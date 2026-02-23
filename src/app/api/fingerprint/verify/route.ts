/* ================================================================
   FINGERPRINT VERIFICATION API ROUTE — Server-Side Only
   ================================================================
   POST /api/fingerprint/verify
   
   Accepts a visitorId (and optional requestId) from the client,
   delegates to the server-side fingerprint-adapter for verification.
   Returns the structured FingerprintVerification result.
   ================================================================ */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyVisitor } from "@/lib/fingerprint-adapter";

/* ── Request schema ── */
const VerifyRequestSchema = z.object({
  visitorId: z.string().min(1, { message: "visitorId is required" }),
  requestId: z.string().optional(),
});

/* ── POST handler ── */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = VerifyRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { visitorId, requestId } = parsed.data;
    const result = await verifyVisitor(visitorId, requestId);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AurumShield] /api/fingerprint/verify error:", message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
