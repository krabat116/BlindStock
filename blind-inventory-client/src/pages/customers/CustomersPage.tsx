import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Customer type for the customers list page
 * - accountName: value parsed from Excel ACCOUNT field
 * - name: optional display name that can be added later
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
 * Replace this with API data later
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

export default function CustomersPage() {
  /**
   * State for the search input
   */
  const [search, setSearch] = useState("");

  /**
   * Filter customers by account name, display name, phone, or email
   */
  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return mockCustomers;

    return mockCustomers.filter((customer) => {
      return (
        customer.accountName.toLowerCase().includes(keyword) ||
        customer.name?.toLowerCase().includes(keyword) ||
        customer.phone?.toLowerCase().includes(keyword) ||
        customer.email?.toLowerCase().includes(keyword)
      );
    });
  }, [search]);

  return (
    <main className="p-6">
      <div className="w-full">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage customer records created manually or from Excel uploads.
          </p>
        </div>

        {/* Top action bar */}
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

        {/* Summary row */}
        <div className="mb-3 text-sm text-gray-600">
          Total customers:{" "}
          <span className="font-semibold text-gray-900">
            {filteredCustomers.length}
          </span>
        </div>

        {/* Customers table */}
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Customer Name</th>
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
                    {/* Account name from Excel */}
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {customer.accountName}
                    </td>

                    {/* Optional display name */}
                    <td className="px-4 py-3 text-gray-600">
                      {customer.name || "-"}
                    </td>

                    {/* Optional phone */}
                    <td className="px-4 py-3 text-gray-600">
                      {customer.phone || "-"}
                    </td>

                    {/* Optional email */}
                    <td className="px-4 py-3 text-gray-600">
                      {customer.email || "-"}
                    </td>

                    {/* Created date */}
                    <td className="px-4 py-3 text-gray-600">
                      {customer.createdAt}
                    </td>

                    {/* Action buttons */}
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
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-400"
                  >
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