import { useEffect, useState } from "react"
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
// Main page
// ─────────────────────────────────────────────
export default function SettingsPage() {
  const { user: me } = useAuth()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [changePwUser, setChangePwUser] = useState<User | null>(null)

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

  useEffect(() => { fetchUsers() }, [])

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
    </main>
  )
}
