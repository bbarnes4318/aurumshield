/* ================================================================
   CRON: Nightly Sanctions Data Sync
   ================================================================
   Triggers the internal Yente container to pull the latest
   OpenSanctions dataset. Designed to be called by an external
   scheduler (AWS EventBridge, GitHub Actions cron, etc.).

   Security:
     - Requires Authorization: Bearer <CRON_SECRET_KEY>
     - Returns 401 if the header is missing or doesn't match

   Endpoint: POST /api/cron/sync-sanctions
   ================================================================ */

import { NextRequest, NextResponse } from "next/server";
import { emitAuditEvent } from "@/lib/audit-logger";

const YENTE_URL = process.env.YENTE_URL || "http://localhost:8000";
const CRON_SECRET = process.env.CRON_SECRET_KEY;

export async function POST(request: NextRequest) {
  // ── 1. Auth check ──
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!CRON_SECRET || token !== CRON_SECRET) {
    emitAuditEvent("SANCTIONS_SYNC_UNAUTHORIZED", "CRITICAL", {
      ip: request.headers.get("x-forwarded-for") ?? "unknown",
    });
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // ── 2. Trigger Yente dataset update ──
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000); // 30s for dataset download

    const response = await fetch(`${YENTE_URL}/updatez`, {
      method: "POST",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      emitAuditEvent("SANCTIONS_SYNC_FAILED", "CRITICAL", {
        status: response.status,
        statusText: response.statusText,
      });
      return NextResponse.json(
        { error: "Yente update failed", status: response.status },
        { status: 502 },
      );
    }

    emitAuditEvent("SANCTIONS_SYNC_INITIATED", "INFO", {
      yenteUrl: YENTE_URL,
      triggeredAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { status: "ok", message: "Sanctions dataset sync initiated" },
      { status: 200 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    emitAuditEvent("SANCTIONS_SYNC_UNREACHABLE", "P1_ALERT", {
      error: message,
      yenteUrl: YENTE_URL,
    });
    return NextResponse.json(
      { error: "Yente service unreachable", detail: message },
      { status: 502 },
    );
  }
}
