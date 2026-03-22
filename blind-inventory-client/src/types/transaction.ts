export type InventoryTransaction = {
  id: number
  itemName: string
  type: string
  quantity: number
  source: string | null
  note: string | null
  createdAt: string
}