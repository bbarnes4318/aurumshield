/* ================================================================
   COMMUNICATIONS ADAPTER — Server-Side Only
   
   Wraps the Resend SDK for transactional email delivery.
   MUST NOT be imported in client components.
   All API keys are read from process.env at call time.

   NOTE: SMS OTP has been permanently removed from AurumShield.
   The only notification channel is Resend email.
   ================================================================ */

import { Resend } from "resend";

/* ---------- Result Type ---------- */
export interface SendResult {
  success: boolean;
  error?: string;
}

/* ---------- Email (Resend SDK) ---------- */

/**
 * Send an email via the Resend SDK.
 * Reads RESEND_API_KEY from process.env at invocation time.
 * Never throws — returns a structured result.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[AurumShield] RESEND_API_KEY is not set — email skipped");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "notifications@aurumshield.vip",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[AurumShield] Resend API error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AurumShield] sendEmail exception:", message);
    return { success: false, error: message };
  }
}
