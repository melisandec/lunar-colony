"use client";

export default function StoragePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">📦 Storage</h2>
        <p className="text-sm text-slate-400">
          View and manage your colony&apos;s resource inventory.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: "Helium-3", amount: "1,240", icon: "⚡" },
          { name: "Iron Ore", amount: "890", icon: "🪨" },
          { name: "Water Ice", amount: "560", icon: "🧊" },
          { name: "Regolith", amount: "2,100", icon: "🟤" },
        ].map((r) => (
          <div
            key={r.name}
            className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4"
          >
            <div className="mb-2 text-2xl">{r.icon}</div>
            <h3 className="text-sm font-semibold text-white">{r.name}</h3>
            <p className="text-xs text-slate-500">{r.amount} units</p>
          </div>
        ))}
      </div>
    </div>
  );
}
