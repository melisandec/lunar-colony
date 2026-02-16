"use client";

/**
 * Skeleton loading state for Colony Map.
 * Grid-shaped placeholders for better perceived performance.
 */

export function ColonySkeleton() {
  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-7 w-40 animate-pulse rounded bg-slate-800" />
          <div className="flex gap-3">
            <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-800" />
            <div className="h-5 w-16 animate-pulse rounded bg-slate-800" />
          </div>
        </div>

        <div
          className="grid gap-2.5 sm:grid-cols-4 md:grid-cols-5"
          style={{ gridTemplateRows: "repeat(4, minmax(0, 1fr))" }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-2xl bg-slate-800/60"
              style={{ animationDelay: `${i * 30}ms` }}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-4 w-16 animate-pulse rounded bg-slate-800/60"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="mb-3 flex justify-between">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-800" />
          </div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-slate-800/50"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
