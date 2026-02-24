/* ================================================================
   COMPLIANCE EVENTS — Logging, Querying & In-Memory Pub/Sub
   ================================================================
   Provides:
     1. appendComplianceEvent() — idempotent DB insert
     2. getEventsForCase()      — query events for timeline
     3. publishCaseEvent()      — push to in-memory subscribers
     4. subscribeCaseEvents()   — register SSE listener
     5. KEEP_ALIVE_MS           — SSE keep-alive interval

   The pub/sub layer is intentionally in-memory (process-scoped).
   For multi-instance deployments, swap to Redis pub/sub or
   PostgreSQL LISTEN/NOTIFY.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import type {
  ComplianceEvent,
  ComplianceEventActor,
} from "./models";
import { eventRowToDomain } from "./models";

/* ── Constants ── */

export const KEEP_ALIVE_MS = 30_000;

/* ── In-Memory Event Bus ── */

interface CaseEventPayload {
  caseId: string;
  event: ComplianceEvent;
}

type EventCallback = (payload: CaseEventPayload) => void;

/**
 * Map of userId → Set<callback>. Each SSE stream registers a
 * callback here and removes it on disconnect.
 */
const subscribers = new Map<string, Set<EventCallback>>();

/**
 * Publish a compliance event to all active SSE connections for
 * the given userId.
 */
export function publishCaseEvent(
  userId: string,
  caseId: string,
  event: ComplianceEvent,
): void {
  const userSubs = subscribers.get(userId);
  if (!userSubs || userSubs.size === 0) return;

  const payload: CaseEventPayload = { caseId, event };
  for (const cb of userSubs) {
    try {
      cb(payload);
    } catch (err) {
      console.warn("[COMPLIANCE] Event callback failed:", err);
    }
  }
}

/**
 * Subscribe to compliance events for a user. Returns an
 * unsubscribe function.
 */
export function subscribeCaseEvents(
  userId: string,
  callback: EventCallback,
): () => void {
  if (!subscribers.has(userId)) {
    subscribers.set(userId, new Set());
  }
  const userSubs = subscribers.get(userId)!;
  userSubs.add(callback);

  return () => {
    userSubs.delete(callback);
    if (userSubs.size === 0) {
      subscribers.delete(userId);
    }
  };
}

/* ── Database Operations ── */

interface EventRow {
  id: string;
  case_id: string;
  event_id: string;
  actor: ComplianceEventActor;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * Append a compliance event to the audit log.
 *
 * Idempotent: if an event with the same event_id already exists,
 * the insert is silently skipped (ON CONFLICT DO NOTHING).
 *
 * @returns The event record, or null if it was a duplicate.
 */
export async function appendComplianceEvent(
  caseId: string,
  eventId: string,
  actor: ComplianceEventActor,
  action: string,
  details: Record<string, unknown> = {},
): Promise<ComplianceEvent | null> {
  const { getDbClient } = await import("@/lib/db");
  const client = await getDbClient();

  try {
    const { rows } = await client.query<EventRow>(
      `INSERT INTO compliance_events (case_id, event_id, actor, action, details)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING *`,
      [caseId, eventId, actor, action, JSON.stringify(details)],
    );

    if (rows.length === 0) {
      console.log(
        `[COMPLIANCE] Event ${eventId} already exists — idempotent skip`,
      );
      return null;
    }

    console.log(
      `[COMPLIANCE] Case ${caseId}: ${action} (actor=${actor}, eventId=${eventId})`,
    );

    return eventRowToDomain(rows[0]);
  } finally {
    try { await client.end(); } catch { /* ignore cleanup */ }
  }
}

/**
 * Retrieve all events for a compliance case, ordered by creation time.
 * Optionally filter to events after a given timestamp.
 */
export async function getEventsForCase(
  caseId: string,
  sinceTimestamp?: string,
): Promise<ComplianceEvent[]> {
  const { getDbClient } = await import("@/lib/db");
  const client = await getDbClient();

  try {
    const whereClause = sinceTimestamp
      ? "WHERE case_id = $1 AND created_at > $2"
      : "WHERE case_id = $1";
    const values: unknown[] = sinceTimestamp
      ? [caseId, sinceTimestamp]
      : [caseId];

    const { rows } = await client.query<EventRow>(
      `SELECT * FROM compliance_events ${whereClause} ORDER BY created_at ASC`,
      values,
    );

    return rows.map(eventRowToDomain);
  } finally {
    try { await client.end(); } catch { /* ignore cleanup */ }
  }
}
