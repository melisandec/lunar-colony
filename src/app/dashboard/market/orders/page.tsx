"use client";

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">📋 Open Orders</h2>
        <p className="text-sm text-slate-400">
          Track and manage your active market orders.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/40 text-left text-xs text-slate-500">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800/20">
              <td className="px-4 py-3">
                <span className="text-emerald-400">Buy</span>
              </td>
              <td className="px-4 py-3">Helium-3</td>
              <td className="px-4 py-3">100</td>
              <td className="px-4 py-3">12.5 🌙</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                  Pending
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <span className="text-rose-400">Sell</span>
              </td>
              <td className="px-4 py-3">Iron Ore</td>
              <td className="px-4 py-3">250</td>
              <td className="px-4 py-3">8.2 🌙</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                  Pending
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
