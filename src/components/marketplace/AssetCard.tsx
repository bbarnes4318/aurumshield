"use client";

/* ================================================================
   ASSET CARD — Curated Gold Listing Card
   ================================================================
   Frosted glass card displaying a single gold listing with
   institutional-grade typography and premium styling.
   Maps directly to the inventory_listings PostgreSQL schema:
     id, form, purity, total_weight_oz, premium_per_oz, vault_location
   ================================================================ */

import { MapPin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Listing } from "@/lib/mock-data";

/* ── Mock spot price for premium derivation ── */
// TODO: Replace with live spot price from LBMA / Kitco API
const MOCK_SPOT_PRICE = 2_020.0;

/* ── Formatter utilities ── */
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtWeight = (n: number) => n.toLocaleString("en-US");

/* ── Form label map ── */
const FORM_LABELS: Record<string, string> = {
  bar: "Bar",
  coin: "Coin",
};

/* ================================================================ */

interface AssetCardProps {
  listing: Listing;
  onReserve: (listing: Listing) => void;
}

export function AssetCard({ listing, onReserve }: AssetCardProps) {
  const premium = listing.pricePerOz - MOCK_SPOT_PRICE;
  const notional = listing.totalWeightOz * listing.pricePerOz;
  const isSuspended = listing.status === "suspended";

  return (
    <article
      role="article"
      aria-label={`${listing.title} — ${fmtWeight(listing.totalWeightOz)} oz gold ${listing.form}`}
      className={cn(
        "glass-panel overflow-hidden transition-all duration-200 ease-out",
        isSuspended
          ? "opacity-50 pointer-events-none"
          : "hover:border-color-2/30 hover:shadow-[0_0_24px_rgba(208,168,92,0.08)]",
      )}
    >
      <div className="px-5 pt-5 pb-4 space-y-4">
        {/* ── Header: Form Badge + Purity Tag ── */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center rounded-sm",
              "bg-color-5/15 px-2 py-0.5",
              "text-[10px] font-bold uppercase tracking-widest text-color-3/70",
            )}
          >
            {FORM_LABELS[listing.form] ?? listing.form}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-sm",
              "bg-color-2/10 border border-color-2/20",
              "px-2 py-0.5",
              "text-[10px] font-bold tracking-wider text-color-2",
            )}
          >
            .{listing.purity}
          </span>
        </div>

        {/* ── Title ── */}
        <p
          className="text-xs font-medium text-color-3/80 leading-tight truncate"
          title={listing.title}
        >
          {listing.title}
        </p>

        {/* ── Hero Weight ── */}
        <div className="text-center py-2">
          <p className="font-mono text-3xl font-bold tabular-nums text-color-3 tracking-tight">
            {fmtWeight(listing.totalWeightOz)}
            <span className="text-sm font-medium text-color-3/40 ml-1.5">
              oz
            </span>
          </p>
          <p className="text-[10px] uppercase tracking-widest text-color-3/30 mt-1">
            Total Weight
          </p>
        </div>

        {/* ── Financial Data Grid ── */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {/* Premium over Spot */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-color-3/40 mb-0.5">
              Premium / oz
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums text-color-2">
              +${fmtUsd(premium)}
            </p>
          </div>

          {/* Price per oz */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-color-3/40 mb-0.5">
              Price / oz
            </p>
            <p className="font-mono text-sm tabular-nums text-color-3">
              ${fmtUsd(listing.pricePerOz)}
            </p>
          </div>

          {/* Notional Value */}
          <div className="col-span-2">
            <p className="text-[10px] uppercase tracking-widest text-color-3/40 mb-0.5">
              Notional Value
            </p>
            <p className="font-mono text-base font-semibold tabular-nums text-color-3">
              ${fmtUsd(notional)}
            </p>
          </div>
        </div>

        {/* ── Vault Location ── */}
        <div className="flex items-center gap-1.5 text-color-3/50">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span
            className="text-xs truncate"
            title={listing.vaultName}
            aria-label={`Vault location: ${listing.vaultName}`}
          >
            {listing.vaultName}
          </span>
          <span className="text-[10px] text-color-3/30">
            · {listing.jurisdiction}
          </span>
        </div>
      </div>

      {/* ── Reserve CTA ── */}
      <div className="px-5 pb-5 pt-1">
        <button
          type="button"
          onClick={() => onReserve(listing)}
          disabled={isSuspended}
          className={cn(
            "flex w-full items-center justify-center gap-2",
            "rounded-lg px-4 py-2.5",
            "bg-color-2 text-color-1 text-sm font-semibold",
            "transition-all duration-150",
            "hover:bg-[#dbb56a] active:bg-[#c49b4e]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-2/50 focus-visible:ring-offset-2 focus-visible:ring-offset-color-1",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          Reserve Asset
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
