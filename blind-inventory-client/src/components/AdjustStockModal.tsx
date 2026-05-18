import { useEffect, useState } from "react"
import type { InventoryItem } from "../types/inventory"

type AdjustType = "out" | "adjustment"

type AdjustStockModalProps = {
  isOpen: boolean
  item: InventoryItem | null
  onClose: () => void
  onSave: (
    itemId: number,
    type: AdjustType,
    value: number,
    note: string
  ) => Promise<void>
}

export default function AdjustStockModal({
  isOpen,
  item,
  onClose,
  onSave,
}: AdjustStockModalProps) {
  const [adjustType, setAdjustType] = useState<AdjustType>("out")
  const [value, setValue] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const isLength = item?.stockType === "LENGTH"
  const isArea = item?.stockType === "AREA"

  useEffect(() => {
    if (isOpen && item) {
      setAdjustType("out")
      setValue("")
      setNote("")
      setError("")
    }
  }, [isOpen, item])

  if (!isOpen || !item) return null

  // parsedValue: user-entered value in display units (m² for AREA, mm for LENGTH, count for COUNT)
  const parsedValue = Number(value)
  const isValidValue = Number.isFinite(parsedValue) && parsedValue >= 0

  // Internal units: mm² for AREA, mm for LENGTH, count for COUNT
  const parsedValueInternal = isArea ? Math.round(parsedValue * 1_000_000) : parsedValue

  const currentStock = isArea
    ? (item.totalAreaMm2 ?? 0)
    : isLength
      ? (item.totalLengthMm ?? 0)
      : (item.quantity ?? 0)

  const previewNew = isValidValue
    ? adjustType === "out"
      ? currentStock - parsedValueInternal
      : parsedValueInternal
    : null

  const isOverDeduct =
    adjustType === "out" && isValidValue && parsedValueInternal > currentStock

  function formatStock(val: number) {
    if (isArea) return `${(val / 1_000_000).toFixed(2)} m²`
    return isLength ? `${val.toLocaleString()} mm` : `${val} ${item!.unit ?? ""}`
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!isValidValue) {
      setError("Please enter a valid non-negative number.")
      return
    }

    if (!note.trim()) {
      setError("Note is required.")
      return
    }

    if (isOverDeduct) {
      setError("Deduction amount exceeds current stock.")
      return
    }

    try {
      setSubmitting(true)
      setError("")
      await onSave(item!.id, adjustType, parsedValueInternal, note)
      onClose()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Failed to adjust stock.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">

        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Adjust Stock</h3>
          <p className="mt-1 text-sm text-gray-500">{item.name}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">

            {/* Current stock info */}
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Category</p>
                  <p className="mt-1 text-gray-700">{item.category}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Current Stock</p>
                  <p className="mt-1 font-medium text-gray-900">{formatStock(currentStock)}</p>
                </div>
                {isLength && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Min Threshold</p>
                    <p className="mt-1 text-gray-700">
                      {item.minimumLengthMm != null ? `${item.minimumLengthMm.toLocaleString()} mm` : "—"}
                    </p>
                  </div>
                )}
                {isArea && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Min Threshold</p>
                    <p className="mt-1 text-gray-700">
                      {item.minimumAreaMm2 != null ? `${(item.minimumAreaMm2 / 1_000_000).toFixed(2)} m²` : "—"}
                    </p>
                  </div>
                )}
                {!isLength && !isArea && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Min Stock</p>
                    <p className="mt-1 text-gray-700">{item.minimumStock} {item.unit}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Adjustment type toggle */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Operation</p>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => { setAdjustType("out"); setError("") }}
                  className={`flex-1 px-4 py-2 transition-colors ${
                    adjustType === "out"
                      ? "bg-red-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Deduct
                </button>
                <button
                  type="button"
                  onClick={() => { setAdjustType("adjustment"); setError("") }}
                  className={`flex-1 px-4 py-2 border-l border-gray-200 transition-colors ${
                    adjustType === "adjustment"
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Correction
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                {adjustType === "out"
                  ? "Remove stock — e.g. damaged goods, samples, loss"
                  : "Set stock to exact value — e.g. after physical count"}
              </p>
            </div>

            {/* Amount input + preview */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {adjustType === "out"
                    ? isLength ? "Deduct (mm)" : isArea ? "Deduct (m²)" : "Deduct"
                    : isLength ? "Set total to (mm)" : isArea ? "Set total to (m²)" : "Set stock to"}
                </label>
                <input
                  type="number"
                  min="0"
                  step={isArea ? "0.01" : "1"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={isLength ? "e.g. 3000" : isArea ? "e.g. 50.00" : "e.g. 20"}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  New Stock
                </label>
                <div
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    previewNew === null
                      ? "border-gray-200 bg-gray-50 text-gray-400"
                      : isOverDeduct
                      ? "border-red-200 bg-red-50 text-red-700"
                      : previewNew < (isArea
                          ? (item.minimumAreaMm2 ?? 0)
                          : isLength
                            ? (item.minimumLengthMm ?? 0)
                            : (item.minimumStock ?? 0))
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-blue-100 bg-blue-50 text-blue-900"
                  }`}
                >
                  {previewNew === null ? "—" : formatStock(previewNew)}
                </div>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Note <span className="text-red-500">*</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  adjustType === "out"
                    ? "e.g. Damaged goods removed"
                    : "e.g. Physical count correction"
                }
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isOverDeduct}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
