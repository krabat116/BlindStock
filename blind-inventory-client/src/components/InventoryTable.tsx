import StockStatusBadge from "./StockStatusBadge"
import type { InventoryItem } from "../types/inventory"

type InventoryTableProps = {
  items: InventoryItem[]
}

export default function InventoryTable({ items }: InventoryTableProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Inventory</h2>
          <p className="text-sm text-gray-500">
            Manage blind manufacturing components and stock levels
          </p>
        </div>

        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
          Add Stock
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-sm text-gray-500">
              <th className="px-4 py-2 font-medium">Item Name</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Current Stock</th>
              <th className="px-4 py-2 font-medium">Minimum Stock</th>
              <th className="px-4 py-2 font-medium">Unit</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="rounded-xl bg-gray-50 text-sm text-gray-700"
              >
                <td className="rounded-l-xl px-4 py-3 font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="px-4 py-3">{item.category}</td>
                <td className="px-4 py-3">{item.currentStock}</td>
                <td className="px-4 py-3">{item.minimumStock}</td>
                <td className="px-4 py-3">{item.unit}</td>
                <td className="rounded-r-xl px-4 py-3">
                  <StockStatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}