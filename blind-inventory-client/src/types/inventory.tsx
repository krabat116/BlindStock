export type StockStatus = "ok" | "low" | "out"

export type InventoryItem = {
  id: number
  name: string
  category: string
  currentStock: number
  minimumStock: number
  unit: string
  status: StockStatus
}