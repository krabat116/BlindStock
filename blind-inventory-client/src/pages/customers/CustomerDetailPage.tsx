import { Link, useParams } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "../../lib/api"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type CustomerOrder = {
  id: string
  orderSheetNo: number
  year: number
  month: number
  totalItems: number
  status: string
  fileName?: string | null
  createdAt: string
}

type CustomerDetail = {
  id: string
  accountName: string
  name?: string | null
  phone?: string | null
  email?: string | null
  companyName?: string | null
  address?: string | null
  note?: string | null
  createdAt: string
  totalOrders: number
  latestOrderSheetNo: number | null
  totalItemsOrdered: number
  orders: CustomerOrder[]
}

// ─────────────────────────────────────────────
// UI primitives
// ─────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-100 px-4 py-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="text-2xl font-medium text-gray-900">{value}</p>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {title && (
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-medium text-gray-800">{title}</h2>
        </div>
      )}
      {children}
    </div>
  )
}

// Custom tooltip for the bar chart
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { payload: { blinds: number; orders: number } }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-gray-900 mb-1">{label}</p>
      <p className="text-gray-700">{data.blinds} blinds</p>
      <p className="text-gray-400">{data.orders} order{data.orders !== 1 ? "s" : ""}</p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function CustomerDetailPage() {
  const { id } = useParams()

  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchCustomerDetail() {
      try {
        setLoading(true)
        setError("")
        const response = await apiFetch(`/customers/${id}`)
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Customer not found"
              : "Failed to fetch customer detail"
          )
        }
        const data: CustomerDetail = await response.json()
        setCustomer(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load customer detail"
        )
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchCustomerDetail()
  }, [id])

  // ── Chart data: aggregate by month, last 12 months ──
  const chartData = useMemo(() => {
    if (!customer) return []

    const map = new Map<
      string,
      { label: string; blinds: number; orders: number }
    >()

    for (const order of customer.orders) {
      const key = `${order.year}-${String(order.month).padStart(2, "0")}`
      const label = `${MONTH_NAMES[order.month - 1]} '${String(order.year).slice(2)}`
      const existing = map.get(key) ?? { label, blinds: 0, orders: 0 }
      existing.blinds += order.totalItems
      existing.orders += 1
      map.set(key, existing)
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([, v]) => v)
  }, [customer])

  // ── Order history: group by year → month ──
  const groupedOrders = useMemo(() => {
    if (!customer) return []

    const yearMap = new Map<number, Map<number, CustomerOrder[]>>()

    for (const order of customer.orders) {
      if (!yearMap.has(order.year)) yearMap.set(order.year, new Map())
      const monthMap = yearMap.get(order.year)!
      if (!monthMap.has(order.month)) monthMap.set(order.month, [])
      monthMap.get(order.month)!.push(order)
    }

    return Array.from(yearMap.entries())
      .sort(([a], [b]) => b - a)
      .map(([year, monthMap]) => ({
        year,
        months: Array.from(monthMap.entries())
          .sort(([a], [b]) => b - a)
          .map(([month, orders]) => ({
            month,
            orders,
            totalItems: orders.reduce((sum, o) => sum + o.totalItems, 0),
          })),
      }))
  }, [customer])

  function toggleMonth(key: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Loading ──
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <p className="text-sm text-gray-500">Loading customer detail...</p>
      </main>
    )
  }

  // ── Error ──
  if (error || !customer) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <h1 className="text-2xl font-medium text-gray-900">
            Customer not found
          </h1>
          <p className="text-sm text-gray-500">
            {error || "The requested customer record does not exist."}
          </p>
          <Link
            to="/customers"
            className="inline-flex rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ← Back to customers
          </Link>
        </div>
      </main>
    )
  }

  // ── Main render ──
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-medium text-gray-900">
              {customer.accountName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Customer detail and order history
            </p>
          </div>
          <Link
            to="/customers"
            className="inline-flex rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ← Back to customers
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total orders" value={customer.totalOrders} />
          <StatCard
            label="Latest order no"
            value={customer.latestOrderSheetNo ?? "—"}
          />
          <StatCard
            label="Blinds ordered"
            value={customer.totalItemsOrdered.toLocaleString()}
          />
        </div>

        {/* Monthly chart */}
        {chartData.length > 0 && (
          <Section title="Monthly blinds (last 12 months)">
            <div className="px-2 py-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={chartData}
                  barSize={28}
                  margin={{ top: 4, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "#f9fafb" }}
                  />
                  <Bar
                    dataKey="blinds"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}

        {/* Customer information */}
        <Section title="Customer information">
          <div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Account</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{customer.accountName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Name</p>
              <p className="mt-1 text-sm text-gray-700">{customer.name || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Company</p>
              <p className="mt-1 text-sm text-gray-700">{customer.companyName || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Phone</p>
              <p className="mt-1 text-sm text-gray-700">{customer.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</p>
              <p className="mt-1 text-sm text-gray-700">{customer.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Created</p>
              <p className="mt-1 text-sm text-gray-700">
                {new Date(customer.createdAt).toLocaleDateString()}
              </p>
            </div>
            {customer.address && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Address</p>
                <p className="mt-1 text-sm text-gray-700">{customer.address}</p>
              </div>
            )}
            {customer.note && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Note</p>
                <p className="mt-1 text-sm text-gray-700">{customer.note}</p>
              </div>
            )}
          </div>
        </Section>

        {/* Order history — grouped by year / month */}
        <Section title="Order history">
          {groupedOrders.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              No order history found.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {groupedOrders.map(({ year, months }) => (
                <div key={year}>
                  {/* Year header */}
                  <div className="bg-gray-50 px-5 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {year}
                    </span>
                  </div>

                  {months.map(({ month, orders, totalItems }) => {
                    const key = `${year}-${month}`
                    const isExpanded = expandedMonths.has(key)

                    return (
                      <div key={key}>
                        {/* Month row — click to expand */}
                        <button
                          onClick={() => toggleMonth(key)}
                          className="flex w-full items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-5">
                            <span className="w-8 text-sm font-medium text-gray-900">
                              {MONTH_NAMES[month - 1]}
                            </span>
                            <span className="text-xs text-gray-400">
                              {orders.length} order{orders.length !== 1 ? "s" : ""}
                            </span>
                            <span className="text-xs text-gray-400">
                              {totalItems} blind{totalItems !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <span className="text-gray-300 text-xs">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </button>

                        {/* Individual orders */}
                        {isExpanded && (
                          <div className="border-t border-gray-100">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="px-10 py-2 text-left text-xs font-medium text-gray-400">
                                    Order sheet no
                                  </th>
                                  <th className="px-5 py-2 text-left text-xs font-medium text-gray-400">
                                    Blinds
                                  </th>
                                  <th className="px-5 py-2 text-left text-xs font-medium text-gray-400">
                                    Status
                                  </th>
                                  <th className="px-5 py-2 text-left text-xs font-medium text-gray-400">
                                    Date
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {orders.map((order) => (
                                  <tr key={order.id} className="bg-white">
                                    <td className="px-10 py-2.5 font-medium text-gray-900">
                                      #{order.orderSheetNo}
                                    </td>
                                    <td className="px-5 py-2.5 text-gray-500">
                                      {order.totalItems}
                                    </td>
                                    <td className="px-5 py-2.5">
                                      <span className="inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                        {order.status}
                                      </span>
                                    </td>
                                    <td className="px-5 py-2.5 text-xs text-gray-400">
                                      {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </Section>

      </div>
    </main>
  )
}
