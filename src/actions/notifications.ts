"use server";

/* ================================================================
   SETTLEMENT NOTIFICATION — Server Action
   
   Bridges the client-side TanStack Query hooks to the server-side
   communications adapter. This file runs ENTIRELY on the server —
   no API keys are ever exposed to the client boundary.
   ================================================================ */

import { sendEmail, sendText } from "@/lib/communications-adapter";

/**
 * Notify buyer and seller that a DvP settlement has completed.
 * Uses Promise.allSettled so a failure in one channel (e.g. SMS)
 * does not block delivery in another channel (e.g. email).
 *
 * This function never throws — it returns structured results.
 */
export async function notifyPartiesOfSettlement(
  buyerEmail: string,
  sellerEmail: string,
  buyerPhone: string,
  sellerPhone: string,
  settlementId: string,
) {
  const timestamp = new Date().toISOString();

  /* ── Email bodies ── */
  const buyerEmailHtml = `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #e4e4e7; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #c9a44e 0%, #f5d77a 50%, #c9a44e 100%); padding: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; color: #0a0a0f; font-weight: 700;">Settlement Confirmed</h1>
      </div>
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">
          Your Delivery-versus-Payment settlement <strong style="color: #c9a44e;">${settlementId}</strong> has been executed successfully.
        </p>
        <div style="background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #a1a1aa;">Status</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #22c55e;">✓ SETTLED</p>
        </div>
        <p style="margin: 0 0 8px; font-size: 14px; color: #a1a1aa;">
          Gold title has been transferred to your account. Funds have been released from escrow.
        </p>
        <p style="margin: 24px 0 0; font-size: 12px; color: #52525b;">
          Timestamp: ${timestamp}<br/>
          AurumShield Clearing Platform
        </p>
      </div>
    </div>
  `;

  const sellerEmailHtml = `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #e4e4e7; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #c9a44e 0%, #f5d77a 50%, #c9a44e 100%); padding: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; color: #0a0a0f; font-weight: 700;">Settlement Confirmed</h1>
      </div>
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">
          Your Delivery-versus-Payment settlement <strong style="color: #c9a44e;">${settlementId}</strong> has been executed successfully.
        </p>
        <div style="background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #a1a1aa;">Status</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #22c55e;">✓ SETTLED</p>
        </div>
        <p style="margin: 0 0 8px; font-size: 14px; color: #a1a1aa;">
          Funds have been released to your account. Gold title has been transferred to the buyer.
        </p>
        <p style="margin: 24px 0 0; font-size: 12px; color: #52525b;">
          Timestamp: ${timestamp}<br/>
          AurumShield Clearing Platform
        </p>
      </div>
    </div>
  `;

  const subject = `[AurumShield] Settlement ${settlementId} — Confirmed`;

  /* ── SMS bodies ── */
  const buyerSms = `AurumShield: Settlement ${settlementId} SETTLED. Gold title transferred to your account. Funds released from escrow. ${timestamp}`;
  const sellerSms = `AurumShield: Settlement ${settlementId} SETTLED. Funds released to your account. Gold title transferred to buyer. ${timestamp}`;

  /* ── Dispatch all notifications concurrently ── */
  const results = await Promise.allSettled([
    sendEmail(buyerEmail, subject, buyerEmailHtml),
    sendEmail(sellerEmail, subject, sellerEmailHtml),
    sendText(buyerPhone, buyerSms),
    sendText(sellerPhone, sellerSms),
  ]);

  const summary = results.map((r, i) => {
    const channel = i < 2 ? "email" : "sms";
    const party = i % 2 === 0 ? "buyer" : "seller";
    if (r.status === "fulfilled") {
      return { channel, party, ...r.value };
    }
    return { channel, party, success: false, error: String(r.reason) };
  });

  console.log(
    `[AurumShield] Settlement notification dispatched for ${settlementId}:`,
    JSON.stringify(summary, null, 2),
  );

  return { results: summary };
}
