import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"

// ─────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────
export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === "ADMIN"

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
      <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
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
            onClick={handleLogout}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </aside>

    </>
  )
}
