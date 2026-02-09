"use client";

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          🎯 Corporation Projects
        </h2>
        <p className="text-sm text-slate-400">
          Collaborate on shared goals with your corporation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            name: "Mega Solar Array",
            progress: 68,
            members: 12,
            reward: "5,000 🌙",
          },
          {
            name: "Deep Core Mining",
            progress: 34,
            members: 8,
            reward: "3,500 🌙",
          },
        ].map((p) => (
          <div
            key={p.name}
            className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4"
          >
            <h3 className="text-sm font-semibold text-white">{p.name}</h3>
            <p className="mb-3 text-xs text-slate-500">
              {p.members} contributors · Reward: {p.reward}
            </p>
            <div className="h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-cyan-500 transition-all"
                style={{ width: `${p.progress}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-slate-500">
              {p.progress}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
