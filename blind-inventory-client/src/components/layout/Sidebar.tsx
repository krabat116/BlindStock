import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { apiFetch } from "../../lib/api"

// ─────────────────────────────────────────────
// Change Password Modal
// ─────────────────────────────────────────────
function ChangePasswordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function reset() {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setError("")
    setSuccess(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword) { setError("Please enter your current password."); return }
    if (newPassword.length < 6) { setError("New password must be at least 6 characters."); return }
    if (newPassword !== confirmPassword) { setError("New passwords do not match."); return }

    try {
      setLoading(true)
      setError("")
      const res = await apiFetch("/auth/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || "Failed to change password")
      }
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
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
        </div>

        {success ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm font-medium text-green-600">Password changed successfully.</p>
            <button
              onClick={handleClose}
              className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Current password
                </label>
                <input
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  New password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={handleClose}
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
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────
export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === "ADMIN"
  const [changePwOpen, setChangePwOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  function navClass({ isActive }: { isActive: boolean }) {
    return [
      "block rounded-lg px-4 py-2 text-sm font-medium transition",
      isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
    ].join(" ")
  }

  return (
    <>
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <h1 className="text-lg font-bold text-gray-900">Blind Admin</h1>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <NavLink to="/" end className={navClass}>
                Inventory
              </NavLink>
            </li>
            <li>
              <NavLink to="/customers" className={navClass}>
                Customers
              </NavLink>
            </li>

            {isAdmin && (
              <>
                <li className="pt-4">
                  <p className="mb-1 px-4 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Admin
                  </p>
                </li>
                <li>
                  <NavLink to="/settings" className={navClass}>
                    Settings
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>

        {/* User info + actions */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          <div className="px-1">
            <p className="text-xs text-gray-400">Signed in as</p>
            <p className="text-sm font-medium text-gray-800">{user?.username ?? "—"}</p>
            <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${
              isAdmin ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {isAdmin ? "Admin" : "Staff"}
            </span>
          </div>
          <button
            onClick={() => setChangePwOpen(true)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-100"
          >
            Change password
          </button>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      <ChangePasswordModal
        isOpen={changePwOpen}
        onClose={() => setChangePwOpen(false)}
      />
    </>
  )
}
