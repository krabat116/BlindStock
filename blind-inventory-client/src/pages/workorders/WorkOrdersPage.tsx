import { useState, useEffect } from "react"
import { apiFetch } from "../../lib/api"
import { useAuth } from "../../contexts/AuthContext"
import type {
  WorkOrderGroup,
  WorkOrderGroupDetail,
  WorkType,
  ToggleActivityResult,
} from "../../types/workOrder"
import { ALL_WORK_TYPES, WORK_TYPE_LABELS } from "../../types/workOrder"

// ─────────────────────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"

  const [groups, setGroups] = useState<WorkOrderGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [detail, setDetail] = useState<WorkOrderGroupDetail | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [conflictMessage, setConflictMessage] = useState("")
  // rowId:workType → true means that cell is currently being submitted
  const [activityLoading, setActivityLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"sheet" | "activity">("sheet")

  useEffect(() => {
    fetchGroups()
  }, [])

  useEffect(() => {
    if (selectedGroupId) {
      setActiveTab("sheet")
      fetchDetail(selectedGroupId)
    } else {
      setDetail(null)
    }
  }, [selectedGroupId])

  async function fetchGroups() {
    try {
      setLoadingGroups(true)
      const res = await apiFetch("/work-orders/groups")
      if (!res.ok) throw new Error()
      const data: WorkOrderGroup[] = await res.json()
      setGroups(data)
    } catch {
      // silent failure — groups stays []
    } finally {
      setLoadingGroups(false)
    }
  }

  async function fetchDetail(id: string) {
    try {
      setLoadingDetail(true)
      setConflictMessage("")
      const res = await apiFetch(`/work-orders/groups/${id}`)
      if (!res.ok) throw new Error()
      const data: WorkOrderGroupDetail = await res.json()
      setDetail(data)
    } catch {
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleCellClick(rowId: string, workType: WorkType) {
    const key = `${rowId}:${workType}`
    setActivityLoading(key)
    setConflictMessage("")
    try {
      const res = await apiFetch("/work-orders/activities", {
        method: "POST",
        body: JSON.stringify({ workOrderRowId: rowId, workType }),
      })
      const data: ToggleActivityResult = await res.json()
      if (data.action === "conflict") {
        setConflictMessage(`Already assigned to: ${data.existingDisplayValue}`)
      } else if (selectedGroupId) {
        await fetchDetail(selectedGroupId)
      }
    } catch {
      setConflictMessage("An error occurred. Please try again.")
    } finally {
      setActivityLoading(null)
    }
  }

  async function handleDeleteActivity(activityId: string) {
    setConflictMessage("")
    try {
      const res = await apiFetch(`/work-orders/activities/${activityId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      if (selectedGroupId) await fetchDetail(selectedGroupId)
    } catch {
      setConflictMessage("Failed to delete activity.")
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-full space-y-5">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Work Orders</h1>
          <p className="mt-1 text-sm text-gray-500">
            Select a work order group to view and record your work.
          </p>
        </div>

        <div className="flex gap-5 items-start">

          {/* ── Group list panel ──────────────────────────────────────── */}
          <div className="w-64 shrink-0">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-medium text-gray-800">Order Groups</h2>
              </div>
              {loadingGroups ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">Loading...</p>
              ) : groups.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">No groups yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-[72vh] overflow-y-auto">
                  {groups.map((g) => (
                    <li key={g.id}>
                      <button
                        onClick={() => setSelectedGroupId(g.id)}
                        className={[
                          "w-full px-4 py-3 text-left transition-colors",
                          selectedGroupId === g.id
                            ? "bg-gray-900 text-white"
                            : "hover:bg-gray-50 text-gray-700",
                        ].join(" ")}
                      >
                        <p className={`text-xs truncate ${selectedGroupId === g.id ? "text-gray-300" : "text-gray-400"}`}>
                          {g.account}
                        </p>
                        <p className={`text-sm font-medium truncate ${selectedGroupId === g.id ? "text-white" : "text-gray-900"}`}>
                          {g.customerName}
                        </p>
                        <p className={`text-xs mt-0.5 ${selectedGroupId === g.id ? "text-gray-400" : "text-gray-400"}`}>
                          {g.rowCount} rows · {new Date(g.uploadedAt).toLocaleDateString()}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Detail panel ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {!selectedGroupId ? (
              <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-400">
                Select a group to view its work order
              </div>
            ) : loadingDetail ? (
              <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-400">
                Loading...
              </div>
            ) : !detail ? (
              <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-red-400">
                Failed to load group.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

                {/* Detail header */}
                <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-medium text-gray-800">
                      {detail.account} — {detail.customerName}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {detail.uploadedSheet.fileName} · uploaded{" "}
                      {new Date(detail.uploadedSheet.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {conflictMessage && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                        {conflictMessage}
                      </p>
                    )}
                    {/* Tab buttons */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                      <button
                        onClick={() => setActiveTab("sheet")}
                        className={[
                          "px-3 py-1.5 transition-colors",
                          activeTab === "sheet"
                            ? "bg-gray-900 text-white"
                            : "text-gray-500 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        시트 보기
                      </button>
                      <button
                        onClick={() => setActiveTab("activity")}
                        className={[
                          "px-3 py-1.5 border-l border-gray-200 transition-colors",
                          activeTab === "activity"
                            ? "bg-gray-900 text-white"
                            : "text-gray-500 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        활동 기록
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Sheet view ───────────────────────────────────────────── */}
                {activeTab === "sheet" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-left">
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Blind #</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Ref</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Room</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">W × D (mm)</th>
                          <th className="px-3 py-2 font-medium text-gray-500">Material</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Tape</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Roll</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Finish</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Comp.</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Op / Side / Chain</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500 whitespace-nowrap">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail.rows.map((row) => {
                          if (row.isAccessoryRow) {
                            return (
                              <tr key={row.id} className="bg-amber-50/40">
                                <td colSpan={11} className="px-3 py-1.5 text-gray-500 italic">
                                  {row.accessoriesNotes}
                                </td>
                              </tr>
                            )
                          }
                          return (
                            <tr key={row.id} className="hover:bg-gray-50/60">
                              <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                                {row.blindNumber || "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {row.additionalRef ?? ""}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {row.room ?? ""}
                              </td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                {row.widthMm !== null && row.dropMm !== null
                                  ? `${row.widthMm} × ${row.dropMm}`
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {[row.materialRange, row.materialColour]
                                  .filter(Boolean)
                                  .join(" ") || "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {row.tape ?? ""}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {row.roll ?? ""}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {row.finish ?? ""}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {row.componentryColour ?? ""}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {[row.chainOperation, row.side, row.chain]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </td>
                              <td className="px-3 py-2 text-center text-gray-700">
                                {row.quantity ?? 1}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Activity log ─────────────────────────────────────────── */}
                {activeTab === "activity" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-left">
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Blind #</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Ref</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Room</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">W × D (mm)</th>
                          <th className="px-3 py-2 font-medium text-gray-500">Material</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Tape</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Roll</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Finish</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Comp.</th>
                          <th className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">Op / Side / Chain</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500 whitespace-nowrap">Qty</th>
                          {ALL_WORK_TYPES.map((wt) => (
                            <th
                              key={wt}
                              className="px-2 py-2 text-center font-medium text-gray-500 whitespace-nowrap min-w-17"
                            >
                              {WORK_TYPE_LABELS[wt]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail.rows.map((row) => {
                          if (row.isAccessoryRow) {
                            return (
                              <tr key={row.id} className="bg-amber-50/40">
                                <td
                                  colSpan={11 + ALL_WORK_TYPES.length}
                                  className="px-3 py-1.5 text-gray-500 italic"
                                >
                                  {row.accessoriesNotes}
                                </td>
                              </tr>
                            )
                          }

                          return (
                            <tr key={row.id} className="hover:bg-gray-50/60">
                              <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                                {row.blindNumber || "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {row.additionalRef ?? ""}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {row.room ?? ""}
                              </td>
                              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                {row.widthMm !== null && row.dropMm !== null
                                  ? `${row.widthMm} × ${row.dropMm}`
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {[row.materialRange, row.materialColour]
                                  .filter(Boolean)
                                  .join(" ") || "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {row.tape ?? ""}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {row.roll ?? ""}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {row.finish ?? ""}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {row.componentryColour ?? ""}
                              </td>
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {[row.chainOperation, row.side, row.chain]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </td>
                              <td className="px-3 py-2 text-center text-gray-700">
                                {row.quantity ?? 1}
                              </td>

                              {/* Work activity cells */}
                              {ALL_WORK_TYPES.map((wt) => {
                                const activity = row.activities.find((a) => a.workType === wt)
                                const isMyActivity = activity?.staffUser.id === user?.id
                                const isBusy = activityLoading === `${row.id}:${wt}`

                                if (activity && !isMyActivity && !isAdmin) {
                                  return (
                                    <td key={wt} className="px-2 py-1.5 text-center">
                                      <span className="inline-flex items-center justify-center rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 cursor-default select-none">
                                        {activity.displayValue}
                                      </span>
                                    </td>
                                  )
                                }

                                if (activity) {
                                  return (
                                    <td key={wt} className="px-2 py-1.5 text-center">
                                      <button
                                        onClick={() =>
                                          isMyActivity
                                            ? handleCellClick(row.id, wt)
                                            : handleDeleteActivity(activity.id)
                                        }
                                        disabled={isBusy}
                                        title={isAdmin && !isMyActivity ? "Delete (admin)" : "Click to undo"}
                                        className="inline-flex items-center justify-center rounded bg-gray-900 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-40 min-w-13"
                                      >
                                        {isBusy ? "…" : activity.displayValue}
                                      </button>
                                    </td>
                                  )
                                }

                                return (
                                  <td key={wt} className="px-2 py-1.5 text-center">
                                    <button
                                      onClick={() => handleCellClick(row.id, wt)}
                                      disabled={isBusy}
                                      className="inline-flex h-6 w-14 items-center justify-center rounded border border-dashed border-gray-300 text-gray-300 hover:border-gray-500 hover:text-gray-500 transition-colors disabled:opacity-40"
                                    >
                                      {isBusy ? "…" : ""}
                                    </button>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Accessories notes footer (sheet view only, from blind rows) */}
                {activeTab === "sheet" && detail.rows.some((r) => !r.isAccessoryRow && r.accessoriesNotes) && (
                  <div className="border-t border-gray-100 px-5 py-3 space-y-0.5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Accessories & Notes</p>
                    {detail.rows
                      .filter((r) => !r.isAccessoryRow && r.accessoriesNotes)
                      .map((r) => (
                        <p key={r.id} className="text-xs text-gray-500">
                          <span className="font-medium text-gray-700">{r.blindNumber}:</span>{" "}
                          {r.accessoriesNotes}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
