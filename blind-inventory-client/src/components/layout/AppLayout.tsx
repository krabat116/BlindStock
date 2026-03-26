import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

/**
 * AppLayout
 * - Shared layout for all pages
 * - Sidebar stays fixed on the left
 * - Page content is rendered on the right through <Outlet />
 */
export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}