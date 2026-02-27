"use client";

/* ================================================================
   STEP 5: DocuSign CLM & Attestation
   ================================================================
   Simulated DocuSign CLM Master Participation Agreement review,
   e-signature, and AML compliance attestation.
   ================================================================ */

import { useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import {
  FileSignature,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  FileText,
  Pen,
} from "lucide-react";

import type { OnboardingFormData } from "@/lib/schemas/onboarding-schema";

/* ----------------------------------------------------------------
   Step Component
   ---------------------------------------------------------------- */

export function StepDocuSignCLM() {
  const {
    setValue,
    watch,
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormData>();

  const [signState, setSignState] = useState<"idle" | "signing" | "signed">(
    () => (watch("agreementSigned") ? "signed" : "idle"),
  );

  const companyName = watch("companyName");

  /* ── Simulated Signing ── */
  const handleSign = useCallback(() => {
    setSignState("signing");
    setTimeout(() => {
      setSignState("signed");
      setValue("agreementSigned", true as unknown as true, {
        shouldValidate: true,
      });
    }, 2500);
  }, [setValue]);

  const signatureTimestamp = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <FileSignature className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          Master Agreement & Attestation
        </h2>
      </div>

      <p className="text-xs text-color-3/50 leading-relaxed -mt-2">
        Review and execute the Master Participation Agreement via DocuSign CLM.
        This contract governs all settlement activity on AurumShield and is
        generated natively within the platform.
      </p>

      {/* ── Document Preview ── */}
      <div className="rounded-lg border border-color-5/20 bg-color-1/50 overflow-hidden">
        {/* Document header */}
        <div className="flex items-center justify-between border-b border-color-5/15 px-4 py-3 bg-color-1/80">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-color-2/60" />
            <div>
              <p className="text-xs font-semibold text-color-3/80">
                Master Participation Agreement
              </p>
              <p className="text-[10px] text-color-3/30">
                DocuSign CLM · v2026.02 · 14 pages
              </p>
            </div>
          </div>
          <span className="text-[10px] text-color-3/30 font-mono">
            SHA256: 7f3a…e2d1
          </span>
        </div>

        {/* Mock document body */}
        <div className="px-5 py-4 space-y-3 max-h-[200px] overflow-y-auto">
          <p className="text-[10px] text-color-3/30 uppercase tracking-wider font-semibold">
            ARTICLE I — DEFINITIONS & INTERPRETATION
          </p>
          <p className="text-[11px] text-color-3/50 leading-relaxed">
            This Master Participation Agreement (&ldquo;Agreement&rdquo;) is
            entered into by and between AurumShield Clearing LLC
            (&ldquo;Clearinghouse&rdquo;) and{" "}
            <span className="text-color-2 font-medium">
              {companyName || "[Entity Name]"}
            </span>{" "}
            (&ldquo;Participant&rdquo;). The Participant agrees to be bound by
            the terms and conditions set forth herein, including all
            settlement, collateral, and compliance obligations.
          </p>
          <p className="text-[10px] text-color-3/30 uppercase tracking-wider font-semibold mt-3">
            ARTICLE II — SETTLEMENT OBLIGATIONS
          </p>
          <p className="text-[11px] text-color-3/50 leading-relaxed">
            2.1 The Participant shall maintain a pre-funded collateral balance
            of not less than five percent (5%) of any pending order notional
            value, as enforced by the Capital Controls Engine.
          </p>
          <p className="text-[11px] text-color-3/50 leading-relaxed">
            2.2 Failed T+1 wire transfers shall result in automatic collateral
            forfeiture pursuant to the SLASH_COLLATERAL protocol.
          </p>
          <p className="text-[10px] text-color-3/30 uppercase tracking-wider font-semibold mt-3">
            ARTICLE III — DUAL AUTHORIZATION
          </p>
          <p className="text-[11px] text-color-3/50 leading-relaxed">
            3.1 All settlement execution requires cryptographically bound
            approval from both a TRADER (Maker) and TREASURY (Checker) via
            JIT WebAuthn signature, as recorded in the order_approvals table.
          </p>
        </div>

        {/* Sign section */}
        <div className="border-t border-color-5/15 px-5 py-4 bg-color-1/40">
          {signState === "idle" && (
            <button
              type="button"
              onClick={handleSign}
              className="
                w-full inline-flex items-center justify-center gap-2
                rounded-lg px-5 py-3
                bg-color-2/15 text-color-2 text-sm font-semibold
                border border-color-2/30
                hover:bg-color-2/25 active:bg-color-2/30
                transition-colors duration-150
              "
            >
              <Pen className="h-4 w-4" />
              Review & Sign Agreement
            </button>
          )}

          {signState === "signing" && (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="h-6 w-6 text-color-2 animate-spin" />
              <p className="text-xs text-color-2 font-medium">
                Applying e-signature via DocuSign CLM…
              </p>
            </div>
          )}

          {signState === "signed" && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#3fae7a]" />
                <span className="text-sm text-[#3fae7a] font-semibold">
                  Agreement Signed
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-color-3/40 font-mono">
                <span>Signed: {signatureTimestamp}</span>
                <span>Hash: b84f…1c3e</span>
                <span>Envelope: ENV-2026-0847</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {errors.agreementSigned && signState !== "signing" && (
        <p className="text-[11px] text-color-4">
          {errors.agreementSigned.message as string}
        </p>
      )}

      {/* ── AML/Compliance Attestation ── */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          {...register("complianceAttested")}
          className="
            mt-0.5 h-4 w-4 rounded border-color-5/40
            bg-color-1/80 text-color-2
            focus:ring-2 focus:ring-color-2/30 focus:ring-offset-0
            accent-[#D0A85C]
          "
        />
        <span className="text-xs leading-relaxed text-color-3/60 group-hover:text-color-3/80 transition-colors">
          I attest that my organization complies with all applicable
          Anti-Money Laundering (AML), Counter-Terrorism Financing (CTF),
          and sanctions regulations. I understand that AurumShield operates
          a fail-closed compliance perimeter and reserves the right to
          terminate access for any regulatory breach.
        </span>
      </label>

      {errors.complianceAttested && (
        <p className="text-[11px] text-color-4">
          {errors.complianceAttested.message as string}
        </p>
      )}

      {/* Trust badge */}
      <div className="flex items-center gap-2 pt-1 text-[10px] text-color-3/30">
        <ShieldCheck className="h-3.5 w-3.5 text-color-2/40" />
        <span>DocuSign CLM · Cryptographic envelope · Tamper-evident</span>
      </div>
    </div>
  );
}
