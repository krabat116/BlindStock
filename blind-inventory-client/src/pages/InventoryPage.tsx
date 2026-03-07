import InventoryTable from "../components/InventoryTable"
import type { InventoryItem } from "../types/inventory"

const inventoryItems: InventoryItem[] = [
  {
    id: 1,
    name: "Metal Chain",
    category: "Chain",
    currentStock: 120,
    minimumStock: 30,
    unit: "pcs",
    status: "ok",
  },
  {
    id: 2,
    name: "Plastic Chain White",
    category: "Chain",
    currentStock: 18,
    minimumStock: 20,
    unit: "pcs",
    status: "low",
  },
  {
    id: 3,
    name: "45mm Aluminium Tube",
    category: "Aluminium Tube",
    currentStock: 0,
    minimumStock: 10,
    unit: "pcs",
    status: "out",
  },
  {
    id: 4,
    name: "White Winder",
    category: "Winder",
    currentStock: 64,
    minimumStock: 15,
    unit: "pcs",
    status: "ok",
  },
]

export default function InventoryPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Blind Inventory Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Track stock levels, process order uploads, and manage component
            inventory.
          </p>
        </div>

        <InventoryTable items={inventoryItems} />
      </div>
    </main>
  )
}