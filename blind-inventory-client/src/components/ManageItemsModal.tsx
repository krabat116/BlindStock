import { useEffect,useMemo, useState } from "react"
import type { InventoryItem } from "../types/inventory"
import type { Category } from "../types/category"

type ManageItemsModalProps = {
  isOpen: boolean
  items: InventoryItem[]
  categories: Category[]
  onClose: () => void
  onCreateItem: (payload: {
    name: string
    categoryId: number
    quantity: number
    minimumStock: number
    unit: string
  }) => Promise<void>
  onCreateCategory: (name: string) => Promise<void>
  onUpdateItemName: (itemId: number, name: string) => Promise<void>
  onDeleteItem: (itemId: number) => Promise<void>
  onOpenEditCategories: () => void
}




export default function ManageItemsModal({
  isOpen,
  items,
  categories,
  onClose,
  onCreateItem,
  onCreateCategory,
  onUpdateItemName,
  onDeleteItem,
  onOpenEditCategories,
  
}: ManageItemsModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(
    categories[0]?.id ?? 0
  )
  
  useEffect(() => {
    if (isOpen && categories.length > 0) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [isOpen, categories])

  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("0")
  const [minimumStock, setMinimumStock] = useState("0")
  const [unit, setUnit] = useState("pcs")

  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [categorySubmitting, setCategorySubmitting] = useState(false)
  const [error, setError] = useState("")
  const [categoryError, setCategoryError] = useState("")

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  if (!isOpen) return null

  async function handleCreateItemSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const parsedQuantity = Number(quantity)
    const parsedMinimumStock = Number(minimumStock)

    if (!name.trim()) {
      setError("Item name is required.")
      return
    }

    if (!selectedCategoryId) {
      setError("Please select a category.")
      return
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setError("Initial quantity must be a non-negative number.")
      return
    }

    if (!Number.isFinite(parsedMinimumStock) || parsedMinimumStock < 0) {
      setError("Minimum stock must be a non-negative number.")
      return
    }

    if (!unit.trim()) {
      setError("Unit is required.")
      return
    }

    try {
      setSubmitting(true)
      setError("")

      await onCreateItem({
        name: name.trim(),
        categoryId: selectedCategoryId,
        quantity: parsedQuantity,
        minimumStock: parsedMinimumStock,
        unit: unit.trim(),
      })

      setName("")
      setQuantity("0")
      setMinimumStock("0")
      setUnit("pcs")
    } catch (err) {
      console.error(err)
      setError("Failed to create item.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) {
      setCategoryError("Category name is required.")
      return
    }

    try {
      setCategorySubmitting(true)
      setCategoryError("")
      await onCreateCategory(newCategoryName.trim())
      setNewCategoryName("")
    } catch (err) {
      console.error(err)
      setCategoryError("Failed to create category.")
    } finally {
      setCategorySubmitting(false)
    }
  }

  async function handleSaveEdit(itemId: number) {
    if (!editingName.trim()) return

    try {
      await onUpdateItemName(itemId, editingName.trim())
      setEditingItemId(null)
      setEditingName("")
    } catch (err) {
      console.error(err)
      alert("Failed to update item name.")
    }
  }

  async function handleDelete(itemId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this item?"
    )

    if (!confirmed) return

    try {
      await onDeleteItem(itemId)
    } catch (err) {
      console.error(err)
      alert("Failed to delete item.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Manage Items</h3>
          <p className="mt-1 text-sm text-gray-500">
            View, edit, delete, and add inventory items and categories.
          </p>
        </div>

        <div className="grid gap-6 overflow-y-auto p-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl bg-gray-50 p-5">
            <div className="mb-4">
              <h4 className="text-base font-semibold text-gray-900">
                Existing Items
              </h4>
              <p className="text-sm text-gray-500">
                Edit item names or remove unused items
              </p>
            </div>

            <div className="max-h-[460px] overflow-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-4 py-2 font-medium">Item Name</th>
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium">Current Stock</th>
                    <th className="px-4 py-2 font-medium">Minimum Stock</th>
                    <th className="px-4 py-2 font-medium">Unit</th>
                    <th className="px-4 py-2 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="bg-white text-sm text-gray-700 shadow-sm"
                    >
                      <td className="rounded-l-xl px-4 py-3 font-medium text-gray-900">
                        {editingItemId === item.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">{item.minimumStock}</td>
                      <td className="px-4 py-3">{item.unit}</td>
                      <td className="rounded-r-xl px-4 py-3">
                        <div className="flex gap-2">
                          {editingItemId === item.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingItemId(null)
                                  setEditingName("")
                                }}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingItemId(item.id)
                                  setEditingName(item.name)
                                }}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="mb-4">
                <h4 className="text-base font-semibold text-gray-900">
                  Add Category
                </h4>
                <p className="text-sm text-gray-500">
                  Create a new reusable inventory category
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Bottom Rail Cap"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />

                {categoryError && (
                  <p className="text-sm text-red-600">{categoryError}</p>
                )}

                <button
                  onClick={handleCreateCategory}
                  disabled={categorySubmitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm  font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {categorySubmitting ? "Adding..." : "Add Category"}
                </button>
                <button
                    type="button"
                    onClick={onOpenEditCategories}
                    className="rounded-lg border border-gray-300 px-4 py-2 ml-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Edit Categories
                  </button>

              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="mb-4">
                <h4 className="text-base font-semibold text-gray-900">
                  Add New Item
                </h4>
                <p className="text-sm text-gray-500">
                  Create a new inventory item using an existing category
                </p>
              </div>

              <form onSubmit={handleCreateItemSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                  >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Black Winder"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. pcs"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Initial Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Minimum Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minimumStock}
                      onChange={(e) => setMinimumStock(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Adding..." : "Add Item"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}