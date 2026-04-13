import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Customer type for the customers list page
 */
type Customer = {
  id: string;
  accountName: string;
  totalOrders?: number;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
};

export default function CustomersPage() {
  /**
   * State for customer data from the backend
   */
  const [customers, setCustomers] = useState<Customer[]>([]);

  /**
   * State for search input
   */
  const [search, setSearch] = useState("");

  /**
   * Loading and error states
   */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * Fetch customers from the backend
   */
  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("http://localhost:3001/customers");

        if (!response.ok) {
          throw new Error("Failed to fetch customers");
        }

        const data: Customer[] = await response.json();
        setCustomers(data);
      } catch (err) {
        console.error(err);
        setError("Could not load customer data");
      } finally {
        setLoading(false);
      }
    }

    fetchCustomers();
  }, []);

  /**
   * Filter customers by account name, display name, phone, or email
   */
  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return customers;

    return customers.filter((customer) => {
      return (
        customer.accountName.toLowerCase().includes(keyword) ||
        customer.name?.toLowerCase().includes(keyword) ||
        customer.phone?.toLowerCase().includes(keyword) ||
        customer.email?.toLowerCase().includes(keyword)
      );
    });
  }, [customers, search]);

  return (
    <main className="p-6">
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage customer records created manually or from Excel uploads.
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            placeholder="Search by account, name, phone, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:max-w-md"
          />

          <button className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black">
            + Add Customer
          </button>
        </div>

        {loading && (
          <p className="text-sm text-gray-600">Loading customers...</p>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && (
          <>
            <div className="mb-3 text-sm text-gray-600">
              Total customers:{" "}
              <span className="font-semibold text-gray-900">
                {filteredCustomers.length}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Total Orders</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {customer.accountName}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {customer.name || "-"}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {customer.totalOrders ?? 0}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {customer.phone || "-"}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {customer.email || "-"}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {customer.createdAt}
                        </td>

                        <td className="px-4 py-3">
                          <Link
                            to={`/customers/${customer.id}`}
                            className="inline-flex rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-gray-400"
                      >
                        No customers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}