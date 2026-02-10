"use client";

import { useColony, useRecruitCrew, useAssignCrew } from "@/hooks/use-colony";
import { useUIStore } from "@/stores/ui-store";

export default function CrewPage() {
  const { data: colony, isLoading } = useColony();
  const recruitCrew = useRecruitCrew();
  const assignCrew = useAssignCrew();
  const addToast = useUIStore((s) => s.addToast);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading crew…</div>
      </div>
    );
  }

  const crew = colony?.crew ?? [];
  const modules = colony?.modules ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">👨‍🚀 Crew Roster</h2>
          <p className="text-sm text-slate-400">
            Assign crew members to modules and manage their specializations.
          </p>
        </div>
        <button
          onClick={async () => {
            try {
              const result = await recruitCrew.mutateAsync();
              addToast({
                type: "success",
                title: `Recruited ${result.crew?.name ?? "crew"}!`,
                message: result.crew
                  ? `${result.crew.role} · +${result.crew.outputBonus}% output`
                  : undefined,
                icon: "👨‍🚀",
              });
            } catch (err) {
              addToast({
                type: "error",
                title: "Recruit failed",
                message: err instanceof Error ? err.message : "Unknown error",
                icon: "❌",
              });
            }
          }}
          disabled={recruitCrew.isPending || crew.length >= 5}
          className="rounded-lg bg-indigo-600/20 px-4 py-2 text-sm font-semibold text-indigo-400 transition hover:bg-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {recruitCrew.isPending
            ? "Recruiting…"
            : crew.length >= 5
              ? "Crew Full (5/5)"
              : `💰 Recruit (200 $L) · ${crew.length}/5`}
        </button>
      </div>

      {crew.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <span className="mb-2 block text-4xl">👨‍🚀</span>
          <p className="text-sm text-slate-400">
            No crew yet. Recruit your first member to boost module output!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {crew.map((c) => {
            const assignedModule = modules.find(
              (m) => m.id === c.assignedModuleId,
            );
            return (
              <div
                key={c.id}
                className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl">👨‍🚀</span>
                  <span
                    className={`text-[10px] font-semibold ${c.assignedModuleId ? "text-amber-400" : "text-emerald-400"}`}
                  >
                    {c.assignedModuleId ? "Assigned" : "Available"}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white">{c.name}</h3>
                <p className="text-xs text-slate-500">
                  {c.role} · Lv.{c.level}
                  {c.specialty &&
                    ` · ${c.specialty.replace(/_/g, " ").toLowerCase()}`}
                </p>
                <div className="mt-2 flex gap-3 text-[10px]">
                  <span className="text-emerald-400">
                    +{c.outputBonus}% output
                  </span>
                  <span className="text-cyan-400">
                    +{c.efficiencyBonus}% efficiency
                  </span>
                </div>
                {assignedModule && (
                  <p className="mt-2 text-[10px] text-slate-500">
                    → {assignedModule.type.replace(/_/g, " ").toLowerCase()}
                  </p>
                )}

                {/* Assign/unassign controls */}
                <div className="mt-3">
                  {c.assignedModuleId ? (
                    <button
                      onClick={async () => {
                        try {
                          await assignCrew.mutateAsync({
                            crewId: c.id,
                            moduleId: null,
                          });
                          addToast({
                            type: "success",
                            title: `${c.name} unassigned`,
                            icon: "👨‍🚀",
                          });
                        } catch (err) {
                          addToast({
                            type: "error",
                            title: "Unassign failed",
                            message:
                              err instanceof Error
                                ? err.message
                                : "Unknown error",
                            icon: "❌",
                          });
                        }
                      }}
                      disabled={assignCrew.isPending}
                      className="w-full rounded-lg bg-amber-600/10 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-600/20 disabled:opacity-40"
                    >
                      Unassign
                    </button>
                  ) : (
                    <select
                      onChange={async (e) => {
                        if (!e.target.value) return;
                        try {
                          await assignCrew.mutateAsync({
                            crewId: c.id,
                            moduleId: e.target.value,
                          });
                          addToast({
                            type: "success",
                            title: `${c.name} assigned!`,
                            icon: "👨‍🚀",
                          });
                        } catch (err) {
                          addToast({
                            type: "error",
                            title: "Assign failed",
                            message:
                              err instanceof Error
                                ? err.message
                                : "Unknown error",
                            icon: "❌",
                          });
                        }
                        e.target.value = "";
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-400"
                      defaultValue=""
                    >
                      <option value="">Assign to module…</option>
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.type.replace(/_/g, " ").toLowerCase()} (Lv.
                          {m.level})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
