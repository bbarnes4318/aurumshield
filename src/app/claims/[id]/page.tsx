"use client";

import { use, Suspense, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/state-views";
import { useClaim, useTransaction, useCounterparty, useCorridors, useEvidence, useDashboardData } from "@/hooks/use-mock-queries";
import { evaluateClaim, type ClaimEvaluationContext } from "./deterministic-claim-engine";
import { ClaimDecisionPanel } from "./claim-decision-panel";
import { ClaimEvidencePanel } from "./claim-evidence-panel";
import { ClaimExportStub } from "./claim-export-stub";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const claimStatusStyles: Record<string, string> = {
  open: "bg-info/10 text-info", investigating: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success", escalated: "bg-danger/10 text-danger",
  denied: "bg-text-faint/10 text-text-faint",
};
const priorityStyles: Record<string, string> = {
  low: "text-text-faint", medium: "text-warning", high: "text-danger", urgent: "text-danger font-bold",
};

const VALID_TABS = new Set(["overview", "evidence", "audit"]);
const TAB_META: { key: string; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "evidence", label: "Evidence" },
  { key: "audit", label: "Audit" },
];

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2.5 border-b border-border last:border-b-0">
      <dt className="typo-label self-center">{label}</dt>
      <dd className="col-span-2 text-sm text-text">{children}</dd>
    </div>
  );
}

function ClaimDetail({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get("tab") ?? "overview";
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : "overview";

  const clmQ = useClaim(id);
  const claim = clmQ.data;

  const txQ = useTransaction(claim?.transactionId ?? "");
  const cpQ = useCounterparty(claim?.counterpartyId ?? "");
  const corQ = useCorridors();
  const evQ = useEvidence();
  const dashQ = useDashboardData("phase1");

  const corridor = useMemo(() => {
    if (!txQ.data || !corQ.data) return null;
    return corQ.data.find((c) => c.id === txQ.data?.corridorId) ?? null;
  }, [txQ.data, corQ.data]);

  const decision = useMemo(() => {
    if (!claim) return null;
    const ctx: ClaimEvaluationContext = {
      claim,
      transaction: txQ.data ?? null,
      counterparty: cpQ.data ?? null,
      corridor,
      evidence: evQ.data ?? [],
      capital: dashQ.data?.capital ?? null,
    };
    return evaluateClaim(ctx);
  }, [claim, txQ.data, cpQ.data, corridor, evQ.data, dashQ.data]);

  const setTab = useCallback(
    (tab: string) => {
      const p = new URLSearchParams(searchParams.toString());
      if (tab === "overview") p.delete("tab"); else p.set("tab", tab);
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  if (clmQ.isLoading) return <LoadingState message="Loading claim…" />;
  if (clmQ.isError) return <ErrorState message="Failed to load claim." onRetry={() => clmQ.refetch()} />;
  if (!claim) return <EmptyState title="Claim not found" message={`No claim found with ID ${id}.`} />;

  const isLoading = txQ.isLoading || cpQ.isLoading || corQ.isLoading || evQ.isLoading || dashQ.isLoading;

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <Link href="/claims" className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> Claims
        </Link>
        {decision && <ClaimExportStub claim={claim} decision={decision} />}
      </div>

      <PageHeader title={claim.reference} description={claim.title} />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-4">
        {TAB_META.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === t.key
                ? "border-gold text-gold"
                : "border-transparent text-text-muted hover:text-text hover:border-border"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState message="Evaluating claim…" />
      ) : decision ? (
        <>
          {/* Overview tab — original three-column layout */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_260px]">
              {/* Left — Claim Summary */}
              <div className="card-base p-5 h-fit lg:sticky lg:top-4">
                <p className="typo-label mb-3">Claim Summary</p>
                <dl>
                  <DetailRow label="Status">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", claimStatusStyles[claim.status])}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />{claim.status}
                    </span>
                  </DetailRow>
                  <DetailRow label="Priority">
                    <span className={cn("text-xs font-semibold uppercase tracking-wider", priorityStyles[claim.priority])}>{claim.priority}</span>
                  </DetailRow>
                  <DetailRow label="Type">
                    <span className="capitalize">{claim.type.replace(/-/g, " ")}</span>
                  </DetailRow>
                  <DetailRow label="Claimant">{claim.claimant}</DetailRow>
                  <DetailRow label="Counterparty">
                    <Link href={`/counterparties/${claim.counterpartyId}`} className="text-gold hover:text-gold-hover transition-colors inline-flex items-center gap-1">
                      {claim.counterpartyName} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </DetailRow>
                  <DetailRow label="Transaction">
                    {claim.transactionId ? (
                      <Link href={`/transactions/${claim.transactionId}`} className="font-mono text-xs text-gold hover:text-gold-hover transition-colors inline-flex items-center gap-1">
                        {claim.transactionId} <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : <span className="text-text-faint">—</span>}
                  </DetailRow>
                  <DetailRow label="Amount">
                    {claim.amount > 0
                      ? <span className="tabular-nums font-semibold">{claim.currency} {claim.amount.toLocaleString("en-US")}</span>
                      : <span className="text-text-faint">N/A</span>
                    }
                  </DetailRow>
                  <DetailRow label="Filed">
                    <span className="tabular-nums">{new Date(claim.filedDate).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
                  </DetailRow>
                  <DetailRow label="Resolved">
                    {claim.resolvedDate
                      ? <span className="tabular-nums">{new Date(claim.resolvedDate).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
                      : <span className="text-text-faint">—</span>}
                  </DetailRow>
                  <DetailRow label="Assignee">{claim.assignee}</DetailRow>
                </dl>
                <div className="mt-4 rounded-[var(--radius-sm)] bg-surface-2 p-3">
                  <p className="typo-label mb-1">Description</p>
                  <p className="text-xs leading-relaxed text-text-muted">{claim.description}</p>
                </div>
              </div>

              {/* Center — Decision Panel */}
              <ClaimDecisionPanel decision={decision} />

              {/* Right — Evidence + Capital Impact */}
              <ClaimEvidencePanel decision={decision} />
            </div>
          )}

          {/* Evidence tab — full-width evidence panel */}
          {activeTab === "evidence" && (
            <ClaimEvidencePanel decision={decision} />
          )}

          {/* Audit tab — full-width decision/audit panel */}
          {activeTab === "audit" && (
            <ClaimDecisionPanel decision={decision} />
          )}
        </>
      ) : null}
    </>
  );
}

export default function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<LoadingState message="Loading claim…" />}>
      <ClaimDetail id={id} />
    </Suspense>
  );
}
