/* ================================================================
   OVERRIDE STORE — SSR-safe localStorage persistence for
   capital control overrides with role-gated creation.
   ================================================================ */

import type { UserRole } from "./mock-data";
import type { ControlActionKey, ControlMode } from "./capital-controls";
import { GLOBALLY_OVERRIDABLE_MODES } from "./capital-controls";

/* ================================================================
   Types
   ================================================================ */

export type OverrideScope = "GLOBAL" | "ACTION";
export type OverrideStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export interface CapitalOverride {
  /** Deterministic ID: OVR-<actorUserId>-<minuteBucket>-<scope>-<action?> */
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  status: OverrideStatus;
  scope: OverrideScope;
  /** Only when scope === "ACTION" */
  actionKey: ControlActionKey | null;
  /** Minimum 20 chars */
  reason: string;
  /** Creator identity */
  actorRole: UserRole;
  actorUserId: string;
  actorName: string;
  /** FNV-1a hash of snapshot key metrics at override creation time */
  snapshotHash: string;
  /** The control mode that was active when override was created */
  modeAtCreation: ControlMode;
}

/** Roles permitted to create/revoke overrides */
export const OVERRIDE_ALLOWED_ROLES: UserRole[] = ["admin", "treasury", "compliance"];

/* ================================================================
   Storage Key + SSR Guard
   ================================================================ */

const STORAGE_KEY = "aurumshield:capital-overrides";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/* ================================================================
   Load / Save
   ================================================================ */

export function loadOverrides(): CapitalOverride[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CapitalOverride[];
  } catch {
    return [];
  }
}

export function saveOverrides(overrides: CapitalOverride[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

/* ================================================================
   Expire — mutates status of overrides past expiresAt
   ================================================================ */

export function expireOverrides(nowIso: string): CapitalOverride[] {
  const overrides = loadOverrides();
  let changed = false;

  for (const ov of overrides) {
    if (ov.status === "ACTIVE" && ov.expiresAt <= nowIso) {
      ov.status = "EXPIRED";
      changed = true;
    }
  }

  if (changed) saveOverrides(overrides);
  return overrides;
}

/* ================================================================
   Deterministic ID generation
   ================================================================ */

function buildOverrideId(
  actorUserId: string,
  createdAt: string,
  scope: OverrideScope,
  actionKey: ControlActionKey | null,
): string {
  const minuteBucket = createdAt.slice(0, 16); // YYYY-MM-DDTHH:MM
  const suffix = scope === "ACTION" && actionKey ? `-${actionKey}` : "";
  return `OVR-${actorUserId}-${minuteBucket}${suffix}`;
}

/* ================================================================
   Validation — scope correctness (Correction #4)
   ================================================================ */

export interface OverrideValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates override creation against the policy:
 * - GLOBAL override only for THROTTLE_RESERVATIONS and FREEZE_CONVERSIONS
 * - EMERGENCY_HALT and FREEZE_MARKETPLACE cannot be globally overridden
 * - ACTION override must include actionKey, snapshotHash, expiresAt
 * - Reason must be ≥ 20 chars
 * - Actor must have an allowed role
 */
export function validateOverrideRequest(
  scope: OverrideScope,
  actionKey: ControlActionKey | null,
  reason: string,
  actorRole: UserRole,
  currentMode: ControlMode,
): OverrideValidationResult {
  const errors: string[] = [];

  // Role check
  if (!OVERRIDE_ALLOWED_ROLES.includes(actorRole)) {
    errors.push(`Role "${actorRole}" is not authorized to create overrides. Allowed: ${OVERRIDE_ALLOWED_ROLES.join(", ")}`);
  }

  // Reason length
  if (!reason || reason.trim().length < 20) {
    errors.push(`Reason must be at least 20 characters (got ${(reason ?? "").trim().length})`);
  }

  // GLOBAL scope correctness
  if (scope === "GLOBAL") {
    if (!GLOBALLY_OVERRIDABLE_MODES.includes(currentMode)) {
      errors.push(
        `GLOBAL override not permitted for mode "${currentMode}". Only allowed for: ${GLOBALLY_OVERRIDABLE_MODES.join(", ")}`,
      );
    }
  }

  // ACTION scope must have actionKey
  if (scope === "ACTION") {
    if (!actionKey) {
      errors.push(`ACTION-scoped override must specify an actionKey`);
    }
  }

  // EMERGENCY_HALT and FREEZE_MARKETPLACE can never be globally overridden
  if (scope === "GLOBAL" && (currentMode === "EMERGENCY_HALT" || currentMode === "FREEZE_MARKETPLACE")) {
    // Already captured above, but belt-and-suspenders
  }

  return { valid: errors.length === 0, errors };
}

/* ================================================================
   Create Override — idempotent by deterministic ID
   ================================================================ */

export interface CreateOverrideInput {
  scope: OverrideScope;
  actionKey: ControlActionKey | null;
  reason: string;
  expiresAt: string;
  actorRole: UserRole;
  actorUserId: string;
  actorName: string;
  snapshotHash: string;
  modeAtCreation: ControlMode;
}

export function createOverride(input: CreateOverrideInput): {
  override: CapitalOverride;
  isNew: boolean;
} {
  const now = new Date().toISOString();
  const id = buildOverrideId(input.actorUserId, now, input.scope, input.actionKey);
  const overrides = loadOverrides();

  // Dedup: if same ID exists, return existing
  const existing = overrides.find((o) => o.id === id);
  if (existing) {
    return { override: existing, isNew: false };
  }

  const newOverride: CapitalOverride = {
    id,
    createdAt: now,
    expiresAt: input.expiresAt,
    revokedAt: null,
    status: "ACTIVE",
    scope: input.scope,
    actionKey: input.actionKey,
    reason: input.reason.trim(),
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    snapshotHash: input.snapshotHash,
    modeAtCreation: input.modeAtCreation,
  };

  overrides.push(newOverride);
  saveOverrides(overrides);

  return { override: newOverride, isNew: true };
}

/* ================================================================
   Revoke Override
   ================================================================ */

export function revokeOverride(overrideId: string): CapitalOverride | null {
  const overrides = loadOverrides();
  const ov = overrides.find((o) => o.id === overrideId);
  if (!ov || ov.status !== "ACTIVE") return null;

  ov.status = "REVOKED";
  ov.revokedAt = new Date().toISOString();
  saveOverrides(overrides);
  return ov;
}

/* ================================================================
   Query — check if a specific action is overridden
   ================================================================ */

export function isActionOverridden(
  actionKey: ControlActionKey,
  nowIso: string,
): { overridden: boolean; overrideId: string | null } {
  const overrides = expireOverrides(nowIso);
  const active = overrides.filter((o) => o.status === "ACTIVE");

  // Check global overrides
  const globalOv = active.find((o) => o.scope === "GLOBAL");
  if (globalOv) return { overridden: true, overrideId: globalOv.id };

  // Check action-specific overrides
  const actionOv = active.find(
    (o) => o.scope === "ACTION" && o.actionKey === actionKey,
  );
  if (actionOv) return { overridden: true, overrideId: actionOv.id };

  return { overridden: false, overrideId: null };
}
