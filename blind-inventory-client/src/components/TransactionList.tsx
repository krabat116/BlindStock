import type { InventoryTransaction } from "../types/transaction"

type TransactionListProps = {
  transactions: InventoryTransaction[]
}

function getTypeLabel(type: string) {
  if (type === "in") return "Stock Added"
  if (type === "out") return "Stock Removed"
  return "Adjustment"
}

export default function TransactionList({
  transactions,
}: TransactionListProps) {
  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Recent Transactions
        </h2>
        <p className="text-sm text-gray-500">
          Latest inventory changes and stock updates
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-sm text-gray-500">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Quantity</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Note</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className="bg-gray-50 text-sm text-gray-700"
              >
                <td className="rounded-l-xl px-4 py-3">
                  {new Date(transaction.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {transaction.itemName}
                </td>
                <td className="px-4 py-3">
                  {getTypeLabel(transaction.type)}
                </td>
                <td className="px-4 py-3">{transaction.quantity}</td>
                <td className="px-4 py-3">{transaction.source ?? "-"}</td>
                <td className="rounded-r-xl px-4 py-3">
                  {transaction.note ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}