"use client";

/* ================================================================
   BANK VERIFICATION — Diro.io Open Banking Onboarding

   Replaces manual bank detail entry with Diro's institutionally
   verified Open Banking flow.  The user never types routing or
   account numbers — data comes strictly from the bank's own portal
   via the Diro API.

   Flow:
   1. User clicks "Verify Institutional Bank Account"
   2. Diro captures bank credentials directly from the institution
   3. Verified payload → POST /api/webhooks/diro
   4. Webhook → registerSellerBank (Modern Treasury) → counterparty_id

   NOTE: Until the Diro client SDK is available, the button simulates
   the flow by POSTing a demo payload to our webhook endpoint.
   ================================================================ */

import { useState } from "react";
import { ShieldCheck, AlertCircle, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ---------- Props ---------- */

interface BankDetailsFormProps {
  /** Called with the Modern Treasury counterparty ID after successful verification */
  onSuccess?: (counterpartyId: string) => void;
}

/* ---------- Demo Constants ---------- */

/**
 * Simulated Diro verified payload for demo mode.
 * In production, the real Diro SDK handles the bank login flow and
 * POSTs the verified result to our webhook automatically.
 */
const DEMO_DIRO_PAYLOAD = {
  event: "bank_account.verified" as const,
  verificationId: "diro-demo-verification-001",
  sellerUserId: "user-3", // Demo seller
  verifiedAccount: {
    accountName: "Meridian Gold Trading LLC",
    routingNumber: "021000021",
    accountNumber: "1234567890",
  },
};

/* ---------- Component ---------- */

export function BankDetailsForm({ onSuccess }: BankDetailsFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [linkedId, setLinkedId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  /**
   * Initiate the Diro verification flow.
   *
   * TODO: Replace this mock with the real Diro client SDK when available.
   *       The SDK will handle the bank portal redirect and POST the
   *       verified payload to /api/webhooks/diro automatically.
   *       This mock simulates that exact end-to-end path.
   */
  const handleVerify = async () => {
    setServerError(null);
    setIsVerifying(true);

    try {
      // Simulate Diro processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // POST the demo verified payload to our own webhook
      const response = await fetch("/api/webhooks/diro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEMO_DIRO_PAYLOAD),
      });

      const data = await response.json();

      if (!response.ok || data.action === "failed") {
        setServerError(
          data.error ?? `Verification failed (${response.status})`,
        );
        return;
      }

      if (data.counterpartyId) {
        setLinkedId(data.counterpartyId);
        onSuccess?.(data.counterpartyId);
      } else {
        setServerError("No counterparty ID returned from verification.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setServerError(`Verification error: ${message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  /* ── Success state ── */
  if (linkedId) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-6 shadow-md">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 ring-2 ring-gold/30">
            <ShieldCheck className="h-7 w-7 text-gold" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text">
              Bank Account Linked Securely
            </h3>
            <p className="mt-1 text-xs text-text-faint">
              Verified via Diro Open Banking
            </p>
            <p className="mt-2 text-xs text-text-faint">
              Counterparty ID:{" "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-gold">
                {linkedId}
              </code>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLinkedId(null)}
            className="mt-2 text-xs font-medium text-gold hover:text-gold-hover transition-colors"
          >
            Verify another account →
          </button>
        </div>
      </div>
    );
  }

  /* ── Verification state ── */
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-6 shadow-md">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <Fingerprint className="h-5 w-5 text-gold" />
        <h2 className="text-sm font-semibold text-text tracking-tight">
          Institutional Bank Verification
        </h2>
      </div>

      {/* Description */}
      <p className="mb-5 text-xs leading-relaxed text-text-muted">
        Verify your institutional bank account securely through{" "}
        <strong className="text-text">Diro&apos;s Open Banking</strong>{" "}
        protocol. You will authenticate directly with your bank — AurumShield{" "}
        <strong className="text-text">never sees</strong> your login
        credentials, routing number, or account number.
      </p>

      {/* Server error */}
      {serverError && (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {serverError}
        </div>
      )}

      {/* Security notice */}
      <div className="mb-5 flex items-start gap-2 rounded-[var(--radius-sm)] border border-gold/20 bg-gold/5 px-3 py-2.5">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-gold" />
        <p className="text-[11px] leading-relaxed text-text-muted">
          Diro captures your bank details directly from your institution&apos;s
          portal using cryptographic verification. The verified data is
          transmitted to our banking partner (Modern Treasury) over an encrypted
          channel and is{" "}
          <strong className="text-text">immediately discarded</strong> from
          our servers.
        </p>
      </div>

      {/* Verify Button */}
      <Button
        type="button"
        isLoading={isVerifying}
        loadingText="Verifying with your bank…"
        onClick={handleVerify}
        className="w-full py-3"
      >
        <Fingerprint className="h-4 w-4" />
        Verify Institutional Bank Account
      </Button>

      {/* Trust badges */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-text-faint">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          256-bit Encryption
        </span>
        <span className="opacity-30">|</span>
        <span>Open Banking Verified</span>
        <span className="opacity-30">|</span>
        <span>Zero Data Storage</span>
      </div>
    </div>
  );
}
