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

/* ---------- SMS (Fractel REST API) ---------- */

const FRACTEL_BASE_URL = "https://api.fractel.net/v1/messages";

/**
 * Send an SMS via the Fractel REST API.
 * Reads FRACTEL_API_KEY from process.env at invocation time.
 * Never throws — returns a structured result.
 */
export async function sendText(
  to: string,
  message: string,
): Promise<SendResult> {
  const apiKey = process.env.FRACTEL_API_KEY;
  if (!apiKey) {
    console.warn("[AurumShield] FRACTEL_API_KEY is not set — SMS skipped");
    return { success: false, error: "FRACTEL_API_KEY not configured" };
  }

  try {
    const response = await fetch(FRACTEL_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to, message }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const errorMsg = `Fractel API ${response.status}: ${body}`;
      console.error("[AurumShield] Fractel API error:", errorMsg);
      return { success: false, error: errorMsg };
    }

    return { success: true };
  } catch (err) {
    const message_ = err instanceof Error ? err.message : String(err);
    console.error("[AurumShield] sendText exception:", message_);
    return { success: false, error: message_ };
  }
}
