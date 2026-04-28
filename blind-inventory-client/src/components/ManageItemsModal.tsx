import { useEffect, useMemo, useState } from "react"
import type { InventoryItem } from "../types/inventory"
import type { Category } from "../types/category"
import type { CreateItemPayload } from "../types/createItemPayload"

type ItemSettingsPayload = {
  stockType: "COUNT" | "LENGTH"
  minimumStock?: number
  unit?: string
  defaultLengthMm?: number
  totalLengthMm?: number
  minimumLengthMm?: number
  cutoffLengthMm?: number
}

type ManageItemsModalProps = {
  isOpen: boolean
  items: InventoryItem[]
  categories: Category[]
  onClose: () => void
  onCreateItem: (payload: CreateItemPayload) => Promise<void>
  onCreateCategory: (name: string) => Promise<void>
  onUpdateItemName: (itemId: number, name: string) => Promise<void>
  onUpdateItemSettings: (itemId: number, payload: ItemSettingsPayload) => Promise<void>
  onDeleteItem: (itemId: number) => Promise<void>
  onOpenEditCategories: () => void
}

type StockTypeTab = "COUNT" | "LENGTH"

export default function ManageItemsModal({
  isOpen,
  items,
  categories,
  onClose,
  onCreateItem,
  onCreateCategory,
  onUpdateItemName,
  onUpdateItemSettings,
  onDeleteItem,
  onOpenEditCategories,
}: ManageItemsModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(
    categories[0]?.id ?? 0
  )

  const [stockTypeTab, setStockTypeTab] = useState<StockTypeTab>("COUNT")

  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("0")
  const [minimumStock, setMinimumStock] = useState("0")
  const [unit, setUnit] = useState("pcs")

  const [defaultLengthMm, setDefaultLengthMm] = useState("4000")
  const [stickCount, setStickCount] = useState("0")
  const [minimumLengthMm, setMinimumLengthMm] = useState("0")
  const [cutoffLengthMm, setCutoffLengthMm] = useState("800")

  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")

  // Settings 편집 상태 (stockType 전환)
  const [settingsItemId, setSettingsItemId] = useState<number | null>(null)
  const [settingsStockType, setSettingsStockType] = useState<StockTypeTab>("COUNT")
  const [settingsMinimumStock, setSettingsMinimumStock] = useState("0")
  const [settingsUnit, setSettingsUnit] = useState("pcs")
  const [settingsDefaultLengthMm, setSettingsDefaultLengthMm] = useState("4000")
  const [settingsStickCount, setSettingsStickCount] = useState("0")
  const [settingsMinimumLengthMm, setSettingsMinimumLengthMm] = useState("0")
  const [settingsCutoffLengthMm, setSettingsCutoffLengthMm] = useState("800")

  const settingsTotalLengthMm = useMemo(() => {
    const d = Number(settingsDefaultLengthMm)
    const s = Number(settingsStickCount)
    if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(s) || s < 0) return 0
    return d * s
  }, [settingsDefaultLengthMm, settingsStickCount])

  const [submitting, setSubmitting] = useState(false)
  const [settingsSubmitting, setSettingsSubmitting] = useState(false)
  const [categorySubmitting, setCategorySubmitting] = useState(false)
  const [error, setError] = useState("")
  const [settingsError, setSettingsError] = useState("")
  const [categoryError, setCategoryError] = useState("")

  useEffect(() => {
    if (isOpen && categories.length > 0) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [isOpen, categories])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  const totalLengthMm = useMemo(() => {
    const parsedDefaultLengthMm = Number(defaultLengthMm)
    const parsedStickCount = Number(stickCount)

    if (!Number.isFinite(parsedDefaultLengthMm) || parsedDefaultLengthMm <= 0) {
      return 0
    }

    if (!Number.isFinite(parsedStickCount) || parsedStickCount < 0) {
      return 0
    }

    return parsedDefaultLengthMm * parsedStickCount
  }, [defaultLengthMm, stickCount])

  function resetItemForm() {
    setName("")
    setQuantity("0")
    setMinimumStock("0")
    setUnit("pcs")
    setDefaultLengthMm("4000")
    setStickCount("0")
    setMinimumLengthMm("0")
    setCutoffLengthMm("800")
    setStockTypeTab("COUNT")
  }

  if (!isOpen) return null

  async function handleCreateItemSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!name.trim()) {
      setError("Item name is required.")
      return
    }

    if (!selectedCategoryId) {
      setError("Please select a category.")
      return
    }

    try {
      setSubmitting(true)
      setError("")

      if (stockTypeTab === "COUNT") {
        const parsedQuantity = Number(quantity)
        const parsedMinimumStock = Number(minimumStock)

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

        await onCreateItem({
          name: name.trim(),
          categoryId: selectedCategoryId,
          stockType: "COUNT",
          quantity: parsedQuantity,
          minimumStock: parsedMinimumStock,
          unit: unit.trim(),
        })
      } else {
        const parsedDefaultLengthMm = Number(defaultLengthMm)
        const parsedStickCount = Number(stickCount)
        const parsedMinimumLengthMm = Number(minimumLengthMm)

        if (
          !Number.isFinite(parsedDefaultLengthMm) ||
          parsedDefaultLengthMm <= 0
        ) {
          setError("Default stick length must be greater than 0.")
          return
        }

        if (!Number.isFinite(parsedStickCount) || parsedStickCount < 0) {
          setError("Stick count must be a non-negative number.")
          return
        }

        if (
          !Number.isFinite(parsedMinimumLengthMm) ||
          parsedMinimumLengthMm < 0
        ) {
          setError("Minimum length must be a non-negative number.")
          return
        }

        const parsedCutoffLengthMm = Number(cutoffLengthMm)

        if (!Number.isFinite(parsedCutoffLengthMm) || parsedCutoffLengthMm < 0) {
          setError("Cut-off length must be a non-negative number.")
          return
        }

        await onCreateItem({
          name: name.trim(),
          categoryId: selectedCategoryId,
          stockType: "LENGTH",
          defaultLengthMm: parsedDefaultLengthMm,
          totalLengthMm,
          minimumLengthMm: parsedMinimumLengthMm,
          cutoffLengthMm: parsedCutoffLengthMm,
        })
      }

      resetItemForm()
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

  function handleOpenSettings(item: InventoryItem) {
    setSettingsItemId(item.id)
    setSettingsStockType(item.stockType)
    setSettingsError("")

    if (item.stockType === "LENGTH") {
      setSettingsDefaultLengthMm(String(item.defaultLengthMm ?? 4000))
      // 현재 재고를 막대 수로 역산 (표시용)
      const defaultLen = item.defaultLengthMm ?? 4000
      const currentTotal = item.totalLengthMm ?? 0
      setSettingsStickCount(defaultLen > 0 ? String(Math.round(currentTotal / defaultLen)) : "0")
      setSettingsMinimumLengthMm(String(item.minimumLengthMm ?? 0))
      setSettingsCutoffLengthMm(String(item.cutoffLengthMm ?? 800))
    } else {
      setSettingsMinimumStock(String(item.minimumStock ?? 0))
      setSettingsUnit(item.unit ?? "pcs")
      setSettingsDefaultLengthMm("4000")
      setSettingsStickCount("0")
      setSettingsMinimumLengthMm("0")
    }
  }

  async function handleSaveSettings() {
    if (!settingsItemId) return

    try {
      setSettingsSubmitting(true)
      setSettingsError("")

      if (settingsStockType === "LENGTH") {
        const d = Number(settingsDefaultLengthMm)
        const s = Number(settingsStickCount)
        const minL = Number(settingsMinimumLengthMm)
        const cutoff = Number(settingsCutoffLengthMm)

        if (!Number.isFinite(d) || d <= 0) {
          setSettingsError("Default length must be greater than 0.")
          return
        }
        if (!Number.isFinite(s) || s < 0) {
          setSettingsError("Stick count must be a non-negative number.")
          return
        }
        if (!Number.isFinite(minL) || minL < 0) {
          setSettingsError("Minimum length must be a non-negative number.")
          return
        }
        if (!Number.isFinite(cutoff) || cutoff < 0) {
          setSettingsError("Cut-off length must be a non-negative number.")
          return
        }

        await onUpdateItemSettings(settingsItemId, {
          stockType: "LENGTH",
          defaultLengthMm: d,
          totalLengthMm: settingsTotalLengthMm,
          minimumLengthMm: minL,
          cutoffLengthMm: cutoff,
        })
      } else {
        const minS = Number(settingsMinimumStock)
        if (!Number.isFinite(minS) || minS < 0) {
          setSettingsError("Minimum stock must be a non-negative number.")
          return
        }
        if (!settingsUnit.trim()) {
          setSettingsError("Unit is required.")
          return
        }

        await onUpdateItemSettings(settingsItemId, {
          stockType: "COUNT",
          minimumStock: minS,
          unit: settingsUnit.trim(),
        })
      }

      setSettingsItemId(null)
    } catch (err) {
      console.error(err)
      setSettingsError("Failed to update item settings.")
    } finally {
      setSettingsSubmitting(false)
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

  function renderCurrentStock(item: InventoryItem) {
    if (item.stockType === "LENGTH") {
      return item.totalLengthMm != null
        ? `${item.totalLengthMm.toLocaleString()} mm`
        : "-"
    }

    return item.quantity != null ? `${item.quantity}` : "-"
  }

  function renderMinimumStock(item: InventoryItem) {
    if (item.stockType === "LENGTH") {
      return item.minimumLengthMm != null
        ? `${item.minimumLengthMm.toLocaleString()} mm`
        : "-"
    }

    return item.minimumStock != null ? `${item.minimumStock}` : "-"
  }

  function renderUnit(item: InventoryItem) {
    if (item.stockType === "LENGTH") {
      return "mm"
    }

    return item.unit ?? "-"
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
                    <th className="px-4 py-2 font-medium">Type</th>
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
                      <td className="px-4 py-3">
                        {item.stockType === "LENGTH" ? "Length" : "Count"}
                      </td>
                      <td className="px-4 py-3">{renderCurrentStock(item)}</td>
                      <td className="px-4 py-3">{renderMinimumStock(item)}</td>
                      <td className="px-4 py-3">{renderUnit(item)}</td>
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
                                onClick={() => handleOpenSettings(item)}
                                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                                  settingsItemId === item.id
                                    ? "bg-blue-600 text-white"
                                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                Settings
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
            {/* ── Settings 편집 패널 ── */}
            {settingsItemId !== null && (() => {
              const settingItem = items.find((i) => i.id === settingsItemId)
              if (!settingItem) return null

              return (
                <div className="rounded-2xl bg-blue-50 p-5 border border-blue-200">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">
                        Item Settings
                      </h4>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">{settingItem.name}</span> — 재고 타입 및 설정 변경
                      </p>
                    </div>
                    <button
                      onClick={() => setSettingsItemId(null)}
                      className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mb-4 flex w-fit rounded-xl bg-white p-1 border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setSettingsStockType("COUNT")}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        settingsStockType === "COUNT"
                          ? "bg-gray-900 text-white shadow"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      개수형 재고
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsStockType("LENGTH")}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        settingsStockType === "LENGTH"
                          ? "bg-gray-900 text-white shadow"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      길이형 재고
                    </button>
                  </div>

                  <div className="space-y-4">
                    {settingsStockType === "COUNT" ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Minimum Stock
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={settingsMinimumStock}
                            onChange={(e) => setSettingsMinimumStock(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Unit
                          </label>
                          <input
                            type="text"
                            value={settingsUnit}
                            onChange={(e) => setSettingsUnit(e.target.value)}
                            placeholder="e.g. pcs"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                              Default Length (mm)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={settingsDefaultLengthMm}
                              onChange={(e) => setSettingsDefaultLengthMm(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                              Stick Count (재고)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={settingsStickCount}
                              onChange={(e) => setSettingsStickCount(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                              Minimum Length (mm)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={settingsMinimumLengthMm}
                              onChange={(e) => setSettingsMinimumLengthMm(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                              Cut-off / Stick (mm)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={settingsCutoffLengthMm}
                              onChange={(e) => setSettingsCutoffLengthMm(e.target.value)}
                              placeholder="e.g. 800"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Total Available Length
                          </label>
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900">
                            {settingsTotalLengthMm.toLocaleString()} mm
                          </div>
                        </div>
                      </>
                    )}

                    {settingsError && (
                      <p className="text-sm text-red-600">{settingsError}</p>
                    )}

                    {settingsStockType !== settingItem.stockType && (
                      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                        재고 타입이 변경됩니다. 기존{" "}
                        {settingItem.stockType === "COUNT" ? "개수" : "길이"} 데이터는 초기화됩니다.
                      </p>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSettingsItemId(null)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={settingsSubmitting}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {settingsSubmitting ? "Saving..." : "Save Settings"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}

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
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {categorySubmitting ? "Adding..." : "Add Category"}
                </button>

                <button
                  type="button"
                  onClick={onOpenEditCategories}
                  className="ml-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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

              <div className="mb-4 flex w-fit rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setStockTypeTab("COUNT")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    stockTypeTab === "COUNT"
                      ? "bg-white text-gray-900 shadow"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  개수형 재고
                </button>

                <button
                  type="button"
                  onClick={() => setStockTypeTab("LENGTH")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    stockTypeTab === "LENGTH"
                      ? "bg-white text-gray-900 shadow"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  길이형 재고
                </button>
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
                    placeholder={
                      stockTypeTab === "COUNT"
                        ? "e.g. Black Winder"
                        : "e.g. 38MM TUBE"
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                {stockTypeTab === "COUNT" ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Default Length (mm)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={defaultLengthMm}
                          onChange={(e) => setDefaultLengthMm(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Stick Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={stickCount}
                          onChange={(e) => setStickCount(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Minimum Length (mm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={minimumLengthMm}
                          onChange={(e) => setMinimumLengthMm(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Cut-off / Stick (mm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={cutoffLengthMm}
                          onChange={(e) => setCutoffLengthMm(e.target.value)}
                          placeholder="e.g. 800"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Total Available Length
                      </label>
                      <div className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                        {totalLengthMm.toLocaleString()} mm
                      </div>
                    </div>
                  </>
                )}

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