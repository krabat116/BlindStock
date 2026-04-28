import { useEffect, useMemo, useState } from "react"
import type { InventoryItem } from "../types/inventory"

type AddStockModalProps = {
  isOpen: boolean
  item: InventoryItem | null
  onClose: () => void
  onSave: (itemId: number, value: number, note: string) => Promise<void>
}

export default function AddStockModal({
  isOpen,
  item,
  onClose,
  onSave,
}: AddStockModalProps) {
  // COUNT 타입용
  const [quantity, setQuantity] = useState("")
  // LENGTH 타입용
  const [stickCount, setStickCount] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const isLength = item?.stockType === "LENGTH"

  // LENGTH 타입: 추가할 총 길이 = 막대 수 × (기본 길이 - cut-off)
  const effectiveLengthPerStick = useMemo(() => {
    if (!item?.defaultLengthMm) return 0
    const cutoff = item.cutoffLengthMm ?? 800
    return Math.max(0, item.defaultLengthMm - cutoff)
  }, [item?.defaultLengthMm, item?.cutoffLengthMm])

  const totalLengthMm = useMemo(() => {
    if (!isLength || !item?.defaultLengthMm) return 0
    const count = Number(stickCount)
    if (!Number.isFinite(count) || count < 0) return 0
    return Math.round(count * effectiveLengthPerStick)
  }, [isLength, stickCount, effectiveLengthPerStick, item?.defaultLengthMm])

  useEffect(() => {
    if (item) {
      setStickCount("")
      setQuantity("")
      setNote("")
      setError("")
    }
  }, [item])

  if (!isOpen || !item) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    try {
      setSubmitting(true)
      setError("")

      if (isLength) {
        if (!item.defaultLengthMm) {
          setError("Default length per stick is not configured. Set it in item settings first.")
          return
        }
        if (totalLengthMm < 0) {
          setError("Total length must be non-negative.")
          return
        }
        await onSave(item!.id, totalLengthMm, note)
      } else {
        const parsedQuantity = Number(quantity)
        if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
          setError("Please enter a valid non-negative number.")
          return
        }
        await onSave(item!.id, parsedQuantity, note)
      }

      onClose()
    } catch (err) {
      console.error(err)
      setError("Failed to update stock.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Stock</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isLength
              ? "Enter the number of sticks to add. The value will be added to the current inventory."
              : "Enter the quantity to add. The value will be added to the current inventory."}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            {isLength ? (
              /* ── LENGTH 타입 UI ── */
              <div className="space-y-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Item</p>
                      <p className="mt-1 font-medium text-gray-900">{item.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current Total</p>
                      <p className="mt-1 text-gray-700">
                        {item.totalLengthMm != null
                          ? `${item.totalLengthMm.toLocaleString()} mm`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Length / Stick</p>
                      <p className="mt-1 text-gray-700">
                        {item.defaultLengthMm != null
                          ? `${item.defaultLengthMm.toLocaleString()} mm`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Cut-off / Stick</p>
                      <p className="mt-1 text-gray-700">
                        {(item.cutoffLengthMm ?? 800).toLocaleString()} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Effective / Stick</p>
                      <p className="mt-1 text-gray-700">
                        {effectiveLengthPerStick.toLocaleString()} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Min Stock Threshold</p>
                      <p className="mt-1 text-gray-700">
                        {item.minimumLengthMm != null
                          ? `${item.minimumLengthMm.toLocaleString()} mm`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {!item.defaultLengthMm && (
                  <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                    Default length per stick is not set. Go to Manage items → Settings to configure it first.
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Sticks to Add
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={stickCount}
                      onChange={(e) => setStickCount(e.target.value)}
                      placeholder="e.g. 10"
                      disabled={!item.defaultLengthMm}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Adding
                    </label>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900">
                      + {totalLengthMm.toLocaleString()} mm
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      New Total
                    </label>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900">
                      {((item.totalLengthMm ?? 0) + totalLengthMm).toLocaleString()} mm
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── COUNT 타입 UI ── */
              <div className="space-y-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Item</p>
                      <p className="mt-1 font-medium text-gray-900">{item.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Category</p>
                      <p className="mt-1 text-gray-700">{item.category}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current Stock</p>
                      <p className="mt-1 text-gray-700">{item.quantity} {item.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Min Stock</p>
                      <p className="mt-1 text-gray-700">{item.minimumStock} {item.unit}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Quantity to Add
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Adding
                    </label>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900">
                      + {Number(quantity) || 0} {item.unit}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      New Total
                    </label>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900">
                      {(item.quantity + (Number(quantity) || 0))} {item.unit}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. manual stock added"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            )}
          </div>

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
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
