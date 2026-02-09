"use client";

export default function CrewPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">👨‍🚀 Crew Roster</h2>
        <p className="text-sm text-slate-400">
          Assign crew members to modules and manage their specialisations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder crew cards */}
        {["Engineer", "Geologist", "Botanist", "Medic"].map((role) => (
          <div
            key={role}
            className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4"
          >
            <div className="mb-2 text-2xl">👨‍🚀</div>
            <h3 className="text-sm font-semibold text-white">{role}</h3>
            <p className="text-xs text-slate-500">Unassigned</p>
          </div>
        ))}
      </div>
    </div>
  );
}
