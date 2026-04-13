import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

type CustomerOrder = {
  id: string;
  orderSheetNo: number;
  year: number;
  month: number;
  totalItems: number;
  status: string;
  fileName?: string | null;
  createdAt: string;
};

type CustomerDetail = {
  id: string;
  accountName: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
  totalOrders: number;
  latestOrderSheetNo: number | null;
  totalItemsOrdered: number;
  orders: CustomerOrder[];
};

export default function CustomerDetailPage() {
  const { id } = useParams();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCustomerDetail() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`http://localhost:3001/customers/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Customer not found");
          }

          throw new Error("Failed to fetch customer detail");
        }

        const data: CustomerDetail = await response.json();
        setCustomer(data);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Could not load customer detail"
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchCustomerDetail();
    }
  }, [id]);

  if (loading) {
    return (
      <main className="p-6">
        <div className="w-full">
          <p className="text-sm text-gray-600">Loading customer detail...</p>
        </div>
      </main>
    );
  }

  if (error || !customer) {
    return (
      <main className="p-6">
        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Customer Not Found
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {error || "The requested customer record does not exist."}
            </p>
          </div>

          <Link
            to="/customers"
            className="inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Back to Customers
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="w-full">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Customer Detail
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              View customer information and order history.
            </p>
          </div>

          <Link
            to="/customers"
            className="inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Back to Customers
          </Link>
        </div>

        {/* Customer information */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Customer Information
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-gray-500">Account</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {customer.accountName}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-500">Customer Name</p>
              <p className="mt-1 text-sm text-gray-700">
                {customer.name || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-500">Phone</p>
              <p className="mt-1 text-sm text-gray-700">
                {customer.phone || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-500">Email</p>
              <p className="mt-1 text-sm text-gray-700">
                {customer.email || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-500">Created</p>
              <p className="mt-1 text-sm text-gray-700">
                {new Date(customer.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {customer.totalOrders}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Latest Order Sheet No</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {customer.latestOrderSheetNo ?? "-"}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Items Ordered</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {customer.totalItemsOrdered}
            </p>
          </div>
        </div>

        {/* Order history */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Order History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">Order Sheet No</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Total Items</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {customer.orders.length > 0 ? (
                  customer.orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {order.orderSheetNo}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{order.year}</td>
                      <td className="px-4 py-3 text-gray-600">{order.month}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.totalItems}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.status}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      No order history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}