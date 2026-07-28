import crypto from "crypto"
import prisma from "../lib/prisma"
import { parseRecentOrderSheet } from "../parseRecentOrderSheet"
import { mapOrderRowToComponents, type PreviewComponent } from "../orderMapping"
import { computeFabricAreaMm2, ROLL_WIDTH_MM } from "../fabricPacking"
import {
  normalizeCategoryName,
  normalizeItemName,
} from "../utils/normalize"
import { saveWorkOrderSheet } from "./workOrderService"

// ─────────────────────────────────────────────────────────────────────────────
// Preview
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Preview one uploaded order Excel file.
 * - parse the file
 * - extract components
 * - aggregate duplicate components
 * - match them with inventory items
 */
export async function previewOrderUpload(fileBuffer: Buffer) {
  const continuationRules = await prisma.continuationRowRule.findMany()
  const parsed = parseRecentOrderSheet(fileBuffer, continuationRules)
  const flatComponents = parsed.rows.flatMap(mapOrderRowToComponents)

  // Continuation components → same PreviewComponent shape
  const continuationPreviewComponents: PreviewComponent[] = parsed.continuationComponents.map((cc) => ({
    sourceRow: cc.sourceRow,
    category: cc.category,
    itemName: cc.itemName,
    quantity: cc.quantity,
  }))

  const allComponents = [...flatComponents, ...continuationPreviewComponents]

  const aggregatedMap = new Map<
    string,
    {
      category: string
      itemName: string
      quantity: number
      totalLengthMm: number
      sourceRows: number[]
    }
  >()

  for (const component of allComponents) {
    const key = `${component.category}::${component.itemName}`

    if (!aggregatedMap.has(key)) {
      aggregatedMap.set(key, {
        category: component.category,
        itemName: component.itemName,
        quantity: 0,
        totalLengthMm: 0,
        sourceRows: [],
      })
    }

    const existing = aggregatedMap.get(key)!
    existing.quantity += component.quantity
    existing.totalLengthMm += component.lengthMm ?? 0
    existing.sourceRows.push(component.sourceRow)
  }

  const aggregatedComponents = Array.from(aggregatedMap.values())

  // ── Material (fabric) — strip-packing per material type ──────────────────
  const materialGroupMap = new Map<
    string,
    { blinds: Array<{ widthMm: number; dropMm: number }>; sourceRows: number[] }
  >()

  for (const row of parsed.rows) {
    if (!row.material || row.width === null || row.drop === null) continue
    const materialName = row.material.trim().toUpperCase()
    if (!materialName) continue

    if (!materialGroupMap.has(materialName)) {
      materialGroupMap.set(materialName, { blinds: [], sourceRows: [] })
    }

    const group = materialGroupMap.get(materialName)!
    group.sourceRows.push(row.rowNumber)

    const qty = row.qty > 0 ? row.qty : 1
    for (let i = 0; i < qty; i++) {
      group.blinds.push({ widthMm: row.width!, dropMm: row.drop! })
    }
  }

  const dbItems = await prisma.item.findMany({ include: { category: true } })

  const materialComponents = Array.from(materialGroupMap.entries()).map(
    ([materialName, { blinds, sourceRows }]) => {
      const matchedItem = dbItems.find(
        (item) =>
          item.name.toUpperCase() === materialName.toUpperCase() &&
          normalizeCategoryName(item.category.name) === "FABRIC"
      )
      const rollWidthMm = matchedItem?.rollWidthMm ?? ROLL_WIDTH_MM
      return {
        category: "Fabric" as const,
        itemName: materialName,
        quantity: blinds.length,
        areaMm2: computeFabricAreaMm2(blinds, rollWidthMm),
        sourceRows,
      }
    }
  )

  const LENGTH_CATEGORIES = new Set(["Finish", "Tube"])
  const AREA_CATEGORIES = new Set(["Fabric"])

  const preview = [
    ...aggregatedComponents.map((component) => {
      const matchedItem = dbItems.find(
        (item) =>
          item.name.toUpperCase() === component.itemName.toUpperCase() &&
          normalizeCategoryName(item.category.name) ===
            normalizeCategoryName(component.category)
      )

      const inferredStockType = LENGTH_CATEGORIES.has(component.category)
        ? "LENGTH"
        : "COUNT"

      return {
        category: component.category,
        itemName: component.itemName,
        quantity: component.quantity,
        lengthMm: component.totalLengthMm > 0 ? component.totalLengthMm : null,
        areaMm2: null as number | null,
        sourceRows: component.sourceRows,
        matched: Boolean(matchedItem),
        stockType: (matchedItem?.stockType ?? inferredStockType) as string,
        currentStock: matchedItem?.quantity ?? null,
        currentLengthMm: matchedItem?.totalLengthMm ?? null,
        currentAreaMm2: null as number | null,
        itemId: matchedItem?.id ?? null,
      }
    }),
    ...materialComponents.map((component) => {
      const matchedItem = dbItems.find(
        (item) =>
          item.name.toUpperCase() === component.itemName.toUpperCase() &&
          normalizeCategoryName(item.category.name) ===
            normalizeCategoryName(component.category)
      )

      const inferredStockType = AREA_CATEGORIES.has(component.category)
        ? "AREA"
        : "COUNT"

      return {
        category: component.category,
        itemName: component.itemName,
        quantity: component.quantity,
        lengthMm: null as number | null,
        areaMm2: component.areaMm2,
        sourceRows: component.sourceRows,
        matched: Boolean(matchedItem),
        stockType: (matchedItem?.stockType ?? inferredStockType) as string,
        currentStock: null as number | null,
        currentLengthMm: null as number | null,
        currentAreaMm2: matchedItem?.totalAreaMm2 ?? null,
        itemId: matchedItem?.id ?? null,
      }
    }),
  ]

  return {
    parsedRowCount: parsed.rows.length,
    orderSheetNo: parsed.orderSheetNo,
    accountName: parsed.accountName,
    totalItems: parsed.totalItems,
    preview,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm — refactored to re-parse the file and run everything atomically
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmParams {
  year: number
  month: number
  fileName: string
  accountName: string
  orderSheetNo: number
  totalItems: number
}

/**
 * Confirm stock deduction and save work order data.
 *
 * Flow (all pre-transaction):
 *  1. Compute fileHash (SHA-256)
 *  2. Check duplicate fileHash
 *  3. Check duplicate orderYear + orderSheetNo
 *  4. Parse Excel — derive components, verify stock
 *
 * Then in ONE prisma.$transaction():
 *  5. find-or-create Customer
 *  6. Create CustomerOrder
 *  7. Deduct inventory + Transaction records
 *  8. Create UploadedWorkOrderSheet + WorkOrderGroups + WorkOrderRows
 */
export async function confirmOrderDeduction(
  fileBuffer: Buffer,
  params: ConfirmParams,
  uploadedById: number
) {
  const { year, month, fileName, accountName, orderSheetNo, totalItems } = params

  // ── Basic validation ──────────────────────────────────────────────────────
  if (!Number.isInteger(year)) throw clientError("Valid year is required")
  if (!Number.isInteger(month) || month < 1 || month > 12) throw clientError("Valid month is required")
  if (!accountName) throw clientError("accountName is required")
  if (!Number.isInteger(orderSheetNo)) throw clientError("Valid orderSheetNo is required")
  if (!Number.isInteger(totalItems) || totalItems < 0) throw clientError("Valid totalItems is required")

  // ── 1. Compute fileHash ───────────────────────────────────────────────────
  const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex")
  const fileSize = fileBuffer.length

  // ── 2. Duplicate fileHash check ───────────────────────────────────────────
  const existingSheet = await prisma.uploadedWorkOrderSheet.findUnique({
    where: { fileHash },
    select: { customerOrder: { select: { orderYear: true, orderSheetNo: true } } },
  })
  if (existingSheet) {
    const ref = existingSheet.customerOrder
    throw clientError(
      `Duplicate file detected: this Excel file was already uploaded` +
      (ref ? ` (order sheet #${ref.orderSheetNo}, ${ref.orderYear})` : "") +
      `. Work order data was not created again.`
    )
  }

  // ── 3. Duplicate orderYear + orderSheetNo check ───────────────────────────
  const existingOrder = await prisma.customerOrder.findUnique({
    where: { orderYear_orderSheetNo: { orderYear: year, orderSheetNo } },
  })
  if (existingOrder) {
    throw clientError(
      `Duplicate upload detected: order sheet no ${orderSheetNo} already exists for year ${year}.`
    )
  }

  // ── 4. Parse Excel + compute required components ──────────────────────────
  const continuationRules = await prisma.continuationRowRule.findMany()
  const parsed = parseRecentOrderSheet(fileBuffer, continuationRules)

  const flatComponents = parsed.rows.flatMap(mapOrderRowToComponents)
  const continuationPreviewComponents: PreviewComponent[] = parsed.continuationComponents.map((cc) => ({
    sourceRow: cc.sourceRow,
    category: cc.category,
    itemName: cc.itemName,
    quantity: cc.quantity,
  }))
  const allComponents = [...flatComponents, ...continuationPreviewComponents]

  // Aggregate components (same as preview)
  const aggregatedMap = new Map<
    string,
    { category: string; itemName: string; quantity: number; totalLengthMm: number; sourceRows: number[] }
  >()
  for (const comp of allComponents) {
    const key = `${comp.category}::${comp.itemName}`
    if (!aggregatedMap.has(key)) {
      aggregatedMap.set(key, { category: comp.category, itemName: comp.itemName, quantity: 0, totalLengthMm: 0, sourceRows: [] })
    }
    const entry = aggregatedMap.get(key)!
    entry.quantity += comp.quantity
    entry.totalLengthMm += comp.lengthMm ?? 0
    entry.sourceRows.push(comp.sourceRow)
  }

  // Fabric area components
  const materialGroupMap = new Map<
    string,
    { blinds: Array<{ widthMm: number; dropMm: number }>; sourceRows: number[] }
  >()
  for (const row of parsed.rows) {
    if (!row.material || row.width === null || row.drop === null) continue
    const matName = row.material.trim().toUpperCase()
    if (!matName) continue
    if (!materialGroupMap.has(matName)) materialGroupMap.set(matName, { blinds: [], sourceRows: [] })
    const g = materialGroupMap.get(matName)!
    g.sourceRows.push(row.rowNumber)
    const qty = row.qty > 0 ? row.qty : 1
    for (let i = 0; i < qty; i++) g.blinds.push({ widthMm: row.width!, dropMm: row.drop! })
  }

  // Load all DB items once
  const dbItems = await prisma.item.findMany({ include: { category: true } })

  // ── 4a. Build deduction list for count/length components ──────────────────
  type DeductionItem = {
    itemId: number
    itemName: string
    category: string
    quantity: number
    lengthMm: number | null
    areaMm2: number | null
    sourceRows: number[]
  }

  const deductionItems: DeductionItem[] = []

  for (const comp of Array.from(aggregatedMap.values())) {
    const dbItem = dbItems.find(
      (item) =>
        normalizeItemName(item.name) === normalizeItemName(comp.itemName) &&
        normalizeCategoryName(item.category.name) === normalizeCategoryName(comp.category)
    )
    if (!dbItem) continue // skip items not in DB (user should have created them first)

    // Stock availability check
    if (dbItem.stockType === "LENGTH") {
      if ((dbItem.totalLengthMm ?? 0) < (comp.totalLengthMm || 0)) {
        throw clientError(`Insufficient stock for ${comp.itemName}`)
      }
    } else {
      if ((dbItem.quantity ?? 0) < comp.quantity) {
        throw clientError(`Insufficient stock for ${comp.itemName}`)
      }
    }

    deductionItems.push({
      itemId: dbItem.id,
      itemName: dbItem.name,
      category: dbItem.category.name,
      quantity: comp.quantity,
      lengthMm: comp.totalLengthMm > 0 ? comp.totalLengthMm : null,
      areaMm2: null,
      sourceRows: comp.sourceRows,
    })
  }

  // ── 4b. Build deduction list for fabric (AREA) components ─────────────────
  for (const [matName, { blinds, sourceRows }] of materialGroupMap.entries()) {
    const dbItem = dbItems.find(
      (item) =>
        item.name.toUpperCase() === matName.toUpperCase() &&
        normalizeCategoryName(item.category.name) === "FABRIC"
    )
    if (!dbItem) continue // skip unmatched fabric items

    const rollWidthMm = dbItem.rollWidthMm ?? ROLL_WIDTH_MM
    const areaMm2 = computeFabricAreaMm2(blinds, rollWidthMm)

    if (Number(dbItem.totalAreaMm2 ?? 0) < areaMm2) {
      throw clientError(`Insufficient stock for ${matName}`)
    }

    deductionItems.push({
      itemId: dbItem.id,
      itemName: dbItem.name,
      category: dbItem.category.name,
      quantity: blinds.length,
      lengthMm: null,
      areaMm2,
      sourceRows,
    })
  }

  // ── 5-8. Single atomic transaction ───────────────────────────────────────
  const result = await prisma.$transaction(
    async (tx) => {
      // Find or create customer
      let customer = await tx.customer.findUnique({ where: { accountName } })
      if (!customer) {
        customer = await tx.customer.create({ data: { accountName } })
      }

      // Create CustomerOrder
      const customerOrder = await tx.customerOrder.create({
        data: {
          customerId: customer.id,
          orderYear: year,
          orderMonth: month,
          orderSheetNo,
          totalItems,
          fileName,
          fileHash,
          status: "COMPLETED",
        },
      })

      const source = `${year}/${String(month).padStart(2, "0")} · #${orderSheetNo}`

      // Deduct inventory + Transaction records
      for (const item of deductionItems) {
        const note = `Order upload deduction (rows: ${item.sourceRows.join(", ")})`

        if (item.areaMm2 !== null) {
          await tx.item.update({
            where: { id: item.itemId },
            data: { totalAreaMm2: { decrement: item.areaMm2 } },
          })
          await tx.transaction.create({
            data: { itemId: item.itemId, type: "out", areaMm2: item.areaMm2, source, note },
          })
        } else if (item.lengthMm !== null) {
          await tx.item.update({
            where: { id: item.itemId },
            data: { totalLengthMm: { decrement: item.lengthMm } },
          })
          await tx.transaction.create({
            data: { itemId: item.itemId, type: "out", lengthMm: item.lengthMm, source, note },
          })
        } else {
          await tx.item.update({
            where: { id: item.itemId },
            data: { quantity: { decrement: item.quantity } },
          })
          await tx.transaction.create({
            data: { itemId: item.itemId, type: "out", quantity: item.quantity, source, note },
          })
        }
      }

      // Save work order sheet + groups + rows (all inside same tx)
      await saveWorkOrderSheet({
        tx,
        rows: parsed.rows,
        accessoryRows: parsed.accessoryRows,
        uploadedById,
        fileName,
        fileHash,
        fileSize,
        customerOrderId: customerOrder.id,
      })

      return {
        success: true,
        customerId: customer.id,
        orderSheetNo,
        year,
        month,
        totalItems,
      }
    },
    { timeout: 30000 }
  )

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Order stats
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrderStats() {
  const orders = await prisma.customerOrder.findMany({
    select: { orderYear: true, orderMonth: true, totalItems: true },
    orderBy: [{ orderYear: "asc" }, { orderMonth: "asc" }],
  })

  return {
    orders: orders.map((o) => ({
      year: o.orderYear,
      month: o.orderMonth,
      totalItems: o.totalItems,
    })),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clientError(message: string): Error & { status: number } {
  const err = new Error(message) as Error & { status: number }
  err.status = 400
  return err
}
