import prisma from "../lib/prisma"
import { parseRecentOrderSheet } from "../parseRecentOrderSheet"
import { mapOrderRowToComponents } from "../orderMapping"
import {
  normalizeCategoryName,
  normalizeItemName,
} from "../utils/normalize"

type DeductionRequestItem = {
  itemId: number
  itemName: string
  category: string
  quantity: number
  sourceRows: number[]
}

type ConfirmOrderDeductionInput = {
  year: number
  month: number
  fileName: string
  fileHash?: string
  accountName: string
  orderSheetNo: number
  totalItems: number
  previewItems?: DeductionRequestItem[]
}

/**
 * Preview one uploaded order Excel file
 * - parse the file
 * - extract components
 * - aggregate duplicate components
 * - match them with inventory items
 */
export async function previewOrderUpload(fileBuffer: Buffer) {
  const parsed = parseRecentOrderSheet(fileBuffer)
  const flatComponents = parsed.rows.flatMap(mapOrderRowToComponents)

  const aggregatedMap = new Map<
    string,
    {
      category: string
      itemName: string
      quantity: number
      sourceRows: number[]
    }
  >()

  for (const component of flatComponents) {
    const key = `${component.category}::${component.itemName}`

    if (!aggregatedMap.has(key)) {
      aggregatedMap.set(key, {
        category: component.category,
        itemName: component.itemName,
        quantity: 0,
        sourceRows: [],
      })
    }

    const existing = aggregatedMap.get(key)!
    existing.quantity += component.quantity
    existing.sourceRows.push(component.sourceRow)
  }

  const aggregatedComponents = Array.from(aggregatedMap.values())

  const dbItems = await prisma.item.findMany({
    include: {
      category: true,
    },
  })

  const preview = aggregatedComponents.map((component) => {
    const matchedItem = dbItems.find(
      (item) =>
        item.name.toUpperCase() === component.itemName.toUpperCase() &&
        normalizeCategoryName(item.category.name) ===
          normalizeCategoryName(component.category)
    )

    return {
      category: component.category,
      itemName: component.itemName,
      quantity: component.quantity,
      sourceRows: component.sourceRows,
      matched: Boolean(matchedItem),
      currentStock: matchedItem?.quantity ?? null,
      itemId: matchedItem?.id ?? null,
    }
  })

  return {
    parsedRowCount: parsed.rows.length,
    orderSheetNo: parsed.orderSheetNo,
    accountName: parsed.accountName,
    totalItems: parsed.totalItems,
    preview,
  }
}

/**
 * Confirm stock deduction and save customer order history
 * - validates payload
 * - verifies item/category/name match
 * - checks stock availability
 * - prevents duplicate order uploads
 * - creates customer if not found
 * - creates customer order
 * - deducts stock
 * - creates transaction records
 */
export async function confirmOrderDeduction(
  input: ConfirmOrderDeductionInput
) {
  const {
    year,
    month,
    fileName,
    fileHash,
    accountName,
    orderSheetNo,
    totalItems,
    previewItems,
  } = input

  /**
   * Validate top-level upload metadata
   */
  if (!Number.isInteger(year)) {
    const error = new Error("Valid year is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    const error = new Error("Valid month is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (!accountName || typeof accountName !== "string") {
    const error = new Error("accountName is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (!Number.isInteger(orderSheetNo)) {
    const error = new Error("Valid orderSheetNo is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (!Number.isInteger(totalItems) || totalItems < 0) {
    const error = new Error("Valid totalItems is required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  if (!Array.isArray(previewItems) || previewItems.length === 0) {
    const error = new Error("Preview items are required")
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  /**
   * Validate preview item shape
   */
  for (const item of previewItems) {
    if (
      !Number.isInteger(item.itemId) ||
      typeof item.itemName !== "string" ||
      typeof item.category !== "string" ||
      typeof item.quantity !== "number" ||
      item.quantity <= 0
    ) {
      const error = new Error("Invalid preview item payload")
      ;(error as Error & { status?: number }).status = 400
      throw error
    }
  }

  const itemIds = previewItems.map((item) => item.itemId)

  const dbItems = await prisma.item.findMany({
    where: {
      id: {
        in: itemIds,
      },
    },
    include: {
      category: true,
    },
  })

  if (dbItems.length !== itemIds.length) {
    const error = new Error(
      "One or more preview items no longer exist in inventory"
    )
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  /**
   * Verify exact matching and stock availability
   */
  for (const previewItem of previewItems) {
    const dbItem = dbItems.find((item) => item.id === previewItem.itemId)

    if (!dbItem) {
      const error = new Error(
        `Missing inventory item for ${previewItem.itemName}`
      )
      ;(error as Error & { status?: number }).status = 400
      throw error
    }

    const categoryMatched =
      normalizeCategoryName(dbItem.category.name) ===
      normalizeCategoryName(previewItem.category)

    const itemNameMatched =
      normalizeItemName(dbItem.name) === normalizeItemName(previewItem.itemName)

    if (!categoryMatched || !itemNameMatched) {
      const error = new Error(
        `Inventory item mismatch for ${previewItem.itemName}`
      )
      ;(error as Error & { status?: number }).status = 400
      throw error
    }

    if (dbItem.quantity < previewItem.quantity) {
      const error = new Error(
        `Insufficient stock for ${previewItem.itemName}`
      )
      ;(error as Error & { status?: number }).status = 400
      throw error
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    /**
     * Prevent duplicate order history records
     * ORDER SHEET NO resets every year,
     * so year + orderSheetNo is the main duplicate key.
     */
    const existingOrder = await tx.customerOrder.findUnique({
      where: {
        orderYear_orderSheetNo: {
          orderYear: year,
          orderSheetNo,
        },
      },
    })

    if (existingOrder) {
      const error = new Error(
        `Duplicate upload detected: order sheet no ${orderSheetNo} already exists for year ${year}.`
      )
      ;(error as Error & { status?: number }).status = 400
      throw error
    }

    /**
     * Find existing customer by accountName
     * or create a new customer automatically
     */
    let customer = await tx.customer.findUnique({
      where: {
        accountName,
      },
    })

    if (!customer) {
      customer = await tx.customer.create({
        data: {
          accountName,
        },
      })
    }

    /**
     * Save customer order history
     */
    await tx.customerOrder.create({
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

    /**
     * Deduct stock and save inventory transactions
     */
    for (const previewItem of previewItems) {
      const dbItem = dbItems.find((item) => item.id === previewItem.itemId)!

      await tx.item.update({
        where: { id: dbItem.id },
        data: {
          quantity: {
            decrement: previewItem.quantity,
          },
        },
      })

      await tx.transaction.create({
        data: {
          itemId: dbItem.id,
          type: "out",
          quantity: previewItem.quantity,
          source: "excel_order",
          note: `Order upload deduction (rows: ${previewItem.sourceRows.join(", ")})`,
        },
      })
    }

    return {
      success: true,
      customerId: customer.id,
      orderSheetNo,
      year,
      month,
      totalItems,
    }
  })

  return result
}