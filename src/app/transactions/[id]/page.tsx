"use client";

import { use, Suspense, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/state-views";
import { useTransaction, useCounterparties, useCorridors, useEvidence, useAuditEvents, useDashboardData } from "@/hooks/use-mock-queries";
import { getTransactionTransitions } from "@/lib/mock-data";

import { DetailOverviewTab } from "./detail-overview-tab";
import { DetailEvidenceTab } from "./detail-evidence-tab";
import { DetailAuditTab } from "./detail-audit-tab";
import { DetailSidebar } from "./detail-sidebar";

const VALID_TABS = new Set(["overview", "evidence", "audit"]);
const TAB_META: { key: string; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "evidence", label: "Evidence" },
  { key: "audit", label: "Audit" },
];

function TransactionDetail({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get("tab") ?? "overview";
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : "overview";

  const txQ = useTransaction(id);
  const cpQ = useCounterparties();
  const corQ = useCorridors();
  const evQ = useEvidence();
  const auditQ = useAuditEvents();
  const dashQ = useDashboardData("phase1");

  const [copied, setCopied] = useState(false);

  const tx = txQ.data;
  const cp = useMemo(() => tx && cpQ.data?.find((c) => c.id === tx.counterpartyId), [tx, cpQ.data]);
  const corridor = useMemo(() => tx && corQ.data?.find((c) => c.id === tx.corridorId), [tx, corQ.data]);
  const transitions = useMemo(() => tx ? getTransactionTransitions(tx) : [], [tx]);
  const evidence = evQ.data ?? [];
  const auditEvents = auditQ.data ?? [];
  const capital = dashQ.data?.capital;

  const handleCopy = useCallback(async () => {
    if (!tx) return;
    await navigator.clipboard.writeText(tx.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tx]);

  function setTab(tab: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (tab === "overview") p.delete("tab"); else p.set("tab", tab);
    // Clear tab-specific filters when switching
    if (tab !== "evidence") p.delete("class");
    if (tab !== "audit") p.delete("cat");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  if (txQ.isLoading) return <LoadingState message="Loading transaction…" />;
  if (txQ.isError) return <ErrorState message="Failed to load transaction." onRetry={() => txQ.refetch()} />;
  if (!tx) return <EmptyState title="Transaction not found" message={`No transaction found with ID ${id}.`} />;

  return (
    <>
      {/* Back link */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/transactions" className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> Transactions
        </Link>
      </div>

      {/* Header with monospace reference + copy */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-1">
        <div className="flex items-center gap-3">
          <h1 className="typo-mono text-xl font-bold text-text tracking-tight">{tx.reference}</h1>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs transition-colors",
              copied ? "bg-success/10 text-success" : "bg-surface-2 text-text-faint hover:text-gold hover:bg-gold/10"
            )}
            aria-label={copied ? "Copied" : "Copy reference"}
          >
            {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
          </button>
        </div>
        <p className="text-sm text-text-muted">{tx.description}</p>
      </div>

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

      {/* Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          {activeTab === "overview" && <DetailOverviewTab tx={tx} cp={cp} transitions={transitions} />}
          {activeTab === "evidence" && <DetailEvidenceTab evidence={evidence} />}
          {activeTab === "audit" && <DetailAuditTab auditEvents={auditEvents} />}
        </div>
        <DetailSidebar tx={tx} cp={cp} corridor={corridor} capital={capital} evidence={evidence} />
      </div>
    </>
  );
}

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<LoadingState message="Loading transaction…" />}>
      <TransactionDetail id={id} />
    </Suspense>
  );
}
