"use client";

/* ================================================================
   MARKETPLACE CONTENT — Curated Gold Asset Discovery Feed
   ================================================================
   Phase 2 Buyer Dashboard: A luxury, card-based marketplace for
   post-KYC buyers. No traditional order book — curated allocations
   displayed in frosted glass cards with institutional typography.

   Extracted as a standalone component so it can be embedded in both
   the /marketplace page and the buyer slide-out panel.

   Data maps to the inventory_listings PostgreSQL schema:
     id, form, purity, total_weight_oz, premium_per_oz, vault_location
   ================================================================ */

import { useState, useMemo, useEffect, Suspense } from "react";
import { Package, Weight, TrendingUp, Radio } from "lucide-react";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useListings, useMyReservations } from "@/hooks/use-mock-queries";
import { runReservationExpirySweep } from "@/lib/api";
import { fetchSpotPrice } from "@/lib/actions/checkout-actions";
import { trackEvent } from "@/lib/analytics";
import type { Listing } from "@/lib/mock-data";
import { CheckoutModalWrapper } from "@/components/checkout/CheckoutModalWrapper";
import { AssetCard } from "@/components/marketplace/AssetCard";
import {
  MarketplaceFilterBar,
  type SortKey,
} from "@/components/marketplace/MarketplaceFilterBar";

/* ================================================================ */
const MOCK_USER_ID = "user-1";

/** Sensible fallback when OANDA hasn't returned yet */
const DEFAULT_SPOT_PRICE = 2_342.5;

/* ── Formatters ── */
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtWeight = (n: number) => n.toLocaleString("en-US");

/* ================================================================
   SummaryStrip — aggregate marketplace metrics + live spot
   ================================================================ */

function SummaryStrip({
  listings,
  spotPrice,
}: {
  listings: Listing[];
  spotPrice: number;
}) {
  const totalWeight = listings.reduce((s, l) => s + l.totalWeightOz, 0);
  const avgPremium =
    listings.length > 0
      ? listings.reduce((s, l) => s + (l.pricePerOz - spotPrice), 0) /
        listings.length
      : 0;
  const totalNotional = listings.reduce(
    (s, l) => s + l.totalWeightOz * l.pricePerOz,
    0,
  );

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {/* Live Spot Indicator */}
      <div className="flex items-center gap-1.5 text-color-2">
        <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          Spot XAU/USD
        </span>
        <span className="font-mono text-xs tabular-nums font-semibold">
          ${fmtUsd(spotPrice)}
        </span>
      </div>

      <div className="h-3 w-px bg-color-5/20" aria-hidden="true" />

      <div className="flex items-center gap-1.5 text-color-3/60">
        <Package className="h-3 w-3" aria-hidden="true" />
        <span className="text-[11px]">
          <span className="font-mono tabular-nums font-semibold text-color-3">
            {listings.length}
          </span>{" "}
          allocations
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-color-3/60">
        <Weight className="h-3 w-3" aria-hidden="true" />
        <span className="text-[11px]">
          <span className="font-mono tabular-nums font-semibold text-color-3">
            {fmtWeight(totalWeight)}
          </span>{" "}
          oz total
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-color-3/60">
        <TrendingUp className="h-3 w-3" aria-hidden="true" />
        <span className="text-[11px]">
          avg premium{" "}
          <span className="font-mono tabular-nums font-semibold text-color-2">
            +${fmtUsd(avgPremium)}
          </span>
          /oz
        </span>
      </div>
      <div className="text-[11px] text-color-3/60">
        notional{" "}
        <span className="font-mono tabular-nums font-semibold text-color-3">
          ${fmtUsd(totalNotional)}
        </span>
      </div>
    </div>
  );
}

/* ================================================================
   Sort comparator
   ================================================================ */

function applySortKey(listings: Listing[], sortKey: SortKey, spotPrice: number): Listing[] {
  if (!sortKey) return listings;
  const sorted = [...listings];
  switch (sortKey) {
    case "price-asc":
      sorted.sort((a, b) => a.pricePerOz - b.pricePerOz);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.pricePerOz - a.pricePerOz);
      break;
    case "weight-asc":
      sorted.sort((a, b) => a.totalWeightOz - b.totalWeightOz);
      break;
    case "weight-desc":
      sorted.sort((a, b) => b.totalWeightOz - a.totalWeightOz);
      break;
    case "premium-asc":
      sorted.sort(
        (a, b) =>
          (a.pricePerOz - spotPrice) - (b.pricePerOz - spotPrice),
      );
      break;
  }
  return sorted;
}

/* ================================================================
   AssetCardSkeleton — suspense fallback for individual card slots
   ================================================================ */

