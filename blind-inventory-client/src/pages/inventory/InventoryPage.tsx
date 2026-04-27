import { useEffect, useState } from "react"
import InventoryTable from "../../components/InventoryTable"
import AddStockModal from "../../components/AddStockModal"
import TransactionList from "../../components/TransactionList"
import ManageItemsModal from "../../components/ManageItemsModal"
import type { InventoryItem } from "../../types/inventory"
import type { InventoryTransaction } from "../../types/transaction"
import type { Category } from "../../types/category"
import EditCategoriesModal from "../../components/EditCategoriesModal"
import OrderUploadPanel from "../../components/OrderUploadPanel"
import type { OrderPreviewItem, OrderPreviewResponse } from "../../types/orderPreview"
import type { CreateItemPayload } from "../../types/createItemPayload"

// ─────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────
function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string
  value: string | number
  variant?: "default" | "danger"
}) {
  return (
    <div className="rounded-lg bg-gray-100 px-4 py-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className={`text-2xl font-medium ${variant === "danger" ? "text-red-600" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────
function Section({
  title,
  actions,
  children,
}: {
  title: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-medium text-gray-800">{title}</h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function InventoryPage() {

  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [orderYear, setOrderYear] = useState("")
  const [orderMonth, setOrderMonth] = useState("")
  const [orderPreview, setOrderPreview] = useState<OrderPreviewItem[]>([])
  const [parsedRowCount, setParsedRowCount] = useState(0)
  const [orderPreviewLoading, setOrderPreviewLoading] = useState(false)
  const [orderPreviewError, setOrderPreviewError] = useState("")

  const [items, setItems] = useState<InventoryItem[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false)
  const [isManageItemsModalOpen, setIsManageItemsModalOpen] = useState(false)
  const [isEditCategoriesModalOpen, setIsEditCategoriesModalOpen] = useState(false)
  const [orderSheetNo, setOrderSheetNo] = useState<number | null>(null)
  const [orderAccountName, setOrderAccountName] = useState("")
  const [orderTotalItems, setOrderTotalItems] = useState(0)

  // ── Derived stats ──────────────────────────
  const lowStockCount = items.filter(
    (item) => item.quantity <= item.minimumStock
  ).length

  // ── Fetch helpers ──────────────────────────
  async function fetchItems() {
    const response = await fetch("http://localhost:3001/items")
    if (!response.ok) throw new Error("Failed to fetch inventory items")
    const data: InventoryItem[] = await response.json()
    setItems(data)
  }

  async function fetchTransactions() {
    const response = await fetch("http://localhost:3001/transactions")
    if (!response.ok) throw new Error("Failed to fetch transactions")
    const data: InventoryTransaction[] = await response.json()
    setTransactions(data)
  }

  async function fetchCategories() {
    const response = await fetch("http://localhost:3001/categories")
    if (!response.ok) throw new Error("Failed to fetch categories")
    const data: Category[] = await response.json()
    setCategories(data)
  }

  async function fetchAllData() {
    try {
      setLoading(true)
      setError("")
      await Promise.all([fetchItems(), fetchTransactions(), fetchCategories()])
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

  // ── Order upload handlers ──────────────────
  async function handlePreviewUpload() {
    if (!orderYear) { setOrderPreviewError("Please select a year."); return }
    if (!orderMonth) { setOrderPreviewError("Please select a month."); return }
    if (!uploadedFile) { setOrderPreviewError("Please choose an Excel file."); return }

    try {
      setOrderPreviewLoading(true)
      setOrderPreviewError("")

      const formData = new FormData()
      formData.append("file", uploadedFile)
      formData.append("year", orderYear)
      formData.append("month", orderMonth)

      const response = await fetch("http://localhost:3001/orders/preview", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to preview uploaded order")

      const data: OrderPreviewResponse = await response.json()
      console.log("📦 Preview API response:", data)

      setOrderPreview(data.preview)
      setParsedRowCount(data.parsedRowCount)
      setOrderSheetNo(data.orderSheetNo)
      setOrderAccountName(data.accountName)
      setOrderTotalItems(data.totalItems)
    } catch (err) {
      console.error(err)
      setOrderPreviewError("Failed to parse and preview this order file.")
    } finally {
      setOrderPreviewLoading(false)
    }
  }

  async function handleConfirmDeduction() {
    try {
      setOrderPreviewLoading(true)
      setOrderPreviewError("")

      const payload = {
        year: Number(orderYear),
        month: Number(orderMonth),
        fileName: uploadedFile?.name ?? "",
        accountName: orderAccountName,
        orderSheetNo,
        totalItems: orderTotalItems,
        previewItems: orderPreview
          .filter((item) => item.matched && item.itemId !== null)
          .map((item) => ({
            itemId: item.itemId!,
            itemName: item.itemName,
            category: item.category,
            quantity: item.quantity,
            sourceRows: item.sourceRows,
          })),
      }

      const response = await fetch("http://localhost:3001/orders/confirm-deduction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || "Failed to confirm deduction")
      }

      await fetchAllData()
      handleClearPreview()
      alert("Stock deduction completed successfully.")
    } catch (err) {
      console.error(err)
      setOrderPreviewError(
        err instanceof Error ? err.message : "Failed to confirm deduction"
      )
    } finally {
      setOrderPreviewLoading(false)
    }
  }

  function handleClearPreview() {
    setUploadedFile(null)
    setOrderYear("")
    setOrderMonth("")
    setOrderPreview([])
    setParsedRowCount(0)
    setOrderPreviewError("")
    setOrderSheetNo(null)
    setOrderAccountName("")
    setOrderTotalItems(0)
  }

  // ── Item / category handlers ───────────────
  function handleOpenAddStock(item: InventoryItem) {
    setSelectedItem(item)
    setIsAddStockModalOpen(true)
  }

  function handleCloseAddStockModal() {
    setIsAddStockModalOpen(false)
    setSelectedItem(null)
  }

  async function handleSaveStock(itemId: number, quantity: number, note: string) {
    const response = await fetch(`http://localhost:3001/items/${itemId}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity, note }),
    })
    if (!response.ok) throw new Error("Failed to update stock")
    await fetchAllData()
  }

  async function handleCreateItem(payload: CreateItemPayload) {
    const response = await fetch("http://localhost:3001/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || "Failed to create item")
    }
    await fetchAllData()
  }

  async function handleCreateCategory(name: string) {
    const response = await fetch("http://localhost:3001/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!response.ok) throw new Error("Failed to create category")
    await fetchAllData()
  }

  async function handleUpdateItemName(itemId: number, name: string) {
    const response = await fetch(`http://localhost:3001/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!response.ok) throw new Error("Failed to update item")
    await fetchAllData()
  }

  async function handleDeleteItem(itemId: number) {
    const response = await fetch(`http://localhost:3001/items/${itemId}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to delete item")
    await fetchAllData()
  }

  async function handleDeleteCategory(categoryId: number) {
    const response = await fetch(`http://localhost:3001/categories/${categoryId}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to delete category")
    await fetchAllData()
  }

  // ── Render ─────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-medium text-gray-900">
            Inventory Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track stock levels, process order uploads, and manage components.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-gray-500">Loading inventory...</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && (
          <>
            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total items" value={items.length} />
              <StatCard
                label="Low stock"
                value={lowStockCount}
                variant={lowStockCount > 0 ? "danger" : "default"}
              />
              <StatCard label="Categories" value={categories.length} />
              <StatCard label="Transactions" value={transactions.length} />
            </div>

            {/* ── Stock inventory ── */}
            <Section
              title="Stock inventory"
              actions={
                <>
                  <button
                    onClick={() => setIsManageItemsModalOpen(true)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    Manage items
                  </button>
                  <button
                    onClick={() => setIsEditCategoriesModalOpen(true)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    Edit categories
                  </button>
                </>
              }
            >
              <InventoryTable
                items={items}
                onOpenAddStock={handleOpenAddStock}
                onOpenManageItems={() => setIsManageItemsModalOpen(true)}
              />
            </Section>

            {/* ── Transaction history ── */}
            <Section title="Transaction history">
              <TransactionList transactions={transactions} />
            </Section>

            {/* ── Order upload ── */}
            <Section title="Order upload">
              <div className="p-5">
                <OrderUploadPanel
                  file={uploadedFile}
                  year={orderYear}
                  month={orderMonth}
                  preview={orderPreview}
                  parsedRowCount={parsedRowCount}
                  loading={orderPreviewLoading}
                  error={orderPreviewError}
                  onFileChange={setUploadedFile}
                  onYearChange={setOrderYear}
                  onMonthChange={setOrderMonth}
                  onPreviewUpload={handlePreviewUpload}
                  onConfirmDeduction={handleConfirmDeduction}
                  onClearPreview={handleClearPreview}
                />
              </div>
            </Section>
          </>
        )}
      </div>

      {/* ── Modals (outside max-w wrapper intentionally) ── */}
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
        onClose={() => setIsManageItemsModalOpen(false)}
        onCreateItem={handleCreateItem}
        onCreateCategory={handleCreateCategory}
        onUpdateItemName={handleUpdateItemName}
        onDeleteItem={handleDeleteItem}
        onOpenEditCategories={() => setIsEditCategoriesModalOpen(true)}
      />

      <EditCategoriesModal
        isOpen={isEditCategoriesModalOpen}
        categories={categories}
        onClose={() => setIsEditCategoriesModalOpen(false)}
        onDeleteCategory={handleDeleteCategory}
      />
    </main>
  )
}
