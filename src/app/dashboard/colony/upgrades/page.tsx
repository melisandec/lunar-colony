"use client";

export default function UpgradesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">⬆️ Upgrades</h2>
        <p className="text-sm text-slate-400">
          Enhance your modules and colony infrastructure.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            name: "Solar Efficiency II",
            cost: "350 🌙",
            desc: "+15% power output",
          },
          {
            name: "Mining Drill III",
            cost: "500 🌙",
            desc: "+20% ore extraction",
          },
          {
            name: "Hab Expansion",
            cost: "800 🌙",
            desc: "+4 crew capacity",
          },
          {
            name: "Storage Vault",
            cost: "600 🌙",
            desc: "+1000 storage capacity",
          },
        ].map((u) => (
          <div
            key={u.name}
            className="flex items-center gap-4 rounded-xl border border-slate-800/60 bg-slate-900/50 p-4"
          >
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">{u.name}</h3>
              <p className="text-xs text-slate-500">{u.desc}</p>
            </div>
            <button className="rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-500/30 transition-colors">
              {u.cost}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
