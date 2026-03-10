"use client";

/* ================================================================
   PHASE 5: PURCHASE — Settlement & Delivery
   ================================================================
   5-step sub-flow: Bank Connect → Verify Funds → Funding →
   Gold Certificate → Transit Tracking.
   Vendors: Plaid (mock), Brinks (mock)
   ================================================================ */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  CheckCircle2,
  Loader2,
  FileText,
  Truck,
  ArrowRight,
  Download,
  Shield,
  CreditCard,
} from "lucide-react";
import { useBuyerFlow } from "@/stores/buyer-flow-store";

const BRAND_GOLD = "#c6a86b";

type PurchaseStep =
  | "bank-connect"
  | "verify-funds"
  | "funding"
  | "certificate"
  | "transit";

const STEPS: { key: PurchaseStep; label: string; icon: React.ElementType }[] = [
  { key: "bank-connect", label: "Connect Bank", icon: Landmark },
  { key: "verify-funds", label: "Verify Funds", icon: CreditCard },
  { key: "funding", label: "Funding", icon: CheckCircle2 },
  { key: "certificate", label: "Certificate", icon: FileText },
  { key: "transit", label: "Delivery", icon: Truck },
];

/* ── Format USD ── */
function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PurchasePage() {
  const router = useRouter();
  const { canAccess } = useBuyerFlow();

  if (!canAccess("purchase")) {
    router.replace("/buy/checkout");
    return null;
  }

  return <PurchaseContent />;
}

