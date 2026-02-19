"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { FilterBar, useFilterValues, type FilterConfig } from "@/components/ui/filter-bar";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useListings, useMyReservations, useCreateReservation } from "@/hooks/use-mock-queries";
import { runReservationExpirySweep } from "@/lib/api";
import type { Listing, InventoryPosition, Reservation } from "@/lib/mock-data";
import { loadMarketplaceState } from "@/lib/marketplace-store";

/* ================================================================ */
const MOCK_USER_ID = "user-1";

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

/* ---------- Reserve Modal Schema ---------- */
const reserveSchema = z.object({
  weightOz: z.number({ error: "Enter a valid weight" }).positive("Weight must be positive"),
});
type ReserveFormData = z.infer<typeof reserveSchema>;

/* ---------- Reserve Modal ---------- */
function ReserveModal({
  listing,
  inventory,
  onClose,
}: {
  listing: Listing;
  inventory: InventoryPosition | undefined;
  onClose: () => void;
}) {
  const createMut = useCreateReservation();
  const available = inventory?.availableWeightOz ?? 0;

  const form = useForm<ReserveFormData>({
    resolver: zodResolver(reserveSchema),
    defaultValues: { weightOz: 0 },
    mode: "onTouched",
  });

  const weightVal = form.watch("weightOz");
  const total = (Number.isFinite(weightVal) && weightVal > 0) ? weightVal * listing.pricePerOz : 0;
  const exceedsAvailable = weightVal > available;

  const onSubmit = useCallback(async (data: ReserveFormData) => {
    if (data.weightOz > available) {
      form.setError("weightOz", { message: `Exceeds available ${available} oz` });
      return;
    }
    try {
      await createMut.mutateAsync({
        listingId: listing.id,
        userId: MOCK_USER_ID,
        weightOz: data.weightOz,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reservation failed";
      form.setError("weightOz", { message });
    }
  }, [available, createMut, listing.id, onClose, form]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[var(--radius)] border border-border bg-surface-1 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-text">Reserve Inventory</h2>
          <p className="mt-1 text-xs text-text-faint">10-minute deterministic lock on listing inventory.</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Listing summary */}
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-text-faint">Reference</span>
              <span className="font-mono text-text">{listing.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-faint">Title</span>
              <span className="text-text">{listing.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-faint">Available</span>
              <span className="tabular-nums text-text">{available} oz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-faint">Price / oz</span>
              <span className="tabular-nums text-text">${listing.pricePerOz.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Weight input */}
          <form onSubmit={form.handleSubmit(onSubmit)} id="reserve-form">
            <label className="typo-label mb-1.5 block" htmlFor="reserve-weight">Weight (oz)</label>
            <input
              id="reserve-weight"
              type="number"
              step="any"
              {...form.register("weightOz")}
              className={cn(
                "w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm tabular-nums text-text",
                "placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors",
                exceedsAvailable && "border-danger"
              )}
              placeholder="Enter weight in troy ounces"
            />
            {form.formState.errors.weightOz && (
              <p className="mt-1 text-xs text-danger">{form.formState.errors.weightOz.message}</p>
            )}
            {exceedsAvailable && !form.formState.errors.weightOz && (
              <p className="mt-1 text-xs text-danger">Exceeds available {available} oz — deterministic rejection.</p>
            )}
          </form>

          {/* Calculated total */}
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-faint">Calculated Total</span>
              <span className="font-semibold tabular-nums text-text">
                ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-text-faint">
            Reservation expires in 10 minutes. Inventory is locked deterministically — no partial fills, no race conditions.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-input)] border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="reserve-form"
            disabled={createMut.isPending || exceedsAvailable || !weightVal || weightVal <= 0}
            className="rounded-[var(--radius-input)] bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMut.isPending ? "Reserving…" : "Confirm Reservation"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

/** Enriched listing row with inventory data joined */
interface ListingRow extends Listing {
  availableWeightOz: number;
  reservedWeightOz: number;
  allocatedWeightOz: number;
  totalValue: number;
  activeReservation: Reservation | null;
}

function MarketplaceContent() {
  /* Run expiry sweep on mount */
  useEffect(() => {
    runReservationExpirySweep({ nowMs: Date.now() });
  }, []);

  const listingsQ = useListings();
  const reservationsQ = useMyReservations(MOCK_USER_ID);
  const filterValues = useFilterValues(["form", "purity", "vault", "jurisdiction"]);
  const [reserveTarget, setReserveTarget] = useState<Listing | null>(null);

  /* Build enriched rows */
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

  /* Apply filters */
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterValues.form && r.form !== filterValues.form) return false;
      if (filterValues.purity && r.purity !== filterValues.purity) return false;
      if (filterValues.vault && r.vaultHubId !== filterValues.vault) return false;
      if (filterValues.jurisdiction && r.jurisdiction !== filterValues.jurisdiction) return false;
      return true;
    });
  }, [rows, filterValues]);

  /* Inventory for reserve modal */
  const targetInventory = useMemo(() => {
    if (!reserveTarget || !state) return undefined;
    return state.inventory.find((i) => i.listingId === reserveTarget.id);
  }, [reserveTarget, state]);

  /* Column definitions */
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
              Reserve
            </button>
          );
        }
        return <span className="text-xs text-text-faint">—</span>;
      },
    },
  ], []);

  /* Loading / Error */
  if (listingsQ.isLoading || reservationsQ.isLoading) return <LoadingState message="Loading marketplace inventory…" />;
  if (listingsQ.isError) return <ErrorState message="Failed to load listings." onRetry={() => listingsQ.refetch()} />;

  return (
    <>
      <PageHeader
        title="Marketplace — Live Gold Inventory"
        description="Deterministic inventory, vault-verified, settlement-gated"
      />

      <FilterBar filters={FILTERS} className="mt-4" />

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={filteredRows}
          dense
          emptyMessage="No listings match the current filters."
        />
      </div>

      {reserveTarget && (
        <ReserveModal
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
