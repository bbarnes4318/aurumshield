"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useMyReservations, useListings, useConvertReservation, useDashboardData, useCorridors, useHubs, useCounterparties } from "@/hooks/use-mock-queries";
import { runReservationExpirySweep } from "@/lib/api";
import type { Reservation, Listing } from "@/lib/mock-data";
import {
  computeTRI,
  validateCapital,
  checkBlockers,
  hasBlockLevel,
  determineApproval,
  type MarketplacePolicySnapshot,
} from "@/lib/policy-engine";

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

/* ---------- Row Type ---------- */
interface ReservationRow extends Reservation {
  listingRef: string;
  listingTitle: string;
}

/* ================================================================ */
export default function ReservationsPage() {
  const router = useRouter();

  useEffect(() => {
    runReservationExpirySweep({ nowMs: Date.now() });
  }, []);

  const resQ = useMyReservations(MOCK_USER_ID);
  const listingsQ = useListings();
  const dashQ = useDashboardData("phase1");
  const corQ = useCorridors();
  const hubQ = useHubs();
  const cpQ = useCounterparties();
  const convertMut = useConvertReservation();

  const [convertError, setConvertError] = useState<string | null>(null);

  /* Build enriched rows */
  const rows: ReservationRow[] = useMemo(() => {
    if (!resQ.data || !listingsQ.data) return [];
    return resQ.data.map((r) => {
      const listing = listingsQ.data.find((l: Listing) => l.id === r.listingId);
      return {
        ...r,
        listingRef: listing?.id ?? r.listingId,
        listingTitle: listing?.title ?? "Unknown Listing",
      };
    });
  }, [resQ.data, listingsQ.data]);

  /* Convert handler with full policy evaluation */
  const handleConvert = useCallback((reservation: ReservationRow) => {
    setConvertError(null);
    const capital = dashQ.data?.capital;
    const listings = listingsQ.data ?? [];
    const corridors = corQ.data ?? [];
    const hubs = hubQ.data ?? [];
    const counterparties = cpQ.data ?? [];

    if (!capital) { setConvertError("Capital data unavailable."); return; }

    const listing = listings.find((l: Listing) => l.id === reservation.listingId);
    if (!listing) { setConvertError(`Listing ${reservation.listingId} not found.`); return; }

    /* Derive counterparty from seller — use first active CP for policy evaluation */
    const cp = counterparties[0];
    /* Derive corridor from listing jurisdiction — deterministic mapping */
    const corridor = corridors.find((c) =>
      c.sourceCountry === listing.jurisdiction || c.destinationCountry === listing.jurisdiction
    );
    const hub = hubs.find((h) => h.id === listing.vaultHubId);

    if (!cp || !corridor || !hub) { setConvertError("Missing counterparty, corridor, or hub data."); return; }

    const notional = reservation.weightOz * reservation.pricePerOzLocked;
    const tri = computeTRI(cp, corridor, notional, capital);
    const capVal = validateCapital(notional, capital);
    const blockers = checkBlockers(cp, corridor, hub, tri, notional, capital);
    const approval = determineApproval(tri.score, notional);

    if (hasBlockLevel(blockers)) {
      const blockMsg = blockers
        .filter((b) => b.severity === "BLOCK")
        .map((b) => `${b.title}: ${b.detail}`)
        .join(" | ");
      setConvertError(`BLOCKED — ${blockMsg}`);
      return;
    }

    const snapshot: MarketplacePolicySnapshot = {
      triScore: tri.score,
      triBand: tri.band,
      ecrBefore: capVal.currentECR,
      ecrAfter: capVal.postTxnECR,
      hardstopBefore: capVal.currentHardstopUtil,
      hardstopAfter: capVal.postTxnHardstopUtil,
      approvalTier: approval.tier,
      blockers,
      timestamp: new Date().toISOString(),
    };

    convertMut.mutate(
      { reservationId: reservation.id, userId: MOCK_USER_ID, policySnapshot: snapshot },
      { onSuccess: (order) => router.push(`/orders/${order.id}`),
        onError: (err) => setConvertError(err instanceof Error ? err.message : "Conversion failed.") },
    );
  }, [dashQ.data, listingsQ.data, corQ.data, hubQ.data, cpQ.data, convertMut, router]);

  /* Column definitions */
  const columns: ColumnDef<ReservationRow, unknown>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "Reservation ID",
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
    },
    {
      accessorKey: "listingRef",
      header: "Listing",
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
    },
    {
      accessorKey: "weightOz",
      header: "Weight (oz)",
      cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
    },
    {
      accessorKey: "pricePerOzLocked",
      header: "Locked Price",
      cell: ({ getValue }) => <span className="tabular-nums">${getValue<number>().toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>,
    },
    {
      accessorKey: "expiresAt",
      header: "Expires",
      cell: ({ row }) => {
        const r = row.original;
        if (r.state !== "ACTIVE") return <span className="text-xs text-text-faint">—</span>;
        return <CountdownTimer expiresAt={r.expiresAt} />;
      },
    },
    {
      accessorKey: "state",
      header: "State",
      cell: ({ getValue }) => {
        const s = getValue<string>();
        const c: Record<string, string> = {
          ACTIVE: "bg-success/10 text-success border-success/20",
          EXPIRED: "bg-text-faint/10 text-text-faint border-text-faint/20",
          CONVERTED: "bg-info/10 text-info border-info/20",
        };
        return (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", c[s] ?? "")}>
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
        if (r.state === "ACTIVE") {
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleConvert(r)}
                disabled={convertMut.isPending}
                data-tour="reservation-convert-cta"
                className="rounded-[var(--radius-input)] border border-gold/30 bg-gold/5 px-3 py-1 text-xs font-medium text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
              >
                {convertMut.isPending ? "…" : "Convert"}
              </button>
              <Link href={`/reservations/${r.id}`} className="text-xs text-gold hover:text-gold-hover transition-colors">
                Detail
              </Link>
            </div>
          );
        }
        if (r.state === "CONVERTED") {
          return (
            <Link href="/orders" className="text-xs text-gold hover:text-gold-hover transition-colors">
              View Order
            </Link>
          );
        }
        return <span className="text-xs text-text-faint">—</span>;
      },
    },
  ], [handleConvert, convertMut.isPending]);

  if (resQ.isLoading || listingsQ.isLoading) return <LoadingState message="Loading reservations…" />;
  if (resQ.isError) return <ErrorState message="Failed to load reservations." onRetry={() => resQ.refetch()} />;

  return (
    <>
      <PageHeader
        title="Reservation Console"
        description="Active inventory locks with deterministic countdown timers"
      />

      {convertError && (
        <div className="mt-4 rounded-[var(--radius-sm)] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {convertError}
        </div>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={rows}
          dense
          emptyMessage="No reservations found."
        />
      </div>
    </>
  );
}
