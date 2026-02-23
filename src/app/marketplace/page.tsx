"use client";

/* ================================================================
   MARKETPLACE — Curated Gold Asset Discovery Feed
   ================================================================
   Phase 2 Buyer Dashboard: A luxury, card-based marketplace for
   post-KYC buyers. No traditional order book — curated allocations
   displayed in frosted glass cards with institutional typography.

   Data maps to the inventory_listings PostgreSQL schema:
     id, form, purity, total_weight_oz, premium_per_oz, vault_location
   ================================================================ */

import { useState, useMemo, useEffect, Suspense } from "react";
import { Filter, Package, Weight, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useListings, useMyReservations } from "@/hooks/use-mock-queries";
import { runReservationExpirySweep } from "@/lib/api";
import type { Listing } from "@/lib/mock-data";
import { CheckoutModalWrapper } from "@/components/checkout/CheckoutModalWrapper";
import { AssetCard } from "@/components/marketplace/AssetCard";

/* ================================================================ */
const MOCK_USER_ID = "user-1";

// TODO: Replace with live spot price feed (LBMA / Kitco API)
const MOCK_SPOT_PRICE = 2_020.0;

/* ── Formatters ── */
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtWeight = (n: number) => n.toLocaleString("en-US");

/* ── Filter Configurations ── */
interface FilterOption {
  label: string;
  value: string;
}

const FORM_OPTIONS: FilterOption[] = [
  { label: "All Forms", value: "" },
  { label: "Bar", value: "bar" },
  { label: "Coin", value: "coin" },
];

const VAULT_OPTIONS: FilterOption[] = [
  { label: "All Vaults", value: "" },
  { label: "Zurich Custody Vault", value: "hub-002" },
  { label: "London Clearing Centre", value: "hub-001" },
  { label: "New York Trading Floor", value: "hub-004" },
  { label: "Singapore Settlement Node", value: "hub-003" },
  { label: "Frankfurt Settlement Hub", value: "hub-005" },
  { label: "Dubai Trade Gateway", value: "hub-006" },
];

/* ================================================================
   FilterChip — inline filter control
   ================================================================ */

function FilterChip({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <label
        className="text-[10px] uppercase tracking-widest text-color-3/40 font-semibold"
        htmlFor={`filter-${label}`}
      >
        {label}
      </label>
      <select
        id={`filter-${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 rounded-lg border bg-color-1/50 px-3 text-xs text-color-3",
          "focus:outline-none focus:ring-2 focus:ring-color-2/30 focus:border-color-2/40",
          "transition-colors cursor-pointer",
          value
            ? "border-color-2/30 bg-color-2/5"
            : "border-color-5/20"
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ================================================================
   SummaryStrip — aggregate marketplace metrics
   ================================================================ */

function SummaryStrip({
  listings,
}: {
  listings: Listing[];
}) {
  const totalWeight = listings.reduce((s, l) => s + l.totalWeightOz, 0);
  const avgPremium =
    listings.length > 0
      ? listings.reduce((s, l) => s + (l.pricePerOz - MOCK_SPOT_PRICE), 0) /
        listings.length
      : 0;
  const totalNotional = listings.reduce(
    (s, l) => s + l.totalWeightOz * l.pricePerOz,
    0
  );

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <div className="flex items-center gap-1.5 text-color-3/60">
        <Package className="h-3 w-3" />
        <span className="text-[11px]">
          <span className="font-mono tabular-nums font-semibold text-color-3">
            {listings.length}
          </span>{" "}
          allocations
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-color-3/60">
        <Weight className="h-3 w-3" />
        <span className="text-[11px]">
          <span className="font-mono tabular-nums font-semibold text-color-3">
            {fmtWeight(totalWeight)}
          </span>{" "}
          oz total
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-color-3/60">
        <TrendingUp className="h-3 w-3" />
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
  const [reserveTarget, setReserveTarget] = useState<Listing | null>(null);

  /* ── Filter to published/available listings only ── */
  const publishedListings = useMemo(() => {
    if (!listingsQ.data) return [];
    return listingsQ.data.filter(
      (l) => l.status !== "suspended" && l.status !== "draft" && l.status !== "sold"
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

  const activeFilterCount = (formFilter ? 1 : 0) + (vaultFilter ? 1 : 0);

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
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 text-color-3/50">
          <Filter className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold uppercase tracking-widest">
            Filters
          </span>
        </div>

        <FilterChip
          label="Form"
          options={FORM_OPTIONS}
          value={formFilter}
          onChange={setFormFilter}
        />

        <FilterChip
          label="Vault"
          options={VAULT_OPTIONS}
          value={vaultFilter}
          onChange={setVaultFilter}
        />

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setFormFilter("");
              setVaultFilter("");
            }}
            className="flex items-center gap-1 rounded-full border border-color-5/20 bg-color-1/50 px-2.5 py-1 text-[10px] font-medium text-color-3/50 transition-colors hover:bg-color-5/10 hover:text-color-3"
          >
            <X className="h-3 w-3" />
            Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {/* ── Summary Strip ── */}
      <SummaryStrip listings={filteredListings} />

      {/* ── Asset Card Grid ── */}
      {filteredListings.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map((listing) => (
            <AssetCard
              key={listing.id}
              listing={listing}
              onReserve={setReserveTarget}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-10 w-10 text-color-3/20 mb-3" />
          <p className="text-sm text-color-3/50">
            No allocations match the current filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setFormFilter("");
              setVaultFilter("");
            }}
            className="mt-3 text-xs text-color-2 hover:text-color-2/80 transition-colors"
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

/* ================================================================
   Default Page Export
   ================================================================ */

export default function MarketplacePage() {
  return (
    <Suspense fallback={<LoadingState message="Loading marketplace…" />}>
      <MarketplaceContent />
    </Suspense>
  );
}
