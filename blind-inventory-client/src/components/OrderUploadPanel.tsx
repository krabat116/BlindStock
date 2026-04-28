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

  if (item.stockType === "LENGTH") {
    if (item.currentLengthMm === null || item.lengthMm === null) return "missing"
    if (item.currentLengthMm < item.lengthMm) return "insufficient"
    return "ok"
  }

  if (item.currentStock === null) return "missing"
  if (item.currentStock < item.quantity) return "insufficient"
  return "ok"
}

function formatMm(mm: number) {
  return `${mm.toLocaleString()} mm`
}

const yearOptions = ["2020", "2021", "2022", "2023", "2024", "2025", "2026", "2027"]

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
  const hasInsufficientStock = preview.some((item) => {
    if (!item.matched) return false
    if (item.stockType === "LENGTH") {
      return (
        item.currentLengthMm !== null &&
        item.lengthMm !== null &&
        item.currentLengthMm < item.lengthMm
      )
    }
    return item.currentStock !== null && item.currentStock < item.quantity
  })

  const canPreview = Boolean(file && year && month) && !loading
  const canConfirm =
    preview.length > 0 && !hasMissingItems && !hasInsufficientStock && !loading

  return (
    <div className="space-y-5">

      {/* ── Form row ── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="order-year" className="text-xs text-gray-500">
            Year
          </label>
          <select
            id="order-year"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          >
            <option value="">Select year</option>
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="order-month" className="text-xs text-gray-500">
            Month
          </label>
          <select
            id="order-month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          >
            <option value="">Select month</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label htmlFor="order-file" className="text-xs text-gray-500">
            Excel file
          </label>
          <input
            id="order-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            className="text-sm text-gray-700"
          />
        </div>

        <button
          onClick={onPreviewUpload}
          disabled={!canPreview}
          className="rounded-md bg-gray-900 px-4 py-1.5 text-sm text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          {loading ? "Parsing..." : "Preview upload"}
        </button>
      </div>

      {/* ── Status info ── */}
      {file && (
        <p className="text-xs text-gray-500">
          File: <span className="font-medium text-gray-700">{file.name}</span>
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* ── Preview table ── */}
      {preview.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            {parsedRowCount} rows parsed
          </p>

          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">Category</th>
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">Item</th>
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">Required</th>
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">In stock</th>
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">Remaining</th>
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {preview.map((item, index) => {
                  const status = getPreviewStatus(item)
                  const isLength = item.stockType === "LENGTH"

                  const requiredDisplay = isLength
                    ? item.lengthMm !== null ? formatMm(item.lengthMm) : "—"
                    : String(item.quantity)

                  const inStockDisplay = isLength
                    ? item.currentLengthMm !== null ? formatMm(item.currentLengthMm) : "—"
                    : item.currentStock !== null ? String(item.currentStock) : "—"

                  const remainingValue = isLength
                    ? (item.currentLengthMm !== null && item.lengthMm !== null)
                      ? item.currentLengthMm - item.lengthMm
                      : null
                    : item.currentStock !== null
                      ? item.currentStock - item.quantity
                      : null

                  const remainingDisplay = remainingValue === null
                    ? "—"
                    : isLength
                      ? formatMm(remainingValue)
                      : String(remainingValue)

                  return (
                    <tr
                      key={`${item.category}-${item.itemName}-${index}`}
                      className="text-gray-700"
                    >
                      <td className="px-4 py-3 text-gray-500">{item.category}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.itemName}
                        {isLength && (
                          <span className="ml-1.5 text-xs text-blue-500 font-normal">길이</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{requiredDisplay}</td>
                      <td className="px-4 py-3">{inStockDisplay}</td>
                      <td className="px-4 py-3">
                        {remainingValue === null ? (
                          "—"
                        ) : remainingValue < 0 ? (
                          <span className="text-red-600">{remainingDisplay}</span>
                        ) : (
                          remainingDisplay
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {status === "ok" && (
                          <span className="inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            Ready
                          </span>
                        )}
                        {status === "missing" && (
                          <span className="inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                            Missing
                          </span>
                        )}
                        {status === "insufficient" && (
                          <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                            Insufficient
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
            <p className="text-xs text-red-600">
              Resolve missing items or insufficient stock before confirming deduction.
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClearPreview}
              className="rounded-md border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={onConfirmDeduction}
              disabled={!canConfirm}
              className="rounded-md bg-gray-900 px-4 py-1.5 text-sm text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
              Confirm deduction
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
