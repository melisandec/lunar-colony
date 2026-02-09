"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Dashboard root — redirect to Colony Map (the default view). */
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/colony");
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-pulse text-slate-500">Loading colony…</div>
    </div>
  );
}
