"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Dashboard root — redirect to Colony Map (the default view). Preserves ?fid= for demo flow. */
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const fidParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("fid") : null;
    const path = fidParam ? `/dashboard/colony?fid=${fidParam}` : "/dashboard/colony";
    router.replace(path);
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-pulse text-slate-500">Loading colony…</div>
    </div>
  );
}
