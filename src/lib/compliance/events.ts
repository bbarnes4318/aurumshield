/* ================================================================
   COMPLIANCE EVENTS — Logging, Querying & Distributed Pub/Sub
   ================================================================
   Provides:
     1. appendComplianceEvent() — idempotent DB insert
     2. getEventsForCase()      — query events for timeline
     3. publishCaseEvent()      — NOTIFY compliance_events on Postgres
     4. subscribeCaseEvents()   — register callback via PG LISTEN
     5. KEEP_ALIVE_MS           — SSE keep-alive interval
     6. Observability metrics   — sse_connection_established,
                                  sse_event_delivered_cross_node

   Pub/Sub layer: PostgreSQL LISTEN/NOTIFY (RSK-008)
     - All nodes share the same RDS connection, so NOTIFY on one
       instance is received by LISTEN on every other instance.
     - Replaces the in-memory Map that silently dropped events
       when webhooks landed on a different ECS task than the one
       serving the user's SSE connection.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import type { ComplianceEvent, ComplianceEventActor } from "./models";
import { eventRowToDomain } from "./models";

/* ── Constants ── */

export const KEEP_ALIVE_MS = 30_000;
const PG_CHANNEL = "compliance_events";

/* ── Observability Metrics ── */

/**
 * Simple counter registry for observability.
 * In production, replace with Datadog/CloudWatch/OTel emitter.
 */
export const metrics = {
  sse_connection_established: 0,
  sse_event_delivered_cross_node: 0,
  pg_listener_reconnects: 0,
  pg_listener_errors: 0,
};

export function emitMetric(
  name: keyof typeof metrics,
  increment: number = 1,
): void {
  metrics[name] += increment;
  // TODO: Forward to Datadog/CloudWatch/OTel
  console.log(`[METRIC] ${name} = ${metrics[name]} (+${increment})`);
}

/* ── Distributed Event Bus — PostgreSQL LISTEN/NOTIFY ── */

/**
 * Payload shape sent through NOTIFY channel.
 * Serialized as JSON, max 8000 bytes per PG spec.
 */
interface PgNotifyPayload {
  userId: string;
  caseId: string;
  event: ComplianceEvent;
  /** Originating node identifier for cross-node tracking */
  sourceNode: string;
}

interface CaseEventPayload {
  caseId: string;
  event: ComplianceEvent;
}

type EventCallback = (payload: CaseEventPayload) => void;

/**
 * Node-unique identifier. Used to detect whether an event was
 * received on the same node that published it (local) or a
 * different node (cross-node).
 */
