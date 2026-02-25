/* ================================================================
   COMPLIANCE SSE STREAM
   GET /api/compliance/stream

   Server-Sent Events endpoint for real-time compliance case updates.
   The client (onboarding page, case detail page) opens an EventSource
   to this endpoint and receives live events as they occur.

   Authentication:
     - requireSession() gates access to the stream
     - Events are scoped to the authenticated user only

   Protocol:
     - Content-Type: text/event-stream
     - Initial "connected" event with current case status
     - Live events forwarded from PG LISTEN/NOTIFY bus (RSK-008)
     - Keep-alive comment (": keep-alive\n\n") every 30 seconds
     - Stream closes when the client disconnects

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { requireSession, AuthError } from "@/lib/authz";
import { getComplianceCaseByUserId } from "@/lib/compliance/models";
import { subscribeCaseEvents, KEEP_ALIVE_MS, emitMetric } from "@/lib/compliance/events";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  /* ── Step 1: Authentication ── */
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(
        JSON.stringify({ error: err.message }),
        {
          status: err.statusCode,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    throw err;
  }

  const userId = session.userId;

  /* ── Step 2: Look up current case ── */
  let currentCase;
  try {
    currentCase = await getComplianceCaseByUserId(userId);
  } catch {
    // Non-fatal: proceed without initial case data
    currentCase = null;
  }

  /* ── Step 3: Subscribe to PG LISTEN/NOTIFY bus ── */
  // subscribeCaseEvents is now async — it ensures the global PG
  // listener is active before registering the local callback.
  let unsubscribePromise: Promise<() => void> | null = null;
  let unsubscribe: (() => void) | null = null;
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event with current case state
      const connectPayload = JSON.stringify({
        type: "connected",
        caseId: currentCase?.id ?? null,
        caseStatus: currentCase?.status ?? null,
        caseTier: currentCase?.tier ?? null,
        nodeId: process.env.HOSTNAME || "unknown",
      });
      controller.enqueue(
        encoder.encode(`data: ${connectPayload}\n\n`),
      );

      // Track SSE connection (metric emitted inside subscribeCaseEvents)

      // Subscribe to the distributed event bus
      unsubscribePromise = subscribeCaseEvents(userId, (payload) => {
        try {
          const eventPayload = JSON.stringify({
            type: "case_event",
            caseId: payload.caseId,
            event: payload.event,
          });
          controller.enqueue(
            encoder.encode(`data: ${eventPayload}\n\n`),
          );
        } catch {
          // Stream may have been closed — ignore write errors
        }
      });

      // Handle async subscription setup
      unsubscribePromise
        .then((unsub) => {
          unsubscribe = unsub;
        })
        .catch((err) => {
          console.error("[SSE] Failed to subscribe to PG bus:", err);
          // Still send events via initial connected payload — stream
          // remains open but won't receive live updates if PG fails.
          emitMetric("pg_listener_errors");
        });

      // Keep-alive to prevent proxy/load-balancer timeout
      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          // Stream closed — cleanup happens in cancel()
        }
      }, KEEP_ALIVE_MS);
    },

    cancel() {
      // Cleanup on client disconnect
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}
