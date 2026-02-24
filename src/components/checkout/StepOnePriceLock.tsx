"use client";

/* ================================================================
   STEP 1: PRICE LOCK — Weight Input & 60-Second Countdown
   ================================================================
   Captures the buyer's desired weight in Troy Ounces, displays
   the calculated total notional value in real-time, and runs a
   60-second countdown timer to create urgency for price locking.

   Live spot price from OANDA adapter is used when available,
   falling back to the listing's static pricePerOz.

   Phase 4: High-trust UI — calm blue countdown, no red alarm
   colors, tooltip explainer, ARIA timer role, analytics hooks.
   ================================================================ */

import { useState, useEffect, useCallback, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { Lock, Clock, AlertTriangle, Radio, HelpCircle } from "lucide-react";
import type { CheckoutFormData } from "@/lib/schemas/checkout-schema";
import { trackEvent } from "@/lib/analytics";

/* ── Countdown Hook ── */
function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const isExpired = remaining <= 0;
  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const progress = remaining / seconds;

  return { remaining, isExpired, display, progress };
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
  /** Live XAU/USD spot price from OANDA (overrides listing pricePerOz if provided) */
  liveSpotPrice?: number | null;
  /** Source of the price data */
  priceSource?: "oanda_live" | "mock" | "listing";
}

export function StepOnePriceLock({
  pricePerOz,
  maxWeightOz,
  onAdvance,
  liveSpotPrice,
  priceSource = "listing",
}: StepOnePriceLockProps) {
  const {
    register,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<CheckoutFormData>();

  const countdown = useCountdown(60);
  const expiredTracked = useRef(false);

  /** Active price: prefer live spot price, fall back to listing price */
  const activePrice = liveSpotPrice ?? pricePerOz;
  const weightOz = watch("weightOz");
  const notional = (weightOz || 0) * activePrice;

  /* Set the locked price on mount and when spot refreshes */
  useEffect(() => {
    setValue("lockedPrice", activePrice);
  }, [activePrice, setValue]);

  /* Track price lock expiration (fire once) */
  useEffect(() => {
    if (countdown.isExpired && !expiredTracked.current) {
      expiredTracked.current = true;
      trackEvent("PriceLockExpired", { pricePerOz: activePrice });
    }
  }, [countdown.isExpired, activePrice]);

  /* Handle advance with validation + analytics */
  const handleLockPrice = useCallback(async () => {
    const isValid = await trigger(["weightOz", "lockedPrice"]);
    if (isValid) {
      trackEvent("PriceLocked", {
        lockedPrice: activePrice,
        weightOz,
        timeRemaining: countdown.remaining,
      });
      onAdvance();
    }
  }, [trigger, onAdvance, activePrice, weightOz, countdown.remaining]);

  /** Price source indicator */
  const isLive = priceSource === "oanda_live";

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
        Enter the weight you wish to acquire. The current spot premium will be
        locked for 60 seconds while you complete checkout.
      </p>

      {/* ── Live Price Indicator ── */}
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${
            isLive
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-color-5/10 text-color-3/40 border border-color-5/15"
          }`}
        >
          <Radio
            className={`h-3 w-3 ${isLive ? "animate-pulse" : ""}`}
          />
          {isLive ? "OANDA Live" : "Listing Price"}
        </div>
        <span className="font-mono text-xs tabular-nums text-color-3/50">
          ${fmtUsd(activePrice)}/oz
        </span>
      </div>

      {/* ── Countdown Timer (Phase 4: calm blue → amber → gray, no red) ── */}
      <div
        role="timer"
        aria-live="assertive"
        aria-label={
          countdown.isExpired
            ? "Price lock expired"
            : `${countdown.remaining} seconds remaining to lock price`
        }
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${timerBorder}`}
      >
        <Clock className={`h-4 w-4 shrink-0 ${timerIconColor}`} />
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-color-3/40">
            Lock your price (60 sec)
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
            This price is locked while you checkout to protect you from
            market spikes. The lock expires after 60 seconds.
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
            placeholder={`Max ${maxWeightOz.toLocaleString()} oz available`}
            className={`
              w-full rounded-lg border bg-color-1/50 px-4 py-3
              font-mono text-lg tabular-nums text-color-3 placeholder:text-color-3/20
              focus:outline-none focus:ring-2 focus:ring-color-2/30 focus:border-color-2/40
              transition-colors
              ${errors.weightOz ? "border-red-500/50" : "border-color-5/20"}
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
            Locked Price / oz
          </span>
          <span className="font-mono text-sm tabular-nums text-color-3">
            ${fmtUsd(activePrice)}
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

      {/* ── Lock CTA ── */}
      <button
        type="button"
        onClick={handleLockPrice}
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
        {countdown.isExpired ? "Price Lock Expired" : "Lock Price & Continue"}
      </button>

      {countdown.isExpired && (
        <p className="text-center text-xs text-color-3/50">
          The price lock window has expired. Please close and reopen the
          checkout to refresh the quote.
        </p>
      )}
    </div>
  );
}
