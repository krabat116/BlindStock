import StockStatusBadge from "./StockStatusBadge"
import type { InventoryItem } from "../types/inventory"
import { getStockStatus } from "../utils/getStockStatus"

type InventoryTableProps = {
  items: InventoryItem[]
  onOpenAddStock: (item: InventoryItem) => void
  onOpenManageItems: () => void
}

export default function InventoryTable({
  items,
  onOpenAddStock,
}: InventoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-1">
        <thead>
          <tr className="text-left">
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">Item name</th>
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">Category</th>
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">Stock</th>
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">Min stock</th>
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">Unit</th>
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">Status</th>
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400"></th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
                No inventory items found.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="bg-gray-50 text-sm text-gray-700">
                <td className="rounded-l-lg px-5 py-3 font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="px-5 py-3 text-gray-500">{item.category}</td>
                <td className="px-5 py-3">{item.quantity}</td>
                <td className="px-5 py-3 text-gray-500">{item.minimumStock}</td>
                <td className="px-5 py-3 text-gray-500">{item.unit}</td>
                <td className="px-5 py-3">
                  <StockStatusBadge status={getStockStatus(item)} />
                </td>
                <td className="rounded-r-lg px-5 py-3">
                  <button
                    onClick={() => onOpenAddStock(item)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-white transition-colors"
                  >
                    + Stock
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
