import { useMemo, useState } from "react";

/**
 * Customer type for temporary mock data
 */
type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  companyName?: string | null;
  createdAt: string;
};

/**
 * Temporary mock data before API integration
 */
const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "Alice Brown",
    phone: "0412 345 678",
    email: "alice@example.com",
    companyName: "AB Interiors",
    createdAt: "2026-03-24",
  },
  {
    id: "2",
    name: "Brian Lee",
    phone: "0433 222 111",
    email: "brian@example.com",
    companyName: null,
    createdAt: "2026-03-20",
  },
];

export default function CustomersPage() {
  const [search, setSearch] = useState("");

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return mockCustomers;

    return mockCustomers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(keyword) ||
        customer.phone?.toLowerCase().includes(keyword) ||
        customer.email?.toLowerCase().includes(keyword) ||
        customer.companyName?.toLowerCase().includes(keyword)
      );
    });
  }, [search]);

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="w-full">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Customer Management
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            View customer records and prepare for future order tracking.
          </p>
        </div>

        {/* Top action bar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            placeholder="Search by name, phone, email, or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:max-w-md"
          />

          <button className="rounded-lg bg-black px-4 py-2 text-white">
            + Add Customer
          </button>
        </div>

        {/* Customer list card */}
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {customer.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {customer.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {customer.email || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {customer.companyName || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {customer.createdAt}
                    </td>
                    <td className="px-4 py-3">
                      <button className="rounded border px-3 py-1 text-sm">
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}