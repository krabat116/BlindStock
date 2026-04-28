export type InventoryTransaction = {
  id: number
  itemName: string
  type: string
  quantity: number | null
  lengthMm: number | null
  source: string | null
  note: string | null
  createdAt: string
}