"use client";

import { useState, useCallback, useTransition } from "react";
import { Banknote, Hexagon, Shield, Copy, Check, ArrowLeft, Loader2, Truck, Lock, ShieldCheck } from "lucide-react";
import {
  verifyAddressAndQuote,
  type FreightQuoteResult,
  type FreightAddress,
} from "@/actions/logistics";
import {
  generateFiatDepositInstructions,
  generateDigitalDepositInstructions,
  type FiatDepositInstructions,
  type DigitalDepositInstructions,
} from "@/actions/banking";

/* ================================================================
   MOCK SPOT PRICE
   ================================================================ */
const MOCK_SPOT_PRICE = 2345.5;

/* ================================================================
   HELPERS
   ================================================================ */

/** Strip non-digits, format with commas */
function formatWithCommas(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

/** Parse a comma-formatted string back to a number (or 0) */
function parseAmount(formatted: string): number {
  const n = Number(formatted.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Format ounces to 4 decimal places */
function formatOunces(usd: number): string {
  if (usd <= 0) return "0.0000";
  return (usd / MOCK_SPOT_PRICE).toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

/** Format spot price */
function formatSpot(price: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format USD dollar amount with commas and 2 decimals */
function formatUSD(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ================================================================
   COPY-TO-CLIPBOARD BUTTON
   ================================================================ */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: no-op in environments without clipboard API
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300 active:scale-95"
      aria-label={`Copy ${value}`}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

/* ================================================================
   VIEW TYPE — Determines which card content is shown
   ================================================================ */
type TerminalView =
  | { kind: "input" }
  | { kind: "wire"; details: FiatDepositInstructions }
  | { kind: "digital"; details: DigitalDepositInstructions };

/* ================================================================
   SETTLEMENT DESTINATION
   ================================================================ */
type SettlementDest = "vault" | "physical";
type AddressType = "commercial" | "residential";

/* ── US State Options ── */
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
] as const;

/* ================================================================
   PAGE
   ================================================================ */
export default function TransactionsPage() {
  const [rawValue, setRawValue] = useState("");
  const [view, setView] = useState<TerminalView>({ kind: "input" });
  const [isPending, startTransition] = useTransition();
  const [pendingRail, setPendingRail] = useState<"fedwire" | "stablecoin" | null>(null);
  const [settlementDest, setSettlementDest] = useState<SettlementDest>("vault");

  /* ── Structured Address Form ── */
  const [addrStreet, setAddrStreet] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrZip, setAddrZip] = useState("");
  const [addrType, setAddrType] = useState<AddressType>("commercial");

  /* ── Freight Quote State ── */
  const [freightQuote, setFreightQuote] = useState<FreightQuoteResult | null>(null);
  const [freightPending, setFreightPending] = useState(false);
  const [freightError, setFreightError] = useState<string | null>(null);
  const [routeVerified, setRouteVerified] = useState(false);

  const amount = parseAmount(rawValue);

  /* ── Derived totals ── */
  const totalLogisticsFee = routeVerified && freightQuote ? freightQuote.totalLogisticsFee : 0;
  const totalAmountDue = settlementDest === "physical" ? amount + totalLogisticsFee : amount;

  /** Toggle destination — reset quote when switching */
  const handleDestinationChange = useCallback(
    (dest: SettlementDest) => {
      setSettlementDest(dest);
      setFreightQuote(null);
      setFreightError(null);
      setRouteVerified(false);
    },
    [],
  );

  /** Verify Route & Calculate Freight — calls the live server action */
  const handleVerifyRoute = useCallback(() => {
    if (!addrZip || amount <= 0) return;
    setFreightPending(true);
    setFreightError(null);
    setRouteVerified(false);
    setFreightQuote(null);

    const address: FreightAddress = {
      streetAddress: addrStreet,
      city: addrCity,
      state: addrState,
      zipCode: addrZip,
      addressType: addrType,
    };

    verifyAddressAndQuote(address, amount)
      .then((quote) => {
        setFreightQuote(quote);
        setRouteVerified(true);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setFreightError(msg);
      })
      .finally(() => setFreightPending(false));
  }, [addrStreet, addrCity, addrState, addrZip, addrType, amount]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRawValue(formatWithCommas(e.target.value));
    },
    [],
  );

  /** Execute via Fedwire — calls server action to generate virtual FBO account */
  const handleFedwire = useCallback(() => {
    setPendingRail("fedwire");
    startTransition(async () => {
      try {
        const instructions = await generateFiatDepositInstructions(
          "temp-counterparty-id",
          `AurumShield Terminal — $${rawValue} USD`,
        );
        setView({ kind: "wire", details: instructions });
      } catch (err) {
        console.error("[AurumShield] Failed to generate wire instructions:", err);
      } finally {
        setPendingRail(null);
      }
    });
  }, [rawValue]);

  /** Execute via Stablecoin — calls server action to generate MPC deposit address */
  const handleStablecoin = useCallback(() => {
    setPendingRail("stablecoin");
    startTransition(async () => {
      try {
        const instructions = await generateDigitalDepositInstructions(amount);
        setView({ kind: "digital", details: instructions });
      } catch (err) {
        console.error("[AurumShield] Failed to generate digital deposit instructions:", err);
      } finally {
        setPendingRail(null);
      }
    });
  }, [amount]);

  /** Return to the input view */
  const handleReturnToTerminal = useCallback(() => {
    setView({ kind: "input" });
  }, []);

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-slate-950 -mx-5 -mt-5 -mb-5 lg:-mx-8 px-4">
      {/* ─── A. Trust Perimeter Badge ─── */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-800/40 bg-emerald-950/30 px-5 py-2 backdrop-blur-sm">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold tracking-wide text-emerald-400">
            Entity KYB Cleared
          </span>
          <span className="text-emerald-700">•</span>
          <span className="text-xs font-medium tracking-wide text-emerald-500/80">
            Limit: Unrestricted
          </span>
        </div>
      </div>

      {/* ─── CENTRAL CARD — View Swap ─── */}
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8 shadow-2xl shadow-black/40">

        {/* ══════════════════════════════════════════════════════════
           FEDWIRE SETTLEMENT INSTRUCTIONS VIEW
           ══════════════════════════════════════════════════════════ */}
        {view.kind === "wire" && (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-light tracking-tight text-slate-100">
                Fedwire Transfer Instructions
              </h1>
            </div>

            <div className="mb-6 rounded-lg border border-amber-800/30 bg-amber-950/20 px-5 py-3.5">
              <p className="text-sm leading-relaxed text-amber-200/80">
                Initiate a same-day wire transfer from your registered corporate account.
                Funds will be mathematically allocated to your vault upon receipt.
              </p>
            </div>

            <div className="mb-8 space-y-5 rounded-xl border border-slate-800 bg-slate-950 p-6">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Amount Due
                </span>
                <div className="mt-1 font-mono text-4xl font-semibold tabular-nums text-white">
                  ${formatUSD(amount)}
                </div>
              </div>

              <div className="h-px bg-slate-800" />

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Bank Name
                </span>
                <div className="mt-1 text-lg font-medium text-slate-200">
                  {view.details.bankName}
                </div>
              </div>

              <div className="h-px bg-slate-800" />

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Routing Number
                  </span>
                  <div className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-wider text-slate-100">
                    {view.details.routingNumber}
                  </div>
                </div>
                <CopyButton value={view.details.routingNumber} />
              </div>

              <div className="h-px bg-slate-800" />

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Account Number
                  </span>
                  <div className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-wider text-slate-100">
                    {view.details.accountNumber}
                  </div>
                </div>
                <CopyButton value={view.details.accountNumber} />
              </div>

              <div className="h-px bg-slate-800" />

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Beneficiary
                </span>
                <div className="mt-1 text-lg font-medium text-slate-200">
                  AurumShield FBO [Entity]
                </div>
              </div>
            </div>

            <button
              id="wire-initiated"
              type="button"
              onClick={handleReturnToTerminal}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-6 py-4 text-sm font-semibold text-emerald-400 transition-all hover:border-emerald-700/60 hover:bg-emerald-950/50 active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              I Have Initiated This Wire
            </button>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
           DIGITAL ASSET SETTLEMENT INSTRUCTIONS VIEW
           ══════════════════════════════════════════════════════════ */}
        {view.kind === "digital" && (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-light tracking-tight text-slate-100">
                Digital Asset Settlement
                <span className="ml-2 text-amber-500/80">●</span>
              </h1>
            </div>

            <div className="mb-6 rounded-lg border border-amber-800/30 bg-amber-950/20 px-5 py-3.5">
              <p className="text-sm leading-relaxed text-amber-200/80">
                Send <span className="font-semibold text-amber-100">exactly</span> the
                requested amount via the ERC-20 network. Funds sent on other networks
                will be permanently lost.
              </p>
            </div>

            <div className="mb-8 space-y-5 rounded-xl border border-slate-800 bg-slate-950 p-6">
              {/* Amount Due */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Amount Due
                </span>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-mono text-3xl font-semibold tabular-nums text-white">
                    {formatUSD(amount)}
                  </span>
                  <span className="text-sm font-semibold tracking-wide text-amber-500/70">
                    {view.details.acceptedTokens}
                  </span>
                </div>
              </div>

              <div className="h-px bg-slate-800" />

              {/* Network */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Network
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800">
                    <Hexagon className="h-3 w-3 text-amber-500" />
                  </div>
                  <span className="text-lg font-medium text-slate-200">
                    {view.details.network}
                  </span>
                </div>
              </div>

              <div className="h-px bg-slate-800" />

              {/* Deposit Address */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      Deposit Address
                    </span>
                    <div className="mt-1 font-mono text-lg font-semibold tabular-nums leading-relaxed text-amber-500 break-all">
                      {view.details.depositAddress}
                    </div>
                  </div>
                  <div className="mt-5 shrink-0">
                    <CopyButton value={view.details.depositAddress} />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-800" />

              {/* QR Code Placeholder + Expiration */}
              <div className="flex items-center justify-between gap-6">
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900">
                  <div className="text-center">
                    <div className="mb-1 text-slate-600">
                      <svg className="mx-auto h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="3" height="3" />
                        <line x1="21" y1="14" x2="21" y2="14.01" />
                        <line x1="21" y1="21" x2="21" y2="21.01" />
                        <line x1="17" y1="18" x2="17" y2="18.01" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-medium text-slate-600">QR Code</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      Session Expires
                    </span>
                    <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-300">
                      {view.details.expirationMinutes} minutes
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    Address valid for a single deposit within the expiration window.
                  </p>
                </div>
              </div>
            </div>

            <button
              id="digital-transfer-initiated"
              type="button"
              onClick={handleReturnToTerminal}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-6 py-4 text-sm font-semibold text-emerald-400 transition-all hover:border-emerald-700/60 hover:bg-emerald-950/50 active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              I Have Initiated This Transfer
            </button>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
           INPUT VIEW (Default Terminal)
           ══════════════════════════════════════════════════════════ */}
        {view.kind === "input" && (
          <>
            <div className="mb-5 text-center">
              <div className="mb-1 flex items-center justify-center gap-2.5">
                <Shield className="h-5 w-5 text-slate-500" />
                <h1 className="text-3xl font-light tracking-tight text-slate-100">
                  Acquire Vaulted Gold
                </h1>
              </div>
              <p className="text-sm text-slate-500">
                T-Zero mathematical settlement via physically allocated bullion.
              </p>
            </div>

            {/* ── Giant USD Input ── */}
            <div className="relative mb-6">
              <div className="flex items-center rounded-xl border border-slate-700/80 bg-slate-950/60 px-5 py-4 transition-colors focus-within:border-slate-600 focus-within:ring-1 focus-within:ring-slate-600/50">
                <span className="mr-1 select-none text-5xl font-light text-slate-500 font-mono">
                  $
                </span>
                <input
                  id="usd-amount-input"
                  type="text"
                  inputMode="numeric"
                  value={rawValue}
                  onChange={handleChange}
                  placeholder="0"
                  autoComplete="off"
                  className="w-full bg-transparent text-5xl font-mono font-medium tabular-nums text-slate-100 placeholder:text-slate-700 outline-none"
                />
                <span className="ml-3 shrink-0 select-none text-sm font-semibold tracking-wider text-slate-600 uppercase">
                  USD
                </span>
              </div>
            </div>

            {/* ── Auto-Calculating Receipt ── */}
            <div className="mb-5 rounded-xl border border-slate-800/60 bg-slate-950/40 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Guaranteed Allocation
                  </span>
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 shrink-0 text-amber-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 20h12l3-8H3l3 8z" />
                      <path d="M8 12l2-8h4l2 8" />
                    </svg>
                    <span className="font-mono text-lg font-semibold tabular-nums text-slate-100">
                      {formatOunces(amount)}
                    </span>
                    <span className="text-sm font-medium text-slate-500">oz</span>
                  </div>
                </div>

                <div className="h-10 w-px bg-slate-800" />

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Spot Execution
                  </span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-amber-500/90">
                    ${formatSpot(MOCK_SPOT_PRICE)}
                    <span className="text-sm text-slate-500">/oz</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Settlement Destination Toggle ─── */}
            <div className="mb-5">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Settlement Destination
              </span>
              <div className="grid grid-cols-2 gap-0 rounded-xl border border-slate-700/60 bg-slate-950/60 p-1">
                {/* Option 1 — Allocated Vault Storage */}
                <button
                  id="dest-vault"
                  type="button"
                  onClick={() => handleDestinationChange("vault")}
                  className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-2.5 text-center transition-all duration-200 ${
                    settlementDest === "vault"
                      ? "bg-slate-800 shadow-inner shadow-black/20"
                      : "hover:bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Lock className={`h-3.5 w-3.5 ${
                      settlementDest === "vault" ? "text-emerald-400" : "text-slate-500"
                    }`} />
                    <span className={`text-xs font-semibold ${
                      settlementDest === "vault" ? "text-slate-100" : "text-slate-400"
                    }`}>
                      Allocated Vault Storage
                    </span>
                  </div>
                  <span className={`text-[10px] font-medium ${
                    settlementDest === "vault" ? "text-emerald-500/70" : "text-slate-600"
                  }`}>
                    +0.15% Annual LBMA Storage
                  </span>
                </button>

                {/* Option 2 — Armored Physical Delivery */}
                <button
                  id="dest-physical"
                  type="button"
                  onClick={() => handleDestinationChange("physical")}
                  className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-2.5 text-center transition-all duration-200 ${
                    settlementDest === "physical"
                      ? "bg-slate-800 shadow-inner shadow-black/20"
                      : "hover:bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Truck className={`h-3.5 w-3.5 ${
                      settlementDest === "physical" ? "text-amber-400" : "text-slate-500"
                    }`} />
                    <span className={`text-xs font-semibold ${
                      settlementDest === "physical" ? "text-slate-100" : "text-slate-400"
                    }`}>
                      Armored Physical Delivery
                    </span>
                  </div>
                  <span className={`text-[10px] font-medium ${
                    settlementDest === "physical" ? "text-amber-500/70" : "text-slate-600"
                  }`}>
                    Insured Transit via Brink&apos;s / Malca-Amit
                  </span>
                </button>
              </div>
            </div>

            {/* ─── Physical Delivery Panel (conditional) ─── */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                settlementDest === "physical"
                  ? "max-h-[600px] opacity-100 mb-4"
                  : "max-h-0 opacity-0 mb-0"
              }`}
            >
              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 px-4 py-3 space-y-3">

                {/* ── Route Verified Badge ── */}
                {routeVerified && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-950/30 px-3 py-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold tracking-wide text-emerald-400 uppercase">
                      Route Verified
                    </span>
                    {freightQuote && (
                      <span className="ml-auto font-mono text-xs font-semibold tabular-nums text-emerald-500/70">
                        {freightQuote.distanceMiles.toLocaleString()} mi
                      </span>
                    )}
                  </div>
                )}

                {/* ── Address Form ── */}
                <div>
                  <label
                    htmlFor="addr-street"
                    className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500"
                  >
                    Street Address
                  </label>
                  <input
                    id="addr-street"
                    type="text"
                    value={addrStreet}
                    onChange={(e) => { setAddrStreet(e.target.value); setRouteVerified(false); }}
                    readOnly={routeVerified}
                    placeholder="123 Vault Street, Suite 400"
                    autoComplete="off"
                    className={`w-full rounded-lg border bg-slate-950/80 px-3 py-2 text-sm font-medium text-slate-200 placeholder:text-slate-600 outline-none transition-colors ${
                      routeVerified
                        ? "border-emerald-800/30 bg-emerald-950/10 cursor-not-allowed"
                        : "border-slate-700/60 focus:border-slate-600 focus:ring-1 focus:ring-slate-600/50"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2">
                    <label htmlFor="addr-city" className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">City</label>
                    <input
                      id="addr-city"
                      type="text"
                      value={addrCity}
                      onChange={(e) => { setAddrCity(e.target.value); setRouteVerified(false); }}
                      readOnly={routeVerified}
                      placeholder="New York"
                      autoComplete="off"
                      className={`w-full rounded-lg border bg-slate-950/80 px-3 py-2 text-sm font-medium text-slate-200 placeholder:text-slate-600 outline-none transition-colors ${
                        routeVerified
                          ? "border-emerald-800/30 bg-emerald-950/10 cursor-not-allowed"
                          : "border-slate-700/60 focus:border-slate-600 focus:ring-1 focus:ring-slate-600/50"
                      }`}
                    />
                  </div>
                  <div>
                    <label htmlFor="addr-state" className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">State</label>
                    <select
                      id="addr-state"
                      value={addrState}
                      onChange={(e) => { setAddrState(e.target.value); setRouteVerified(false); }}
                      disabled={routeVerified}
                      className={`w-full rounded-lg border bg-slate-950/80 px-2 py-2 text-sm font-medium text-slate-200 outline-none transition-colors appearance-none ${
                        routeVerified
                          ? "border-emerald-800/30 bg-emerald-950/10 cursor-not-allowed"
                          : "border-slate-700/60 focus:border-slate-600 focus:ring-1 focus:ring-slate-600/50"
                      }`}
                    >
                      <option value="" className="bg-slate-900">—</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s} className="bg-slate-900">{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="addr-zip" className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">Zip Code</label>
                    <input
                      id="addr-zip"
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={addrZip}
                      onChange={(e) => { setAddrZip(e.target.value.replace(/\D/g, "").slice(0, 5)); setRouteVerified(false); }}
                      readOnly={routeVerified}
                      placeholder="10005"
                      autoComplete="off"
                      className={`w-full rounded-lg border bg-slate-950/80 px-3 py-2 text-sm font-mono font-semibold tabular-nums text-slate-200 placeholder:text-slate-600 outline-none transition-colors ${
                        routeVerified
                          ? "border-emerald-800/30 bg-emerald-950/10 cursor-not-allowed"
                          : "border-slate-700/60 focus:border-slate-600 focus:ring-1 focus:ring-slate-600/50"
                      }`}
                    />
                  </div>
                </div>

                {/* ── Address Type Toggle ── */}
                <div>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">Address Type</span>
                  <div className="grid grid-cols-2 gap-0 rounded-lg border border-slate-700/60 bg-slate-950/60 p-0.5">
                    <button
                      id="addr-type-commercial"
                      type="button"
                      onClick={() => { if (!routeVerified) setAddrType("commercial"); }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                        addrType === "commercial"
                          ? "bg-slate-800 text-slate-100 shadow-inner shadow-black/20"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Commercial
                    </button>
                    <button
                      id="addr-type-residential"
                      type="button"
                      onClick={() => { if (!routeVerified) setAddrType("residential"); }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                        addrType === "residential"
                          ? "bg-slate-800 text-slate-100 shadow-inner shadow-black/20"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Residential
                    </button>
                  </div>
                </div>

                {/* ── Error Display ── */}
                {freightError && (
                  <div className="rounded-lg border border-red-800/40 bg-red-950/20 px-3 py-2">
                    <p className="text-xs font-medium leading-relaxed text-red-400">{freightError}</p>
                  </div>
                )}

                {/* ── Verify Route Button (shown when NOT verified) ── */}
                {!routeVerified && (
                  <button
                    id="verify-route"
                    type="button"
                    onClick={handleVerifyRoute}
                    disabled={freightPending || !addrZip || amount <= 0}
                    className="group flex w-full items-center justify-center gap-2.5 rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm font-bold tracking-wide text-amber-400 uppercase transition-all hover:border-amber-600/60 hover:bg-amber-950/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {freightPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Pinging Armored Logistics Network...
                      </>
                    ) : (
                      <>
                        <Truck className="h-4 w-4" />
                        Verify Route &amp; Calculate Freight
                      </>
                    )}
                  </button>
                )}

                {/* ── Verified Quote Breakdown ── */}
                {routeVerified && freightQuote && (
                  <>
                    <div className="h-px bg-slate-800/60" />
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Logistics Premium
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Dispatch Base</span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-slate-300">
                          ${formatUSD(freightQuote.baseDispatch)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Transit Mileage ({freightQuote.distanceMiles.toLocaleString()} mi × $4.50)
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-slate-300">
                          ${formatUSD(freightQuote.mileageSurcharge)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Lloyd&apos;s Insurance (15bps)</span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-slate-300">
                          ${formatUSD(freightQuote.insurancePremium)}
                        </span>
                      </div>
                      <div className="h-px bg-slate-800/40" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-500/80">Total Logistics Fee</span>
                        <span className="font-mono text-sm font-bold tabular-nums text-amber-400">
                          ${formatUSD(freightQuote.totalLogisticsFee)}
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-slate-800/60" />

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Total Amount Due
                      </span>
                      <span className="font-mono text-lg font-bold tabular-nums text-white">
                        ${formatUSD(totalAmountDue)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ─── Dual-Rail Action Triggers ─── */}
            <div className="grid grid-cols-2 gap-4">
              {/* Button 1 — Fedwire */}
              <button
                id="execute-fedwire"
                type="button"
                onClick={handleFedwire}
                disabled={isPending}
                className="group flex flex-col items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-5 transition-all hover:border-slate-600 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {isPending && pendingRail === "fedwire" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                ) : (
                  <Banknote className="h-6 w-6 text-slate-400 transition-colors group-hover:text-slate-200" />
                )}
                <span className="text-sm font-semibold text-slate-200">
                  {isPending && pendingRail === "fedwire"
                    ? "Generating Virtual FBO Account..."
                    : "Execute via Fedwire"}
                </span>
                <span className="text-[11px] font-medium tracking-wide text-slate-500">
                  {isPending && pendingRail === "fedwire" ? "Please wait" : "Domestic USD"}
                </span>
              </button>

              {/* Button 2 — Stablecoin */}
              <button
                id="execute-stablecoin"
                type="button"
                onClick={handleStablecoin}
                disabled={isPending}
                className="group flex flex-col items-center gap-2 rounded-xl border border-amber-700/30 bg-amber-950/15 px-4 py-5 transition-all hover:border-amber-600/50 hover:bg-amber-950/25 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {isPending && pendingRail === "stablecoin" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500/80" />
                ) : (
                  <Hexagon className="h-6 w-6 text-amber-500/80 transition-colors group-hover:text-amber-400" />
                )}
                <span className="text-sm font-semibold text-amber-400/90">
                  {isPending && pendingRail === "stablecoin"
                    ? "Generating Secure MPC Enclave..."
                    : "Execute via Stablecoin"}
                </span>
                <span className="text-[11px] font-medium tracking-wide text-amber-600/70">
                  {isPending && pendingRail === "stablecoin" ? "Please wait" : "Instant T-Zero"}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Ambient gradient glow behind card ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-900/4 blur-3xl" />
      </div>
    </div>
  );
}
