import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

type Customer = {
  id: string
  accountName: string
  totalOrders?: number
  name?: string | null
  phone?: string | null
  email?: string | null
  createdAt: string
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
  actions,
  children,
}: {
  title?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {title && (
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-medium text-gray-800">{title}</h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoading(true)
        setError("")
        const response = await fetch("http://localhost:3001/customers")
        if (!response.ok) throw new Error("Failed to fetch customers")
        const data: Customer[] = await response.json()
        setCustomers(data)
      } catch (err) {
        console.error(err)
        setError("Could not load customer data")
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [])

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return customers
    return customers.filter(
      (c) =>
        c.accountName.toLowerCase().includes(keyword) ||
        c.name?.toLowerCase().includes(keyword) ||
        c.phone?.toLowerCase().includes(keyword) ||
        c.email?.toLowerCase().includes(keyword)
    )
  }, [customers, search])

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage customer records created manually or from Excel uploads.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-gray-500">Loading customers...</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && (
          <>
            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total customers" value={customers.length} />
              <StatCard label="Search results" value={filteredCustomers.length} />
            </div>

            {/* ── Search + Add ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="text"
                placeholder="Search by account, name, phone, or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:border-gray-400 focus:outline-none sm:max-w-sm"
              />
              <button className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-100">
                + Add customer
              </button>
            </div>

            {/* ── Customer table ── */}
            <Section>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Account</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Name</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Orders</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Phone</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Email</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Created</th>
                      <th className="px-5 py-2.5"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-900">
                            {customer.accountName}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {customer.name || "—"}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {customer.totalOrders ?? 0}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {customer.phone || "—"}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {customer.email || "—"}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {new Date(customer.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            <Link
                              to={`/customers/${customer.id}`}
                              className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
                          No customers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          </>
        )}
      </div>
    </main>
  )
}
