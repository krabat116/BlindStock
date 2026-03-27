import { Link, useParams } from "react-router-dom";

/**
 * Temporary customer type for detail page
 * Later this can be replaced with API data
 */
type Customer = {
  id: string;
  accountName: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
};

/**
 * Temporary mock data
 * This should match the same shape used in CustomersPage
 */
const mockCustomers: Customer[] = [
  {
    id: "1",
    accountName: "USHAN",
    name: "Ushan Blinds",
    phone: null,
    email: null,
    createdAt: "2026-03-27",
  },
  {
    id: "2",
    accountName: "ABC BLINDS",
    name: null,
    phone: null,
    email: null,
    createdAt: "2026-03-26",
  },
  {
    id: "3",
    accountName: "JJ INTERIORS",
    name: "JJ Interiors",
    phone: "0412 345 678",
    email: "jj@example.com",
    createdAt: "2026-03-25",
  },
];

/**
 * Temporary mock order history
 * Later this should come from the backend by customer id
 */
const mockOrders = [
  {
    id: "o1",
    customerId: "1",
    orderSheetNo: 101,
    year: 2026,
    month: 3,
    totalItems: 12,
    status: "Completed",
  },
  {
    id: "o2",
    customerId: "1",
    orderSheetNo: 87,
    year: 2026,
    month: 2,
    totalItems: 8,
    status: "Completed",
  },
  {
    id: "o3",
    customerId: "3",
    orderSheetNo: 56,
    year: 2026,
    month: 1,
    totalItems: 5,
    status: "Pending",
  },
];

export default function CustomerDetailPage() {
  /**
   * useParams reads route parameters from the URL
   * Example: /customers/1  ->  id = "1"
   */
  const { id } = useParams();

  /**
   * Find the customer that matches the route id
   */
  const customer = mockCustomers.find((item) => item.id === id);

  /**
   * Get order history for this customer
   */
  const customerOrders = mockOrders.filter((order) => order.customerId === id);

  /**
   * If no customer is found, show a simple fallback message
   */
  if (!customer) {
    return (
      <main className="p-6">
        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Customer Not Found
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              The requested customer record does not exist.
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
        {/* Page header */}
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

        {/* Customer info card */}
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
                {customer.createdAt}
              </p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {customerOrders.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Latest Order Sheet No</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {customerOrders[0]?.orderSheetNo ?? "-"}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Items Ordered</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {customerOrders.reduce((sum, order) => sum + order.totalItems, 0)}
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
                {customerOrders.length > 0 ? (
                  customerOrders.map((order) => (
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