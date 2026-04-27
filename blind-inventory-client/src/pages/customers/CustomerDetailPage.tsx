import { Link, useParams } from "react-router-dom"
import { useEffect, useState } from "react"

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
  createdAt: string
  totalOrders: number
  latestOrderSheetNo: number | null
  totalItemsOrdered: number
  orders: CustomerOrder[]
}

// ─────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────
function StatCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
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

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function CustomerDetailPage() {
  const { id } = useParams()

  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchCustomerDetail() {
      try {
        setLoading(true)
        setError("")
        const response = await fetch(`http://localhost:3001/customers/${id}`)
        if (!response.ok) {
          throw new Error(
            response.status === 404 ? "Customer not found" : "Failed to fetch customer detail"
          )
        }
        const data: CustomerDetail = await response.json()
        setCustomer(data)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : "Could not load customer detail")
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchCustomerDetail()
  }, [id])

  // ── Loading state ──────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <p className="text-sm text-gray-500">Loading customer detail...</p>
      </main>
    )
  }

  // ── Error state ────────────────────────────
  if (error || !customer) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <h1 className="text-2xl font-medium text-gray-900">Customer not found</h1>
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

  // ── Main render ────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Page header */}
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

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total orders" value={customer.totalOrders} />
          <StatCard
            label="Latest order no"
            value={customer.latestOrderSheetNo ?? "—"}
          />
          <StatCard label="Items ordered" value={customer.totalItemsOrdered} />
        </div>

        {/* ── Customer information ── */}
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
          </div>
        </Section>

        {/* ── Order history ── */}
        <Section title="Order history">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Order sheet no</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Year</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Month</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Total items</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {customer.orders.length > 0 ? (
                  customer.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        #{order.orderSheetNo}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{order.year}</td>
                      <td className="px-5 py-3 text-gray-500">{order.month}</td>
                      <td className="px-5 py-3 text-gray-500">{order.totalItems}</td>
                      <td className="px-5 py-3">
                        <span className="inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                      No order history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

      </div>
    </main>
  )
}
