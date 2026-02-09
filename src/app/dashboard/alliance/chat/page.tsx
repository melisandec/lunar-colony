"use client";

export default function ChatPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">💬 Corporation Chat</h2>
        <p className="text-sm text-slate-400">
          Communicate with your corporation members.
        </p>
      </div>

      <div className="flex flex-1 flex-col rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
        {/* Messages area */}
        <div className="flex-1 space-y-3 pb-4">
          {[
            {
              user: "Commander_X",
              msg: "Who needs Helium-3? Got a surplus.",
              time: "2m ago",
            },
            {
              user: "LunarMiner42",
              msg: "I'll take 200 units!",
              time: "1m ago",
            },
            {
              user: "StarBase_Alpha",
              msg: "Market prices looking good today 📈",
              time: "30s ago",
            },
          ].map((m, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-400">
                {m.user[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    {m.user}
                  </span>
                  <span className="text-[10px] text-slate-600">{m.time}</span>
                </div>
                <p className="text-sm text-slate-300">{m.msg}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2 border-t border-slate-800/40 pt-3">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <button className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-400 hover:bg-cyan-500/30 transition-colors">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
