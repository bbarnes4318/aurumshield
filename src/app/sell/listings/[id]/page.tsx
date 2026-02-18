"use client";

/* ================================================================
   LISTING DETAIL — /sell/listings/[id]
   ================================================================
   Detailed view of a single seller listing, including evidence
   pack status, inventory position, and publish gate.
   ================================================================ */

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock, ShieldCheck, Package, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardPanel } from "@/components/ui/dashboard-panel";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import { useListing, useListingInventory, useListingEvidenceItems, usePublishGate } from "@/hooks/use-mock-queries";
import type { ListingStatus, ListingEvidenceType } from "@/lib/mock-data";
import { REQUIRED_EVIDENCE_TYPES } from "@/lib/marketplace-engine";

/* ---------- Status badge config ---------- */
const STATUS_CONFIG: Record<ListingStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-surface-3 text-text-faint border-border" },
  available: { label: "Available", color: "bg-success/10 text-success border-success/20" },
  reserved: { label: "Reserved", color: "bg-warning/10 text-warning border-warning/20" },
  allocated: { label: "Allocated", color: "bg-gold/10 text-gold border-gold/20" },
  sold: { label: "Sold", color: "bg-info/10 text-info border-info/20" },
  suspended: { label: "Suspended", color: "bg-danger/10 text-danger border-danger/20" },
};

const EVIDENCE_LABELS: Record<ListingEvidenceType, string> = {
  ASSAY_REPORT: "Certified Assay Report",
  CHAIN_OF_CUSTODY: "Chain of Custody Certificate",
  SELLER_ATTESTATION: "Seller Attestation Declaration",
};

