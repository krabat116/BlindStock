import type { OrderPreviewItem } from "../types/orderPreview"

type OrderUploadPanelProps = {
  file: File | null
  year: string
  month: string
  preview: OrderPreviewItem[]
  parsedRowCount: number
  loading: boolean
  error: string
  onFileChange: (file: File | null) => void
  onYearChange: (value: string) => void
  onMonthChange: (value: string) => void
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

const yearOptions = ["2020","2021","2022","2023", "2024", "2025", "2026", "2027"]

const monthOptions = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

export default function OrderUploadPanel({
  file,
  year,
  month,
  preview,
  parsedRowCount,
  loading,
  error,
  onFileChange,
  onYearChange,
  onMonthChange,
  onPreviewUpload,
  onConfirmDeduction,
  onClearPreview,
}: OrderUploadPanelProps) {
  const hasMissingItems = preview.some((item) => !item.matched)
  const hasInsufficientStock = preview.some(
    (item) => item.matched && item.currentStock !== null && item.currentStock < item.quantity
  )

  const canPreview = Boolean(file && year && month) && !loading

  const canConfirm =
    preview.length > 0 && !hasMissingItems && !hasInsufficientStock && !loading

  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Order Upload</h2>
        <p className="text-sm text-gray-500">
          Select the order year and month, then upload an Excel file to preview
          the mapped components.
        </p>
      </div>

      {/* Vertical form layout */}
      <div className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="order-year"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Year
          </label>
          <select
            id="order-year"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select year</option>
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="order-month"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Month
          </label>
          <select
            id="order-month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select month</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="order-file"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Excel File
          </label>
          <input
            id="order-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-700"
          />
        </div>

        <div>
          <button
            onClick={onPreviewUpload}
            disabled={!canPreview}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Parsing..." : "Preview Upload"}
          </button>
        </div>
      </div>

      {file && (
        <p className="mt-3 text-sm text-gray-600">
          Selected file: <span className="font-medium">{file.name}</span>
        </p>
      )}

      {(year || month) && (
        <p className="mt-2 text-sm text-gray-600">
          Order period:{" "}
          <span className="font-medium">
            {monthOptions.find((option) => option.value === month)?.label || "-"}{" "}
            {year || "-"}
          </span>
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