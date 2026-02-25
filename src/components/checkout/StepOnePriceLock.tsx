"use client";

/* ================================================================
   STEP 1: PRICE LOCK — Server-Backed Quote Model
   ================================================================
   Captures the buyer's desired weight in Troy Ounces, creates a
   server-backed quote via serverCreateQuote (with step-up auth),
   and displays a countdown from the server's expiresAt.

   The client ONLY controls the countdown display — the server
   is authoritative on quote expiry and locked price.

   Flow:
     1. User enters weight
     2. Clicks "Lock Price" → triggers useReverification()
     3. Server creates quote row, returns quoteId + expiresAt
     4. Client starts countdown from (expiresAt - now)
     5. Advance to Step 2 with quoteId in form context

   Live spot price from OANDA adapter is used for display only;
   the actual locked price comes from the server quote.
   ================================================================ */

import { useState, useEffect, useCallback, useRef } from "react";
import { useFormContext } from "react-hook-form";
import {
  Lock,
  Clock,
  AlertTriangle,
  Radio,
  HelpCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import type { CheckoutFormData } from "@/lib/schemas/checkout-schema";
import { trackEvent } from "@/lib/analytics";
import { useReverification } from "@/hooks/useReverification";
import {
  serverCreateQuote,
  type QuoteActionResult,
} from "@/lib/actions/checkout-actions";
import { registerQuoteInStore } from "@/lib/api";

/* ── Countdown Hook (from server expiresAt) ── */
function useServerCountdown(expiresAt: string | null) {
  const computeRemaining = (expiry: string | null) =>
    expiry
      ? Math.max(0, Math.floor((new Date(expiry).getTime() - Date.now()) / 1000))
      : 0;

  const [remaining, setRemaining] = useState(() => computeRemaining(expiresAt));

  useEffect(() => {
    // Sync initial value when expiresAt changes
    const initial = computeRemaining(expiresAt);
    if (initial !== remaining) setRemaining(initial);
    if (!expiresAt || initial <= 0) return;

    const id = setInterval(() => {
      setRemaining((prev) => {
        const next = prev <= 1 ? 0 : prev - 1;
        if (next <= 0) clearInterval(id);
        return next;
      });
    }, 1000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const isExpired = remaining <= 0 && expiresAt !== null;
  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const progress = expiresAt ? remaining / 60 : 1; // 60s total window

  return { remaining, isExpired, display, progress, hasStarted: expiresAt !== null };
}

/* ── Formatter ── */
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ================================================================ */

interface StepOnePriceLockProps {
  pricePerOz: number;
  maxWeightOz: number;
  onAdvance: () => void;
  /** Live XAU/USD spot price from OANDA (for display before quote creation) */
  liveSpotPrice?: number | null;
  /** Source of the price data */
  priceSource?: "oanda_live" | "mock" | "listing";
  /** Listing ID for quote creation */
  listingId?: string;
}

export function StepOnePriceLock({
  pricePerOz,
  maxWeightOz,
  onAdvance,
  liveSpotPrice,
  priceSource = "listing",
  listingId = "demo-listing",
}: StepOnePriceLockProps) {
  const {
    register,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<CheckoutFormData>();

  const { execute, isReverifying } = useReverification();

  /* ── Quote state ── */
  const [quoteResult, setQuoteResult] = useState<QuoteActionResult | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const expiredTracked = useRef(false);

  /** Per-oz price for display (always the raw spot/listing price pre-quote) */
  const displayPricePerOz = liveSpotPrice ?? pricePerOz;

  const weightOz = watch("weightOz");
  const notional = quoteResult
    ? quoteResult.lockedPrice
    : (weightOz || 0) * displayPricePerOz;

  /* ── Server-driven countdown ── */
  const countdown = useServerCountdown(quoteResult?.expiresAt ?? null);

  /* Set the display locked price on mount and when spot refreshes */
  useEffect(() => {
    if (!quoteResult) {
      setValue("lockedPrice", displayPricePerOz);
    }
  }, [displayPricePerOz, setValue, quoteResult]);

  /* Track price lock expiration (fire once) */
  useEffect(() => {
    if (countdown.isExpired && !expiredTracked.current) {
      expiredTracked.current = true;
      trackEvent("PriceLockExpired", {
        quoteId: quoteResult?.quoteId,
        pricePerOz: displayPricePerOz,
      });
      // Clear quote via callback in next tick to avoid cascading render
      requestAnimationFrame(() => setQuoteResult(null));
    }
  }, [countdown.isExpired, displayPricePerOz, quoteResult?.quoteId]);

  /* Handle Lock Price — server-backed quote creation with re-verification */
  const handleLockPrice = useCallback(async () => {
    const isValid = await trigger(["weightOz"]);
    if (!isValid || !weightOz || weightOz <= 0) return;

    setIsLocking(true);
    setLockError(null);
    expiredTracked.current = false;

    const outcome = await execute(() =>
      serverCreateQuote({
        listingId,
        weightOz,
        premiumBps: 0,
      }),
    );

    setIsLocking(false);

    if (outcome.ok && outcome.data) {
      const data = outcome.data;
      setQuoteResult(data);

      // Persist to form context
      setValue("lockedPrice", data.lockedPrice / weightOz);
      setValue("quoteId", data.quoteId);

      // RSK-004: Mirror quote to localStorage store for client-side consumption
      registerQuoteInStore({
        id: data.quoteId,
        userId: "user-1", // TODO: pass real userId from auth context
        listingId,
        weightOz,
        spotPrice: data.spotPrice,
        premiumBps: data.premiumBps,
        lockedPrice: data.lockedPrice,
        status: "ACTIVE",
        expiresAt: data.expiresAt,
        priceFeedSource: data.priceFeedSource,
        priceFeedTimestamp: data.priceFeedTimestamp,
      });

      trackEvent("PriceLocked", {
        quoteId: data.quoteId,
        lockedPrice: data.lockedPrice,
        spotPrice: data.spotPrice,
        weightOz,
        priceFeedSource: data.priceFeedSource,
      });
    } else if (!outcome.ok) {
      if (outcome.error === "REVERIFICATION_REQUIRED") {
        // The hook handles re-auth flow automatically
        return;
      }
      setLockError(outcome.error);
    }
  }, [trigger, weightOz, listingId, execute, setValue]);

  /* Advance to Step 2 only if we have a valid quote */
  const handleAdvance = useCallback(() => {
    if (quoteResult && !countdown.isExpired) {
      onAdvance();
    }
  }, [quoteResult, countdown.isExpired, onAdvance]);

  /** Price source indicator */
  const isLive = priceSource === "oanda_live";
  const hasQuote = quoteResult !== null && !countdown.isExpired;

  /* ── Countdown color palette (Phase 4: high-trust, no red) ── */
  const timerBorder = countdown.isExpired
    ? "border-color-5/30 bg-color-5/5"
    : countdown.remaining <= 15
      ? "border-amber-500/30 bg-amber-500/5"
      : "border-blue-200/30 bg-blue-500/5";

  const timerIconColor = countdown.isExpired
    ? "text-color-3/40"
    : countdown.remaining <= 15
      ? "text-amber-400"
      : "text-blue-400";

  const timerTextColor = countdown.isExpired
    ? "text-color-3/40"
    : countdown.remaining <= 15
      ? "text-amber-400"
      : "text-blue-400";

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">Lock Your Price</h2>
      </div>

      <p className="text-xs text-color-3/50 leading-relaxed">
        Enter the weight you wish to acquire. Your price will be locked for
        60 seconds via a server-backed quote while you complete checkout.
      </p>

      {/* ── Live Price Indicator ── */}
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${
            hasQuote
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : isLive
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-color-5/10 text-color-3/40 border border-color-5/15"
          }`}
        >
          {hasQuote ? (
            <>
              <ShieldCheck className="h-3 w-3" />
              Server Locked
            </>
          ) : (
            <>
              <Radio
                className={`h-3 w-3 ${isLive ? "animate-pulse" : ""}`}
              />
              {isLive ? "OANDA Live" : "Listing Price"}
            </>
          )}
        </div>
        <span className="font-mono text-xs tabular-nums text-color-3/50">
          ${fmtUsd(hasQuote ? quoteResult!.spotPrice : displayPricePerOz)}/oz
        </span>
        {hasQuote && quoteResult!.priceFeedSource && (
          <span className="text-[9px] text-color-3/30 font-mono">
            via {quoteResult!.priceFeedSource}
          </span>
        )}
      </div>

      {/* ── Countdown Timer (only visible after quote created) ── */}
      {countdown.hasStarted && (
        <div
          role="timer"
          aria-live="assertive"
          aria-label={
            countdown.isExpired
              ? "Price lock expired"
              : `${countdown.remaining} seconds remaining to complete checkout`
          }
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${timerBorder}`}
        >
          <Clock className={`h-4 w-4 shrink-0 ${timerIconColor}`} />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-color-3/40">
              Quote locked (60 sec)
            </p>
            <p
              className={`font-mono text-xl font-bold tabular-nums ${timerTextColor}`}
            >
              {countdown.display}
            </p>
          </div>

          {/* "?" tooltip explaining the price lock */}
          <div className="relative group shrink-0">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-color-5/20 text-color-3/30 hover:text-color-3/60 hover:border-color-5/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-2/30"
              aria-label="Why lock the price?"
              tabIndex={0}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
            <div
              role="tooltip"
              className="
                absolute right-0 top-full mt-2 z-20
                w-56 rounded-lg border border-color-5/20 bg-color-1 px-3 py-2
                text-[11px] leading-relaxed text-color-3/70 shadow-lg
                opacity-0 pointer-events-none scale-95
                group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-100
                group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus-within:scale-100
                transition-all duration-150
              "
            >
              This price is locked server-side to protect you from market
              spikes. The lock expires after 60 seconds. The price feed
              source and timestamp are recorded for regulatory audit.
            </div>
          </div>

          {/* Progress arc */}
          <div className="relative h-10 w-10 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-color-5/10"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray={`${countdown.progress * 100.53} 100.53`}
                strokeLinecap="round"
                className={timerTextColor}
              />
            </svg>
          </div>
        </div>
      )}

      {/* ── Weight Input ── */}
      <div>
        <label
          htmlFor="checkout-weight"
          className="text-[10px] uppercase tracking-widest text-color-3/40 font-semibold mb-1.5 block"
        >
          Weight (Troy Ounces)
        </label>
        <div className="relative">
          <input
            id="checkout-weight"
            type="number"
            step="any"
            min={0.01}
            max={maxWeightOz}
            disabled={hasQuote}
            placeholder={`Max ${maxWeightOz.toLocaleString()} oz available`}
            className={`
              w-full rounded-lg border bg-color-1/50 px-4 py-3
              font-mono text-lg tabular-nums text-color-3 placeholder:text-color-3/20
              focus:outline-none focus:ring-2 focus:ring-color-2/30 focus:border-color-2/40
              transition-colors
              ${errors.weightOz ? "border-red-500/50" : "border-color-5/20"}
              ${hasQuote ? "opacity-60 cursor-not-allowed" : ""}
            `}
            {...register("weightOz", { valueAsNumber: true })}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-color-3/30 font-medium">
            oz
          </span>
        </div>
        {errors.weightOz && (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
            <AlertTriangle className="h-3 w-3" />
            {errors.weightOz.message}
          </p>
        )}
      </div>

      {/* ── Financial Summary ── */}
      <div className="rounded-lg border border-color-5/15 bg-color-1/30 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-color-3/40">
            {hasQuote ? "Locked Price / oz" : "Current Price / oz"}
          </span>
          <span className="font-mono text-sm tabular-nums text-color-3">
            ${fmtUsd(hasQuote ? quoteResult!.lockedPrice / (weightOz || 1) : displayPricePerOz)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-color-3/40">
            Weight
          </span>
          <span className="font-mono text-sm tabular-nums text-color-3">
            {weightOz ? weightOz.toLocaleString() : "—"} oz
          </span>
        </div>
        <div className="border-t border-color-5/10 pt-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-color-3/60 font-semibold">
            Total Notional
          </span>
          <span className="font-mono text-lg font-bold tabular-nums text-color-2">
            ${fmtUsd(notional)}
          </span>
        </div>
      </div>

      {/* ── Lock / Continue CTA ── */}
      {!hasQuote ? (
        <button
          type="button"
          onClick={handleLockPrice}
          disabled={isLocking || isReverifying || !weightOz || weightOz <= 0}
          className="
            flex w-full items-center justify-center gap-2
            rounded-lg px-4 py-3
            bg-color-2 text-color-1 text-sm font-semibold
            transition-all duration-150
            hover:bg-[#dbb56a] active:bg-[#c49b4e]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-2/50 focus-visible:ring-offset-2 focus-visible:ring-offset-color-1
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          {isLocking || isReverifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isReverifying ? "Re-verifying Identity…" : "Locking Price…"}
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Verify &amp; Lock Price
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleAdvance}
          disabled={countdown.isExpired}
          className="
            flex w-full items-center justify-center gap-2
            rounded-lg px-4 py-3
            bg-color-2 text-color-1 text-sm font-semibold
            transition-all duration-150
            hover:bg-[#dbb56a] active:bg-[#c49b4e]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-2/50 focus-visible:ring-offset-2 focus-visible:ring-offset-color-1
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          <Lock className="h-4 w-4" />
          {countdown.isExpired ? "Price Lock Expired" : "Continue to Delivery"}
        </button>
      )}

      {/* ── Lock Error ── */}
      {lockError && (
        <p className="text-center text-xs text-red-400">{lockError}</p>
      )}

      {/* ── Expired Message ── */}
      {countdown.isExpired && (
        <p className="text-center text-xs text-color-3/50">
          The price lock quote has expired. Please re-enter your weight and
          lock a new quote.
        </p>
      )}
    </div>
  );
}