function AssetCardSkeleton() {
  return (
    <div className="glass-panel overflow-hidden animate-pulse">
      <div className="px-5 pt-5 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-12 rounded bg-color-5/10" />
          <div className="h-4 w-10 rounded bg-color-5/10" />
        </div>
        <div className="h-3 w-3/4 rounded bg-color-5/10" />
        <div className="flex justify-center py-2">
          <div className="h-8 w-24 rounded bg-color-5/10" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-6 rounded bg-color-5/10" />
          <div className="h-6 rounded bg-color-5/10" />
          <div className="col-span-2 h-6 rounded bg-color-5/10" />
        </div>
        <div className="h-3 w-2/3 rounded bg-color-5/10" />
      </div>
      <div className="px-5 pb-5 pt-1">
        <div className="h-10 rounded-lg bg-color-5/10" />
      </div>
    </div>
  );
}

/* ================================================================
   MarketplaceContent — main export (used by buyer page slide-out)
   ================================================================ */

export function MarketplaceContent() {
  useEffect(() => {
    runReservationExpirySweep({ nowMs: Date.now() });
  }, []);

  const listingsQ = useListings();
  const reservationsQ = useMyReservations(MOCK_USER_ID);
  const [formFilter, setFormFilter] = useState("");
  const [vaultFilter, setVaultFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("");
  const [reserveTarget, setReserveTarget] = useState<Listing | null>(null);
  const [liveSpot, setLiveSpot] = useState(DEFAULT_SPOT_PRICE);

  /* ── Fetch live spot price from OANDA adapter ── */
  useEffect(() => {
    fetchSpotPrice()
      .then((r) => setLiveSpot(r.pricePerOz))
      .catch(() => {
        /* keep default on failure */
      });
  }, []);

  /* ── Filter to published/available listings only ── */
  const publishedListings = useMemo(() => {
    if (!listingsQ.data) return [];
    return listingsQ.data.filter(
      (l) =>
        l.status !== "suspended" && l.status !== "draft" && l.status !== "sold",
    );
  }, [listingsQ.data]);

  /* ── Apply user filters ── */
  const filteredListings = useMemo(() => {
    return publishedListings.filter((l) => {
      if (formFilter && l.form !== formFilter) return false;
      if (vaultFilter && l.vaultHubId !== vaultFilter) return false;
      return true;
    });
  }, [publishedListings, formFilter, vaultFilter]);

  /* ── Apply sort ── */
  const sortedListings = useMemo(
    () => applySortKey(filteredListings, sortKey, liveSpot),
    [filteredListings, sortKey, liveSpot],
  );

  /* ── Clear all handler ── */
  const handleClearAll = () => {
    setFormFilter("");
    setVaultFilter("");
    setSortKey("");
  };

  /* ── Loading / Error ── */
  if (listingsQ.isLoading || reservationsQ.isLoading)
    return <LoadingState message="Loading marketplace inventory…" />;
  if (listingsQ.isError)
    return (
      <ErrorState
        message="Failed to load listings."
        onRetry={() => listingsQ.refetch()}
      />
    );

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-lg font-semibold text-color-3 tracking-tight">
          Curated Gold Allocations
        </h1>
        <p className="text-xs text-color-3/40 mt-0.5">
          Vault-verified inventory · Settlement-gated · Premium pricing
        </p>
      </div>

      {/* ── Filter Bar ── */}
      <MarketplaceFilterBar
        formFilter={formFilter}
        vaultFilter={vaultFilter}
        sortKey={sortKey}
        onFormChange={(v) => {
          setFormFilter(v);
          trackEvent("FilterUsed", { filter: "form", value: v, vaultFilter });
        }}
        onVaultChange={(v) => {
          setVaultFilter(v);
          trackEvent("FilterUsed", { filter: "vault", value: v, formFilter });
        }}
        onSortChange={(v) => {
          setSortKey(v);
          trackEvent("SortChanged", { sortKey: v });
        }}
        onClearAll={() => {
          handleClearAll();
          trackEvent("FilterCleared");
        }}
      />

      {/* ── Summary Strip (with live spot) ── */}
      <SummaryStrip listings={sortedListings} spotPrice={liveSpot} />

      {/* ── Asset Card Grid ── */}
      {sortedListings.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sortedListings.map((listing) => (
            <Suspense key={listing.id} fallback={<AssetCardSkeleton />}>
              <AssetCard
                listing={listing}
                onReserve={setReserveTarget}
                liveSpot={liveSpot}
              />
            </Suspense>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-10 w-10 text-color-3/20 mb-3" aria-hidden="true" />
          <p className="text-sm text-color-3/50">
            No allocations match the current filters.
          </p>
          <button
            type="button"
            onClick={handleClearAll}
            className="mt-3 text-xs text-color-2 hover:text-color-2/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-2/50 rounded"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* ── Checkout Modal (Phase 3) ── */}
      {reserveTarget && (
        <CheckoutModalWrapper
          listing={reserveTarget}
          maxWeightOz={reserveTarget.totalWeightOz}
          onClose={() => setReserveTarget(null)}
        />
      )}
    </div>
  );
}
