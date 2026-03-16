export type StockStatus = "ok" | "low" | "out"

export type InventoryItem = {
  id: number
  name: string
  category: string
  quantity: number
  minimumStock: number
  unit: string
}