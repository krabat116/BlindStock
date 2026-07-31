export type WorkType =
  | "FABRIC_CUTTING"
  | "TUBE_CUTTING"
  | "ASSEMBLING"
  | "PACKING"
  | "INSPECTING"

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  FABRIC_CUTTING: "Fabric",
  TUBE_CUTTING: "Tube",
  ASSEMBLING: "Assembly",
  PACKING: "Packing",
  INSPECTING: "Inspect",
}

export const ALL_WORK_TYPES: WorkType[] = [
  "FABRIC_CUTTING",
  "TUBE_CUTTING",
  "ASSEMBLING",
  "PACKING",
  "INSPECTING",
]

export type WorkActivity = {
  id: string
  workType: WorkType
  displayValue: string
  staffUser: { id: number; username: string }
}

export type WorkOrderRow = {
  id: string
  sourceRowNumber: number
  isAccessoryRow: boolean
  // Blind row fields
  blindNumber: string | null
  additionalRef: string | null
  room: string | null
  widthMm: number | null
  dropMm: number | null
  materialRange: string | null
  materialColour: string | null
  tape: string | null
  roll: string | null
  finish: string | null
  componentryColour: string | null
  chainOperation: string | null
  side: string | null
  chain: string | null
  quantity: number | null
  // Accessory row
  accessoriesNotes: string | null
  activities: WorkActivity[]
}

export type WorkOrderGroup = {
  id: string
  account: string
  customerName: string
  createdAt: string
  sheetId: string
  fileName: string
  uploadedAt: string
  uploadedBy: string
  rowCount: number
  orderYear: number
  orderMonth: number
}

export type WorkOrderGroupDetail = {
  id: string
  account: string
  customerName: string
  createdAt: string
  uploadedSheet: { fileName: string; uploadedAt: string }
  rows: WorkOrderRow[]
}

export type WorkOrderSheetDetail = {
  id: string
  fileName: string
  uploadedAt: string
  uploadedBy: string
  groups: Array<{
    id: string
    account: string
    customerName: string
    rows: WorkOrderRow[]
  }>
}

// Toggle response shapes
export type ToggleActivityResult =
  | { action: "created"; activity: { id: string; displayValue: string; workType: WorkType } }
  | { action: "deleted" }
  | { action: "conflict"; existingDisplayValue: string; existingStaffUserId: number }
