/* ================================================================
   COMMUNICATIONS ADAPTER — Server-Side Only
   
   Wraps Resend (email) and Fractel (SMS) APIs.
   MUST NOT be imported in client components.
   All API keys are read from process.env at call time.
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

/* ---------- SMS (DEPRECATED — D7 Directive) ---------- */

/**
 * @deprecated SMS functionality has been removed per D7 system directive.
 * Fractel API integration is no longer active. This function is a no-op
 * preserved for backward compatibility with any residual imports.
 *
 * The ONLY notification channel is Resend email.
 */
export async function sendText(
  _to: string,
  _message: string,
): Promise<SendResult> {
  console.warn(
    "[AurumShield] sendText() is DEPRECATED — SMS functionality removed per D7 directive. Use sendEmail() instead.",
  );
  return { success: false, error: "SMS_DEPRECATED" };
}

