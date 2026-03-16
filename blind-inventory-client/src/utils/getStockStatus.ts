import type { InventoryItem, StockStatus } from "../types/inventory"

export function getStockStatus(item: InventoryItem): StockStatus {
  if (item.quantity <= 0) return "out"
  if (item.quantity <= item.minimumStock) return "low"
  return "ok"
}