function PurchaseContent() {
  const { lockedQuote, completePhase } = useBuyerFlow();

  const [step, setStep] = useState<PurchaseStep>("bank-connect");
  const [completedSteps, setCompletedSteps] = useState<PurchaseStep[]>([]);
  const [loading, setLoading] = useState(false);

  const completeStep = useCallback(
    (s: PurchaseStep) => {
      setCompletedSteps((prev) => [...prev, s]);
      const idx = STEPS.findIndex((st) => st.key === s);
      if (idx < STEPS.length - 1) {
        setStep(STEPS[idx + 1].key);
      }
    },
    [],
  );

  /* ── Step Handlers ── */
  const handleConnectBank = useCallback(() => {
    // TODO: Replace with Plaid Link SDK
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      completeStep("bank-connect");
    }, 1500);
  }, [completeStep]);

  const handleVerifyFunds = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      completeStep("verify-funds");
    }, 2000);
  }, [completeStep]);

  const handleFunding = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      completeStep("funding");
    }, 2000);
  }, [completeStep]);

  const handleViewCertificate = useCallback(() => {
    completeStep("certificate");
  }, [completeStep]);

  const handleCompletePurchase = useCallback(() => {
    completePhase("purchase");
  }, [completePhase]);

  const grandTotal = lockedQuote?.grandTotal ?? 0;

  /* ── Mock certificate data ── */
  const certHash =
    "SHA256:a7f3c8d92e1b4f6a8b2c0d3e5f7a9b1c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f";
  const certDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Complete Your Purchase
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Secure payment and delivery in {STEPS.length} simple steps.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        {STEPS.map((s, i) => {
          const isComplete = completedSteps.includes(s.key);
          const isCurrent = step === s.key;
          const Icon = s.icon;

          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-4 ${isComplete ? "bg-emerald-500/40" : "bg-slate-800"}`}
                />
              )}
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                  isComplete
                    ? "border-emerald-500 bg-emerald-500/10"
                    : isCurrent
                      ? "border-[#c6a86b] bg-[#c6a86b]/10"
                      : "border-slate-700"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Icon
                    className="h-3 w-3"
                    style={{
                      color: isCurrent ? BRAND_GOLD : "#64748b",
                    }}
                  />
                )}
              </div>
              <span
                className={`hidden text-[11px] font-semibold sm:block ${
                  isCurrent ? "text-white" : "text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1829] p-8">
          {/* ═══ STEP 1: Connect Bank ═══ */}
          {step === "bank-connect" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  Connect Your Bank Account
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Securely link your bank to verify ownership and fund your
                  purchase.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/60 bg-[#070e1a] p-6 text-center">
                <Landmark className="mx-auto mb-3 h-10 w-10 text-slate-500" />
                <p className="text-sm text-slate-400">
                  Your bank connection is secured by Plaid&apos;s
                  bank-level encryption.
                </p>
              </div>

              <button
                type="button"
                onClick={handleConnectBank}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: BRAND_GOLD, color: "#0a1128" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting…
                  </>
                ) : (
                  <>
                    <Landmark className="h-4 w-4" />
                    Connect Bank Account
                  </>
                )}
              </button>
            </div>
          )}

          {/* ═══ STEP 2: Verify Funds ═══ */}
          {step === "verify-funds" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  Verifying Available Funds
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Confirming your account has sufficient funds for{" "}
                  <span
                    className="font-mono font-bold"
                    style={{ color: BRAND_GOLD }}
                  >
                    ${fmtUSD(grandTotal)}
                  </span>
                </p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <Loader2 className="h-10 w-10 animate-spin text-[#c6a86b]" />
                  <p className="text-sm text-slate-400">
                    Verifying funds availability…
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleVerifyFunds}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold transition-all active:scale-[0.98]"
                  style={{ backgroundColor: BRAND_GOLD, color: "#0a1128" }}
                >
                  Verify Funds
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* ═══ STEP 3: Funding ═══ */}
          {step === "funding" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  Fund Your Purchase
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Initiate the wire transfer to complete your payment.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/60 bg-[#070e1a] p-5">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Amount</span>
                    <span
                      className="font-mono text-sm font-bold tabular-nums"
                      style={{ color: BRAND_GOLD }}
                    >
                      ${fmtUSD(grandTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Method</span>
                    <span className="text-xs font-semibold text-white">
                      Wire Transfer (Fedwire)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">
                      Settlement
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">
                      T+0 (Same Day)
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFunding}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: BRAND_GOLD, color: "#0a1128" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing Payment…
                  </>
                ) : (
                  <>
                    Confirm Payment
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ═══ STEP 4: Gold Certificate ═══ */}
          {step === "certificate" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  Gold Certificate Issued
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Your ownership has been cryptographically recorded.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                <div className="mb-4 flex justify-center">
                  <Shield className="h-12 w-12 text-emerald-400" />
                </div>
                <div className="space-y-2.5 text-center">
                  <p className="text-sm font-bold text-white">
                    Certificate of Ownership
                  </p>
                  <div className="space-y-1.5 text-[11px] text-slate-400">
                    <p>
                      <span className="text-slate-500">Date:</span> {certDate}
                    </p>
                    <p>
                      <span className="text-slate-500">Amount:</span>{" "}
                      <span className="font-mono font-bold text-white">
                        ${fmtUSD(grandTotal)}
                      </span>
                    </p>
                    <p className="break-all">
                      <span className="text-slate-500">Hash:</span>{" "}
                      <span className="font-mono text-[10px] text-slate-500">
                        {certHash}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#070e1a] px-4 py-3 text-xs font-semibold text-slate-300 transition-all hover:border-slate-600"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handleViewCertificate}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-[0.98]"
                  style={{ backgroundColor: BRAND_GOLD, color: "#0a1128" }}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: Transit ═══ */}
          {step === "transit" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  Your Gold is On Its Way
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Armored transit via Brink&apos;s with full insurance coverage.
                </p>
              </div>

              {/* Tracking Card */}
              <div className="rounded-xl border border-slate-700/60 bg-[#070e1a] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Tracking Number
                  </span>
                  <span className="font-mono text-xs font-bold text-white">
                    BRK-US-10005-X7K2
                  </span>
                </div>

                {/* Status Timeline */}
                <div className="space-y-3">
                  {[
                    {
                      label: "Order Confirmed",
                      status: "complete" as const,
                      time: "Today",
                    },
                    {
                      label: "Vault Dispatch",
                      status: "complete" as const,
                      time: "Today",
                    },
                    {
                      label: "In Transit",
                      status: "active" as const,
                      time: "Est. 2-3 days",
                    },
                    {
                      label: "Delivered",
                      status: "pending" as const,
                      time: "",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          item.status === "complete"
                            ? "bg-emerald-500/10"
                            : item.status === "active"
                              ? "bg-[#c6a86b]/10"
                              : "bg-slate-800"
                        }`}
                      >
                        {item.status === "complete" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : item.status === "active" ? (
                          <Truck
                            className="h-3 w-3"
                            style={{ color: BRAND_GOLD }}
                          />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span
                          className={`text-xs font-semibold ${
                            item.status === "pending"
                              ? "text-slate-600"
                              : "text-white"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Complete */}
              <button
                type="button"
                onClick={handleCompletePurchase}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold transition-all active:scale-[0.98]"
                style={{ backgroundColor: BRAND_GOLD, color: "#0a1128" }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Purchase Complete
              </button>

              <p className="text-center text-[11px] text-slate-600">
                You will receive email updates at each transit milestone.
                Track your shipment anytime from your dashboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
