import { notFound } from "next/navigation";
import gameEngine from "@/lib/game-engine";
import { formatLunar, formatNumber } from "@/lib/utils";

/**
 * Dynamic player profile page: /[fid]
 * Shows a public view of a player's colony.
 */
export default async function PlayerProfile({
  params,
}: {
  params: Promise<{ fid: string }>;
}) {
  const { fid: fidStr } = await params;
  const fid = parseInt(fidStr, 10);

  if (isNaN(fid) || fid <= 0) {
    notFound();
  }

  try {
    const player = await gameEngine.getOrCreatePlayer(fid);
    const state = gameEngine.calculateColonyState(player);

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white">
        <div className="mx-auto max-w-2xl px-4 py-12">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold">🌙 {state.colonyName}</h1>
            <p className="mt-2 text-lg text-indigo-300">
              Player: {player.username} (FID: {player.fid})
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="$LUNAR Balance"
              value={formatLunar(state.lunarBalance)}
              icon="💰"
            />
            <StatCard
              label="Production/tick"
              value={`${formatNumber(state.productionRate)}/tick`}
              icon="⚡"
            />
            <StatCard
              label="Modules"
              value={`${state.modules.length}`}
              icon="🏗️"
            />
            <StatCard label="Colony Level" value={`${state.level}`} icon="⭐" />
          </div>

          {/* Modules List */}
          <div className="rounded-xl border border-indigo-800 bg-slate-900/50 p-6">
            <h2 className="mb-4 text-xl font-semibold">Modules</h2>
            {state.modules.length === 0 ? (
              <p className="text-slate-400">No modules built yet.</p>
            ) : (
              <div className="grid gap-3">
                {state.modules.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between rounded-lg border border-indigo-900 bg-slate-800/50 p-3"
                  >
                    <div>
                      <span className="font-medium capitalize">
                        {mod.type.replace("_", " ")}
                      </span>
                      <span className="ml-2 text-sm text-slate-400">
                        Lv.{mod.level}
                      </span>
                    </div>
                    <div className="text-sm text-emerald-400">
                      +{mod.productionRate}/tick
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Earnings */}
          {state.pendingEarnings > 0 && (
            <div className="mt-6 rounded-xl border border-emerald-800 bg-emerald-900/20 p-4 text-center">
              <p className="text-emerald-300">
                ⏳ Pending: +{formatLunar(state.pendingEarnings)}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Open the Frame to collect!
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 text-center">
            <p className="text-slate-400">
              Play Lunar Colony Tycoon on Farcaster to build your own colony!
            </p>
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-indigo-800 bg-slate-900/50 p-4 text-center">
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
