import { useEffect, useState } from "react"
import InventoryTable from "../components/InventoryTable"
import AddStockModal from "../components/AddStockModal"
import type { InventoryItem } from "../types/inventory"

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  async function fetchItems() {
    try {
      setLoading(true)
      setError("")

      const response = await fetch("http://localhost:3001/items")

      if (!response.ok) {
        throw new Error("Failed to fetch inventory items")
      }

      const data: InventoryItem[] = await response.json()
      setItems(data)
    } catch (err) {
      console.error(err)
      setError("Could not load inventory data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  function handleOpenAddStock(item: InventoryItem) {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setSelectedItem(null)
  }

  async function handleSaveStock(itemId: number, quantity: number) {
    const response = await fetch(`http://localhost:3001/items/${itemId}/stock`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity }),
    })

    if (!response.ok) {
      throw new Error("Failed to update stock")
    }

    await fetchItems()
  }

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

        {loading && (
          <p className="text-sm text-gray-600">Loading inventory...</p>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && (
          <InventoryTable
            items={items}
            onOpenAddStock={handleOpenAddStock}
          />
        )}

        <AddStockModal
          isOpen={isModalOpen}
          item={selectedItem}
          onClose={handleCloseModal}
          onSave={handleSaveStock}
        />
      </div>
    </main>
  )
}