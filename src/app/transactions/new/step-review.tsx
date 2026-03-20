"use client";

import { useMemo, useState, useCallback, useTransition } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { WizardFormData } from "./wizard-schema";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Fingerprint,
  Lock,
  Landmark,
  Coins,
  Copy,
  Check,
  Loader2,
  Building2,
  AlertTriangle,
  Package,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { generateFiatDepositInstructions } from "@/actions/banking";
import type { FiatDepositInstructions } from "@/actions/banking";

/* ── Constants — same as step-settlement for consistency ── */
const MOCK_GOLD_SPOT_USD = 2_342.50;
const NETWORK_FEE_RATE = 0.01;

/* ── Mock counterparty ID for demo mode ── */
const DEMO_COUNTERPARTY_ID = "demo-counterparty-001";

const FIELD = cn(
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text",
  "placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors"
);

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ROUTE_LABEL: Record<string, { icon: typeof Landmark; label: string; detail: string }> = {
  fedwire: { icon: Landmark, label: "BaaS Fedwire", detail: "Domestic USD Wire" },
  stablecoin: { icon: Coins, label: "Enterprise MPC Stablecoin", detail: "USDC/USDT Bridge" },
};

/* ── Copy to Clipboard Hook ── */
function useCopyToClipboard(resetMs = 2000) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = useCallback(
    async (value: string, fieldName: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), resetMs);
      } catch {
        // Fallback for non-secure contexts
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), resetMs);
      }
    },
    [resetMs],
  );

  return { copiedField, copy };
}

