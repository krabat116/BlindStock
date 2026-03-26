import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import InventoryPage from "./pages/inventory/InventoryPage";
import CustomersPage from "./pages/customers/CustomersPage";

/**
 * App entry point
 * - BrowserRouter enables routing
 * - AppLayout wraps pages with a shared sidebar layout
 * - Each Route renders a different page
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<InventoryPage />} />
          <Route path="/customers" element={<CustomersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;