"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { FilterBar, useFilterValues, type FilterConfig } from "@/components/ui/filter-bar";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useListings, useMyReservations } from "@/hooks/use-mock-queries";
import { runReservationExpirySweep } from "@/lib/api";
import type { Listing, Reservation } from "@/lib/mock-data";
import { loadMarketplaceState } from "@/lib/marketplace-store";
import { BuyNowModal } from "@/components/buyer/BuyNowModal";

/* ================================================================ */
const MOCK_USER_ID = "user-1";

/** Map listing IDs to gold product images */
const LISTING_IMAGES: Record<string, string> = {
  "lst-001": "/1.png",
  "lst-002": "/2.png",
  "lst-003": "/3.png",
  "lst-004": "/4.png",
  "lst-005": "/5.png",
};

/** Delivery method descriptions */
const DELIVERY_METHOD: Record<string, string> = {
  "hub-001": "Vault Transfer (LBMA)",
  "hub-002": "Allocated Storage (ZKB)",
  "hub-003": "Vault Transfer (SGX)",
  "hub-004": "COMEX Delivery",
  "hub-005": "Allocated Storage (DBV)",
  "hub-006": "Vault Transfer (DMCC)",
};

/* ---------- Countdown Timer ---------- */
function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  });

  useEffect(() => {
    const id = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(ms / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining <= 0) return <span className="text-xs text-danger font-medium">EXPIRED</span>;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return (
    <span className="font-mono text-xs tabular-nums text-warning">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

/* ---------- Filter Configs ---------- */
const FILTERS: FilterConfig[] = [
  { key: "form", label: "Form", options: [{ label: "Bar", value: "bar" }, { label: "Coin", value: "coin" }] },
  { key: "purity", label: "Purity", options: [{ label: "995", value: "995" }, { label: "999", value: "999" }, { label: "9999", value: "9999" }] },
  { key: "vault", label: "Vault", options: [
    { label: "Zurich Custody Vault", value: "hub-002" },
    { label: "London Clearing Centre", value: "hub-001" },
    { label: "New York Trading Floor", value: "hub-004" },
    { label: "Singapore Settlement Node", value: "hub-003" },
    { label: "Frankfurt Settlement Hub", value: "hub-005" },
    { label: "Dubai Trade Gateway", value: "hub-006" },
  ]},
  { key: "jurisdiction", label: "Jurisdiction", options: [
    { label: "Switzerland", value: "Switzerland" },
    { label: "United Kingdom", value: "United Kingdom" },
    { label: "United States", value: "United States" },
    { label: "Singapore", value: "Singapore" },
    { label: "Germany", value: "Germany" },
    { label: "UAE", value: "UAE" },
  ]},
];

/* ---------- Reserve Modal removed — replaced by BuyNowModal ---------- */

/* ================================================================
   MAIN PAGE
   ================================================================ */

interface ListingRow extends Listing {
  availableWeightOz: number;
  reservedWeightOz: number;
  allocatedWeightOz: number;
  totalValue: number;
  activeReservation: Reservation | null;
}

function MarketplaceContent() {
  useEffect(() => {
    runReservationExpirySweep({ nowMs: Date.now() });
  }, []);

  const listingsQ = useListings();
  const reservationsQ = useMyReservations(MOCK_USER_ID);
  const filterValues = useFilterValues(["form", "purity", "vault", "jurisdiction"]);
  const [reserveTarget, setReserveTarget] = useState<Listing | null>(null);

  const state = typeof window !== "undefined" ? loadMarketplaceState() : null;
  const rows: ListingRow[] = useMemo(() => {
    if (!listingsQ.data) return [];
    const reservations = reservationsQ.data ?? [];
    return listingsQ.data.map((listing) => {
      const inv = state?.inventory.find((i) => i.listingId === listing.id);
      const activeRes = reservations.find((r) => r.listingId === listing.id && r.state === "ACTIVE") ?? null;
      return {
        ...listing,
        availableWeightOz: inv?.availableWeightOz ?? listing.totalWeightOz,
        reservedWeightOz: inv?.reservedWeightOz ?? 0,
        allocatedWeightOz: inv?.allocatedWeightOz ?? 0,
        totalValue: (inv?.availableWeightOz ?? listing.totalWeightOz) * listing.pricePerOz,
        activeReservation: activeRes,
      };
    });
  }, [listingsQ.data, reservationsQ.data, state?.inventory]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterValues.form && r.form !== filterValues.form) return false;
      if (filterValues.purity && r.purity !== filterValues.purity) return false;
      if (filterValues.vault && r.vaultHubId !== filterValues.vault) return false;
      if (filterValues.jurisdiction && r.jurisdiction !== filterValues.jurisdiction) return false;
      return true;
    });
  }, [rows, filterValues]);

  const featuredListings = useMemo(() => {
    return filteredRows.filter((r) => LISTING_IMAGES[r.id]).slice(0, 5);
  }, [filteredRows]);

  const targetInventory = useMemo(() => {
    if (!reserveTarget || !state) return undefined;
    return state.inventory.find((i) => i.listingId === reserveTarget.id);
  }, [reserveTarget, state]);

  const columns: ColumnDef<ListingRow, unknown>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "Reference",
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
    },
    { accessorKey: "form", header: "Form", cell: ({ getValue }) => <span className="capitalize">{getValue<string>()}</span> },
    { accessorKey: "purity", header: "Purity", cell: ({ getValue }) => <span className="tabular-nums">.{getValue<string>()}</span> },
    { accessorKey: "vaultName", header: "Vault" },
    { accessorKey: "jurisdiction", header: "Jurisdiction" },
    {
      accessorKey: "availableWeightOz",
      header: "Available (oz)",
      cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>().toLocaleString("en-US")}</span>,
    },
    {
      accessorKey: "pricePerOz",
      header: "Price / oz",
      cell: ({ getValue }) => <span className="tabular-nums">${getValue<number>().toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>,
    },
    {
      accessorKey: "totalValue",
      header: "Total Value",
      cell: ({ getValue }) => <span className="tabular-nums">${getValue<number>().toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const s = getValue<string>();
        const colors: Record<string, string> = {
          available: "bg-success/10 text-success border-success/20",
          reserved: "bg-warning/10 text-warning border-warning/20",
          allocated: "bg-info/10 text-info border-info/20",
          sold: "bg-text-faint/10 text-text-faint border-text-faint/20",
          suspended: "bg-danger/10 text-danger border-danger/20",
        };
        return (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", colors[s] ?? "")}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {s}
          </span>
        );
      },
    },
    {
      id: "action",
      header: "Action",
      cell: ({ row }) => {
        const r = row.original;
        if (r.status === "suspended") return <span className="text-xs text-text-faint">—</span>;
        if (r.activeReservation) {
          return (
            <div className="flex items-center gap-2">
              <CountdownTimer expiresAt={r.activeReservation.expiresAt} />
              <Link
                href={`/reservations/${r.activeReservation.id}`}
                className="text-xs text-gold hover:text-gold-hover transition-colors"
              >
                View
              </Link>
            </div>
          );
        }
        if (r.availableWeightOz > 0) {
          return (
            <button
              onClick={() => setReserveTarget(r)}
              data-tour="marketplace-reserve-cta"
              className="rounded-[var(--radius-input)] border border-gold/30 bg-gold/5 px-3 py-1 text-xs font-medium text-gold transition-colors hover:bg-gold/10"
            >
              Buy Now
            </button>
          );
        }
        return <span className="text-xs text-text-faint">—</span>;
      },
    },
  ], []);

  if (listingsQ.isLoading || reservationsQ.isLoading) return <LoadingState message="Loading marketplace inventory…" />;
  if (listingsQ.isError) return <ErrorState message="Failed to load listings." onRetry={() => listingsQ.refetch()} />;

  return (
    <>
      <PageHeader
        title="Marketplace — Live Gold Inventory"
        description="Deterministic inventory, vault-verified, settlement-gated"
      />

      <FilterBar filters={FILTERS} className="mt-4" />

      {/* Featured Listings Card Grid */}
      {featuredListings.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint mb-3">
            Featured Allocations
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {featuredListings.map((listing, idx) => {
              const imgSrc = LISTING_IMAGES[listing.id];
              const notional = listing.availableWeightOz * listing.pricePerOz;
              const delivery = DELIVERY_METHOD[listing.vaultHubId] ?? "Vault Transfer";
              const isFirst = idx === 0;
              return (
                <div
                  key={listing.id}
                  data-tour={isFirst ? "marketplace-listing-demo" : undefined}
                  className="group card-base border border-border overflow-hidden transition-all hover:border-gold/30"
                >
                  {/* Image */}
                  <div className="relative h-36 w-full bg-surface-2 overflow-hidden">
                    {imgSrc && (
                      <Image
                        src={imgSrc}
                        alt={listing.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                      />
                    )}
                    <div className="absolute top-2 left-2 rounded-sm bg-bg/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">
                      .{listing.purity}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="p-3 space-y-2">
                    <p className="text-xs font-medium text-text leading-tight truncate" title={listing.title}>
                      {listing.title}
                    </p>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-text-faint">Weight</span>
                        <span className="tabular-nums text-text">{listing.availableWeightOz.toLocaleString()} oz</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-faint">Vault</span>
                        <span className="text-text truncate ml-2 text-right" title={listing.vaultName}>{listing.vaultName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-faint">Delivery</span>
                        <span className="text-text text-right">{delivery}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-faint">Price/oz</span>
                        <span className="tabular-nums font-medium text-text">
                          ${listing.pricePerOz.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1 mt-1">
                        <span className="text-text-faint">Notional</span>
                        <span className="tabular-nums font-semibold text-gold">
                          ${notional.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setReserveTarget(listing)}
                      data-tour={isFirst ? "marketplace-reserve-cta" : undefined}
                      className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-gold/30 bg-gold/5 px-2 py-1.5 text-[11px] font-medium text-gold transition-colors hover:bg-gold/10"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Data Table */}
      <div className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint mb-3">
          Full Inventory Ledger
        </h2>
        <DataTable
          columns={columns}
          data={filteredRows}
          dense
          emptyMessage="No listings match the current filters."
        />
      </div>

      {reserveTarget && (
        <BuyNowModal
          listing={reserveTarget}
          inventory={targetInventory}
          onClose={() => setReserveTarget(null)}
        />
      )}
    </>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<LoadingState message="Loading marketplace…" />}>
      <MarketplaceContent />
    </Suspense>
  );
}
