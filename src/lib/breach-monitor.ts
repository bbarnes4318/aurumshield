/* ================================================================
   BREACH MONITOR — Deterministic, idempotent breach event generation
   Evaluates an IntradayCapitalSnapshot and produces governance alerts.
   Each event has a deterministic ID for dedup.
   ================================================================ */

import type { IntradayCapitalSnapshot } from "./capital-engine";
import { TARGET_ECR } from "./capital-engine";
import { appendBreachEvent, type BreachEvent, type BreachEventType } from "./breach-store";
import { appendAuditEvent } from "./audit-store";

// Re-export types for convenience
export type { BreachEvent, BreachEventType };

/* ---------- Deterministic ID generation ---------- */

/**
 * Derives a deterministic breach event ID from:
 * - type
 * - minute bucket (ISO truncated to minute)
 * - breach level
 * - key metric values (rounded to 4 decimals)
 *
 * This ensures that the same breach condition in the same minute
 * will always produce the same ID, enabling idempotent dedup.
 */
function deriveBreachId(
  type: BreachEventType,
  occurredAt: string,
  snapshot: IntradayCapitalSnapshot,
): string {
  const minuteBucket = occurredAt.slice(0, 16); // e.g., "2026-02-17T02:30"
  const huRounded = snapshot.hardstopUtilization.toFixed(4);
  const ecrRounded = snapshot.ecr.toFixed(4);
  const raw = `${type}|${minuteBucket}|${snapshot.breachLevel}|${huRounded}|${ecrRounded}`;
  // Simple deterministic hash (FNV-1a-like)
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `brch-${(h >>> 0).toString(16).padStart(8, "0")}`;
}

/* ---------- Audit instrumentation ---------- */

function emitAuditEvent(event: BreachEvent): void {
  const topDriverIds = event.snapshot.topDrivers
    .filter((d) => d.id)
    .map((d) => d.id!)
    .join(",");

  appendAuditEvent({
    occurredAt: event.occurredAt,
    actorRole: "system",
    actorUserId: null,
    action: "CAPITAL_BREACH_DETECTED",
    resourceType: "CAPITAL",
    resourceId: event.id,
    ip: null,
    userAgent: null,
    result: "SUCCESS",
    severity:
      event.level === "CRITICAL"
        ? "critical"
        : event.level === "WARN"
          ? "warning"
          : "info",
    message: event.message,
    metadata: {
      breachType: event.type,
      hardstopUtilization: Number(
        event.snapshot.hardstopUtilization.toFixed(4),
      ),
      ecr: Number(event.snapshot.ecr.toFixed(4)),
      topDriverIds,
    },
  });
}

/* ================================================================
   evaluateBreachEvents — Main entry point
   Evaluates a snapshot and returns NEW breach events (deduped).
   ================================================================ */

export function evaluateBreachEvents(
  snapshot: IntradayCapitalSnapshot,
  existingEvents: BreachEvent[],
): BreachEvent[] {
  const newEvents: BreachEvent[] = [];
  const now = snapshot.asOf;

  // Build a set of existing IDs for dedupe check
  const existingIds = new Set(existingEvents.map((e) => e.id));

  function maybeEmit(
    type: BreachEventType,
    level: "INFO" | "WARN" | "CRITICAL",
    message: string,
  ): void {
    const id = deriveBreachId(type, now, snapshot);
    if (existingIds.has(id)) return; // Already emitted — idempotent skip
    const event: BreachEvent = {
      id,
      occurredAt: now,
      type,
      level,
      message,
      snapshot: structuredClone(snapshot),
    };
    // Persist to breach store (also dedupes internally)
    const appended = appendBreachEvent(event);
    if (appended) {
      // Emit audit event for governance trail
      emitAuditEvent(event);
      newEvents.push(event);
    }
  }

  /* ── ECR checks ── */
  if (snapshot.ecr >= TARGET_ECR * 1.2) {
    // Severe ECR breach (20% over target)
    maybeEmit(
      "ECR_BREACH",
      "CRITICAL",
      `ECR ${snapshot.ecr.toFixed(2)}x exceeds ${(TARGET_ECR * 1.2).toFixed(1)}x critical threshold (target: ${TARGET_ECR}x)`,
    );
  } else if (snapshot.ecr >= TARGET_ECR) {
    maybeEmit(
      "ECR_CAUTION",
      "WARN",
      `ECR ${snapshot.ecr.toFixed(2)}x exceeds target ${TARGET_ECR.toFixed(1)}x`,
    );
  }

  /* ── Hardstop checks ── */
  if (snapshot.hardstopUtilization >= 0.95) {
    maybeEmit(
      "HARDSTOP_BREACH",
      "CRITICAL",
      `Hardstop utilization ${(snapshot.hardstopUtilization * 100).toFixed(2)}% ≥ 95% — BREACH`,
    );
  } else if (snapshot.hardstopUtilization >= 0.8) {
    maybeEmit(
      "HARDSTOP_CAUTION",
      "WARN",
      `Hardstop utilization ${(snapshot.hardstopUtilization * 100).toFixed(2)}% in 80–95% caution band`,
    );
  }

  /* ── Buffer check ── */
  if (snapshot.bufferVsTvar99 < 0) {
    maybeEmit(
      "BUFFER_NEGATIVE",
      "WARN",
      `Buffer vs TVaR₉₉ is negative: -$${Math.abs(snapshot.bufferVsTvar99).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    );
  }

  return newEvents;
}
