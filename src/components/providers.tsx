"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, type ReactNode } from "react";
import { useAdaptive } from "@/hooks/use-adaptive";

export function Providers({ children }: { children: ReactNode }) {
  const adaptive = useAdaptive();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // 30s — game ticks every 5 min
            refetchInterval: 60_000, // auto-refresh every 60s
            retry: 2,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  // Adapt query behaviour based on battery/network conditions
  useEffect(() => {
    queryClient.setDefaultOptions({
      queries: {
        staleTime: adaptive.pauseAutoRefresh ? 120_000 : 30_000,
        refetchInterval: adaptive.pauseAutoRefresh
          ? false // stop auto-refresh when battery critical / offline
          : adaptive.deferHeavyWork
            ? 120_000 // slow down refresh on poor connections
            : 60_000,
        retry: adaptive.deferHeavyWork ? 1 : 2,
        refetchOnWindowFocus: !adaptive.pauseAutoRefresh,
      },
    });
  }, [queryClient, adaptive.pauseAutoRefresh, adaptive.deferHeavyWork]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
