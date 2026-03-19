/* ================================================================
   CLERK WEBHOOK — Identity Synchronization Engine
   ================================================================
   Secure Next.js Route Handler that receives Clerk webhook events,
   verifies Svix cryptographic signatures, and idempotently inserts
   user records into our Postgres users table.

   Security:
     - Svix signature verification (HMAC-SHA256)
     - Fail-closed: any verification failure → 400, no detail leaked
     - Parameterized SQL only — zero string interpolation

   Idempotency:
     - ON CONFLICT (clerk_id) DO UPDATE — safe for Clerk retries
     - ON CONFLICT (email) handled via clerk_id unique constraint

   Response Protocol:
     - 200 { success: true } on commit
     - 400 on signature / payload failure (silent log)
     - 500 on database failure (Clerk retries)
   ================================================================ */

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { getPoolClient } from "@/lib/db";

/* ----------------------------------------------------------------
   TYPE DEFINITIONS — Clerk Webhook Payload
   ---------------------------------------------------------------- */
interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserCreatedPayload {
  id: string;
  email_addresses: ClerkEmailAddress[];
  first_name: string | null;
  last_name: string | null;
  public_metadata?: Record<string, unknown>;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserCreatedPayload;
  object: string;
}

/* ----------------------------------------------------------------
   CONSTANTS
   ---------------------------------------------------------------- */
const SUPPORTED_EVENTS = new Set(["user.created"]);
const DEFAULT_ROLE = "PENDING_ASSIGNMENT";

/* ================================================================
   POST HANDLER
   ================================================================ */
export async function POST(req: NextRequest) {
  /* ── 1. Extract Svix Headers ── */
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn(
      "[CLERK-WEBHOOK] Missing Svix headers — request rejected.",
    );
    return NextResponse.json(
      { error: "Bad Request" },
      { status: 400 },
    );
  }

  /* ── 2. Verify Cryptographic Signature ── */
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "[CLERK-WEBHOOK] CLERK_WEBHOOK_SECRET is not configured. " +
      "Cannot verify webhook signatures. Rejecting request.",
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  let event: ClerkWebhookEvent;

  try {
    const rawBody = await req.text();
    const wh = new Webhook(webhookSecret);

    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.warn(
      "[CLERK-WEBHOOK] Signature verification FAILED:",
      err instanceof Error ? err.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Bad Request" },
      { status: 400 },
    );
  }

  /* ── 3. Route by Event Type ── */
  if (!SUPPORTED_EVENTS.has(event.type)) {
    // Acknowledge unsupported events gracefully so Clerk doesn't
    // retry them indefinitely.
    console.info(
      `[CLERK-WEBHOOK] Ignoring unsupported event type: ${event.type}`,
    );
    return NextResponse.json({ success: true, skipped: event.type });
  }

  /* ── 4. Extract Identity Fields ── */
  const { data } = event;
  const clerkId = data.id;
  const email = data.email_addresses?.[0]?.email_address;
  const firstName = data.first_name ?? null;
  const lastName = data.last_name ?? null;

  if (!clerkId || !email) {
    console.warn(
      "[CLERK-WEBHOOK] Malformed user.created payload — " +
      "missing id or email_addresses. Rejecting.",
    );
    return NextResponse.json(
      { error: "Bad Request" },
      { status: 400 },
    );
  }

  /* ── 5. Resolve Role ── */
  // If Clerk passes a role in public_metadata, honor it.
  // Otherwise fall back to PENDING_ASSIGNMENT.
  const metadataRole =
    typeof data.public_metadata?.role === "string"
      ? data.public_metadata.role
      : null;
  const role = metadataRole || DEFAULT_ROLE;

  /* ── 6. Idempotent Database Insert ── */
  const client = await getPoolClient();

  try {
    /* ── Self-healing: ensure clerk_id column exists ── */
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE`);

    await client.query(
      `INSERT INTO users (clerk_id, email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (clerk_id) DO UPDATE SET
         email      = EXCLUDED.email,
         first_name = EXCLUDED.first_name,
         last_name  = EXCLUDED.last_name`,
      [clerkId, email, firstName, lastName, role],
    );

    console.info(
      `[CLERK-WEBHOOK] user.created committed — clerk_id=${clerkId} email=${email} role=${role}`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(
      "[CLERK-WEBHOOK] Database INSERT failed:",
      err instanceof Error ? err.message : err,
    );
    // Return 500 so Clerk's retry mechanism holds the event in queue.
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
