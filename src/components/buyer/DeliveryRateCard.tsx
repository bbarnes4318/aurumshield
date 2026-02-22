"use client";

/* ================================================================
   DELIVERY RATE CARD — Displays BGS rate quote with fee breakdown
   Shows loading skeleton while rate is being fetched.
   ================================================================ */

import { cn } from "@/lib/utils";
import { Shield, Loader2, AlertTriangle, Truck } from "lucide-react";
import type { DeliveryRateQuote } from "@/lib/delivery/delivery-types";

/* ---------- Currency Formatter ---------- */

function fmtUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ---------- Loading Skeleton ---------- */

function RateSkeleton() {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface-2 p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
        <span className="text-xs text-text-faint">
          Fetching Brink&apos;s rate quote…
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-3/4 rounded bg-surface-3" />
        <div className="h-3 w-1/2 rounded bg-surface-3" />
        <div className="h-3 w-2/3 rounded bg-surface-3" />
      </div>
      <div className="h-5 w-1/3 rounded bg-surface-3" />
    </div>
  );
}

/* ---------- Error State ---------- */

function RateError({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-danger/30 bg-danger/5 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-danger">
            Rate quote unavailable
          </p>
          <p className="text-[11px] text-danger/80 mt-0.5">{message}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Component ---------- */

interface DeliveryRateCardProps {
  quote: DeliveryRateQuote | null | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function DeliveryRateCard({
  quote,
  isLoading,
  error,
}: DeliveryRateCardProps) {
  if (isLoading) return <RateSkeleton />;
  if (error) return <RateError message={error.message} />;
  if (!quote) return null;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface-2 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-gold" />
          <span className="typo-label">Transport Quote</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-sm bg-gold/10 px-2 py-0.5">
          <Truck className="h-3 w-3 text-gold" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
            {quote.carrier}
          </span>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-faint">Armored Transport</span>
          <span className="tabular-nums text-text">{fmtUsd(quote.baseFee)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-faint">Insurance Premium (0.15%)</span>
          <span className="tabular-nums text-text">
            {fmtUsd(quote.insuranceFee)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-faint">Handling &amp; Packaging</span>
          <span className="tabular-nums text-text">
            {fmtUsd(quote.handlingFee)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-border pt-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-text">Total Delivery Cost</span>
            <span className="font-semibold tabular-nums text-gold">
              {fmtUsd(quote.totalFee)}
            </span>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div
        className={cn(
          "flex items-center justify-between rounded-sm border border-border bg-surface-1 px-3 py-1.5",
        )}
      >
        <span className="text-[11px] text-text-faint">
          Est. {quote.estimatedDays} business day{quote.estimatedDays === 1 ? "" : "s"}
        </span>
        <span className="text-[10px] text-text-faint tabular-nums">
          Quote valid for {quote.validForMinutes} min
        </span>
      </div>
    </div>
  );
}
