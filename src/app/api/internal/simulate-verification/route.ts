/* ================================================================
   DEMO VERIFICATION TRIGGER
   POST /api/internal/simulate-verification

   Simulates an external identity provider calling back after a
   configurable delay (default 7 seconds). Used for demo/testing
   purposes only — calls the verification engine directly without
   making an HTTP round-trip to the webhook route.

   This route is NOT protected by HMAC because it is an internal
   trigger. In production, this route should be removed or gated
   behind admin authentication.
   ================================================================ */

import { NextResponse } from "next/server";
import { z } from "zod";
import { processProviderWebhook } from "@/lib/verification-engine";

/* ---------- Zod Schema ---------- */

const SimulateVerificationSchema = z.object({
  userId: z.string().min(1),
  stepId: z.string().min(1),
  orgId: z.string().min(1),
  orgType: z.enum(["individual", "company"]),
  delayMs: z.number().int().min(1000).max(30000).optional().default(7000),
});

/* ---------- In-memory dedup for pending simulations ---------- */

const pendingSimulations = new Set<string>();

/* ---------- Route Handler ---------- */

export async function POST(request: Request): Promise<NextResponse> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON body" },
      { status: 400 },
    );
  }

  const validation = SimulateVerificationSchema.safeParse(parsed);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: validation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const { userId, stepId, orgId, orgType, delayMs } = validation.data;
  const webhookId = `sim-${userId}-${stepId}-${Date.now()}`;
  const dedupeKey = `${userId}:${stepId}`;

  // Prevent duplicate simulations for the same user+step
  if (pendingSimulations.has(dedupeKey)) {
    return NextResponse.json({
      scheduled: false,
      reason: "Simulation already pending for this step",
      dedupeKey,
    });
  }

  pendingSimulations.add(dedupeKey);

  console.log(
    `[DEMO-TRIGGER] Scheduling verification callback for ${userId}/${stepId} in ${delayMs}ms (webhookId=${webhookId})`,
  );

  // Fire the delayed callback — this runs in the Node.js event loop
  // and resolves after the specified delay
  setTimeout(() => {
    try {
      const result = processProviderWebhook(
        userId,
        webhookId,
        stepId,
        orgId,
        orgType,
        // Let the engine use deterministic outcome rules
        undefined,
        undefined,
      );

      if (result && !result.alreadyProcessed) {
        console.log(
          `[DEMO-TRIGGER] Verification callback fired — ${stepId} resolved to ${result.case.steps.find((s) => s.id === stepId)?.status} for ${userId}`,
        );
      } else if (result?.alreadyProcessed) {
        console.log(
          `[DEMO-TRIGGER] Webhook ${webhookId} already processed — skipped`,
        );
      } else {
        console.warn(
          `[DEMO-TRIGGER] Failed to process webhook for ${userId}/${stepId} — step may no longer be in PROCESSING state`,
        );
      }
    } catch (err) {
      console.error(`[DEMO-TRIGGER] Error processing simulated webhook:`, err);
    } finally {
      pendingSimulations.delete(dedupeKey);
    }
  }, delayMs);

  return NextResponse.json({
    scheduled: true,
    webhookId,
    delayMs,
    userId,
    stepId,
  });
}
