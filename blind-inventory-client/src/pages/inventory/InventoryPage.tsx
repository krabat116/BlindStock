import { useEffect, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import InventoryTable from "../../components/InventoryTable"
import AddStockModal from "../../components/AddStockModal"
import AdjustStockModal from "../../components/AdjustStockModal"
import TransactionList from "../../components/TransactionList"
import ManageItemsModal from "../../components/ManageItemsModal"
import type { InventoryItem } from "../../types/inventory"
import type { InventoryTransaction } from "../../types/transaction"
import type { Category } from "../../types/category"
import EditCategoriesModal from "../../components/EditCategoriesModal"
import OrderUploadPanel from "../../components/OrderUploadPanel"
import BatchUploadPanel from "../../components/BatchUploadPanel"
import type { BatchResult } from "../../components/BatchUploadPanel"
import type { OrderPreviewItem, OrderPreviewResponse } from "../../types/orderPreview"
import type { CreateItemPayload } from "../../types/createItemPayload"
import { apiFetch } from "../../lib/api"

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
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"

  const [orderUploadMode, setOrderUploadMode] = useState<"single" | "batch">("single")

  // Single upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [orderYear, setOrderYear] = useState("")
  const [orderMonth, setOrderMonth] = useState("")
  const [orderPreview, setOrderPreview] = useState<OrderPreviewItem[]>([])
  const [parsedRowCount, setParsedRowCount] = useState(0)
  const [orderPreviewLoading, setOrderPreviewLoading] = useState(false)
  const [orderPreviewError, setOrderPreviewError] = useState("")

  // Batch upload state
  const [batchFiles, setBatchFiles] = useState<File[]>([])
  const [batchYear, setBatchYear] = useState("")
  const [batchMonth, setBatchMonth] = useState("")
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [batchResults, setBatchResults] = useState<BatchResult[]>([])

  const [items, setItems] = useState<InventoryItem[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false)
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false)
  const [isManageItemsModalOpen, setIsManageItemsModalOpen] = useState(false)
  const [isEditCategoriesModalOpen, setIsEditCategoriesModalOpen] = useState(false)
  const [orderSheetNo, setOrderSheetNo] = useState<number | null>(null)
  const [orderAccountName, setOrderAccountName] = useState("")
  const [orderTotalItems, setOrderTotalItems] = useState(0)

  // ── Derived stats ──────────────────────────
  const lowStockCount = items.filter((item) => {
    if (item.stockType === "LENGTH") {
      return (item.totalLengthMm ?? 0) <= (item.minimumLengthMm ?? 0)
    }
    if (item.stockType === "AREA") {
      return (item.totalAreaMm2 ?? 0) <= (item.minimumAreaMm2 ?? 0)
    }
    return item.quantity <= item.minimumStock
  }).length

  // ── Fetch helpers ──────────────────────────
  async function fetchItems() {
    const response = await apiFetch("/items")
    if (!response.ok) throw new Error("Failed to fetch inventory items")
    const data: InventoryItem[] = await response.json()
    setItems(data)
  }

  async function fetchTransactions() {
    const response = await apiFetch("/transactions")
    if (!response.ok) throw new Error("Failed to fetch transactions")
    const data: InventoryTransaction[] = await response.json()
    setTransactions(data)
  }

  async function fetchCategories() {
    const response = await apiFetch("/categories")
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

      const response = await apiFetch("/orders/preview", {
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
            ...(item.lengthMm !== null ? { lengthMm: item.lengthMm } : {}),
            ...(item.areaMm2 !== null ? { areaMm2: item.areaMm2 } : {}),
            sourceRows: item.sourceRows,
          })),
      }

      const response = await apiFetch("/orders/confirm-deduction", {
        method: "POST",
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

  async function handleCreateMissingItems() {
    const missingItems = orderPreview
      .filter((item) => !item.matched)
      .map((item) => ({ category: item.category, itemName: item.itemName }))

    if (missingItems.length === 0) return

    try {
      setOrderPreviewLoading(true)
      setOrderPreviewError("")

      const res = await apiFetch("/items/bulk-create-missing", {
        method: "POST",
        body: JSON.stringify({ items: missingItems }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || "Failed to create missing items")
      }

      // Refresh inventory list and re-run preview so status updates to Ready
      await fetchItems()
      await handlePreviewUpload()
    } catch (err) {
      setOrderPreviewError(err instanceof Error ? err.message : "Failed to create missing items")
      setOrderPreviewLoading(false)
    }
  }

  async function handleFillInsufficientStock() {
    const insufficientItems = orderPreview.filter((item) => {
      if (!item.matched || item.itemId === null) return false
      if (item.stockType === "LENGTH") {
        return (item.currentLengthMm ?? 0) < (item.lengthMm ?? 0)
      }
      if (item.stockType === "AREA") {
        return (item.currentAreaMm2 ?? 0) < (item.areaMm2 ?? 0)
      }
      return (item.currentStock ?? 0) < item.quantity
    })

    if (insufficientItems.length === 0) return

    try {
      setOrderPreviewLoading(true)
      setOrderPreviewError("")

      for (const item of insufficientItems) {
        if (item.itemId === null) continue

        if (item.stockType === "LENGTH") {
          const deficit = (item.lengthMm ?? 0) - (item.currentLengthMm ?? 0)
          if (deficit <= 0) continue
          const res = await apiFetch(`/items/${item.itemId}/stock`, {
            method: "PATCH",
            body: JSON.stringify({ totalLengthMm: deficit, note: "Topped up via order preview" }),
          })
          if (!res.ok) throw new Error(`Failed to top up stock for ${item.itemName}`)
        } else if (item.stockType === "AREA") {
          const deficit = (item.areaMm2 ?? 0) - (item.currentAreaMm2 ?? 0)
          if (deficit <= 0) continue
          const res = await apiFetch(`/items/${item.itemId}/stock`, {
            method: "PATCH",
            body: JSON.stringify({ totalAreaMm2: deficit, note: "Topped up via order preview" }),
          })
          if (!res.ok) throw new Error(`Failed to top up stock for ${item.itemName}`)
        } else {
          const deficit = item.quantity - (item.currentStock ?? 0)
          if (deficit <= 0) continue
          const res = await apiFetch(`/items/${item.itemId}/stock`, {
            method: "PATCH",
            body: JSON.stringify({ quantity: deficit, note: "Topped up via order preview" }),
          })
          if (!res.ok) throw new Error(`Failed to top up stock for ${item.itemName}`)
        }
      }

      await fetchItems()
      await handlePreviewUpload()
    } catch (err) {
      setOrderPreviewError(err instanceof Error ? err.message : "Failed to fill insufficient stock")
      setOrderPreviewLoading(false)
    }
  }

  async function handleBatchUpload() {
    if (!batchFiles.length || !batchYear || !batchMonth) return

    setBatchRunning(true)
    setBatchResults([])
    setBatchProgress({ current: 0, total: batchFiles.length })

    const results: BatchResult[] = []

    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i]
      setBatchProgress({ current: i + 1, total: batchFiles.length })

      try {
        // Step 1: Preview
        const formData = new FormData()
        formData.append("file", file)
        formData.append("year", batchYear)
        formData.append("month", batchMonth)

        const previewRes = await apiFetch("/orders/preview", { method: "POST", body: formData })

        if (!previewRes.ok) {
          results.push({ fileName: file.name, status: "error", message: "Failed to parse file" })
          setBatchResults([...results])
          continue
        }

        const previewData: OrderPreviewResponse = await previewRes.json()

        // Step 2: Check for issues
        const missingCount = previewData.preview.filter((item) => !item.matched).length
        const insufficientCount = previewData.preview.filter((item) => {
          if (!item.matched) return false
          if (item.stockType === "LENGTH") {
            return (item.currentLengthMm ?? 0) < (item.lengthMm ?? 0)
          }
          if (item.stockType === "AREA") {
            return (item.currentAreaMm2 ?? 0) < (item.areaMm2 ?? 0)
          }
          return (item.currentStock ?? 0) < item.quantity
        }).length

        if (missingCount > 0 || insufficientCount > 0) {
          const parts: string[] = []
          if (missingCount > 0) parts.push(`${missingCount} missing item${missingCount > 1 ? "s" : ""}`)
          if (insufficientCount > 0) parts.push(`${insufficientCount} insufficient`)
          results.push({ fileName: file.name, status: "skipped", message: parts.join(", ") })
          setBatchResults([...results])
          continue
        }

        // Step 3: Confirm deduction
        const payload = {
          year: Number(batchYear),
          month: Number(batchMonth),
          fileName: file.name,
          accountName: previewData.accountName,
          orderSheetNo: previewData.orderSheetNo,
          totalItems: previewData.totalItems,
          previewItems: previewData.preview
            .filter((item) => item.matched && item.itemId !== null)
            .map((item) => ({
              itemId: item.itemId!,
              itemName: item.itemName,
              category: item.category,
              quantity: item.quantity,
              ...(item.lengthMm !== null ? { lengthMm: item.lengthMm } : {}),
              ...(item.areaMm2 !== null ? { areaMm2: item.areaMm2 } : {}),
              sourceRows: item.sourceRows,
            })),
        }

        const confirmRes = await apiFetch("/orders/confirm-deduction", {
          method: "POST",
          body: JSON.stringify(payload),
        })

        if (!confirmRes.ok) {
          results.push({ fileName: file.name, status: "error", message: "Deduction failed" })
        } else {
          const count = previewData.preview.length
          results.push({
            fileName: file.name,
            status: "success",
            message: `${count} item${count !== 1 ? "s" : ""} deducted`,
          })
        }
      } catch {
        results.push({ fileName: file.name, status: "error", message: "Unexpected error" })
      }

      setBatchResults([...results])
    }

    setBatchRunning(false)
    await fetchAllData()
  }

  function handleClearBatch() {
    setBatchFiles([])
    setBatchYear("")
    setBatchMonth("")
    setBatchResults([])
    setBatchProgress({ current: 0, total: 0 })
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

  function handleOpenAdjustStock(item: InventoryItem) {
    setSelectedItem(item)
    setIsAdjustStockModalOpen(true)
  }

  function handleCloseAdjustStockModal() {
    setIsAdjustStockModalOpen(false)
    setSelectedItem(null)
  }

  async function handleAdjustStock(
    itemId: number,
    type: "out" | "adjustment",
    value: number,
    note: string
  ) {
    const item = items.find((i) => i.id === itemId)
    const body =
      item?.stockType === "LENGTH"
        ? { type, totalLengthMm: value, note }
        : item?.stockType === "AREA"
          ? { type, totalAreaMm2: value, note }
          : { type, quantity: value, note }

    const response = await apiFetch(`/items/${itemId}/adjust`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || "Failed to adjust stock")
    }
    await fetchAllData()
  }

  async function handleSaveStock(itemId: number, value: number, note: string) {
    const item = items.find((i) => i.id === itemId)
    const body =
      item?.stockType === "LENGTH"
        ? { totalLengthMm: value, note }
        : item?.stockType === "AREA"
          ? { totalAreaMm2: value, note }
          : { quantity: value, note }

    const response = await apiFetch(`/items/${itemId}/stock`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error("Failed to update stock")
    await fetchAllData()
  }

  async function handleUpdateItemSettings(
    itemId: number,
    payload: {
      stockType: "COUNT" | "LENGTH" | "AREA"
      minimumStock?: number
      unit?: string
      defaultLengthMm?: number
      totalLengthMm?: number
      minimumLengthMm?: number
      cutoffLengthMm?: number
      totalAreaMm2?: number
      minimumAreaMm2?: number
    }
  ) {
    const response = await apiFetch(`/items/${itemId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || "Failed to update item settings")
    }
    await fetchAllData()
  }

  async function handleCreateItem(payload: CreateItemPayload) {
    const response = await apiFetch("/items", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || "Failed to create item")
    }
    await fetchAllData()
  }

  async function handleCreateCategory(name: string) {
    const response = await apiFetch("/categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
    if (!response.ok) throw new Error("Failed to create category")
    await fetchAllData()
  }

  async function handleUpdateItemName(itemId: number, name: string) {
    const response = await apiFetch(`/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    })
    if (!response.ok) throw new Error("Failed to update item")
    await fetchAllData()
  }

  async function handleDeleteItem(itemId: number) {
    const response = await apiFetch(`/items/${itemId}`, { method: "DELETE" })
    if (!response.ok) throw new Error("Failed to delete item")
    await fetchAllData()
  }

  async function handleDeleteCategory(categoryId: number) {
    const response = await apiFetch(`/categories/${categoryId}`, { method: "DELETE" })
    if (!response.ok) throw new Error("Failed to delete category")
    await fetchAllData()
  }

  // ── Render ─────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-5">

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
                  {isAdmin && (
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
                  )}
                </>
              }
            >
              <InventoryTable
                items={items}
                onOpenAddStock={handleOpenAddStock}
                onOpenAdjustStock={handleOpenAdjustStock}
                onOpenManageItems={() => setIsManageItemsModalOpen(true)}
              />
            </Section>

            {/* ── Transaction history ── */}
            <Section title="Transaction history">
              <TransactionList transactions={transactions} />
            </Section>

            {/* ── Order upload ── */}
            <Section
              title="Order upload"
              actions={
                <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
                  <button
                    onClick={() => setOrderUploadMode("single")}
                    className={`px-3 py-1 transition-colors ${
                      orderUploadMode === "single"
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Single
                  </button>
                  <button
                    onClick={() => setOrderUploadMode("batch")}
                    className={`px-3 py-1 transition-colors border-l border-gray-200 ${
                      orderUploadMode === "batch"
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Batch
                  </button>
                </div>
              }
            >
              <div className="p-5">
                {orderUploadMode === "single" ? (
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
                    onCreateMissingItems={handleCreateMissingItems}
                    onFillInsufficientStock={handleFillInsufficientStock}
                  />
                ) : (
                  <BatchUploadPanel
                    files={batchFiles}
                    year={batchYear}
                    month={batchMonth}
                    running={batchRunning}
                    progress={batchProgress}
                    results={batchResults}
                    onFilesChange={setBatchFiles}
                    onYearChange={setBatchYear}
                    onMonthChange={setBatchMonth}
                    onStartBatch={handleBatchUpload}
                    onClear={handleClearBatch}
                  />
                )}
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
        onGoToSettings={() => {
          setIsAddStockModalOpen(false)
          setIsManageItemsModalOpen(true)
        }}
      />

      <AdjustStockModal
        isOpen={isAdjustStockModalOpen}
        item={selectedItem}
        onClose={handleCloseAdjustStockModal}
        onSave={handleAdjustStock}
      />

      <ManageItemsModal
        isOpen={isManageItemsModalOpen}
        items={items}
        categories={categories}
        onClose={() => {
          setIsManageItemsModalOpen(false)
          setSelectedItem(null)
        }}
        initialSettingsItemId={selectedItem?.id ?? null}
        onCreateItem={handleCreateItem}
        onCreateCategory={handleCreateCategory}
        onUpdateItemName={handleUpdateItemName}
        onUpdateItemSettings={handleUpdateItemSettings}
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
