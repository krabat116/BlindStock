import { useEffect, useState } from "react"
import InventoryTable from "../components/InventoryTable"
import AddStockModal from "../components/AddStockModal"
import TransactionList from "../components/TransactionList"
import ManageItemsModal from "../components/ManageItemsModal"
import type { InventoryItem } from "../types/inventory"
import type { InventoryTransaction } from "../types/transaction"
import type { Category } from "../types/category"
import EditCategoriesModal from "../components/EditCategoriesModal"

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false)
  const [isManageItemsModalOpen, setIsManageItemsModalOpen] = useState(false)
  const [isEditCategoriesModalOpen, setIsEditCategoriesModalOpen] =
  useState(false)

  async function fetchItems() {
    const response = await fetch("http://localhost:3001/items")

    if (!response.ok) {
      throw new Error("Failed to fetch inventory items")
    }

    const data: InventoryItem[] = await response.json()
    setItems(data)
  }

  async function fetchTransactions() {
    const response = await fetch("http://localhost:3001/transactions")

    if (!response.ok) {
      throw new Error("Failed to fetch transactions")
    }

    const data: InventoryTransaction[] = await response.json()
    setTransactions(data)
  }

  async function fetchCategories() {
    const response = await fetch("http://localhost:3001/categories")

    if (!response.ok) {
      throw new Error("Failed to fetch categories")
    }

    const data: Category[] = await response.json()
    setCategories(data)
  }

  async function fetchAllData() {
    try {
      setLoading(true)
      setError("")
      await Promise.all([
        fetchItems(),
        fetchTransactions(),
        fetchCategories(),
      ])
    } catch (err) {
      console.error(err)
      setError("Could not load inventory data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  function handleOpenAddStock(item: InventoryItem) {
    setSelectedItem(item)
    setIsAddStockModalOpen(true)
  }

  function handleCloseAddStockModal() {
    setIsAddStockModalOpen(false)
    setSelectedItem(null)
  }

  function handleOpenManageItems() {
    setIsManageItemsModalOpen(true)
  }

  function handleCloseManageItemsModal() {
    setIsManageItemsModalOpen(false)
  }

  function handleOpenEditCategories() {
    setIsEditCategoriesModalOpen(true)
  }

  function handleCloseEditCategoriesModal() {
    setIsEditCategoriesModalOpen(false)
  }

  async function handleSaveStock(
    itemId: number,
    quantity: number,
    note: string
  ) {
    const response = await fetch(`http://localhost:3001/items/${itemId}/stock`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity, note }),
    })

    if (!response.ok) {
      throw new Error("Failed to update stock")
    }

    await fetchAllData()
  }

  async function handleCreateItem(payload: {
    name: string
    categoryId: number
    quantity: number
    minimumStock: number
    unit: string
  }) {
    const response = await fetch("http://localhost:3001/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error("Failed to create item")
    }

    await fetchAllData()
  }
  async function handleCreateCategory(name: string) {
    const response = await fetch("http://localhost:3001/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      throw new Error("Failed to create category")
    }

    await fetchAllData()
  }

  async function handleUpdateItemName(itemId: number, name: string) {
    const response = await fetch(`http://localhost:3001/items/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      throw new Error("Failed to update item")
    }

    await fetchAllData()
  }

  async function handleDeleteItem(itemId: number) {
    const response = await fetch(`http://localhost:3001/items/${itemId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete item")
    }

    await fetchAllData()
  }
  async function handleDeleteCategory(categoryId: number) {
    const response = await fetch(
      `http://localhost:3001/categories/${categoryId}`,
      {
        method: "DELETE",
      }
    )

    if (!response.ok) {
      throw new Error("Failed to delete category")
    }

    await fetchAllData()
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
          <>
            <InventoryTable
              items={items}
              onOpenAddStock={handleOpenAddStock}
              onOpenManageItems={handleOpenManageItems}
            />

            <TransactionList transactions={transactions} />
          </>
        )}

        <AddStockModal
          isOpen={isAddStockModalOpen}
          item={selectedItem}
          onClose={handleCloseAddStockModal}
          onSave={handleSaveStock}
        />

        <ManageItemsModal
          isOpen={isManageItemsModalOpen}
          items={items}
          categories={categories}
          onClose={handleCloseManageItemsModal}
          onCreateItem={handleCreateItem}
          onCreateCategory={handleCreateCategory}
          onUpdateItemName={handleUpdateItemName}
          onDeleteItem={handleDeleteItem}
          onOpenEditCategories={handleOpenEditCategories}
        />
        
        <EditCategoriesModal
          isOpen={isEditCategoriesModalOpen}
          categories={categories}
          onClose={handleCloseEditCategoriesModal}
          onDeleteCategory={handleDeleteCategory}
        />
      </div>
    </main>
  )

  
}