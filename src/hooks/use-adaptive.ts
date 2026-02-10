"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionType =
  | "4g"
  | "3g"
  | "2g"
  | "slow-2g"
  | "wifi"
  | "ethernet"
  | "unknown";

export type ConnectionQuality = "high" | "medium" | "low" | "offline";

export interface NetworkInfo {
  /** Is the device online */
  online: boolean;
  /** Effective connection type */
  connectionType: ConnectionType;
  /** Estimated downlink bandwidth in Mbps */
  downlink: number;
  /** Estimated round-trip time in ms */
  rtt: number;
  /** Whether the user has requested data saving */
  saveData: boolean;
  /** Computed quality tier */
  quality: ConnectionQuality;
}

export interface BatteryInfo {
  /** Is the Battery API supported */
  supported: boolean;
  /** Current battery level 0–1 */
  level: number;
  /** Is the device currently charging */
  charging: boolean;
  /** Is battery low (< 20%) */
  isLow: boolean;
  /** Is battery critical (< 10%) */
  isCritical: boolean;
}

export interface AdaptiveFlags {
  /** Should animations be reduced (low battery or reduce-motion pref) */
  reduceAnimations: boolean;
  /** Should images use lower quality */
  reducedImageQuality: boolean;
  /** Should auto-refresh be paused */
  pauseAutoRefresh: boolean;
  /** Should heavy computations be deferred */
  deferHeavyWork: boolean;
  /** Optimal image format quality 0–100 */
  imageQuality: number;
  /** Should prefetching be disabled */
  disablePrefetch: boolean;
}

// ---------------------------------------------------------------------------
// Network Connection API types (not in TS lib)
// ---------------------------------------------------------------------------

interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  type?: string;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

// ---------------------------------------------------------------------------
// Battery API types
// ---------------------------------------------------------------------------

interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

// ---------------------------------------------------------------------------
// useNetwork
// ---------------------------------------------------------------------------

function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection
  );
}

function computeQuality(
  ct: ConnectionType,
  online: boolean,
): ConnectionQuality {
  if (!online) return "offline";
  switch (ct) {
    case "4g":
    case "wifi":
    case "ethernet":
      return "high";
    case "3g":
      return "medium";
    case "2g":
    case "slow-2g":
      return "low";
    default:
      return "medium";
  }
}

export function useNetwork(): NetworkInfo {
  const getInfo = useCallback((): NetworkInfo => {
    if (typeof navigator === "undefined") {
      return {
        online: true,
        connectionType: "unknown",
        downlink: 10,
        rtt: 50,
        saveData: false,
        quality: "high",
      };
    }

    const conn = getConnection();
    const ct = (conn?.effectiveType ?? "unknown") as ConnectionType;
    const online = navigator.onLine;

    return {
      online,
      connectionType: ct,
      downlink: conn?.downlink ?? 10,
      rtt: conn?.rtt ?? 50,
      saveData: conn?.saveData ?? false,
      quality: computeQuality(ct, online),
    };
  }, []);

  const [network, setNetwork] = useState<NetworkInfo>(getInfo);

  useEffect(() => {
    const update = () => setNetwork(getInfo());

    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    const conn = getConnection();
    conn?.addEventListener("change", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      conn?.removeEventListener("change", update);
    };
  }, [getInfo]);

  return network;
}

// ---------------------------------------------------------------------------
// useBattery
// ---------------------------------------------------------------------------

export function useBattery(): BatteryInfo {
  const [battery, setBattery] = useState<BatteryInfo>({
    supported: false,
    level: 1,
    charging: true,
    isLow: false,
    isCritical: false,
  });

  useEffect(() => {
    let manager: BatteryManager | null = null;

    async function init() {
      try {
        if (typeof navigator === "undefined") return;
        // @ts-expect-error — getBattery is not in all TS libs
        if (!navigator.getBattery) return;

        // @ts-expect-error — getBattery returns a BatteryManager promise
        manager = (await navigator.getBattery()) as BatteryManager;
        const update = () => {
          if (!manager) return;
          setBattery({
            supported: true,
            level: manager.level,
            charging: manager.charging,
            isLow: manager.level < 0.2 && !manager.charging,
            isCritical: manager.level < 0.1 && !manager.charging,
          });
        };

        update();
        manager.addEventListener("levelchange", update);
        manager.addEventListener("chargingchange", update);
      } catch {
        // Battery API not available — keep defaults
      }
    }

    init();

    return () => {
      if (manager) {
        manager.removeEventListener("levelchange", () => {});
        manager.removeEventListener("chargingchange", () => {});
      }
    };
  }, []);

  return battery;
}

// ---------------------------------------------------------------------------
// useAdaptive — combines device, network, and battery signals
// ---------------------------------------------------------------------------

export function useAdaptive(): AdaptiveFlags {
  const network = useNetwork();
  const battery = useBattery();

  return useMemo(() => {
    const lowBattery = battery.isLow;
    const criticalBattery = battery.isCritical;
    const poorNetwork =
      network.quality === "low" || network.quality === "offline";
    const mediumNetwork = network.quality === "medium";
    const saveData = network.saveData;

    return {
      reduceAnimations: lowBattery || criticalBattery || saveData,
      reducedImageQuality: poorNetwork || saveData || criticalBattery,
      pauseAutoRefresh: criticalBattery || !network.online,
      deferHeavyWork: lowBattery || poorNetwork,
      imageQuality:
        criticalBattery || poorNetwork
          ? 40
          : lowBattery || mediumNetwork || saveData
            ? 60
            : 85,
      disablePrefetch: saveData || poorNetwork || criticalBattery,
    };
  }, [network, battery]);
}
