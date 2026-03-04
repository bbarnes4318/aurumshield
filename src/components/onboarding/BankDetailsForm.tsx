"use client";

/* ================================================================
   TREASURY FUNDING ARCHITECTURE — Dual-Mode Onboarding

   Phase 1 (Closed Beta): Digital Stablecoin Bridge
     → USDC/USDT via institutional wallet → instant clearing
   Phase 2 (GA): Legacy Correspondent Banking
     → Traditional wire with 30-45 day MSB underwriting

   The user selects their funding method via a prominent tab toggle.
   The form dynamically renders the appropriate input fields.
   ================================================================ */

import { useState } from "react";
import {
  ShieldCheck,
  AlertCircle,
  Fingerprint,
  Wallet,
  Building,
  Zap,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ---------- Types ---------- */

type FundingMethod = "digital_stablecoin" | "legacy_wire";

interface TreasuryFundingFormProps {
  onSubmit?: (data: TreasuryFundingPayload) => void;
}

interface TreasuryFundingPayload {
  fundingMethod: FundingMethod;
  walletAddress?: string;
  walletNetwork?: string;
  stablecoinAsset?: string;
  bankName?: string;
  bankRoutingNumber?: string;
  bankAccountNumber?: string;
  bankSwiftCode?: string;
}

/* ---------- Constants ---------- */

const NETWORKS = [
  { value: "ERC-20 (Ethereum)", label: "ERC-20 (Ethereum)" },
  { value: "TRC-20 (Tron)", label: "TRC-20 (Tron)" },
  { value: "Solana", label: "Solana" },
  { value: "Base", label: "Base" },
];

const ASSETS = [
  { value: "USDC", label: "USDC (Circle)" },
  { value: "USDT", label: "USDT (Tether)" },
];

const FIELD = cn(
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2.5 text-sm text-text",
  "placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors"
);

/* ---------- Component ---------- */

export function BankDetailsForm({ onSubmit }: TreasuryFundingFormProps) {
  const [method, setMethod] = useState<FundingMethod>("digital_stablecoin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* Digital stablecoin fields */
  const [walletAddress, setWalletAddress] = useState("");
  const [walletNetwork, setWalletNetwork] = useState("");
  const [stablecoinAsset, setStablecoinAsset] = useState("");

  /* Legacy wire fields */
  const [bankName, setBankName] = useState("");
  const [bankRouting, setBankRouting] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankSwift, setBankSwift] = useState("");

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const payload: TreasuryFundingPayload = {
      fundingMethod: method,
      ...(method === "digital_stablecoin"
        ? { walletAddress, walletNetwork, stablecoinAsset }
        : { bankName, bankRoutingNumber: bankRouting, bankAccountNumber: bankAccount, bankSwiftCode: bankSwift }),
    };

    // TODO: POST to /api/onboarding/treasury
    console.log("═══ TREASURY FUNDING CONFIG ═══");
    console.log(JSON.stringify(payload, null, 2));
    console.log("═══════════════════════════════");

    await new Promise((r) => setTimeout(r, 800));
    onSubmit?.(payload);
    setSubmitted(true);
    setIsSubmitting(false);
  };

  /* ── Success state ── */
  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-surface-1 p-6 shadow-md">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 ring-2 ring-gold/30">
            <ShieldCheck className="h-7 w-7 text-gold" />
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold text-text">
              Treasury Funding Configured
            </h3>
            <p className="mt-1 text-xs text-text-faint">
              {method === "digital_stablecoin"
                ? "Digital Stablecoin Bridge — Instant Beta Access"
                : "Legacy Correspondent Banking — Pending Underwriting"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-2 text-xs font-medium text-gold hover:text-gold-hover transition-colors"
          >
            Reconfigure →
          </button>
        </div>
      </div>
    );
  }

  /* ── Main form ── */
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-6 shadow-md">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <Fingerprint className="h-5 w-5 text-gold" />
        <h2 className="font-heading text-sm font-semibold text-text tracking-tight">
          Treasury Funding Architecture
        </h2>
      </div>

      {/* ── Method Toggle ── */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMethod("digital_stablecoin")}
          className={cn(
            "relative flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-all duration-200",
            method === "digital_stablecoin"
              ? "border-gold bg-gold/[0.06] ring-1 ring-gold/40"
              : "border-border bg-surface-2 hover:border-gold/30"
          )}
        >
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-gold" />
            <span className="text-xs font-bold text-text">Digital Stablecoin Bridge</span>
          </div>
          <span className="text-[11px] text-text-faint leading-relaxed">
            USDC/USDT via institutional wallet
          </span>
          <div className="flex items-center gap-1 mt-1">
            <Zap className="h-3 w-3 text-success" />
            <span className="text-[10px] font-semibold text-success uppercase tracking-widest">
              Instant Beta Access
            </span>
          </div>
          {method === "digital_stablecoin" && (
            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-gold animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setMethod("legacy_wire")}
          className={cn(
            "relative flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-all duration-200",
            method === "legacy_wire"
              ? "border-warning/50 bg-warning/[0.06] ring-1 ring-warning/30"
              : "border-border bg-surface-2 hover:border-warning/30"
          )}
        >
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-text-faint" />
            <span className="text-xs font-bold text-text">Legacy Correspondent Banking</span>
          </div>
          <span className="text-[11px] text-text-faint leading-relaxed">
            Traditional fiat wire transfers
          </span>
          <div className="flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3 text-warning" />
            <span className="text-[10px] font-semibold text-warning uppercase tracking-widest">
              45-Day Underwriting
            </span>
          </div>
        </button>
      </div>

      {/* ── Digital Stablecoin Fields ── */}
      {method === "digital_stablecoin" && (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-2 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2.5">
            <Zap className="h-4 w-4 mt-0.5 shrink-0 text-gold" />
            <p className="text-[11px] leading-relaxed text-text-muted">
              Phase 1 participants receive <strong className="text-text">instant clearing access</strong> through
              our institutional stablecoin bridge. Deposits are converted to allocated gold title at
              live spot price within the Goldwire clearing engine.
            </p>
          </div>

          <div>
            <label className="typo-label mb-1.5 block" htmlFor="tf-asset">
              Stablecoin Asset
            </label>
            <select
              id="tf-asset"
              value={stablecoinAsset}
              onChange={(e) => setStablecoinAsset(e.target.value)}
              className={FIELD}
            >
              <option value="">Select asset…</option>
              {ASSETS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="typo-label mb-1.5 block" htmlFor="tf-network">
              Blockchain Network
            </label>
            <select
              id="tf-network"
              value={walletNetwork}
              onChange={(e) => setWalletNetwork(e.target.value)}
              className={FIELD}
            >
              <option value="">Select network…</option>
              {NETWORKS.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="typo-label mb-1.5 block" htmlFor="tf-wallet">
              Institutional Wallet Address
            </label>
            <input
              id="tf-wallet"
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              className={cn(FIELD, "font-mono text-xs tracking-wider")}
            />
            <p className="mt-1 text-[10px] text-text-faint">
              Whitelisted corporate custody address. Must pass OFAC compliance screening.
            </p>
          </div>
        </div>
      )}

      {/* ── Legacy Wire Fields ── */}
      {method === "legacy_wire" && (
        <div className="space-y-4">
          {/* Warning banner */}
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
            <p className="text-[11px] leading-relaxed text-text-muted">
              Legacy fiat underwriting is currently pending MSB compliance clearance.
              Expect <strong className="text-warning">30-45 day delays</strong> for USD
              wire approvals. For instant access, switch to the{" "}
              <button
                type="button"
                onClick={() => setMethod("digital_stablecoin")}
                className="text-gold font-semibold hover:underline"
              >
                Digital Stablecoin Bridge
              </button>
              .
            </p>
          </div>

          <div>
            <label className="typo-label mb-1.5 block" htmlFor="tf-bankname">
              Correspondent Bank Name
            </label>
            <input
              id="tf-bankname"
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="JPMorgan Chase NA"
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="typo-label mb-1.5 block" htmlFor="tf-routing">
                ABA Routing Number
              </label>
              <input
                id="tf-routing"
                type="text"
                value={bankRouting}
                onChange={(e) => setBankRouting(e.target.value)}
                placeholder="021000021"
                className={cn(FIELD, "font-mono tabular-nums")}
              />
            </div>
            <div>
              <label className="typo-label mb-1.5 block" htmlFor="tf-account">
                Account Number
              </label>
              <input
                id="tf-account"
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="••••••••1234"
                className={cn(FIELD, "font-mono tabular-nums")}
              />
            </div>
          </div>

          <div>
            <label className="typo-label mb-1.5 block" htmlFor="tf-swift">
              SWIFT/BIC Code
            </label>
            <input
              id="tf-swift"
              type="text"
              value={bankSwift}
              onChange={(e) => setBankSwift(e.target.value)}
              placeholder="CHASUS33"
              className={cn(FIELD, "font-mono uppercase tracking-wider")}
            />
          </div>
        </div>
      )}

      {/* Server error placeholder */}
      {/* TODO: Wire to real API error state */}

      {/* ── Submit ── */}
      <div className="mt-6">
        <Button
          type="button"
          isLoading={isSubmitting}
          loadingText="Configuring treasury…"
          onClick={handleSubmit}
          className="w-full py-3"
        >
          <ShieldCheck className="h-4 w-4" />
          {method === "digital_stablecoin"
            ? "Connect Institutional Wallet"
            : "Submit Bank Details for Underwriting"}
        </Button>
      </div>

      {/* Trust badges */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-text-faint">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          256-bit Encryption
        </span>
        <span className="opacity-30">|</span>
        <span>OFAC Screened</span>
        <span className="opacity-30">|</span>
        <span>Zero Data Storage</span>
      </div>
    </div>
  );
}
