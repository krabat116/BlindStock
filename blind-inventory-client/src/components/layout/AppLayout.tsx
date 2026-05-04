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
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}