const NODE_ID =
  process.env.HOSTNAME ||
  process.env.ECS_CONTAINER_METADATA_URI_V4?.split("/").pop() ||
  `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Local subscriber registry. SSE connections on THIS node
 * register here. The PG listener routes inbound NOTIFY
 * payloads to the matching userId callbacks.
 *
 * This is still a Map, but it's populated PER-NODE and the
 * PG LISTEN ensures that events published on ANY node reach
 * every node's subscriber map — solving the distributed problem.
 */
const localSubscribers = new Map<string, Set<EventCallback>>();

/* ── PG Listener Singleton ── */

/**
 * The global PG LISTEN connection. One per node, started lazily
 * on the first subscribeCaseEvents() call and kept alive with
 * automatic reconnect.
 */
let listenerClient: import("pg").Client | null = null;
let listenerReady = false;
let listenerStarting = false;

/**
 * Start the global PG LISTEN connection if not already active.
 * Uses the same getDbClient() factory as the rest of the app,
 * but this client is NEVER ended — it's a long-lived listener.
 */
async function ensureListener(): Promise<void> {
  if (listenerReady || listenerStarting) return;
  listenerStarting = true;

  try {
    const { getDbClient } = await import("@/lib/db");
    const client = await getDbClient();
    listenerClient = client;

    // Register the notification handler
    client.on("notification", (msg) => {
      if (msg.channel !== PG_CHANNEL || !msg.payload) return;

      try {
        const data: PgNotifyPayload = JSON.parse(msg.payload);
        const { userId, caseId, event, sourceNode } = data;

        // Track cross-node delivery
        if (sourceNode !== NODE_ID) {
          emitMetric("sse_event_delivered_cross_node");
        }

        // Route to local subscribers for this userId
        const userSubs = localSubscribers.get(userId);
        if (!userSubs || userSubs.size === 0) return;

        const payload: CaseEventPayload = { caseId, event };
        for (const cb of userSubs) {
          try {
            cb(payload);
          } catch (err) {
            console.warn("[COMPLIANCE] Event callback failed:", err);
          }
        }
      } catch (err) {
        console.error("[COMPLIANCE] Failed to parse NOTIFY payload:", err);
        emitMetric("pg_listener_errors");
      }
    });

    // Handle connection loss — auto-reconnect after 3s
    client.on("error", (err) => {
      console.error("[COMPLIANCE] PG listener connection error:", err);
      emitMetric("pg_listener_errors");
      listenerReady = false;
      listenerStarting = false;
      listenerClient = null;

      setTimeout(() => {
        console.log("[COMPLIANCE] Attempting PG listener reconnect...");
        emitMetric("pg_listener_reconnects");
        ensureListener().catch((e) =>
          console.error("[COMPLIANCE] Reconnect failed:", e),
        );
      }, 3_000);
    });

    client.on("end", () => {
      console.warn("[COMPLIANCE] PG listener disconnected");
      listenerReady = false;
      listenerStarting = false;
      listenerClient = null;
    });

    // Start listening on the channel
    await client.query(`LISTEN ${PG_CHANNEL}`);
    listenerReady = true;
    listenerStarting = false;

    console.log(
      `[COMPLIANCE] PG LISTEN active on channel "${PG_CHANNEL}" (node=${NODE_ID})`,
    );
  } catch (err) {
    listenerStarting = false;
    console.error("[COMPLIANCE] Failed to start PG listener:", err);
    throw err;
  }
}

/* ── Public Pub/Sub API ── */

/**
 * Publish a compliance event to ALL nodes via PostgreSQL NOTIFY.
 *
 * This replaces the old in-memory publish that only reached
 * subscribers on the same process. Now every ECS task running
 * LISTEN on the same channel receives the event.
 */
export async function publishCaseEvent(
  userId: string,
  caseId: string,
  event: ComplianceEvent,
): Promise<void> {
  const payload: PgNotifyPayload = {
    userId,
    caseId,
    event,
    sourceNode: NODE_ID,
  };

  const jsonPayload = JSON.stringify(payload);

  // PG NOTIFY payload max is 8000 bytes. If we exceed, log a warning
  // but still attempt — PG will raise an error if truly too large.
  if (jsonPayload.length > 7500) {
    console.warn(
      `[COMPLIANCE] NOTIFY payload is ${jsonPayload.length} bytes — approaching 8000 byte PG limit`,
    );
  }

  const { getDbClient } = await import("@/lib/db");
  const client = await getDbClient();

  try {
    // Use parameterized escaping to prevent SQL injection in the payload
    await client.query(`SELECT pg_notify($1, $2)`, [PG_CHANNEL, jsonPayload]);
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore cleanup */
    }
  }
}

/**
 * Subscribe to compliance events for a user on THIS node.
 * Returns an unsubscribe function for cleanup.
 *
 * Automatically ensures the global PG LISTEN connection is active.
 * The SSE stream route should call this when a user connects and
 * call the returned function when the user disconnects.
 */
export async function subscribeCaseEvents(
  userId: string,
  callback: EventCallback,
): Promise<() => void> {
  // Ensure the global PG listener is active
  await ensureListener();

  // Track SSE connection
  emitMetric("sse_connection_established");

  if (!localSubscribers.has(userId)) {
    localSubscribers.set(userId, new Set());
  }
  const userSubs = localSubscribers.get(userId)!;
  userSubs.add(callback);

  return () => {
    userSubs.delete(callback);
    if (userSubs.size === 0) {
      localSubscribers.delete(userId);
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
    try {
      await client.end();
    } catch {
      /* ignore cleanup */
    }
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
    try {
      await client.end();
    } catch {
      /* ignore cleanup */
    }
  }
}
