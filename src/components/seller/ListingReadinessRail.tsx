"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  FileStack,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublishGate } from "@/hooks/use-mock-queries";
import type { Listing } from "@/lib/mock-data";
import type { GateResult } from "@/lib/marketplace-engine";

/* ================================================================
   LISTING READINESS RAIL
   Vertical rail showing draft listing readiness at a glance.
   For each draft listing, displays blocker count and severity.
   ================================================================ */

/* ---------- Single Listing Readiness Card ---------- */

function ReadinessCard({
  listing,
  userId,
}: {
  listing: Listing;
  userId: string;
}) {
  const gateQ = usePublishGate(listing.id, userId);
  const gate: GateResult | undefined = gateQ.data;

  const blockerCount = gate?.blockers.length ?? 0;
  const isReady = gate?.allowed ?? false;
  const isLoading = gateQ.isLoading;

  return (
    <Link
      href={`/sell?listing=${listing.id}`}
      className={cn(
        "block rounded-[var(--radius-sm)] border px-3 py-2.5 transition-colors group",
        isLoading
          ? "border-border bg-surface-2"
          : isReady
            ? "border-success/20 bg-success/5 hover:border-success/40"
            : "border-warning/20 bg-warning/5 hover:border-warning/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text truncate">
            {listing.title}
          </p>
          <p className="text-[11px] text-text-faint mt-0.5">
            {listing.totalWeightOz} oz · .{listing.purity} ·{" "}
            {listing.form}
          </p>
        </div>

        {isLoading ? (
          <div className="h-5 w-5 rounded-full bg-text-faint/10 animate-pulse shrink-0 mt-0.5" />
        ) : isReady ? (
          <CheckCircle2 className="h-4.5 w-4.5 text-success shrink-0 mt-0.5" />
        ) : (
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {blockerCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-danger/10 border border-danger/20 px-1.5 py-0.5 text-[10px] font-medium text-danger">
                <XCircle className="h-2.5 w-2.5" />
                {blockerCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Inline blocker preview (first 2) */}
      {!isLoading && gate && blockerCount > 0 && (
        <div className="mt-2 space-y-1">
          {gate.blockers.slice(0, 2).map((b, i) => (
            <p
              key={i}
              className="text-[10px] text-danger flex items-start gap-1"
            >
              <AlertTriangle className="h-2.5 w-2.5 shrink-0 mt-[2px]" />
              <span className="truncate">{formatBlockerLabel(b)}</span>
            </p>
          ))}
          {blockerCount > 2 && (
            <p className="text-[10px] text-text-faint italic">
              +{blockerCount - 2} more
            </p>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center gap-1 mt-2 text-[11px] font-medium text-gold group-hover:text-gold-hover transition-colors">
        {isReady ? "Publish Now" : "Continue Editing"}
        <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

/* ---------- Blocker Label Formatter ---------- */

function formatBlockerLabel(raw: string): string {
  if (raw.includes("SELLER_NOT_VERIFIED")) return "Identity not verified";
  if (raw.includes("MISSING_EVIDENCE")) {
    const match = raw.match(
      /(ASSAY_REPORT|CHAIN_OF_CUSTODY|SELLER_ATTESTATION)/i,
    );
    if (match) {
      return `Missing ${match[1].replace(/_/g, " ").toLowerCase()}`;
    }
    return "Missing evidence document";
  }
  if (raw.includes("DATA_MISMATCH")) return "Assay data mismatch";
  if (raw.includes("ANALYSIS_FAILED")) return "Document analysis failed";
  if (raw.includes("CAPITAL_CONTROL")) return "Capital control block";
  return raw.length > 50 ? raw.slice(0, 47) + "…" : raw;
}

/* ---------- Main Rail Component ---------- */

interface ListingReadinessRailProps {
  draftListings: Listing[];
  userId: string;
  className?: string;
}

export function ListingReadinessRail({
  draftListings,
  userId,
  className,
}: ListingReadinessRailProps) {
  const sortedDrafts = useMemo(
    () =>
      [...draftListings].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [draftListings],
  );

  if (sortedDrafts.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileStack className="h-4 w-4 text-gold" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-faint">
          Listing Readiness
        </h3>
        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-gold/10 text-gold text-[10px] font-semibold min-w-[18px] h-[18px] px-1">
          {sortedDrafts.length}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {sortedDrafts.map((listing) => (
          <ReadinessCard
            key={listing.id}
            listing={listing}
            userId={userId}
          />
        ))}
      </div>

      {/* Create New CTA */}
      <Link
        href="/sell"
        className={cn(
          "flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-gold/30",
          "px-3 py-2 text-xs font-medium text-gold",
          "transition-colors hover:border-gold/50 hover:bg-gold/5",
        )}
      >
        + New Listing
      </Link>
    </div>
  );
}
