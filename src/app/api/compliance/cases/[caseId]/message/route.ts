/* ================================================================
   POST /api/compliance/cases/[caseId]/message
   ================================================================
   Appends a user message to a ComplianceCase as a compliance event.
   Authenticated — userId comes from the session, not the body.

   Body: { body: string }
   Response: { event: ComplianceEvent }
   ================================================================ */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, AuthError } from "@/lib/authz";
import { getComplianceCaseById } from "@/lib/compliance/models";
import { appendComplianceEvent, publishCaseEvent } from "@/lib/compliance/events";

const messageBodySchema = z.object({
  body: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message is too long"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
  /* ── Auth ── */
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    throw err;
  }

  const { caseId } = await params;

  /* ── Validate body ── */
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON body" },
      { status: 400 },
    );
  }

  const parsed = messageBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid message", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  /* ── Verify case ownership ── */
  const cc = await getComplianceCaseById(caseId);
  if (!cc) {
    return NextResponse.json(
      { error: "Case not found" },
      { status: 404 },
    );
  }

  if (cc.userId !== session.userId) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  /* ── Append message event ── */
  const eventId = `msg-${session.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const event = await appendComplianceEvent(
    caseId,
    eventId,
    "USER",
    "MESSAGE",
    { body: parsed.data.body },
  );

  if (event) {
    publishCaseEvent(session.userId, caseId, event);
  }

  return NextResponse.json({
    event: event ?? { eventId, action: "MESSAGE", actor: "USER" },
  });
}
