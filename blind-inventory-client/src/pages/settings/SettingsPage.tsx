import { useEffect, useRef, useState } from "react"
import { apiFetch } from "../../lib/api"
import { useAuth } from "../../contexts/AuthContext"

type User = {
  id: number
  username: string
  role: "ADMIN" | "STAFF"
  createdAt: string
}

// ─────────────────────────────────────────────
// Add User Modal
// ─────────────────────────────────────────────
function AddUserModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setUsername("")
      setPassword("")
      setRole("STAFF")
      setError("")
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) { setError("Username is required."); return }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return }

    try {
      setLoading(true)
      setError("")
      const res = await apiFetch("/auth/users", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password, role }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || "Failed to create user")
      }
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Add User</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Change Password Modal
// ─────────────────────────────────────────────
function ChangePasswordModal({
  user,
  onClose,
  onChanged,
}: {
  user: User | null
  onClose: () => void
  onChanged: () => void
}) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setPassword("")
    setError("")
  }, [user])

  if (!user) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError("Password must be at least 6 characters."); return }

    try {
      setLoading(true)
      setError("")
      const res = await apiFetch(`/auth/users/${user!.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ newPassword: password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || "Failed to change password")
      }
      onChanged()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
          <p className="mt-1 text-sm text-gray-500">
            Setting new password for <span className="font-medium">{user.username}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Reset Confirm Modal
// ─────────────────────────────────────────────
function ResetConfirmModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setConfirmText("")
      setError("")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  const canConfirm = confirmText === "RESET" && !loading

  async function handleReset() {
    if (!canConfirm) return
    try {
      setLoading(true)
      setError("")
      const res = await apiFetch("/admin/reset", { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || "Reset failed")
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Reset inventory data</h3>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
            <p className="font-medium">The following will be permanently deleted:</p>
            <ul className="list-disc list-inside space-y-0.5 text-red-600">
              <li>All transaction history</li>
              <li>All uploaded order records (year / sheet no.)</li>
              <li>All item stock reset to 0</li>
            </ul>
            <p className="mt-2 text-red-500">Items, categories, and customers are kept.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Type <span className="font-mono font-bold">RESET</span> to confirm
            </label>
            <input
              ref={inputRef}
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={loading}
              placeholder="RESET"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-400 disabled:opacity-50"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!canConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            {loading ? "Resetting..." : "Reset"}
          </button>
        </div>
      </div>
    </div>
  )
}

type ContinuationRule = {
  id: number
  keyword: string
  categoryName: string
}

type Category = {
  id: number
  name: string
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function SettingsPage() {
  const { user: me } = useAuth()
  const isAdmin = me?.role === "ADMIN"

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [changePwUser, setChangePwUser] = useState<User | null>(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false)

  // Order Parsing Rules
  const [rules, setRules] = useState<ContinuationRule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [rulesOpen, setRulesOpen] = useState(false)
  const [newKeyword, setNewKeyword] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [rulesError, setRulesError] = useState("")
  const [rulesLoading, setRulesLoading] = useState(false)

  async function fetchUsers() {
    try {
      setLoading(true)
      setError("")
      const res = await apiFetch("/auth/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      const data: User[] = await res.json()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users")
    } finally {
      setLoading(false)
    }
  }

  async function fetchRules() {
    try {
      const res = await apiFetch("/continuation-rules")
      if (!res.ok) return
      const data: ContinuationRule[] = await res.json()
      setRules(data)
    } catch {
      // silent — non-critical
    }
  }

  async function fetchCategories() {
    try {
      const res = await apiFetch("/categories")
      if (!res.ok) return
      const data: Category[] = await res.json()
      setCategories(data)
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchRules()
    fetchCategories()
  }, [])

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault()
    if (!newKeyword.trim()) { setRulesError("Keyword is required."); return }
    if (!newCategory) { setRulesError("Please select a category."); return }
    try {
      setRulesLoading(true)
      setRulesError("")
      const res = await apiFetch("/continuation-rules", {
        method: "POST",
        body: JSON.stringify({ keyword: newKeyword.trim(), categoryName: newCategory }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || "Failed to add rule")
      }
      setNewKeyword("")
      setNewCategory("")
      await fetchRules()
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : "Failed to add rule")
    } finally {
      setRulesLoading(false)
    }
  }

  async function handleDeleteRule(id: number) {
    try {
      const res = await apiFetch(`/continuation-rules/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        alert(body?.message || "Failed to delete rule")
        return
      }
      await fetchRules()
    } catch {
      alert("Failed to delete rule")
    }
  }

  async function handleDelete(user: User) {
    const confirmed = window.confirm(
      `Delete user "${user.username}"?\nThis cannot be undone.`
    )
    if (!confirmed) return

    try {
      const res = await apiFetch(`/auth/users/${user.id}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        alert(body?.message || "Failed to delete user")
        return
      }
      await fetchUsers()
    } catch {
      alert("Failed to delete user")
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage user accounts.</p>
        </div>

        {/* User management section */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-medium text-gray-800">Users</h2>
            <button
              onClick={() => setAddModalOpen(true)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-100"
            >
              + Add user
            </button>
          </div>

          {loading && (
            <p className="px-5 py-8 text-sm text-gray-400">Loading users...</p>
          )}
          {error && (
            <p className="px-5 py-8 text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Username</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Role</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Created</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {user.username}
                      {user.id === me?.id && (
                        <span className="ml-2 text-xs font-normal text-gray-400">(me)</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {user.role === "ADMIN" ? "Admin" : "Staff"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setChangePwUser(user)}
                          className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          Change password
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={user.id === me?.id}
                          title={user.id === me?.id ? "Cannot delete your own account" : undefined}
                          className="rounded-md border border-red-100 px-3 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Order Parsing Rules section */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setRulesOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-gray-50"
          >
            <div>
              <h2 className="text-sm font-medium text-gray-800">Order Parsing Rules</h2>
              <p className="mt-0.5 text-xs text-gray-500">Map keywords to inventory categories for continuation rows in Excel orders.</p>
            </div>
            <svg
              className={`ml-4 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${rulesOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {rulesOpen && (
            <div className="border-t border-gray-100">
              {/* Rules table */}
              {rules.length > 0 ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Keyword</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Category</th>
                      {isAdmin && <th className="px-5 py-2.5"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-5 py-2.5 font-mono text-sm text-gray-800">{rule.keyword}</td>
                        <td className="px-5 py-2.5 text-gray-600">{rule.categoryName}</td>
                        {isAdmin && (
                          <td className="px-5 py-2.5 text-right">
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="rounded-md border border-red-100 px-3 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-5 py-4 text-sm text-gray-400">No rules defined. Unmatched rows default to "Bracket".</p>
              )}

              {/* Default fallback note */}
              <div className="border-t border-gray-100 bg-gray-50 px-5 py-2.5">
                <p className="text-xs text-gray-500">
                  Rows with no matching keyword are assigned to <span className="font-medium text-gray-700">Bracket</span> by default.
                </p>
              </div>

              {/* Add rule form (admin only) */}
              {isAdmin && (
                <form onSubmit={handleAddRule} className="border-t border-gray-100 px-5 py-4">
                  <p className="mb-3 text-xs font-medium text-gray-700">Add rule</p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Keyword</label>
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="e.g. MOTOR"
                        className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={rulesLoading}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
                    >
                      {rulesLoading ? "Adding..." : "Add Rule"}
                    </button>
                  </div>
                  {rulesError && <p className="mt-2 text-xs text-red-600">{rulesError}</p>}
                </form>
              )}
            </div>
          )}
        </div>

        {/* Danger Zone section */}
        <div className="overflow-hidden rounded-xl border border-red-100 bg-white">
          <button
            type="button"
            onClick={() => setDangerZoneOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-red-50"
          >
            <h2 className="text-sm font-medium text-red-600">Danger Zone</h2>
            <svg
              className={`h-4 w-4 text-red-400 transition-transform duration-200 ${dangerZoneOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dangerZoneOpen && (
            <>
              <div className="flex items-center justify-between border-t border-red-100 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">Reset inventory data</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Zero all stock, delete all transactions and order records. Items and categories are kept.
                  </p>
                </div>
                <button
                  onClick={() => { setResetSuccess(false); setResetModalOpen(true) }}
                  className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Reset
                </button>
              </div>
              {resetSuccess && (
                <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-xs text-red-700">
                  Inventory data has been reset successfully.
                </div>
              )}
            </>
          )}
        </div>

      </div>

      <AddUserModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={fetchUsers}
      />

      <ChangePasswordModal
        user={changePwUser}
        onClose={() => setChangePwUser(null)}
        onChanged={fetchUsers}
      />

      <ResetConfirmModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onSuccess={() => setResetSuccess(true)}
      />
    </main>
  )
}
