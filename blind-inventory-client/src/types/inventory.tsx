export type StockStatus = "ok" | "low" | "out"

export type InventoryItem = {
  id: number
  name: string
  category: string
  stockType: "COUNT" | "LENGTH"
  defaultLengthMm: number | null
  totalLengthMm: number | null
  minimumLengthMm: number | null
  quantity: number
  minimumStock: number
  unit: string
}