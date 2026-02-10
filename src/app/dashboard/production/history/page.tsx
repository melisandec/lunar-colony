"use client";

import { useProductionHistory } from "@/hooks/use-colony";

export default function ProductionHistoryPage() {
  const { data: history, isLoading } = useProductionHistory();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-slate-500">
          Loading production history…
        </div>
      </div>
    );
  }

  const entries = history ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">📊 Production History</h2>
        <p className="text-sm text-slate-400">
          Daily snapshots of your colony&apos;s production output.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <span className="mb-2 block text-4xl">📊</span>
          <p className="text-sm text-slate-400">
            No production data yet. History will appear after your first
            collection cycle.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium text-right">Produced</th>
                <th className="px-4 py-3 font-medium text-right">Collected</th>
                <th className="px-4 py-3 font-medium text-right">
                  Active Modules
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  Avg. Efficiency
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr
                  key={`${entry.date}-${entry.resource}`}
                  className={idx % 2 === 0 ? "bg-slate-800/10" : ""}
                >
                  <td className="px-4 py-2 text-white tabular-nums">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-slate-300">
                    {entry.resource.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-emerald-400">
                    {entry.totalProduced.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-cyan-400">
                    {entry.totalCollected.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-white">
                    {entry.activeModules}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <span
                      className={
                        entry.avgEfficiency >= 80
                          ? "text-emerald-400"
                          : entry.avgEfficiency >= 50
                            ? "text-amber-400"
                            : "text-red-400"
                      }
                    >
                      {entry.avgEfficiency.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
