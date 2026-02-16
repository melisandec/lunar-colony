/**
 * Input validation helpers for Lunar Colony API routes.
 * Validates and sanitizes user input before database operations.
 */

import {
  GAME_CONSTANTS,
  type ResourceType,
  type ModuleType,
  type Tier,
} from "@/lib/utils";

// --- Constants ---

const MAX_TRADE_QUANTITY = 100_000;
const MIN_TRADE_QUANTITY = 1;
const MAX_ALLIANCE_NAME_LENGTH = 30;
const MIN_ALLIANCE_NAME_LENGTH = 2;
const ALLIANCE_NAME_PATTERN = /^[a-zA-Z0-9\s\-_]+$/;

// --- Trade Input ---

export interface ValidatedTradeInput {
  side: "buy" | "sell";
  resource: ResourceType;
  quantity: number;
}

/** Valid resource names for trade input parsing */
const RESOURCE_ALIASES: Record<string, ResourceType> = {
  regolith: "REGOLITH",
  reg: "REGOLITH",
  water: "WATER_ICE",
  water_ice: "WATER_ICE",
  ice: "WATER_ICE",
  helium: "HELIUM3",
  helium3: "HELIUM3",
  he3: "HELIUM3",
  rare: "RARE_EARTH",
  rare_earth: "RARE_EARTH",
  rareearth: "RARE_EARTH",
};

/**
 * Parse and validate trade input from Frame input text.
 * Format: "<side> <quantity> <resource>" e.g. "buy 10 REGOLITH"
 *
 * @returns Validated trade input or null if invalid
 */
export function validateTradeInput(
  input: string | undefined,
): ValidatedTradeInput | null {
  if (!input || typeof input !== "string") return null;

  const parts = input.trim().toLowerCase().split(/\s+/);
  if (parts.length < 3) return null;

  const sideStr = parts[0];
  if (sideStr !== "buy" && sideStr !== "sell") return null;

  const qty = parseInt(parts[1] ?? "", 10);
  if (
    isNaN(qty) ||
    qty < MIN_TRADE_QUANTITY ||
    qty > MAX_TRADE_QUANTITY
  ) {
    return null;
  }

  const resourceStr = parts.slice(2).join("_");
  const resource = RESOURCE_ALIASES[resourceStr];
  if (!resource) return null;

  return {
    side: sideStr as "buy" | "sell",
    resource,
    quantity: qty,
  };
}

// --- Alliance Input ---

export interface ValidatedAllianceInput {
  name: string;
  description?: string;
}

/**
 * Validate alliance name and optional description.
 *
 * @returns Validated input or null if invalid
 */
export function validateAllianceInput(body: {
  name?: unknown;
  description?: unknown;
}): ValidatedAllianceInput | null {
  const name = body.name;
  if (typeof name !== "string" || !name.trim()) return null;

  const trimmedName = name.trim();
  if (
    trimmedName.length < MIN_ALLIANCE_NAME_LENGTH ||
    trimmedName.length > MAX_ALLIANCE_NAME_LENGTH
  ) {
    return null;
  }

  if (!ALLIANCE_NAME_PATTERN.test(trimmedName)) {
    return null;
  }

  let description: string | undefined;
  if (body.description !== undefined) {
    if (typeof body.description !== "string") return null;
    description = body.description.trim().slice(0, 200); // Max 200 chars
  }

  return { name: trimmedName, description };
}

// --- Module Input ---

/**
 * Validate module type against allowed values.
 */
export function isValidModuleType(value: unknown): value is ModuleType {
  return (
    typeof value === "string" &&
    GAME_CONSTANTS.MODULE_TYPES.includes(value as ModuleType)
  );
}

/**
 * Validate tier against allowed values.
 */
export function isValidTier(value: unknown): value is Tier {
  return (
    typeof value === "string" &&
    GAME_CONSTANTS.TIERS.includes(value as Tier)
  );
}

// --- Numeric Input ---

/**
 * Validate positive integer within bounds.
 */
export function validatePositiveInt(
  value: unknown,
  options: { min?: number; max?: number } = {},
): number | null {
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (isNaN(num) || !Number.isInteger(num) || num < 0) return null;

  const { min = 0, max = Number.MAX_SAFE_INTEGER } = options;
  if (num < min || num > max) return null;

  return num;
}

/**
 * Validate FID (Farcaster ID) - positive integer.
 */
export function validateFid(value: unknown): number | null {
  return validatePositiveInt(value, { min: 1, max: 2 ** 31 - 1 });
}
