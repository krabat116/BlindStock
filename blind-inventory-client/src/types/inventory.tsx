export type StockStatus = "ok" | "low" | "out"

export type InventoryItem = {
  id: number
  name: string
  category: string
  stockType: "COUNT" | "LENGTH" | "AREA"
  defaultLengthMm: number | null
  totalLengthMm: number | null
  minimumLengthMm: number | null
  cutoffLengthMm: number | null
  totalAreaMm2: number | null
  minimumAreaMm2: number | null
  rollWidthMm: number | null
  quantity: number
  minimumStock: number
  unit: string
}