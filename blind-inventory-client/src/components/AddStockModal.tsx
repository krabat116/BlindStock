import { useEffect, useMemo, useState } from "react"
import type { InventoryItem } from "../types/inventory"

type AddStockModalProps = {
  isOpen: boolean
  item: InventoryItem | null
  onClose: () => void
  onSave: (itemId: number, value: number, note: string) => Promise<void>
  onGoToSettings?: () => void
}

export default function AddStockModal({
  isOpen,
  item,
  onClose,
  onSave,
  onGoToSettings,
}: AddStockModalProps) {
  // COUNT 타입용
  const [quantity, setQuantity] = useState("")
  // LENGTH 타입용
  const [stickCount, setStickCount] = useState("")
  // AREA 타입 — roll width 설정 시 사용
  const [rollLengthM, setRollLengthM] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const isLength = item?.stockType === "LENGTH"
  const isArea = item?.stockType === "AREA"

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

  // AREA 타입: rollWidthMm 설정 시 m 입력 → mm²; 미설정 시 m² 입력 → mm²
  const addedAreaMm2 = useMemo(() => {
    if (!isArea) return 0
    if (item?.rollWidthMm) {
      const lengthM = Number(rollLengthM)
      if (!Number.isFinite(lengthM) || lengthM < 0) return 0
      return Math.round(item.rollWidthMm * lengthM * 1000)
    }
    const m2 = Number(quantity)
    if (!Number.isFinite(m2) || m2 < 0) return 0
    return Math.round(m2 * 1_000_000)
  }, [isArea, item?.rollWidthMm, rollLengthM, quantity])

  useEffect(() => {
    if (item) {
      setStickCount("")
      setQuantity("")
      setRollLengthM("")
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
      } else if (isArea) {
        if (item!.rollWidthMm) {
          const lengthM = Number(rollLengthM)
          if (!Number.isFinite(lengthM) || lengthM < 0) {
            setError("Please enter a valid non-negative number.")
            return
          }
        } else {
          const m2 = Number(quantity)
          if (!Number.isFinite(m2) || m2 < 0) {
            setError("Please enter a valid non-negative number.")
            return
          }
        }
        await onSave(item!.id, addedAreaMm2, note)
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
              : isArea
                ? item.rollWidthMm
                  ? "Enter the roll length to add (m). Area will be computed automatically."
                  : "Enter the area to add (m²). The value will be added to the current inventory."
                : "Enter the quantity to add. The value will be added to the current inventory."}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            {isArea ? (
              /* ── AREA 타입 UI ── */
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
                        {item.totalAreaMm2 != null
                          ? item.rollWidthMm
                            ? item.defaultRollLengthMm
                              ? `${(item.totalAreaMm2 / item.rollWidthMm / 1000).toFixed(1)} m · ${(item.totalAreaMm2 / (item.rollWidthMm * item.defaultRollLengthMm)).toFixed(1)} rolls`
                              : `${(item.totalAreaMm2 / item.rollWidthMm / 1000).toFixed(1)} m`
                            : `${(item.totalAreaMm2 / 1_000_000).toFixed(2)} m²`
                          : "—"}
                      </p>
                    </div>
                    {item.rollWidthMm != null && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Roll Width</p>
                        <p className="mt-1 text-gray-700">
                          {(item.rollWidthMm / 1000).toFixed(2)} m ({item.rollWidthMm.toLocaleString()} mm)
                        </p>
                      </div>
                    )}
                    {item.rollWidthMm != null && item.defaultRollLengthMm != null && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Default Roll Length</p>
                        <p className="mt-1 text-gray-700">
                          {(item.defaultRollLengthMm / 1000).toFixed(1)} m
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Min Stock Threshold</p>
                      <p className="mt-1 text-gray-700">
                        {item.minimumAreaMm2 != null
                          ? `${(item.minimumAreaMm2 / 1_000_000).toFixed(2)} m²`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {item.rollWidthMm == null && (
                  <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                    Roll width not configured — go to{" "}
                    {onGoToSettings ? (
                      <button
                        type="button"
                        onClick={onGoToSettings}
                        className="underline font-medium hover:text-amber-900"
                      >
                        Settings
                      </button>
                    ) : (
                      "Manage items → Settings"
                    )}{" "}
                    to enable roll-length input.
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {item.rollWidthMm != null ? "Roll Length to Add (m)" : "Area to Add (m²)"}
                    </label>
                    {item.rollWidthMm != null ? (
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={rollLengthM}
                        onChange={(e) => setRollLengthM(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                      />
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Adding
                    </label>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900">
                      {item.rollWidthMm != null
                        ? item.defaultRollLengthMm
                          ? `+ ${Number(rollLengthM) || 0} m (${(addedAreaMm2 / (item.rollWidthMm * item.defaultRollLengthMm)).toFixed(1)} rolls)`
                          : `+ ${Number(rollLengthM) || 0} m (${(addedAreaMm2 / 1_000_000).toFixed(2)} m²)`
                        : `+ ${(addedAreaMm2 / 1_000_000).toFixed(2)} m²`}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      New Total
                    </label>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900">
                      {item.rollWidthMm != null
                        ? item.defaultRollLengthMm
                          ? `${(((item.totalAreaMm2 ?? 0) + addedAreaMm2) / item.rollWidthMm / 1000).toFixed(1)} m · ${(((item.totalAreaMm2 ?? 0) + addedAreaMm2) / (item.rollWidthMm * item.defaultRollLengthMm)).toFixed(1)} rolls`
                          : `${(((item.totalAreaMm2 ?? 0) + addedAreaMm2) / item.rollWidthMm / 1000).toFixed(1)} m`
                        : `${(((item.totalAreaMm2 ?? 0) + addedAreaMm2) / 1_000_000).toFixed(2)} m²`}
                    </div>
                  </div>
                </div>
              </div>
            ) : isLength ? (
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
                    Default length per stick is not set.{" "}
                    {onGoToSettings ? (
                      <button
                        type="button"
                        onClick={onGoToSettings}
                        className="underline font-medium hover:text-amber-900"
                      >
                        Go to Settings
                      </button>
                    ) : (
                      "Go to Manage items → Settings to configure it first."
                    )}
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