/* ── Copiable Field Component ── */
function CopiableField({
  label,
  value,
  fieldName,
  copiedField,
  onCopy,
  mono = true,
}: {
  label: string;
  value: string;
  fieldName: string;
  copiedField: string | null;
  onCopy: (value: string, fieldName: string) => void;
  mono?: boolean;
}) {
  const isCopied = copiedField === fieldName;

  return (
    <div className="group flex items-center justify-between rounded-md bg-bg/60 border border-border/40 px-3.5 py-2.5 transition-colors hover:border-gold/30">
      <div className="min-w-0">
        <span className="text-[10px] uppercase tracking-widest text-text-faint font-medium block mb-0.5">
          {label}
        </span>
        <span
          className={cn(
            "text-sm font-semibold text-text block truncate",
            mono && "font-mono tabular-nums tracking-wider",
          )}
        >
          {value}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onCopy(value, fieldName)}
        className={cn(
          "ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-all",
          isCopied
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            : "border-border/50 bg-surface-2 text-text-faint hover:text-gold hover:border-gold/40 hover:bg-gold/5",
        )}
        title={isCopied ? "Copied!" : `Copy ${label}`}
      >
        {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/* ── Props ── */
interface Props {
  form: UseFormReturn<WizardFormData>;
  beneficiaryName: string;
  isExecuting: boolean;
  onExecute: () => void;
}

export function StepReview({ form, beneficiaryName, isExecuting, onExecute }: Props) {
  const {
    register,
    formState: { errors },
    watch,
  } = form;

  const fiatAmount = watch("fiatSettlementAmount") ?? 0;
  const memo = watch("memo");
  const fundingRoute = watch("fundingRoute");
  const amount = Number.isFinite(fiatAmount) && fiatAmount > 0 ? fiatAmount : 0;

  const calc = useMemo(() => {
    const goldOz = amount / MOCK_GOLD_SPOT_USD;
    const fee = amount * NETWORK_FEE_RATE;
    return { goldOz, fee, total: amount + fee };
  }, [amount]);

  const routeInfo = fundingRoute ? ROUTE_LABEL[fundingRoute] : null;
  const RouteIcon = routeInfo?.icon ?? Landmark;

  /* ── Fedwire deposit instructions via TanStack Query ── */
  const isFedwire = fundingRoute === "fedwire";

  const {
    data: depositInstructions,
    isLoading: isLoadingInstructions,
    error: instructionsError,
  } = useQuery<FiatDepositInstructions>({
    queryKey: ["fiat-deposit-instructions", DEMO_COUNTERPARTY_ID, isFedwire],
    queryFn: () =>
      generateFiatDepositInstructions(
        DEMO_COUNTERPARTY_ID,
        `Goldwire Settlement — ${beneficiaryName}`,
      ),
    enabled: isFedwire,
    staleTime: 5 * 60 * 1000, // Cache for 5 min — same virtual account per session
    retry: 2,
  });

  const { copiedField, copy } = useCopyToClipboard();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10 border border-gold/20">
          <ShieldCheck className="h-3.5 w-3.5 text-gold" />
        </div>
        <div>
          <h2 className="font-heading text-sm font-semibold text-text">
            Step 4 — Cryptographic Sign-Off
          </h2>
          <p className="text-[11px] text-text-faint">
            Verify all parameters before signing the Goldwire execution certificate.
          </p>
        </div>
      </div>

      {/* Goldwire Execution Certificate */}
      <div className="rounded-lg border border-border bg-surface-2 overflow-hidden">
        <div className="bg-gold/[0.06] border-b border-gold/20 px-4 py-2.5 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-gold" />
          <span className="text-[10px] font-bold text-gold uppercase tracking-widest">
            Goldwire Execution Certificate
          </span>
        </div>
        <div className="px-4 py-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-text-faint text-xs">Beneficiary</span>
              <p className="text-text font-medium">{beneficiaryName}</p>
            </div>
            <div>
              <span className="text-text-faint text-xs">Settlement Value</span>
              <p className="text-text font-bold font-mono tabular-nums">{fmt(amount)}</p>
            </div>
            <div>
              <span className="text-text-faint text-xs">Gold Allocation</span>
              <p className="text-text font-bold font-mono tabular-nums">
                {calc.goldOz.toFixed(4)}{" "}
                <span className="text-text-faint font-normal text-xs">oz t</span>
              </p>
            </div>
            <div>
              <span className="text-text-faint text-xs">Spot Price</span>
              <p className="text-text font-mono tabular-nums">{fmt(MOCK_GOLD_SPOT_USD)} /oz</p>
            </div>
          </div>

          {/* Funding Route */}
          {routeInfo && (
            <div className="pt-3 border-t border-border/50">
              <span className="text-text-faint text-xs">Funding Route</span>
              <div className="flex items-center gap-2 mt-1">
                <RouteIcon className="h-4 w-4 text-gold" />
                <span className="text-sm font-semibold text-text">{routeInfo.label}</span>
                <span className="text-xs text-text-faint">— {routeInfo.detail}</span>
              </div>
            </div>
          )}

          {/* Fee summary */}
          <div className="pt-3 border-t border-border/50 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-text-faint text-xs">T-Zero Execution Fee (1.0%)</span>
              <p className="text-gold font-semibold font-mono tabular-nums">{fmt(calc.fee)}</p>
            </div>
            <div>
              <span className="text-text-faint text-xs">Total Debit</span>
              <p className="text-text font-bold font-mono tabular-nums">{fmt(calc.total)}</p>
            </div>
          </div>

          {memo && (
            <div className="pt-3 border-t border-border/50 text-sm">
              <span className="text-text-faint text-xs">Memo</span>
              <p className="text-text-muted">{memo}</p>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
         FEDWIRE SETTLEMENT INSTRUCTIONS — Dynamic from Column N.A.
         ════════════════════════════════════════════════════════════
         Only shown when fundingRoute === 'fedwire'.
         Data fetched via TanStack Query → server action → ColumnBankService.
         ════════════════════════════════════════════════════════════ */}
      {isFedwire && (
        <div className="rounded-lg border border-border bg-surface-2 overflow-hidden">
          <div className="bg-blue-500/[0.06] border-b border-blue-500/20 px-5 py-3 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
              Fedwire Settlement Instructions
            </span>
            {depositInstructions && !depositInstructions.isLive && (
              <span className="ml-auto text-[10px] font-mono text-amber-400/70 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                SANDBOX
              </span>
            )}
          </div>

          <div className="px-5 py-4">
            {/* Loading state */}
            {isLoadingInstructions && (
              <div className="flex items-center justify-center gap-3 py-6">
                <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                <span className="text-sm text-text-muted">
                  Generating virtual account…
                </span>
              </div>
            )}

            {/* Error state */}
            {instructionsError && !isLoadingInstructions && (
              <div className="flex items-center gap-2 py-4 px-3 rounded-md bg-danger/10 border border-danger/20">
                <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
                <span className="text-sm text-danger">
                  Failed to generate wire instructions. Please retry or contact treasury.
                </span>
              </div>
            )}

            {/* Success state */}
            {depositInstructions && !isLoadingInstructions && (
              <div className="space-y-2.5">
                <p className="text-xs text-text-faint leading-relaxed mb-3">
                  Wire the exact notional amount below to the following FBO account.
                  Funds are held in escrow by{" "}
                  <span className="font-semibold text-text-muted">
                    {depositInstructions.bankName}
                  </span>{" "}
                  until Delivery-vs-Payment execution.
                </p>

                <CopiableField
                  label="Receiving Bank"
                  value={depositInstructions.bankName}
                  fieldName="bankName"
                  copiedField={copiedField}
                  onCopy={copy}
                  mono={false}
                />

                <CopiableField
                  label="ABA Routing Number"
                  value={depositInstructions.routingNumber}
                  fieldName="routingNumber"
                  copiedField={copiedField}
                  onCopy={copy}
                />

                <CopiableField
                  label="Account Number"
                  value={depositInstructions.accountNumber}
                  fieldName="accountNumber"
                  copiedField={copiedField}
                  onCopy={copy}
                />

                <div className="mt-3 pt-3 border-t border-border/40">
                  <CopiableField
                    label="Exact Wire Amount (USD)"
                    value={fmt(calc.total)}
                    fieldName="wireAmount"
                    copiedField={copiedField}
                    onCopy={copy}
                  />
                </div>

                <p className="text-[10px] text-text-faint/70 mt-2 leading-relaxed">
                  Virtual Account ID:{" "}
                  <span className="font-mono text-text-faint">
                    {depositInstructions.virtualAccountId}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Order Status — shown when wire instructions are generated */}
      {isFedwire && depositInstructions && !isLoadingInstructions && (
        <Link
          id="view-order-tracking-institutional"
          href="/orders/ord-1"
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-400 transition-all hover:bg-amber-500/15 hover:border-amber-500/50 no-underline"
        >
          <Package className="h-4 w-4" />
          View Order Status & Tracking
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {/* Settlement Reference Code */}
      <div>
        <label className="typo-label mb-1.5 block" htmlFor="w-ref">
          Settlement Reference Code
        </label>
        <input
          id="w-ref"
          type="text"
          {...register("referenceCode")}
          placeholder="GW-2026-0391"
          className={cn(FIELD, "font-mono tracking-wider")}
        />
        {errors.referenceCode && (
          <p className="mt-1 text-xs text-danger">{errors.referenceCode.message}</p>
        )}
        <p className="mt-1 text-xs text-text-faint">
          Auto-generated for both wire and stablecoin rails. Embedded in the SHA-256 clearing certificate.
        </p>
      </div>

      {/* Execute CTA */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onExecute}
          disabled={isExecuting}
          className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-gold px-5 py-3.5 text-sm font-bold text-bg transition-all hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Fingerprint className="h-5 w-5" />
          {isExecuting ? "Signing & Executing…" : "Sign & Execute Goldwire"}
        </button>
        <p className="mt-2 text-center text-[11px] text-text-faint leading-relaxed">
          By executing, you authorize the deterministic title transfer of{" "}
          <span className="font-mono font-medium text-text-muted">{calc.goldOz.toFixed(4)} oz t</span>{" "}
          of allocated gold within the Malca-Amit sovereign vault network.
        </p>
      </div>
    </div>
  );
}
