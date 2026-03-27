import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import InventoryPage from "./pages/inventory/InventoryPage";
import CustomersPage from "./pages/customers/CustomersPage";
import CustomerDetailPage from "./pages/customers/CustomerDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<InventoryPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;