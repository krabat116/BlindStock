import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { apiFetch } from "../../lib/api"
import { useAuth } from "../../contexts/AuthContext"

type Customer = {
  id: string
  accountName: string
  totalOrders?: number
  name?: string | null
  phone?: string | null
  email?: string | null
  companyName?: string | null
  address?: string | null
  note?: string | null
  createdAt: string
}

type CustomerFormData = {
  accountName: string
  name: string
  phone: string
  email: string
  companyName: string
  address: string
  note: string
}

const emptyForm: CustomerFormData = {
  accountName: "",
  name: "",
  phone: "",
  email: "",
  companyName: "",
  address: "",
  note: "",
}

// ─────────────────────────────────────────────
// CustomerFormModal
// ─────────────────────────────────────────────
function CustomerFormModal({
  isOpen,
  editingCustomer,
  onClose,
  onSave,
  onDelete,
}: {
  isOpen: boolean
  editingCustomer: Customer | null
  onClose: () => void
  onSave: (data: CustomerFormData) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [form, setForm] = useState<CustomerFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen) {
      setError("")
      setForm(
        editingCustomer
          ? {
              accountName: editingCustomer.accountName,
              name: editingCustomer.name ?? "",
              phone: editingCustomer.phone ?? "",
              email: editingCustomer.email ?? "",
              companyName: editingCustomer.companyName ?? "",
              address: editingCustomer.address ?? "",
              note: editingCustomer.note ?? "",
            }
          : emptyForm
      )
    }
  }, [isOpen, editingCustomer])

  if (!isOpen) return null

  function set(field: keyof CustomerFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.accountName.trim()) {
      setError("Account name is required.")
      return
    }
    try {
      setSubmitting(true)
      setError("")
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save customer.")
    } finally {
      setSubmitting(false)
    }
  }

  const isEdit = editingCustomer !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Customer" : "Add Customer"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {isEdit
              ? "Update the customer's information below."
              : "Fill in the details to register a new customer."}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Account Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.accountName}
                onChange={(e) => set("accountName", e.target.value)}
                placeholder="e.g. ACME-001"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="e.g. 010-1234-5678"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Company</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  placeholder="e.g. ACME Corp"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="e.g. 123 Main St, Seoul"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Note</label>
              <textarea
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div>
              {isEdit && onDelete && (
                <button
                  type="button"
                  disabled={deleting || submitting}
                  onClick={async () => {
                    const confirmed = window.confirm(
                      `Delete customer "${editingCustomer?.accountName}"?\nThis will also delete all associated orders.`
                    )
                    if (!confirmed) return
                    try {
                      setDeleting(true)
                      await onDelete()
                      onClose()
                    } catch {
                      setError("Failed to delete customer.")
                    } finally {
                      setDeleting(false)
                    }
                  }}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || deleting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Customer"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
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
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"

  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  async function fetchCustomers() {
    try {
      setLoading(true)
      setError("")
      const response = await apiFetch("/customers")
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

  useEffect(() => {
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
        c.email?.toLowerCase().includes(keyword) ||
        c.companyName?.toLowerCase().includes(keyword)
    )
  }, [customers, search])

  function openCreate() {
    setEditingCustomer(null)
    setModalOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer)
    setModalOpen(true)
  }

  async function handleSave(data: CustomerFormData) {
    if (editingCustomer) {
      const response = await apiFetch(`/customers/${editingCustomer.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.message || "Failed to update customer")
      }
    } else {
      const response = await apiFetch("/customers", {
        method: "POST",
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.message || "Failed to create customer")
      }
    }
    await fetchCustomers()
  }

  async function handleDelete(customer: Customer) {
    const confirmed = window.confirm(
      `Delete customer "${customer.accountName}"?\nThis will also delete all associated orders.`
    )
    if (!confirmed) return

    const response = await apiFetch(`/customers/${customer.id}`, { method: "DELETE" })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      alert(body?.message || "Failed to delete customer")
      return
    }
    await fetchCustomers()
  }

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
                placeholder="Search by account, name, phone, email, or company"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:border-gray-400 focus:outline-none sm:max-w-sm"
              />
              <button
                onClick={openCreate}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-100"
              >
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
                      <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Company</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Orders</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Phone</th>
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
                            {customer.companyName || "—"}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {customer.totalOrders ?? 0}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {customer.phone || "—"}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {new Date(customer.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/customers/${customer.id}`}
                                className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                              >
                                View
                              </Link>
                              <button
                                onClick={() => openEdit(customer)}
                                className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                              >
                                Edit
                              </button>
                            </div>
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

      <CustomerFormModal
        isOpen={modalOpen}
        editingCustomer={editingCustomer}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={isAdmin && editingCustomer ? () => handleDelete(editingCustomer) : undefined}
      />
    </main>
  )
}
