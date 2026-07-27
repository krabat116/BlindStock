import { useState, useEffect, useMemo } from "react"
import type { InventoryTransaction } from "../types/transaction"

const PAGE_SIZE = 10

type DateRange = "30d" | "3m" | "1y" | "all"

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All" },
]

function getCutoff(range: DateRange): Date | null {
  const now = new Date()
  if (range === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  if (range === "3m") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  if (range === "1y") return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  return null
}

type TransactionListProps = {
  transactions: InventoryTransaction[]
}

function getTypeLabel(type: string) {
  if (type === "in") return "Stock Added"
  if (type === "out") return "Stock Removed"
  return "Adjustment"
}

export default function TransactionList({
  transactions,
}: TransactionListProps) {
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState<DateRange>("30d")
  const [search, setSearch] = useState("")

  // Reset to first page when any filter or transaction list changes
  useEffect(() => {
    setPage(1)
  }, [transactions, dateRange, search])

  const filtered = useMemo(() => {
    const cutoff = getCutoff(dateRange)
    const q = search.trim().toLowerCase()

    return transactions.filter((t) => {
      if (cutoff && new Date(t.createdAt) < cutoff) return false
      if (!q) return true
      return (
        t.itemName?.toLowerCase().includes(q) ||
        t.source?.toLowerCase().includes(q) ||
        t.note?.toLowerCase().includes(q) ||
        getTypeLabel(t.type).toLowerCase().includes(q)
      )
    })
  }, [transactions, dateRange, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Transactions
          </h2>
          <p className="text-sm text-gray-500">
            Latest inventory changes and stock updates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item, source, note…"
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 outline-none focus:border-gray-400 w-52"
          />

          {/* Date range filter */}
          <div className="flex shrink-0 rounded-md border border-gray-200 overflow-hidden text-xs">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={`px-3 py-1.5 transition-colors border-l first:border-l-0 border-gray-200 ${
                  dateRange === opt.value
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-sm text-gray-500">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Note</th>
            </tr>
          </thead>

          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  No transactions in this period.
                </td>
              </tr>
            ) : (
              paged.map((transaction) => {
                const amountDisplay = transaction.lengthMm != null
                  ? `${transaction.lengthMm.toLocaleString()} mm`
                  : transaction.quantity != null
                    ? String(transaction.quantity)
                    : "-"

                return (
                  <tr
                    key={transaction.id}
                    className="bg-gray-50 text-sm text-gray-700"
                  >
                    <td className="rounded-l-xl px-4 py-3">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {transaction.itemName}
                    </td>
                    <td className="px-4 py-3">
                      {getTypeLabel(transaction.type)}
                    </td>
                    <td className="px-4 py-3">{amountDisplay}</td>
                    <td className="px-4 py-3 text-gray-500">{transaction.source ?? "-"}</td>
                    <td className="rounded-r-xl px-4 py-3">
                      {transaction.note ?? "-"}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400">
            {filtered.length === 0
              ? "0 results"
              : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="px-3 text-xs text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
