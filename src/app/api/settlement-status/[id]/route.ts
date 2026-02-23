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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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
