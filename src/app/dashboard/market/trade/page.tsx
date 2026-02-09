"use client";

export default function TradePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">💱 Buy / Sell</h2>
        <p className="text-sm text-slate-400">
          Execute trades on the Lunar Market.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Buy panel */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-emerald-400">
            Buy Resources
          </h3>
          <div className="space-y-3">
            <select className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
              <option>Helium-3</option>
              <option>Iron Ore</option>
              <option>Water Ice</option>
            </select>
            <input
              type="number"
              placeholder="Amount"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <button className="w-full rounded-lg bg-emerald-500/20 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors">
              Place Buy Order
            </button>
          </div>
        </div>

        {/* Sell panel */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-rose-400">
            Sell Resources
          </h3>
          <div className="space-y-3">
            <select className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
              <option>Helium-3</option>
              <option>Iron Ore</option>
              <option>Water Ice</option>
            </select>
            <input
              type="number"
              placeholder="Amount"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <button className="w-full rounded-lg bg-rose-500/20 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/30 transition-colors">
              Place Sell Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
