import { useState, useMemo, useEffect, useRef } from "react"
import StockStatusBadge from "./StockStatusBadge"
import type { InventoryItem } from "../types/inventory"
import { getStockStatus } from "../utils/getStockStatus"

type InventoryTableProps = {
  items: InventoryItem[]
  onOpenAddStock: (item: InventoryItem) => void
  onOpenAdjustStock: (item: InventoryItem) => void
  onOpenManageItems: () => void
}

// Downward triangle icon — active state is dark
function FilterIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 10 6"
      className={`h-2.5 w-2.5 transition-colors ${active ? "fill-blue-500" : "fill-gray-400 hover:fill-gray-600"}`}
    >
      <path d="M0 0l5 6 5-6z" />
    </svg>
  )
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 10 6"
      className={`h-2.5 w-2.5 fill-gray-400 transition-transform duration-150 ${collapsed ? "-rotate-90" : ""}`}
    >
      <path d="M0 0l5 6 5-6z" />
    </svg>
  )
}

// Dropdown that closes when clicking outside
function FilterDropdown({
  label,
  active,
  children,
}: {
  label: string
  active: boolean
  children: (close: () => void) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center outline-none"
        title={`Filter by ${label}`}
      >
        <FilterIcon active={active} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[130px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export default function InventoryTable({
  items,
  onOpenAddStock,
  onOpenAdjustStock,
}: InventoryTableProps) {
  const [categoryFilter, setCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const categories = useMemo(() => {
    const unique = Array.from(new Set(items.map((i) => i.category).filter(Boolean)))
    return unique.sort((a, b) => a.localeCompare(b))
  }, [items])

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        if (categoryFilter && item.category !== categoryFilter) return false
        if (statusFilter && getStockStatus(item) !== statusFilter) return false
        return true
      })
      .sort((a, b) => (a.category ?? "").localeCompare(b.category ?? ""))
  }, [items, categoryFilter, statusFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, InventoryItem[]>()
    for (const item of filtered) {
      const cat = item.category ?? "Uncategorised"
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    return Array.from(map.entries())
  }, [filtered])

  function toggleCategory(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const allCollapsed = grouped.length > 0 && collapsed.size === grouped.length

  function toggleAll() {
    if (allCollapsed) {
      setCollapsed(new Set())
    } else {
      setCollapsed(new Set(grouped.map(([cat]) => cat)))
    }
  }

  const optionClass = (selected: boolean) =>
    `block w-full px-3 py-1.5 text-left text-xs transition-colors cursor-pointer ${
      selected ? "bg-gray-100 font-medium text-gray-900" : "text-gray-700 hover:bg-gray-50"
    }`

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-1">
        <thead>
          <tr className="text-left">
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">Item name</th>
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              <FilterDropdown label="Category" active={!!categoryFilter}>
                {(close) => (
                  <>
                    <button className={optionClass(categoryFilter === "")} onClick={() => { setCategoryFilter(""); close() }}>All</button>
                    {categories.map((cat) => (
                      <button key={cat} className={optionClass(categoryFilter === cat)} onClick={() => { setCategoryFilter(cat); close() }}>
                        {cat}
                      </button>
                    ))}
                  </>
                )}
              </FilterDropdown>
            </th>
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">Stock</th>
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">Min stock</th>
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">Unit</th>
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              <FilterDropdown label="Status" active={!!statusFilter}>
                {(close) => (
                  <>
                    <button className={optionClass(statusFilter === "")} onClick={() => { setStatusFilter(""); close() }}>All</button>
                    <button className={optionClass(statusFilter === "ok")} onClick={() => { setStatusFilter("ok"); close() }}>OK</button>
                    <button className={optionClass(statusFilter === "low")} onClick={() => { setStatusFilter("low"); close() }}>Low</button>
                    <button className={optionClass(statusFilter === "out")} onClick={() => { setStatusFilter("out"); close() }}>Out</button>
                  </>
                )}
              </FilterDropdown>
            </th>
            <th className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              {grouped.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="font-normal normal-case tracking-normal text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {allCollapsed ? "Expand all" : "Collapse all"}
                </button>
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {grouped.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
                No inventory items found.
              </td>
            </tr>
          ) : (
            grouped.map(([cat, catItems]) => {
              const isCollapsed = collapsed.has(cat)
              return (
                <>
                  {/* Category header row */}
                  <tr
                    key={`header-${cat}`}
                    onClick={() => toggleCategory(cat)}
                    className="cursor-pointer select-none"
                  >
                    <td
                      colSpan={7}
                      className="rounded-lg bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 border border-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronIcon collapsed={isCollapsed} />
                        <span>{cat}</span>
                        <span className="font-normal text-gray-400">({catItems.length})</span>
                      </div>
                    </td>
                  </tr>

                  {/* Item rows */}
                  {!isCollapsed &&
                    catItems.map((item) => (
                      <tr key={item.id} className="bg-gray-50 text-sm text-gray-700">
                        <td className="rounded-l-lg px-5 py-3 font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-5 py-3 text-gray-500">{item.category}</td>
                        <td className="px-5 py-3">
                          {item.stockType === "LENGTH"
                            ? item.totalLengthMm != null
                              ? `${item.totalLengthMm.toLocaleString()} mm`
                              : "—"
                            : item.stockType === "AREA"
                              ? item.totalAreaMm2 != null
                                ? `${(item.totalAreaMm2 / 1_000_000).toFixed(2)} m²`
                                : "—"
                              : item.quantity}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {item.stockType === "LENGTH"
                            ? item.minimumLengthMm != null
                              ? `${item.minimumLengthMm.toLocaleString()} mm`
                              : "—"
                            : item.stockType === "AREA"
                              ? item.minimumAreaMm2 != null
                                ? `${(item.minimumAreaMm2 / 1_000_000).toFixed(2)} m²`
                                : "—"
                              : item.minimumStock}
                        </td>
                        <td className="px-5 py-3 text-gray-500">{item.unit}</td>
                        <td className="px-5 py-3">
                          <StockStatusBadge status={getStockStatus(item)} />
                        </td>
                        <td className="rounded-r-lg px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onOpenAddStock(item)}
                              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-white transition-colors"
                            >
                              + Stock
                            </button>
                            <button
                              onClick={() => onOpenAdjustStock(item)}
                              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-white transition-colors"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
