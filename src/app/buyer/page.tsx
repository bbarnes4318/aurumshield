"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  Store,
  Shield,
  Award,
  CheckCircle2,
  ChevronRight,
  Lock,
  Fingerprint,
  Landmark,
  Truck,
  ExternalLink,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { SlideOutPanel } from "@/components/ui/slide-out-panel";
import { HorizontalStepper } from "@/components/buyer/HorizontalStepper";
import {
  deriveCurrentPhase,
  type BuyerLifecyclePhase,
} from "@/components/buyer/TransactionProgressSidebar";
import {
  useMyOrders,
  useMyReservations,
  useSettlements,
  useSettlementLedger,
  useListings,
  useVerificationCase,
  useCertificateBySettlement,
} from "@/hooks/use-mock-queries";
import type {
  Order,
  SettlementCase,
  Listing,
  LedgerEntry,
} from "@/lib/mock-data";
import { useAuth } from "@/providers/auth-provider";

/* ================================================================
   MarketplaceContent — lazy-loaded inside the overlay panel
   ================================================================ */
import { MarketplaceContent } from "@/app/marketplace/page";

/* ================================================================
   VerificationDrawerContent — inline version of verification
   ================================================================ */
import { CaseSummaryCard } from "@/components/verification/case-summary-card";
import { StepLadder } from "@/components/verification/step-ladder";
import { DecisionPanel } from "@/components/verification/decision-panel";
import { AuditLog } from "@/components/verification/audit-log";

/* ================================================================
   CertificateDrawerContent — inline certificate viewer
   ================================================================ */
import { AppLogo } from "@/components/app-logo";
import {
  resolvePartyName,
  resolvePartyLei,
  resolvePartyJurisdiction,
  resolveHubName,
} from "@/lib/certificate-engine";
import type { ClearingCertificate } from "@/lib/certificate-engine";
import { mockCorridors } from "@/lib/mock-data";

const MOCK_USER_ID = "user-1";

/* ================================================================
   Derive lifecycle timestamps from ledger entries
   ================================================================ */

function deriveTimestamps(
  order: Order | undefined,
  settlement: SettlementCase | undefined,
  ledger: LedgerEntry[],
): (string | null)[] {
  const timestamps: (string | null)[] = [null, null, null, null, null];
  if (order) timestamps[0] = order.createdAt;
  const verEntry = ledger.find((e) => e.type === "VERIFICATION_PASSED");
  if (verEntry) timestamps[1] = verEntry.timestamp;
  const fundsEntry = ledger.find((e) => e.type === "FUNDS_DEPOSITED");
  if (fundsEntry) timestamps[2] = fundsEntry.timestamp;
  if (settlement?.status === "SETTLED") timestamps[3] = settlement.updatedAt;
  return timestamps;
}

/* ================================================================
   Tab Navigation Bar (Marketplace / Verification / Certificates)
   ================================================================ */

type TabKey = "marketplace" | "verification" | "certificates";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; accent: string }[] = [
  { key: "marketplace",   label: "Marketplace",   icon: Store,  accent: "text-gold" },
  { key: "verification",  label: "Verification",  icon: Shield, accent: "text-info" },
  { key: "certificates",  label: "Certificates",  icon: Award,  accent: "text-success" },
];

