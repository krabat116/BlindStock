export type BatchResult = {
  fileName: string
  status: "success" | "skipped" | "error"
  message: string
}

type BatchUploadPanelProps = {
  files: File[]
  year: string
  month: string
  running: boolean
  progress: { current: number; total: number }
  results: BatchResult[]
  onFilesChange: (files: File[]) => void
  onYearChange: (value: string) => void
  onMonthChange: (value: string) => void
  onStartBatch: () => Promise<void>
  onClear: () => void
}

const yearOptions = ["2020", "2021", "2022", "2023", "2024", "2025", "2026", "2027"]

const monthOptions = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

export default function BatchUploadPanel({
  files,
  year,
  month,
  running,
  progress,
  results,
  onFilesChange,
  onYearChange,
  onMonthChange,
  onStartBatch,
  onClear,
}: BatchUploadPanelProps) {
  const canStart = files.length > 0 && !!year && !!month && !running

  const succeeded = results.filter((r) => r.status === "success").length
  const skipped = results.filter((r) => r.status === "skipped").length
  const failed = results.filter((r) => r.status === "error").length
  const isDone = results.length === progress.total && progress.total > 0 && !running

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="space-y-5">
      {/* ── Controls ── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Year</label>
          <select
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            disabled={running}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none disabled:opacity-50"
          >
            <option value="">Select year</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Month</label>
          <select
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            disabled={running}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none disabled:opacity-50"
          >
            <option value="">Select month</option>
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs text-gray-500">Excel files (multiple)</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            disabled={running}
            onChange={(e) => onFilesChange(Array.from(e.target.files ?? []))}
            className="text-sm text-gray-700 disabled:opacity-50"
          />
        </div>

        <button
          onClick={onStartBatch}
          disabled={!canStart}
          className="rounded-md bg-gray-900 px-4 py-1.5 text-sm text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          {running
            ? `Processing ${progress.current} / ${progress.total}...`
            : "Upload all"}
        </button>
      </div>

      {/* ── File list ── */}
      {files.length > 0 && !running && results.length === 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">{files.length} file{files.length > 1 ? "s" : ""} selected</p>
          <ul className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 divide-y divide-gray-100">
            {files.map((f, i) => (
              <li key={i} className="px-3 py-1.5 text-xs text-gray-700">{f.name}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Progress bar ── */}
      {(running || (results.length > 0 && progress.total > 0)) && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{running ? `Processing file ${progress.current} of ${progress.total}…` : "Complete"}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-gray-900 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {results.length > 0 && (
        <div className="space-y-3">
          {isDone && (
            <div className="flex gap-4 text-xs">
              <span className="text-green-600 font-medium">{succeeded} succeeded</span>
              <span className="text-amber-600 font-medium">{skipped} skipped</span>
              <span className="text-red-600 font-medium">{failed} failed</span>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">File</th>
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-400">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r, i) => (
                  <tr key={i} className="text-gray-700">
                    <td className="px-4 py-2.5 font-medium text-gray-900 max-w-xs truncate">{r.fileName}</td>
                    <td className="px-4 py-2.5">
                      {r.status === "success" && (
                        <span className="inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Success</span>
                      )}
                      {r.status === "skipped" && (
                        <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">Skipped</span>
                      )}
                      {r.status === "error" && (
                        <span className="inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">Error</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isDone && (
            <div className="flex justify-end">
              <button
                onClick={onClear}
                className="rounded-md border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
