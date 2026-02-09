"use client";

export default function TournamentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">🏆 Tournament</h2>
        <p className="text-sm text-slate-400">
          Compete against other corporations for glory and rewards.
        </p>
      </div>

      {/* Current tournament */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <h3 className="mb-1 text-sm font-semibold text-amber-400">
          🏆 Season 3 — Lunar Rush
        </h3>
        <p className="mb-3 text-xs text-slate-400">Ends in 5 days</p>
        <div className="space-y-2">
          {[
            { rank: 1, name: "Nova Corp", score: "42,500" },
            { rank: 2, name: "Stellar Industries", score: "38,200" },
            { rank: 3, name: "Your Corporation", score: "35,800" },
          ].map((t) => (
            <div
              key={t.rank}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                t.rank === 3 ? "bg-cyan-500/10 text-cyan-400" : "text-slate-300"
              }`}
            >
              <span className="w-6 text-center font-bold">#{t.rank}</span>
              <span className="flex-1">{t.name}</span>
              <span className="text-xs text-slate-500">{t.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
