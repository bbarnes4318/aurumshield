"use server";

/* ================================================================
   LEAD CAPTURE — Waitlist Server Action
   ================================================================
   Accepts an email from the simple-home landing page and inserts
   it into the `waitlist_leads` table.

   - Validates with Zod
   - Uses getPoolClient() from @/lib/db (connection-pooled)
   - ON CONFLICT (email) DO NOTHING — idempotent, no user error
   ================================================================ */

import { z } from "zod";

/* ---------- Schema ---------- */

const WaitlistSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
});

/* ---------- Result Type ---------- */

export interface WaitlistResult {
  success: boolean;
  error?: string;
}

/* ---------- Server Action ---------- */

export async function joinWaitlist(
  _prev: WaitlistResult | null,
  formData: FormData,
): Promise<WaitlistResult> {
  /* ── Parse & validate ── */
  const raw = { email: formData.get("email") };
  const parsed = WaitlistSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { email } = parsed.data;

  /* ── Insert into DB ── */
  try {
    const { getPoolClient } = await import("@/lib/db");
    const client = await getPoolClient();

    try {
      await client.query(
        `INSERT INTO waitlist_leads (email, source)
         VALUES ($1, 'simple-home')
         ON CONFLICT (email) DO NOTHING`,
        [email.toLowerCase().trim()],
      );
    } finally {
      client.release();
    }

    return { success: true };
  } catch (err) {
    console.error("[Waitlist] Failed to insert lead:", err);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
