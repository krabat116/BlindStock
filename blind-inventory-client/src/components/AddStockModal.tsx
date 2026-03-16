import { useEffect, useState } from "react"
import type { InventoryItem } from "../types/inventory"

type AddStockModalProps = {
  isOpen: boolean
  item: InventoryItem | null
  onClose: () => void
  onSave: (itemId: number, quantity: number) => Promise<void>
}

export default function AddStockModal({
  isOpen,
  item,
  onClose,
  onSave,
}: AddStockModalProps) {
  const [quantity, setQuantity] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (item) {
      setQuantity(String(item.quantity))
      setError("")
    }
  }, [item])

  if (!isOpen || !item) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const parsedQuantity = Number(quantity)

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setError("Please enter a valid non-negative number.")
      return
    }

    try {
      setSubmitting(true)
      setError("")
      await onSave(item.id, parsedQuantity)
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
          <h3 className="text-lg font-semibold text-gray-900">Update Stock</h3>
          <p className="mt-1 text-sm text-gray-500">
            Edit the stock quantity using the same inventory fields.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-4 py-2 font-medium">Item Name</th>
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium">Current Stock</th>
                    <th className="px-4 py-2 font-medium">Minimum Stock</th>
                    <th className="px-4 py-2 font-medium">Unit</th>
                  </tr>
                </thead>

                <tbody>
                  <tr className="bg-gray-50 text-sm text-gray-700">
                    <td className="rounded-l-xl px-4 py-3 font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-3">{item.category}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none ring-0 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">{item.minimumStock}</td>
                    <td className="rounded-r-xl px-4 py-3">{item.unit}</td>
                  </tr>
                </tbody>
              </table>
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