/* ================================================================
   SETTLEMENT STATUS POLLING — D2 FIX
   GET /api/settlement-status/[id]

   Enables client-side polling of settlement case status after the
   Moov webhook persists state changes. Returns the latest status,
   activation status, and key boolean flags for the settlement UI.

   This route reads from the in-memory settlement store (which is
   hydrated by the Moov webhook handler). In production, this would
   read directly from PostgreSQL.
   ================================================================ */

import { NextResponse, type NextRequest } from "next/server";
import { loadSettlementState } from "@/lib/settlement-store";
import { getCertificateBySettlementId } from "@/lib/certificate-engine";
import { requireSession, AuthError } from "@/lib/authz";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id || id.trim().length === 0) {
    return NextResponse.json(
      { error: "Settlement ID is required" },
      { status: 400 },
    );
  }

  const state = loadSettlementState();
  const settlement = state.settlements.find((s) => s.id === id);

  if (!settlement) {
    return NextResponse.json(
      { error: "Settlement not found", settlementId: id },
      { status: 404 },
    );
  }

  /* ── BOLA/IDOR: Resource Ownership Enforcement ── */
  const callerOwnsResource =
    settlement.buyerUserId === session.userId ||
    settlement.sellerUserId === session.userId ||
    session.role === "admin" ||
    session.role === "compliance" ||
    session.role === "INSTITUTION_TREASURY";

  if (!callerOwnsResource) {
    console.warn(
      `[SETTLEMENT-STATUS] BOLA BLOCKED: user=${session.userId} ` +
        `attempted to read settlement=${id} owned by ` +
        `buyer=${settlement.buyerUserId} seller=${settlement.sellerUserId}`,
    );
    return NextResponse.json(
      { error: "Forbidden: you do not own this settlement" },
      { status: 403 },
    );
  }

  // Check if a certificate has been issued for this settlement
  const certificate = getCertificateBySettlementId(id);

  return NextResponse.json({
    settlementId: settlement.id,
    orderId: settlement.orderId,
    status: settlement.status,
    activationStatus: settlement.activationStatus,
    paymentStatus: settlement.paymentStatus,
    fundsConfirmedFinal: settlement.fundsConfirmedFinal,
    goldAllocated: settlement.goldAllocated,
    verificationCleared: settlement.verificationCleared,
    updatedAt: settlement.updatedAt,
    // Post-settlement data (only present once SETTLED)
    certificateNumber: certificate?.certificateNumber ?? null,
    certificateIssuedAt: certificate?.issuedAt ?? null,
  });
}
