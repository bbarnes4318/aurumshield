"use server";

/* ================================================================
   SETTLEMENT NOTIFICATION — Server Action (D7 Revised)
   
   Bridges the client-side TanStack Query hooks to the server-side
   communications adapter. This file runs ENTIRELY on the server —
   no API keys are ever exposed to the client boundary.

   ⚠️  SMS DEPRECATED — All Fractel/sendText functionality removed.
       Only Resend email notifications are dispatched post-settlement.
   ================================================================ */

import { sendEmail } from "@/lib/communications-adapter";

/**
 * Notify buyer and seller that a DvP settlement has completed.
 * Uses Promise.allSettled so a failure in one email
 * does not block delivery of the other.
 *
 * This function never throws — it returns structured results.
 *
 * @param buyerEmail  – Buyer's email address
 * @param sellerEmail – Seller's email address
 * @param settlementId – Settlement case ID
 * @param certificateNumber – (Optional) Gold Clearing Certificate number, embedded in email body
 */
export async function notifyPartiesOfSettlement(
  buyerEmail: string,
  sellerEmail: string,
  settlementId: string,
  certificateNumber?: string,
) {
  const timestamp = new Date().toISOString();

  const certBlock = certificateNumber
    ? `
        <div style="background: #1a2e1a; border: 1px solid #22c55e33; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #22c55e; text-transform: uppercase; letter-spacing: 1px;">Gold Clearing Certificate</p>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #e4e4e7; font-family: 'Courier New', monospace;">${certificateNumber}</p>
        </div>`
    : "";

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
        </div>${certBlock}
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
        </div>${certBlock}
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

  /* ── Dispatch email notifications concurrently ── */
  const results = await Promise.allSettled([
    sendEmail(buyerEmail, subject, buyerEmailHtml),
    sendEmail(sellerEmail, subject, sellerEmailHtml),
  ]);

  const summary = results.map((r, i) => {
    const party = i === 0 ? "buyer" : "seller";
    if (r.status === "fulfilled") {
      return { channel: "email" as const, party, ...r.value };
    }
    return { channel: "email" as const, party, success: false, error: String(r.reason) };
  });

  console.log(
    `[AurumShield] Settlement notification dispatched for ${settlementId}:`,
    JSON.stringify(summary, null, 2),
  );

  return { results: summary };
}
