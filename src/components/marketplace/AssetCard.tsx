"use client";

/* ================================================================
   ASSET CARD — Curated Gold Listing Card
   ================================================================
   Frosted glass card displaying a single gold listing with
   institutional-grade typography, trust badges, live spot price
   context, Framer Motion hover animation, and accessibility.

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
        "glass-panel overflow-hidden transition-colors duration-200 ease-out",
        isSuspended
          ? "opacity-50 pointer-events-none"
          : "hover:border-color-2/30",
      )}
      whileHover={
        isSuspended
          ? undefined
          : { y: -4, boxShadow: "0 8px 30px rgba(208,168,92,0.12)" }
      }
      transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
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
            aria-label={`Purity .${listing.purity}`}
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
            <p className="font-mono text-sm font-semibold tabular-nums text-color-2 flex items-center gap-1">
              {premiumPositive && (
                <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" aria-hidden="true" />
              )}
              {premiumPositive ? "+" : ""}${fmtUsd(Math.abs(premium))}
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

          {/* Live Spot Reference */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-color-3/40 mb-0.5">
              Spot
            </p>
            <p className="font-mono text-xs tabular-nums text-color-3/50">
              ${fmtUsd(liveSpot)}
            </p>
          </div>

          {/* Notional Value */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-color-3/40 mb-0.5">
              Notional Value
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums text-color-3">
              ${fmtUsd(notional)}
            </p>
          </div>
        </div>

        {/* ── Vault Location Badge ── */}
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-sm",
            "bg-color-2/5 border border-color-2/15",
            "px-2 py-1",
          )}
          aria-label={`Vault location: ${listing.vaultName}, ${listing.jurisdiction}`}
        >
          <MapPin className="h-3 w-3 shrink-0 text-color-2/60" aria-hidden="true" />
          <span
            className="text-xs text-color-3/70 truncate"
            title={listing.vaultName}
          >
            {listing.vaultName}
          </span>
          <span className="text-[10px] text-color-3/30 shrink-0">
            · {listing.jurisdiction}
          </span>
        </div>
      </div>

      {/* ── Reserve CTA ── */}
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
    </motion.article>
  );
}
