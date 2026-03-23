import type { OrderPreviewItem } from "../types/orderPreview"

type OrderUploadPanelProps = {
  file: File | null
  preview: OrderPreviewItem[]
  parsedRowCount: number
  loading: boolean
  error: string
  onFileChange: (file: File | null) => void
  onPreviewUpload: () => Promise<void>
  onConfirmDeduction: () => Promise<void>
  onClearPreview: () => void
}

function getPreviewStatus(item: OrderPreviewItem) {
  if (!item.matched) return "missing"

  if (item.currentStock === null) return "missing"

  if (item.currentStock < item.quantity) return "insufficient"

  return "ok"
}

export default function OrderUploadPanel({
  file,
  preview,
  parsedRowCount,
  loading,
  error,
  onFileChange,
  onPreviewUpload,
  onConfirmDeduction,
  onClearPreview,
}: OrderUploadPanelProps) {
  const hasMissingItems = preview.some((item) => !item.matched)
  const hasInsufficientStock = preview.some(
    (item) => item.matched && item.currentStock !== null && item.currentStock < item.quantity
  )

  const canConfirm =
    preview.length > 0 && !hasMissingItems && !hasInsufficientStock && !loading

  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Order Upload</h2>
        <p className="text-sm text-gray-500">
          Upload a recent order sheet and preview the default component mapping.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-700"
        />

        <button
          onClick={onPreviewUpload}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Parsing..." : "Preview Upload"}
        </button>
      </div>

      {file && (
        <p className="mt-3 text-sm text-gray-600">
          Selected file: <span className="font-medium">{file.name}</span>
        </p>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {preview.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-gray-600">
            Parsed rows: <span className="font-medium">{parsedRowCount}</span>
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="px-4 py-2 font-medium">Required Qty</th>
                  <th className="px-4 py-2 font-medium">Current Stock</th>
                  <th className="px-4 py-2 font-medium">Remaining</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {preview.map((item, index) => {
                  const status = getPreviewStatus(item)
                  const remaining =
                    item.currentStock !== null ? item.currentStock - item.quantity : null

                  return (
                    <tr
                      key={`${item.category}-${item.itemName}-${index}`}
                      className="bg-gray-50 text-sm text-gray-700"
                    >
                      <td className="rounded-l-xl px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.itemName}
                      </td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">{item.currentStock ?? "-"}</td>
                      <td className="px-4 py-3">{remaining ?? "-"}</td>
                      <td className="rounded-r-xl px-4 py-3">
                        {status === "ok" && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Ready
                          </span>
                        )}

                        {status === "missing" && (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            Missing Item
                          </span>
                        )}

                        {status === "insufficient" && (
                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                            Insufficient Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {(hasMissingItems || hasInsufficientStock) && (
            <p className="mt-4 text-sm text-red-600">
              Resolve missing items or insufficient stock before confirming deduction.
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              onClick={onClearPreview}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear Preview
            </button>

            <button
              onClick={onConfirmDeduction}
              disabled={!canConfirm}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Confirm Deduction
            </button>
          </div>
        </div>
      )}
    </section>
  )
}