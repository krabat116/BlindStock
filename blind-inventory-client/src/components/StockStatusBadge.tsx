import type { StockStatus } from "../types/inventory"

type StockStatusBadgeProps = {
  status: StockStatus
}

const statusMap = {
  ok: {
    label: "OK",
    className: "bg-green-100 text-green-700",
  },
  low: {
    label: "Low",
    className: "bg-yellow-100 text-yellow-700",
  },
  out: {
    label: "Out of Stock",
    className: "bg-red-100 text-red-700",
  },
}

export default function StockStatusBadge({
  status,
}: StockStatusBadgeProps) {
  const config = statusMap[status]

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  )
}