"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useColony } from "@/hooks/use-colony";
import { useLeaderboard } from "@/hooks/use-events";
import { useUIStore } from "@/stores/ui-store";
import {
  usePlayerAlliance,
  useAllianceList,
  useCreateAlliance,
  useJoinAlliance,
  useLeaveAlliance,
} from "@/hooks/use-alliance";

// ---------------------------------------------------------------------------
// Alliance Dashboard Page
// ---------------------------------------------------------------------------

export default function AlliancePage() {
  const { data: colony, isLoading } = useColony();
  const { data: leaderboard } = useLeaderboard("WEEKLY");
  const { data: alliance, isLoading: allianceLoading } = usePlayerAlliance();
  const isLoadingAny = isLoading || allianceLoading;
  const { data: alliances } = useAllianceList();
  const createAlliance = useCreateAlliance();
  const joinAlliance = useJoinAlliance();
  const leaveAlliance = useLeaveAlliance();
  const addToast = useUIStore((s) => s.addToast);

  const [allianceName, setAllianceName] = useState("");
  const [allianceDesc, setAllianceDesc] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "members" | "leaderboard"
  >("overview");

  const hasAlliance = !!alliance;

  // Leaderboard entries
  const topPlayers = useMemo(() => {
    if (!leaderboard?.entries) return [];
    return leaderboard.entries.slice(0, 20);
  }, [leaderboard]);

  if (isLoadingAny) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading alliance…</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 lg:p-6">
      <h1 className="text-xl font-bold">
        <span className="mr-2">🤝</span>Alliance
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-800 p-0.5">
        {(["overview", "members", "leaderboard"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md py-2 text-sm font-medium capitalize transition ${
              activeTab === tab
                ? "bg-slate-800 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab === "overview"
              ? "🏠 Overview"
              : tab === "members"
                ? "👥 Members"
                : "🏆 Leaderboard"}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {hasAlliance ? (
            <>
              {/* Alliance info cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Alliance"
                  value={alliance.name}
                  sub={`Lv ${alliance.level}`}
                  icon="🏰"
                />
                <StatCard
                  label="Members"
                  value={`${alliance.memberCount}/${alliance.maxMembers}`}
                  icon="👥"
                />
                <StatCard
                  label="Treasury"
                  value={`${alliance.totalLunar.toLocaleString()} $L`}
                  icon="💰"
                />
                <StatCard
                  label="Level"
                  value={String(alliance.level)}
                  icon="⚡"
                />
              </div>

              {/* Leave alliance button */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">
                      {alliance.description ?? "No description set."}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await leaveAlliance.mutateAsync();
                        addToast({
                          type: "info",
                          title: "Left alliance",
                          icon: "👋",
                        });
                      } catch (err) {
                        addToast({
                          type: "error",
                          title: "Leave failed",
                          message:
                            err instanceof Error
                              ? err.message
                              : "Unknown error",
                          icon: "❌",
                        });
                      }
                    }}
                    disabled={leaveAlliance.isPending}
                    className="shrink-0 rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-600/20 disabled:opacity-40"
                  >
                    {leaveAlliance.isPending ? "Leaving…" : "Leave Alliance"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* No alliance — join or create */
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center">
                <span className="mb-3 block text-4xl">🤝</span>
                <h2 className="text-lg font-bold text-white">
                  No Alliance Yet
                </h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
                  Join an alliance to combine forces with other players.
                  Alliance members share production bonuses and compete together
                  on the leaderboard.
                </p>
              </div>

              {/* Create alliance form */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-300">
                  Create Alliance (1,000 $LUNAR)
                </h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Alliance name"
                    value={allianceName}
                    onChange={(e) => setAllianceName(e.target.value)}
                    maxLength={24}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={allianceDesc}
                    onChange={(e) => setAllianceDesc(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    onClick={async () => {
                      try {
                        await createAlliance.mutateAsync({
                          name: allianceName,
                          description: allianceDesc || undefined,
                        });
                        addToast({
                          type: "success",
                          title: `Alliance "${allianceName}" created!`,
                          icon: "🏰",
                        });
                        setAllianceName("");
                        setAllianceDesc("");
                      } catch (err) {
                        addToast({
                          type: "error",
                          title: "Create failed",
                          message:
                            err instanceof Error
                              ? err.message
                              : "Unknown error",
                          icon: "❌",
                        });
                      }
                    }}
                    disabled={
                      allianceName.length < 3 || createAlliance.isPending
                    }
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40"
                  >
                    {createAlliance.isPending ? "Creating…" : "Create"}
                  </button>
                </div>
              </div>

              {/* Browse alliances list */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-300">
                  Browse Alliances
                </h3>
                {alliances && alliances.length > 0 ? (
                  <div className="space-y-2">
                    {alliances
                      .filter((a) => a.memberCount < a.maxMembers)
                      .map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-medium text-white">
                              🏰 {a.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Lv.{a.level} · {a.memberCount}/{a.maxMembers}{" "}
                              members
                              {a.description && ` · ${a.description}`}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await joinAlliance.mutateAsync(a.id);
                                addToast({
                                  type: "success",
                                  title: `Joined ${a.name}!`,
                                  icon: "🤝",
                                });
                              } catch (err) {
                                addToast({
                                  type: "error",
                                  title: "Join failed",
                                  message:
                                    err instanceof Error
                                      ? err.message
                                      : "Unknown error",
                                  icon: "❌",
                                });
                              }
                            }}
                            disabled={joinAlliance.isPending}
                            className="shrink-0 rounded-lg bg-cyan-600/20 px-3 py-1.5 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-600/30 disabled:opacity-40"
                          >
                            {joinAlliance.isPending ? "Joining…" : "Join"}
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-slate-500">
                    No alliances available yet. Be the first to create one!
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Members tab */}
      {activeTab === "members" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {hasAlliance ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-300">
                Alliance Members ({alliance.memberCount}/{alliance.maxMembers})
              </h3>
              <div className="space-y-1">
                {alliance.members.map((m) => {
                  const roleIcon =
                    m.role === "LEADER"
                      ? "👑"
                      : m.role === "OFFICER"
                        ? "⭐"
                        : "👤";
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg bg-slate-800/30 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span>{roleIcon}</span>
                        <div>
                          <span className="text-sm font-medium text-white">
                            {m.player.username ?? "Unknown"}
                          </span>
                          <span className="ml-2 text-[10px] text-slate-500">
                            Lv.{m.player.level} · {m.role.toLowerCase()}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs tabular-nums text-slate-400">
                        {Number(m.player.totalEarnings).toLocaleString()} $L
                        earned
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center">
              <span className="mb-2 block text-3xl">👥</span>
              <p className="text-sm text-slate-400">
                Join an alliance to see members.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Leaderboard tab */}
      {activeTab === "leaderboard" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-300">
              🏆 Weekly Leaderboard
            </h3>
            {topPlayers.length > 0 ? (
              <div className="space-y-1">
                {topPlayers.map(
                  (
                    entry: {
                      rank: number;
                      playerName: string;
                      score: number;
                      fid: number;
                    },
                    idx: number,
                  ) => {
                    const medal =
                      idx === 0
                        ? "🥇"
                        : idx === 1
                          ? "🥈"
                          : idx === 2
                            ? "🥉"
                            : null;
                    const isMe = colony?.playerId === String(entry.fid);

                    return (
                      <div
                        key={entry.fid}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                          isMe
                            ? "border border-cyan-500/20 bg-cyan-500/5"
                            : idx % 2 === 0
                              ? "bg-slate-800/20"
                              : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 text-center text-sm font-bold tabular-nums text-slate-500">
                            {medal ?? `#${entry.rank}`}
                          </span>
                          <span
                            className={`text-sm font-medium ${isMe ? "text-cyan-400" : "text-white"}`}
                          >
                            {entry.playerName}{" "}
                            {isMe && (
                              <span className="text-xs text-cyan-500">
                                (you)
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-white">
                          {entry.score.toLocaleString()}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-slate-500">
                No leaderboard data yet.
              </div>
            )}

            {/* Player rank */}
            {leaderboard?.playerRank && (
              <div className="mt-3 border-t border-slate-800 pt-3 text-center text-sm text-slate-400">
                Your rank:{" "}
                <span className="font-bold text-cyan-400">
                  #{leaderboard.playerRank}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Alliance benefits info */}
      <div className="grid gap-3 sm:grid-cols-3">
        <BenefitCard
          icon="⚡"
          title="Production Bonus"
          description="Alliance members get +5% production for each active member"
        />
        <BenefitCard
          icon="🛡️"
          title="Event Protection"
          description="Shared defense during meteor storm events reduces losses"
        />
        <BenefitCard
          icon="🏆"
          title="Alliance Rankings"
          description="Compete as a team on the weekly production leaderboard"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <div className="text-xs text-slate-500">
        {icon} {label}
      </div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <span className="mb-2 block text-2xl">{icon}</span>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}
