"use client";

/* ================================================================
   ASSET CARD — Institutional-Grade Gold Listing Card
   ================================================================
   Dark, imposing card with Bloomberg Terminal aesthetics.
   Strict monospace financial data grid, brand gold (#c6a86b)
   accents, zero cheap CSS variables.

   Maps directly to the inventory_listings PostgreSQL schema:
     id, form, purity, total_weight_oz, premium_per_oz, vault_location
   ================================================================ */

import { MapPin, ArrowRight, TrendingUp, ShieldCheck, Award, ShieldHalf, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Listing } from "@/lib/mock-data";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { trackEvent } from "@/lib/analytics";

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
  /** Live XAU/USD spot price from OANDA adapter */
  liveSpot: number;
}

export function AssetCard({ listing, onReserve, liveSpot }: AssetCardProps) {
  const premium = listing.pricePerOz - liveSpot;
  const notional = listing.totalWeightOz * listing.pricePerOz;
  const isSuspended = listing.status === "suspended";
  const premiumPositive = premium > 0;

  return (
    <motion.article
      role="article"
      aria-label={`${listing.title} — ${fmtWeight(listing.totalWeightOz)} oz gold ${listing.form}`}
      className={cn(
        /* ── Container: Dark, imposing, zero-radius institutional card ── */
        "overflow-hidden rounded-sm",
        "bg-slate-950 border border-slate-800",
        "transition-all duration-300 ease-out",
        isSuspended
          ? "opacity-50 pointer-events-none"
          : "hover:border-[#c6a86b]/60 hover:shadow-[0_0_20px_rgba(198,168,107,0.06)]",
      )}
      whileHover={
        isSuspended
          ? undefined
          : { y: -4, boxShadow: "0 6px 40px rgba(198,168,107,0.10)" }
      }
      transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
    >
      <div className="px-5 pt-5 pb-4 space-y-4">
        {/* ── Header: Form Badge + Purity Tag ── */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center rounded-sm",
              "bg-slate-800 border border-slate-700 px-2.5 py-0.5",
              "text-[10px] font-bold uppercase tracking-widest text-slate-400",
            )}
          >
            {FORM_LABELS[listing.form] ?? listing.form}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-sm",
              "bg-[#c6a86b]/8 border border-[#c6a86b]/25",
              "px-2.5 py-0.5",
              "text-[10px] font-bold tracking-widest text-[#c6a86b]",
            )}
            aria-label={`Purity .${listing.purity}`}
          >
            .{listing.purity}
          </span>
        </div>

        {/* ── Title ── */}
        <p
          className="text-xs font-medium text-slate-300 leading-tight truncate"
          title={listing.title}
        >
          {listing.title}
        </p>

        {/* ── Trust Badges ── */}
        {(listing.isAssayVerified ||
          listing.isLbmaGoodDelivery ||
          listing.isFullyInsured ||
          listing.isSellerVerified) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {listing.isAssayVerified && (
              <TrustBadge label="Assay Verified" icon={ShieldCheck} />
            )}
            {listing.isLbmaGoodDelivery && (
              <TrustBadge label="LBMA" icon={Award} />
            )}
            {listing.isFullyInsured && (
              <TrustBadge label="Insured" icon={ShieldHalf} />
            )}
            {listing.isSellerVerified && (
              <TrustBadge label="Verified Seller" icon={UserCheck} variant="neutral" />
            )}
          </div>
        )}

        {/* ── Hero Weight ── */}
        <div className="text-center py-3 border-y border-slate-800/60">
          <p className="font-mono text-3xl font-bold tabular-nums text-white tracking-tight">
            {fmtWeight(listing.totalWeightOz)}
            <span className="text-sm font-medium text-slate-500 ml-1.5">
              oz
            </span>
          </p>
          <p className="text-[10px] uppercase tracking-widest text-slate-600 mt-1 font-mono">
            Total Weight
          </p>
        </div>

        {/* ── Financial Data Grid — Bloomberg Terminal Style ── */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {/* Premium over Spot */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5 font-mono">
              Premium / oz
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums text-[#c6a86b] flex items-center gap-1">
              {premiumPositive && (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
              )}
              {premiumPositive ? "+" : ""}${fmtUsd(Math.abs(premium))}
            </p>
          </div>

          {/* Price per oz */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5 font-mono">
              Price / oz
            </p>
            <p className="font-mono text-lg tabular-nums text-white">
              ${fmtUsd(listing.pricePerOz)}
            </p>
          </div>

          {/* Live Spot Reference */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5 font-mono">
              Spot
            </p>
            <p className="font-mono text-sm tabular-nums text-slate-400">
              ${fmtUsd(liveSpot)}
            </p>
          </div>

          {/* Notional Value */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5 font-mono">
              Notional Value
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums text-white">
              ${fmtUsd(notional)}
            </p>
          </div>
        </div>

        {/* ── Vault Location Badge ── */}
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-sm",
            "bg-slate-900 border border-slate-800",
            "px-2.5 py-1.5",
          )}
          aria-label={`Vault location: ${listing.vaultName}, ${listing.jurisdiction}`}
        >
          <MapPin className="h-3 w-3 shrink-0 text-[#c6a86b]/60" aria-hidden="true" />
          <span
            className="text-xs text-slate-400 truncate"
            title={listing.vaultName}
          >
            {listing.vaultName}
          </span>
          <span className="text-[10px] text-slate-600 shrink-0">
            · {listing.jurisdiction}
          </span>
        </div>
      </div>

      {/* ── Reserve CTA — Brand Gold, institutional weight ── */}
      <div className="px-5 pb-5 pt-1">
        <button
          type="button"
          onClick={() => {
            trackEvent("ReserveClicked", { listingId: listing.id });
            onReserve(listing);
          }}
          disabled={isSuspended}
          aria-disabled={isSuspended}
          className={cn(
            "flex w-full items-center justify-center gap-2",
            "rounded-sm px-4 py-3",
            "bg-[#c6a86b] text-slate-950 text-sm font-bold tracking-wide",
            "transition-all duration-200",
            "hover:bg-[#d4b97a] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]",
            "active:bg-[#b89a5f] active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a86b]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          Reserve Asset
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </motion.article>
  );
}
