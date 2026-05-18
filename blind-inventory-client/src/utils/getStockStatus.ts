import type { InventoryItem, StockStatus } from "../types/inventory"

export function getStockStatus(item: InventoryItem): StockStatus {
  if (item.stockType === "LENGTH") {
    const total = item.totalLengthMm ?? 0
    const minimum = item.minimumLengthMm ?? 0
    if (total <= 0) return "out"
    if (total <= minimum) return "low"
    return "ok"
  }
  if (item.stockType === "AREA") {
    const total = item.totalAreaMm2 ?? 0
    const minimum = item.minimumAreaMm2 ?? 0
    if (total <= 0) return "out"
    if (total <= minimum) return "low"
    return "ok"
  }
  if (item.quantity <= 0) return "out"
  if (item.quantity <= item.minimumStock) return "low"
  return "ok"
}