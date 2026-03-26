import { NavLink } from "react-router-dom";

/**
 * Navigation item type
 */
type NavItem = {
  label: string;
  path: string;
};

/**
 * Sidebar menu items
 */
const navItems: NavItem[] = [
  { label: "Inventory", path: "/" },
  { label: "Customers", path: "/customers" },
];

/**
 * Sidebar component
 * - Shown on the left side
 * - Uses NavLink so the active menu can be styled automatically
 */
export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="text-lg font-bold text-gray-900">Blind Admin</h1>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  [
                    "block rounded-lg px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}