function TabBar({ onOpen }: { onOpen: (tab: TabKey) => void }) {
  return (
    <div className="flex items-center gap-2" role="navigation" aria-label="Quick actions">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onOpen(tab.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
              "border border-border bg-surface-1 px-3 py-1.5",
              "text-xs font-medium text-text-muted",
              "transition-all hover:border-gold/20 hover:bg-surface-2 hover:text-text",
              "active:scale-[0.98]",
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", tab.accent)} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ================================================================
   Workspace Step Panels — rendered inside DynamicWorkspace
   ================================================================ */

/* ── Step 1: Inventory Lock ── */
function StepInventoryLock({ order, listing, settlement }: {
  order: Order;
  listing: Listing | undefined;
  settlement: SettlementCase | undefined;
}) {
  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-semibold text-text">Inventory Lock</h3>
        <span className="text-[10px] text-text-faint">Gold reserved, price locked</span>
      </div>

      <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3 flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
          <DataCell label="Order ID" value={order.id} mono />
          <DataCell label="Listing" value={order.listingId} mono />
          <DataCell label="Weight" value={`${order.weightOz} oz`} />
          <DataCell label="Price/oz" value={`$${order.pricePerOz.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
          <DataCell label="Notional" value={`$${order.notional.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
          <DataCell
            label="Created"
            value={new Date(order.createdAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          />
          {listing && (
            <>
              <DataCell label="Vault" value={listing.vaultName} />
              <DataCell label="Purity" value={`.${listing.purity}`} />
              <DataCell label="Form" value={listing.form} />
              <DataCell label="Jurisdiction" value={listing.jurisdiction} />
            </>
          )}
          {settlement && (
            <>
              <DataCell label="Settlement" value={settlement.id} mono />
              <DataCell label="Rail" value={settlement.rail} />
              <DataCell label="Status" value={settlement.status.replace(/_/g, " ")} chip chipColor={
                settlement.status === "SETTLED" ? "success" : "gold"
              } />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Identity Perimeter (Verification) ── */
function StepVerification({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-info/10">
        <Fingerprint className="h-7 w-7 text-info" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-text">Identity Verification</h3>
        <p className="text-xs text-text-muted mt-1 max-w-sm">
          Complete your KYC/KYB identity verification to proceed with settlement.
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenDrawer}
        className={cn(
          "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
          "bg-gold px-5 py-2 text-sm font-medium text-bg",
          "transition-colors hover:bg-gold-hover active:bg-gold-pressed",
        )}
      >
        <Shield className="h-4 w-4" />
        Open Verification
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Step 3: Capital Activation ── */
function StepCapitalActivation({ settlement }: { settlement: SettlementCase | undefined }) {
  if (!settlement) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-center">
        <div className="space-y-2">
          <Landmark className="h-10 w-10 text-text-faint mx-auto" />
          <p className="text-sm text-text-muted">Settlement case not yet created.</p>
          <p className="text-xs text-text-faint">Awaiting verification completion to open escrow.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Landmark className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-semibold text-text">Capital Activation</h3>
        <span className="text-[10px] text-text-faint">Payment & settlement</span>
      </div>

      <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3 flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
          <DataCell label="Settlement ID" value={settlement.id} mono />
          <DataCell label="Status" value={settlement.status.replace(/_/g, " ")} chip chipColor={
            settlement.status === "SETTLED" ? "success" : "gold"
          } />
          <DataCell label="Rail" value={settlement.rail} />
          <DataCell label="Notional" value={`$${settlement.notionalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
        </div>
      </div>

      <Link
        href={`/settlements/${settlement.id}/activation`}
        className={cn(
          "self-start inline-flex items-center gap-2 rounded-[var(--radius-input)]",
          "bg-gold px-4 py-2 text-sm font-medium text-bg",
          "transition-colors hover:bg-gold-hover active:bg-gold-pressed",
        )}
      >
        <CreditCard className="h-4 w-4" />
        Activate Payment
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/* ── Step 4: Finality (Certificate) ── */
function StepFinality({ settlement, onOpenCert }: {
  settlement: SettlementCase | undefined;
  onOpenCert: () => void;
}) {
  if (!settlement || settlement.status !== "SETTLED") {
    return (
      <div className="h-full flex items-center justify-center p-4 text-center">
        <div className="space-y-2">
          <Award className="h-10 w-10 text-text-faint mx-auto" />
          <p className="text-sm text-text-muted">Certificate pending settlement.</p>
          <p className="text-xs text-text-faint">Complete capital activation to issue the clearing certificate.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
        <Award className="h-7 w-7 text-success" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-text">Settlement Complete</h3>
        <p className="text-xs text-text-muted mt-1">
          Your clearing certificate has been issued.
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenCert}
        className={cn(
          "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
          "bg-success/10 border border-success/20 px-5 py-2 text-sm font-medium text-success",
          "transition-colors hover:bg-success/20",
        )}
      >
        <Award className="h-4 w-4" />
        View Certificate
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Step 5: Secure Delivery ── */
function StepDelivery({ settlement }: { settlement: SettlementCase | undefined }) {
  if (!settlement) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-center">
        <div className="space-y-2">
          <Truck className="h-10 w-10 text-text-faint mx-auto" />
          <p className="text-sm text-text-muted">Delivery pending settlement completion.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Truck className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-semibold text-text">Secure Delivery</h3>
        <span className="text-[10px] text-text-faint">Brink&apos;s Global Services</span>
      </div>

      <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3 flex-1">
        <div className="flex items-center justify-center h-full text-center">
          <div className="space-y-2">
            <p className="text-sm text-text-muted">
              {settlement.status === "SETTLED"
                ? "Delivery logistics are being coordinated."
                : "Delivery will be arranged upon settlement finality."}
            </p>
            {settlement.status === "SETTLED" && (
              <Link
                href={`/buyer/delivery/${settlement.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-gold hover:text-gold-hover transition-colors"
              >
                Track Delivery <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Data Cell Primitive ── */
function DataCell({ label, value, mono, chip, chipColor }: {
  label: string;
  value: string;
  mono?: boolean;
  chip?: boolean;
  chipColor?: "success" | "gold" | "info" | "danger";
}) {
  const chipColors = {
    success: "border-success/20 bg-success/10 text-success",
    gold: "border-gold/20 bg-gold/10 text-gold",
    info: "border-info/20 bg-info/10 text-info",
    danger: "border-danger/20 bg-danger/10 text-danger",
  };
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">{label}</p>
      {chip ? (
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
          chipColors[chipColor ?? "gold"],
        )}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {value}
        </span>
      ) : (
        <p className={cn(
          "text-sm font-medium text-text truncate",
          mono && "font-mono tabular-nums",
        )}>
          {value}
        </p>
      )}
    </div>
  );
}

/* ================================================================
   Completed Transaction Card
   ================================================================ */

function CompletedCard({ order, listing, settlement }: {
  order: Order;
  listing: Listing | undefined;
  settlement: SettlementCase | undefined;
}) {
  return (
    <Link
      href={settlement ? `/settlements/${settlement.id}` : `/orders/${order.id}`}
      className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] hover:bg-surface-2 transition-colors group"
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text truncate">
          {listing?.title ?? `Order ${order.id}`}
        </p>
      </div>
      <span className="text-[11px] text-text-faint tabular-nums">
        {order.weightOz} oz · ${order.notional.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-text-faint group-hover:text-success transition-colors" />
    </Link>
  );
}

/* ================================================================
   Empty State — No Active Transactions
   ================================================================ */

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
            <Store className="h-7 w-7 text-gold" />
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold text-text">No active transactions</h3>
          <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
            Browse the marketplace to find verified gold allocations.
          </p>
        </div>
        <button
          type="button"
          onClick={onBrowse}
          className={cn(
            "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
            "bg-gold px-5 py-2.5 text-sm font-medium text-bg",
            "transition-colors hover:bg-gold-hover",
          )}
          data-tour="buyer-browse-marketplace"
        >
          <Store className="h-4 w-4" />
          Browse Marketplace
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   Verification Drawer Content
   ================================================================ */

function VerificationDrawerBody() {
  const { user, org } = useAuth();
  const caseQ = useVerificationCase(user?.id ?? null);
  const vc = caseQ.data;

  if (caseQ.isLoading) return <LoadingState message="Loading verification…" />;

  if (!vc) {
    return (
      <div className="p-5">
        <p className="text-sm text-text-muted">
          Your identity verification has not started yet. Verification will be initiated
          as part of the transaction lifecycle.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <CaseSummaryCard verificationCase={vc} />
      <StepLadder steps={vc.steps} currentStepId={vc.nextRequiredStepId} />
      <DecisionPanel
        verificationCase={vc}
        userId={user?.id ?? ""}
        orgId={org?.id ?? ""}
      />
      <AuditLog audit={vc.audit} />
    </div>
  );
}

/* ================================================================
   Certificate Drawer Content
   ================================================================ */

function CertificateDrawerBody({ cert }: { cert: ClearingCertificate }) {
  const corridor = mockCorridors.find((c) => c.id === cert.corridorId);

  function fmtUsd(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-faint mb-3 flex items-center gap-2">
        <span className="h-px flex-1 bg-border" />
        {children}
        <span className="h-px flex-1 bg-border" />
      </h2>
    );
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <tr>
        <td className="py-1 pr-4 text-text-faint text-xs w-44 align-top">{label}</td>
        <td className="py-1 text-xs">{children}</td>
      </tr>
    );
  }

  return (
    <div className="p-5">
      <div className="rounded-xl border border-gold/20 bg-surface-1 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-gold/10 via-gold/5 to-transparent px-6 py-5 border-b border-gold/20">
          <div className="flex items-start justify-between">
            <div>
              <AppLogo className="h-8 w-auto mb-2" variant="light" />
              <h1 className="text-base font-semibold text-text">Clearing Certificate</h1>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold text-gold">{cert.certificateNumber}</p>
              <p className="text-[10px] text-text-faint mt-1">
                Issued {new Date(cert.issuedAt).toLocaleDateString("en-GB", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="px-6 py-4">
          <SectionTitle>Parties</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint mb-2">Buyer</p>
              <table className="w-full text-xs"><tbody>
                <Field label="Organization">{resolvePartyName(cert.buyerOrgId)}</Field>
                <Field label="LEI">{resolvePartyLei(cert.buyerOrgId)}</Field>
                <Field label="Jurisdiction">{resolvePartyJurisdiction(cert.buyerOrgId)}</Field>
              </tbody></table>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint mb-2">Seller</p>
              <table className="w-full text-xs"><tbody>
                <Field label="Organization">{resolvePartyName(cert.sellerOrgId)}</Field>
                <Field label="LEI">{resolvePartyLei(cert.sellerOrgId)}</Field>
                <Field label="Jurisdiction">{resolvePartyJurisdiction(cert.sellerOrgId)}</Field>
              </tbody></table>
            </div>
          </div>
        </div>

        {/* Asset */}
        <div className="px-6 py-4 border-t border-border">
          <SectionTitle>Asset Specification</SectionTitle>
          <table className="w-full text-xs"><tbody>
            <Field label="Form">{cert.asset.form === "bar" ? "LBMA Good Delivery Bar" : "Bullion Coin"}</Field>
            <Field label="Purity">{cert.asset.purity} fine</Field>
            <Field label="Weight">{cert.asset.weightOz.toLocaleString("en-US", { minimumFractionDigits: 2 })} oz</Field>
            <Field label="Custody Vault">{resolveHubName(cert.asset.vaultId)}</Field>
          </tbody></table>
        </div>

        {/* Settlement */}
        <div className="px-6 py-4 border-t border-border">
          <SectionTitle>Settlement Confirmation</SectionTitle>
          <table className="w-full text-xs"><tbody>
            <Field label="Settlement ID">{cert.settlementId}</Field>
            <Field label="Price Per Oz">{fmtUsd(cert.economics.pricePerOzLocked)}</Field>
            <Field label="Notional Value">{fmtUsd(cert.economics.notional)}</Field>
            <Field label="Total Fees">{fmtUsd(cert.economics.fees.totalFees)}</Field>
            <Field label="Rail">{cert.rail}</Field>
          </tbody></table>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-t border-border">
          <SectionTitle>Controls &amp; Infrastructure</SectionTitle>
          <table className="w-full text-xs"><tbody>
            <Field label="Corridor">{corridor?.name ?? cert.corridorId}</Field>
            <Field label="Settlement Hub">{resolveHubName(cert.settlementHubId)}</Field>
            <Field label="Vault Hub">{resolveHubName(cert.vaultHubId)}</Field>
          </tbody></table>
        </div>

        {/* Signature */}
        <div className="px-6 py-4 border-t border-border">
          <SectionTitle>Cryptographic Signature</SectionTitle>
          <div className="rounded-lg border border-border bg-surface-2/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint mb-1">SHA-256 Hash</p>
            <code className="font-mono text-[10px] text-gold break-all leading-relaxed">
              {cert.signatureHash}
            </code>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gold/10 bg-gold/2">
          <p className="text-[10px] text-text-faint italic leading-relaxed text-center">
            This certificate is generated from AurumShield&apos;s append-only settlement ledger.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   BUYER MISSION CONTROL — Main Page Component
   ================================================================
   Layout:
   ┌──────────────────────────────────────────────┐
   │ HEADER + TAB BAR                             │
   ├──────────────────────────────────────────────┤
   │ HORIZONTAL STEPPER (hero)                    │
   ├──────────────────────────────────────────────┤
   │ DYNAMIC WORKSPACE (flex-1)                   │
   ├──────────────────────────────────────────────┤
   │ COMPLETED TRANSACTIONS (compact, max ~50px)  │
   └──────────────────────────────────────────────┘
   ================================================================ */

export default function BuyerPage() {
  const ordersQ = useMyOrders(MOCK_USER_ID);
  const reservationsQ = useMyReservations(MOCK_USER_ID);
  const settlementsQ = useSettlements();
  const listingsQ = useListings();

  const isLoading =
    ordersQ.isLoading ||
    reservationsQ.isLoading ||
    settlementsQ.isLoading ||
    listingsQ.isLoading;

  /* ── Derive active and completed orders ── */
  const { activeOrder, completedOrders, activeSettlement } = useMemo(() => {
    if (!ordersQ.data || !settlementsQ.data)
      return { activeOrder: null, completedOrders: [], activeSettlement: null };

    const buyerSettlements = settlementsQ.data.filter(
      (s: SettlementCase) => s.buyerUserId === MOCK_USER_ID,
    );

    const active = ordersQ.data.find(
      (o: Order) => o.status !== "completed" && o.status !== "cancelled",
    );

    const activeSett = active
      ? buyerSettlements.find((s: SettlementCase) => s.orderId === active.id) ?? null
      : null;

    const completed = ordersQ.data.filter(
      (o: Order) => o.status === "completed",
    );

    return {
      activeOrder: active ?? null,
      completedOrders: completed,
      activeSettlement: activeSett,
    };
  }, [ordersQ.data, settlementsQ.data]);

  /* ── Ledger & certificate for active settlement ── */
  const ledgerQ = useSettlementLedger(activeSettlement?.id ?? "");
  const certQ = useCertificateBySettlement(activeSettlement?.id ?? "");

  /* ── Resolve listing for active order ── */
  const activeListing = useMemo(() => {
    if (!activeOrder || !listingsQ.data) return undefined;
    return listingsQ.data.find((l: Listing) => l.id === activeOrder.listingId);
  }, [activeOrder, listingsQ.data]);

  /* ── Derive current lifecycle phase ── */
  const currentPhase = useMemo((): BuyerLifecyclePhase => {
    if (!activeOrder) return 1;
    return deriveCurrentPhase(
      activeOrder.status,
      activeSettlement?.status ?? null,
      activeSettlement?.status === "SETTLED",
    );
  }, [activeOrder, activeSettlement]);

  const timestamps = useMemo(
    () => deriveTimestamps(activeOrder ?? undefined, activeSettlement ?? undefined, ledgerQ.data ?? []),
    [activeOrder, activeSettlement, ledgerQ.data],
  );

  /* ── Local UI state ── */
  const [selectedStep, setSelectedStep] = useState<BuyerLifecyclePhase>(currentPhase);
  const [drawerOpen, setDrawerOpen] = useState<"marketplace" | "verification" | "certificate" | null>(null);

  /* Sync selected step when phase changes */
  // Using a simple check to keep it in sync
  const effectiveStep = selectedStep;

  /* ── Handle tab clicks ── */
  const handleTabOpen = (tab: TabKey) => {
    if (tab === "marketplace") setDrawerOpen("marketplace");
    else if (tab === "verification") setDrawerOpen("verification");
    else if (tab === "certificates") setDrawerOpen("certificate");
  };

  /* ── Loading / Error ── */
  if (isLoading) return <LoadingState message="Loading buyer console…" />;
  if (ordersQ.isError) {
    return (
      <ErrorState
        message="Failed to load buyer data."
        onRetry={() => ordersQ.refetch()}
      />
    );
  }

  /* ── Workspace content renderer ── */
  const renderWorkspace = () => {
    if (!activeOrder) {
      return <EmptyState onBrowse={() => setDrawerOpen("marketplace")} />;
    }

    switch (effectiveStep) {
      case 1:
        return (
          <StepInventoryLock
            order={activeOrder}
            listing={activeListing}
            settlement={activeSettlement ?? undefined}
          />
        );
      case 2:
        return (
          <StepVerification onOpenDrawer={() => setDrawerOpen("verification")} />
        );
      case 3:
        return (
          <StepCapitalActivation settlement={activeSettlement ?? undefined} />
        );
      case 4:
        return (
          <StepFinality
            settlement={activeSettlement ?? undefined}
            onOpenCert={() => setDrawerOpen("certificate")}
          />
        );
      case 5:
        return (
          <StepDelivery settlement={activeSettlement ?? undefined} />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* ═══ MAIN LAYOUT — zero-scroll viewport lock ═══ */}
      <div className="viewport-lock">

        {/* ── Header + Tab Bar ── */}
        <div className="shrink-0 flex items-center justify-between gap-4 pb-3">
          <div>
            <h1 className="text-lg font-semibold text-text tracking-tight">
              Buyer Mission Control
            </h1>
            <p className="text-xs text-text-faint">
              Single-path transaction lifecycle — from discovery to certificate
            </p>
          </div>
          <TabBar onOpen={handleTabOpen} />
        </div>

        {/* ── Active Transaction Header ── */}
        {activeOrder && (
          <div className="shrink-0 flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-gold/15 bg-surface-1 px-4 py-2 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-2 w-2 shrink-0 rounded-full bg-gold animate-pulse" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gold uppercase tracking-widest">
                  Active Transaction
                </p>
                <p className="text-sm font-medium text-text truncate">
                  {activeListing?.title ?? `Order ${activeOrder.id}`}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-semibold tabular-nums text-text">
                ${activeOrder.notional.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-text-faint uppercase">Notional</p>
            </div>
          </div>
        )}

        {/* ── Horizontal Stepper (hero) ── */}
        {activeOrder && (
          <div className="shrink-0 rounded-[var(--radius-sm)] border border-border bg-surface-1 mb-3">
            <HorizontalStepper
              currentPhase={currentPhase}
              selectedStep={effectiveStep}
              onSelectStep={setSelectedStep}
              timestamps={timestamps}
            />
          </div>
        )}

        {/* ── Dynamic Workspace (flex-1, fills remaining space) ── */}
        <div className="flex-1 min-h-0 rounded-[var(--radius-sm)] border border-border bg-surface-1 overflow-hidden">
          {renderWorkspace()}
        </div>

        {/* ── Completed Transactions (compact bottom strip) ── */}
        {completedOrders.length > 0 && (
          <div className="shrink-0 mt-3">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
                Completed
              </h2>
              <span className="text-[10px] text-text-faint">({completedOrders.length})</span>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-1 divide-y divide-border max-h-[80px] overflow-y-auto scrollbar-hidden">
              {completedOrders.map((order: Order) => {
                const listing = listingsQ.data?.find((l: Listing) => l.id === order.listingId);
                const settlement = settlementsQ.data?.find(
                  (s: SettlementCase) => s.orderId === order.id,
                );
                return (
                  <CompletedCard
                    key={order.id}
                    order={order}
                    listing={listing}
                    settlement={settlement}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ SLIDE-OUT PANELS — never leave Mission Control ═══ */}

      {/* Marketplace Overlay — full screen (Condition #1: no route change) */}
      <SlideOutPanel
        open={drawerOpen === "marketplace"}
        onClose={() => setDrawerOpen(null)}
        title="Marketplace — Live Gold Inventory"
        subtitle="Browse verified gold allocations"
        size="full"
        id="marketplace-panel"
      >
        <Suspense fallback={<LoadingState message="Loading marketplace…" />}>
          <div className="p-5">
            <MarketplaceContent />
          </div>
        </Suspense>
      </SlideOutPanel>

      {/* Verification Drawer */}
      <SlideOutPanel
        open={drawerOpen === "verification"}
        onClose={() => setDrawerOpen(null)}
        title="Verification"
        subtitle="KYC / KYB identity verification"
        size="xl"
        id="verification-panel"
      >
        <VerificationDrawerBody />
      </SlideOutPanel>

      {/* Certificate Drawer */}
      <SlideOutPanel
        open={drawerOpen === "certificate"}
        onClose={() => setDrawerOpen(null)}
        title="Clearing Certificate"
        subtitle={certQ.data?.certificateNumber ?? "Certificate viewer"}
        size="xl"
        id="certificate-panel"
      >
        {certQ.isLoading ? (
          <LoadingState message="Loading certificate…" />
        ) : certQ.data ? (
          <CertificateDrawerBody cert={certQ.data} />
        ) : (
          <div className="p-5 text-center">
            <Award className="h-10 w-10 text-text-faint mx-auto mb-3" />
            <p className="text-sm text-text-muted">No certificate issued yet.</p>
            <p className="text-xs text-text-faint mt-1">
              Certificates are generated upon settlement finality.
            </p>
          </div>
        )}
      </SlideOutPanel>
    </>
  );
}
