import type { Prisma, WorkType } from "@prisma/client"
import type { ParsedOrderRow } from "../orderMapping"
import type { RawAccessoryRow } from "../parseRecentOrderSheet"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TxClient = Prisma.TransactionClient

interface SaveWorkOrderSheetParams {
  tx: TxClient
  rows: ParsedOrderRow[]
  accessoryRows: RawAccessoryRow[]
  uploadedById: number
  fileName: string
  fileHash: string
  fileSize: number
  customerOrderId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Save — called inside the confirm-deduction transaction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persists the work order sheet and all its groups/rows.
 * Must be called with a Prisma transaction client so the entire
 * confirm-deduction operation is atomic.
 */
export async function saveWorkOrderSheet({
  tx,
  rows,
  accessoryRows,
  uploadedById,
  fileName,
  fileHash,
  fileSize,
  customerOrderId,
}: SaveWorkOrderSheetParams): Promise<void> {
  // 1. Create the sheet record (linked 1-to-1 with CustomerOrder)
  const sheet = await tx.uploadedWorkOrderSheet.create({
    data: {
      customerOrderId,
      fileName,
      fileHash,
      fileSize,
      uploadedById,
    },
  })

  // 2. Collect all unique (account, customerName) pairs, preserving first-seen order
  const groupKeys: string[] = []
  const groupMap = new Map<string, { account: string; customerName: string }>()

  for (const row of rows) {
    const key = `${row.account}|||${row.customerName}`
    if (!groupMap.has(key)) {
      groupKeys.push(key)
      groupMap.set(key, { account: row.account, customerName: row.customerName })
    }
  }
  for (const ar of accessoryRows) {
    const key = `${ar.account}|||${ar.customerName}`
    if (!groupMap.has(key)) {
      groupKeys.push(key)
      groupMap.set(key, { account: ar.account, customerName: ar.customerName })
    }
  }

  // 3. For each group, create WorkOrderGroup + WorkOrderRows
  for (const key of groupKeys) {
    const { account, customerName } = groupMap.get(key)!

    const group = await tx.workOrderGroup.create({
      data: {
        uploadedWorkOrderSheetId: sheet.id,
        account,
        customerName,
      },
    })

    // Blind rows for this group, ordered by sourceRowNumber
    const groupBlindRows = rows
      .filter((r) => r.account === account && r.customerName === customerName)
      .sort((a, b) => a.rowNumber - b.rowNumber)

    // Accessory rows for this group, ordered by sourceRowNumber
    const groupAccessoryRows = accessoryRows
      .filter((r) => r.account === account && r.customerName === customerName)
      .sort((a, b) => a.rowNumber - b.rowNumber)

    // Create blind rows
    if (groupBlindRows.length > 0) {
      await tx.workOrderRow.createMany({
        data: groupBlindRows.map((r) => ({
          workOrderGroupId: group.id,
          sourceRowNumber: r.rowNumber,
          isAccessoryRow: false,
          blindNumber: r.blindNo || null,
          additionalRef: r.tubeOverride || null,
          room: r.room || null,
          widthMm: r.width ?? null,
          dropMm: r.drop ?? null,
          materialRange: r.materialRangePart || null,
          materialColour: r.materialColourPart || null,
          tape: r.tape || null,
          roll: r.roll || null,
          finish: r.finish || null,
          componentryColour: r.componentryColour || null,
          chainOperation: r.operationRaw || null,
          side: r.sideWdr || null,
          chain: r.chainType || null,
          quantity: r.qty,
          accessoriesNotes: r.accessoriesNotes || null,
        })),
      })
    }

    // Create accessory rows
    if (groupAccessoryRows.length > 0) {
      await tx.workOrderRow.createMany({
        data: groupAccessoryRows.map((r) => ({
          workOrderGroupId: group.id,
          sourceRowNumber: r.rowNumber,
          isAccessoryRow: true,
          accessoriesNotes: r.rawText,
        })),
      })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Query helpers (used by workOrderRoutes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all work order groups with sheet metadata, sorted newest-first.
 */
export async function getWorkOrderGroups(prisma: TxClient) {
  const groups = await prisma.workOrderGroup.findMany({
    include: {
      uploadedSheet: {
        select: {
          id: true,
          fileName: true,
          uploadedAt: true,
          uploadedBy: { select: { username: true } },
          customerOrder: { select: { orderYear: true, orderMonth: true } },
        },
      },
      _count: { select: { rows: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return groups.map((g) => ({
    id: g.id,
    account: g.account,
    customerName: g.customerName,
    createdAt: g.createdAt,
    sheetId: g.uploadedSheet.id,
    fileName: g.uploadedSheet.fileName,
    uploadedAt: g.uploadedSheet.uploadedAt,
    uploadedBy: g.uploadedSheet.uploadedBy.username,
    rowCount: g._count.rows,
    orderYear: g.uploadedSheet.customerOrder.orderYear,
    orderMonth: g.uploadedSheet.customerOrder.orderMonth,
  }))
}

/**
 * Returns one group with all its rows (ordered by sourceRowNumber) and
 * all WorkActivities for those rows.
 */
export async function getWorkOrderGroupById(prisma: TxClient, id: string) {
  const group = await prisma.workOrderGroup.findUnique({
    where: { id },
    include: {
      uploadedSheet: {
        select: { fileName: true, uploadedAt: true },
      },
      rows: {
        orderBy: { sourceRowNumber: "asc" },
        include: {
          activities: {
            include: {
              staffUser: { select: { id: true, username: true } },
            },
          },
        },
      },
    },
  })

  return group
}

/**
 * Returns one sheet with all groups and all their rows + activities.
 * Used by GET /work-orders/sheets/:id (Page tab detail view).
 */
export async function getWorkOrderSheetById(prisma: TxClient, id: string) {
  const sheet = await prisma.uploadedWorkOrderSheet.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { username: true } },
      workOrderGroups: {
        orderBy: { createdAt: "asc" },
        include: {
          rows: {
            orderBy: { sourceRowNumber: "asc" },
            include: {
              activities: {
                include: {
                  staffUser: { select: { id: true, username: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!sheet) return null

  return {
    id: sheet.id,
    fileName: sheet.fileName,
    uploadedAt: sheet.uploadedAt,
    uploadedBy: sheet.uploadedBy.username,
    groups: sheet.workOrderGroups.map((g) => ({
      id: g.id,
      account: g.account,
      customerName: g.customerName,
      rows: g.rows,
    })),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Toggle logic for a staff member clicking a Work Status cell:
 *  - No existing record → create with staff username
 *  - Existing record owned by this staff → delete (toggle off)
 *  - Existing record owned by someone else → return conflict info
 */
export async function toggleWorkActivity(
  prisma: TxClient,
  workOrderRowId: string,
  workType: WorkType,
  staffUserId: number,
  staffUsername: string
): Promise<
  | { action: "created"; activity: { id: string; displayValue: string; workType: string } }
  | { action: "deleted" }
  | { action: "conflict"; existingDisplayValue: string; existingStaffUserId: number }
> {
  const existing = await prisma.workActivity.findUnique({
    where: { workOrderRowId_workType: { workOrderRowId, workType } },
  })

  if (!existing) {
    const activity = await prisma.workActivity.create({
      data: { workOrderRowId, workType, staffUserId, displayValue: staffUsername },
    })
    return { action: "created", activity: { id: activity.id, displayValue: activity.displayValue, workType: activity.workType } }
  }

  if (existing.staffUserId === staffUserId) {
    await prisma.workActivity.delete({ where: { id: existing.id } })
    return { action: "deleted" }
  }

  return {
    action: "conflict",
    existingDisplayValue: existing.displayValue,
    existingStaffUserId: existing.staffUserId,
  }
}

/**
 * Delete any WorkActivity by ID.
 * Caller must verify the requester is the owner or an admin.
 */
export async function deleteWorkActivity(
  prisma: TxClient,
  activityId: string,
  requesterId: number,
  requesterRole: string
): Promise<{ deleted: boolean; reason?: string }> {
  const activity = await prisma.workActivity.findUnique({
    where: { id: activityId },
  })

  if (!activity) return { deleted: false, reason: "not_found" }

  const isOwner = activity.staffUserId === requesterId
  const isAdmin = requesterRole === "ADMIN"

  if (!isOwner && !isAdmin) {
    return { deleted: false, reason: "forbidden" }
  }

  await prisma.workActivity.delete({ where: { id: activityId } })
  return { deleted: true }
}