/* ================================================================ */
function ListingDetailContent() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const listingQ = useListing(params.id);
  const inventoryQ = useListingInventory(params.id);
  const evidenceQ = useListingEvidenceItems(params.id);
  const gateQ = usePublishGate(params.id, userId);

  const listing = listingQ.data;
  const inventory = inventoryQ.data;
  const evidenceItems = useMemo(() => evidenceQ.data ?? [], [evidenceQ.data]);

  // Determine which evidence types are present
  const evidenceTypesPresent = useMemo(() => {
    const set = new Set<ListingEvidenceType>();
    for (const e of evidenceItems) set.add(e.type);
    return set;
  }, [evidenceItems]);

  const isLoading = listingQ.isLoading || inventoryQ.isLoading || evidenceQ.isLoading;
  if (isLoading) return <LoadingState message="Loading listing detail…" />;
  if (!listing) return <ErrorState title="Not Found" message={`Listing ${params.id} not found.`} />;

  const statusCfg = STATUS_CONFIG[listing.status] ?? STATUS_CONFIG.draft;
  const gateResult = gateQ.data;

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/sell/listings" className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> My Listings
        </Link>
      </div>

      <PageHeader
        title={listing.title}
        description={`${statusCfg.label} · ${listing.id}`}
        actions={
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", statusCfg.color)}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusCfg.label}
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* ── Left: Asset Details ── */}
        <DashboardPanel title="Asset Specification" tooltip="Gold asset configuration for this listing" asOf={listing.createdAt}>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-text-faint">Form</dt><dd className="text-text capitalize">{listing.form}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Purity</dt><dd className="tabular-nums text-text">.{listing.purity}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Total Weight</dt><dd className="tabular-nums text-text">{listing.totalWeightOz.toLocaleString()} oz</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Price / oz</dt>
              <dd className="tabular-nums text-text">
                {listing.pricePerOz > 0
                  ? `$${listing.pricePerOz.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : "Not set"}
              </dd>
            </div>
            {listing.pricePerOz > 0 && (
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-text-faint">Total Value</dt>
                <dd className="tabular-nums font-semibold text-text">
                  ${(listing.pricePerOz * listing.totalWeightOz).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </dd>
              </div>
            )}
            <div className="border-t border-border pt-2 space-y-3">
              <div className="flex justify-between"><dt className="text-text-faint">Vault</dt><dd className="text-text">{listing.vaultName}</dd></div>
              <div className="flex justify-between"><dt className="text-text-faint">Jurisdiction</dt><dd className="text-text">{listing.jurisdiction}</dd></div>
              <div className="flex justify-between"><dt className="text-text-faint">Seller</dt><dd className="text-text">{listing.sellerName}</dd></div>
            </div>
            {listing.publishedAt && (
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-text-faint">Published</dt>
                <dd className="text-xs tabular-nums text-text">
                  {new Date(listing.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </dd>
              </div>
            )}
          </dl>
        </DashboardPanel>

        {/* ── Center: Evidence Pack + Inventory ── */}
        <div className="space-y-4">
          {/* Evidence */}
          <DashboardPanel title="Evidence Pack" tooltip="Required evidence documents for publish gate clearance" asOf={listing.createdAt}>
            <div className="space-y-2.5">
              {REQUIRED_EVIDENCE_TYPES.map((type) => {
                const present = evidenceTypesPresent.has(type);
                return (
                  <div key={type} className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                    present ? "border-success/20 bg-success/5" : "border-border bg-surface-2"
                  )}>
                    {present
                      ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      : <Clock className="h-4 w-4 text-text-faint shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className={cn("text-sm truncate", present ? "text-text" : "text-text-muted")}>
                        {EVIDENCE_LABELS[type] ?? type}
                      </p>
                      {present && (
                        <p className="text-xs text-text-faint mt-0.5 font-mono">
                          {evidenceItems.find((e) => e.type === type)?.id ?? "—"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-text-faint">
              {evidenceTypesPresent.size} / {REQUIRED_EVIDENCE_TYPES.length} required evidence items present
            </div>
          </DashboardPanel>

          {/* Inventory Position (only if published) */}
          {inventory && listing.status !== "draft" && (
            <DashboardPanel title="Inventory Position" tooltip="Real-time inventory breakdown for this listing" asOf={inventory.updatedAt}>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-faint">Total</dt>
                  <dd className="tabular-nums text-text">{inventory.totalWeightOz} oz</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-faint">Available</dt>
                  <dd className="tabular-nums text-success">{inventory.availableWeightOz} oz</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-faint">Reserved</dt>
                  <dd className="tabular-nums text-warning">{inventory.reservedWeightOz} oz</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-faint">Allocated</dt>
                  <dd className="tabular-nums text-info">{inventory.allocatedWeightOz} oz</dd>
                </div>
                {/* Visual bar */}
                <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden flex mt-1">
                  {inventory.totalWeightOz > 0 && (
                    <>
                      <div className="bg-success h-full" style={{ width: `${(inventory.availableWeightOz / inventory.totalWeightOz) * 100}%` }} />
                      <div className="bg-warning h-full" style={{ width: `${(inventory.reservedWeightOz / inventory.totalWeightOz) * 100}%` }} />
                      <div className="bg-info h-full" style={{ width: `${(inventory.allocatedWeightOz / inventory.totalWeightOz) * 100}%` }} />
                    </>
                  )}
                </div>
              </dl>
            </DashboardPanel>
          )}
        </div>

        {/* ── Right: Publish Gate + Actions ── */}
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-surface-1 p-5">
            <h3 className="typo-label mb-3">Publish Gate</h3>
            {gateQ.isLoading ? (
              <div className="flex items-center gap-2 text-xs text-text-faint">
                <Clock className="h-3.5 w-3.5 animate-spin" /> Evaluating…
              </div>
            ) : gateResult ? (
              <div className="space-y-3">
                <div className={cn(
                  "flex items-center gap-2 text-sm font-medium",
                  gateResult.allowed ? "text-success" : "text-danger"
                )}>
                  {gateResult.allowed
                    ? <><CheckCircle2 className="h-4 w-4" /> All checks passed</>
                    : <><AlertTriangle className="h-4 w-4" /> {gateResult.blockers.length} blocker(s)</>
                  }
                </div>

                {/* Gate checks */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    {gateResult.checks.sellerVerified
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      : <AlertTriangle className="h-3.5 w-3.5 text-danger" />
                    }
                    <span className={gateResult.checks.sellerVerified ? "text-text" : "text-danger"}>
                      Seller Identity Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {gateResult.checks.evidenceComplete
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      : <AlertTriangle className="h-3.5 w-3.5 text-danger" />
                    }
                    <span className={gateResult.checks.evidenceComplete ? "text-text" : "text-danger"}>
                      Evidence Pack Complete ({gateResult.checks.evidencePresent.length}/{REQUIRED_EVIDENCE_TYPES.length})
                    </span>
                  </div>
                </div>

                {gateResult.blockers.length > 0 && (
                  <ul className="space-y-1.5 pt-2 border-t border-border">
                    {gateResult.blockers.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-bold text-danger bg-danger/10">BLOCK</span>
                        <span className="text-text-muted">{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-faint">Gate evaluation unavailable.</p>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-lg border border-border bg-surface-1 p-5">
            <h3 className="typo-label mb-3">Actions</h3>
            <div className="space-y-2">
              {listing.status === "available" && (
                <Link
                  href={`/marketplace`}
                  className="flex items-center gap-2 text-sm text-gold hover:text-gold-hover transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" /> View on Marketplace <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {listing.status === "draft" && (
                <Link
                  href="/sell"
                  className="flex items-center gap-2 text-sm text-gold hover:text-gold-hover transition-colors"
                >
                  <Package className="h-4 w-4" /> Continue Editing
                </Link>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="rounded-lg border border-border bg-surface-1 p-5">
            <h3 className="typo-label mb-3">Timeline</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-text-faint">Created</dt>
                <dd className="tabular-nums text-text">
                  {new Date(listing.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </dd>
              </div>
              {listing.publishedAt && (
                <div className="flex justify-between">
                  <dt className="text-text-faint">Published</dt>
                  <dd className="tabular-nums text-text">
                    {new Date(listing.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function ListingDetailPage() {
  return (
    <RequireAuth>
      <ListingDetailContent />
    </RequireAuth>
  );
}
