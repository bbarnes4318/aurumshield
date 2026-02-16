"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StateChip } from "@/components/ui/state-chip";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/state-views";
import { useCounterparty } from "@/hooks/use-mock-queries";
import { ArrowLeft, Mail, Calendar, Hash, User } from "lucide-react";

function DetailRow({ label, icon: Icon, children }: { label: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-border last:border-b-0">
      <dt className="typo-label self-center flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-text-faint" />}
        {label}
      </dt>
      <dd className="col-span-2 text-sm text-text">{children}</dd>
    </div>
  );
}

export default function CounterpartyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const cpQ = useCounterparty(id);

  if (cpQ.isLoading) return <LoadingState message="Loading counterparty…" />;
  if (cpQ.isError) return <ErrorState message="Failed to load counterparty." onRetry={() => cpQ.refetch()} />;
  if (!cpQ.data) return <EmptyState title="Counterparty not found" message={`No counterparty found with ID ${id}.`} />;

  const cp = cpQ.data;

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/counterparties" className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Counterparties
        </Link>
      </div>

      <PageHeader title={cp.entity} description={`${cp.jurisdiction} · ${cp.type.replace("-", " ")}`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Overview */}
        <div className="card-base p-6">
          <h3 className="typo-h3 mb-4">Overview</h3>
          <dl>
            <DetailRow label="Status"><StateChip status={cp.status} /></DetailRow>
            <DetailRow label="Risk Level"><RiskBadge level={cp.riskLevel} /></DetailRow>
            <DetailRow label="Exposure"><span className="tabular-nums font-semibold">${(cp.exposure / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 })}M</span></DetailRow>
            <DetailRow label="Analyst" icon={User}>{cp.analyst}</DetailRow>
            <DetailRow label="Last Review" icon={Calendar}>
              <span className="tabular-nums">{new Date(cp.lastReview).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
            </DetailRow>
          </dl>
        </div>

        {/* Legal & Contact */}
        <div className="card-base p-6">
          <h3 className="typo-h3 mb-4">Legal & Contact</h3>
          <dl>
            <DetailRow label="LEI" icon={Hash}><span className="typo-mono">{cp.legalEntityId}</span></DetailRow>
            <DetailRow label="Incorporated" icon={Calendar}>
              <span className="tabular-nums">{new Date(cp.incorporationDate).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
            </DetailRow>
            <DetailRow label="Primary Contact" icon={User}>{cp.primaryContact}</DetailRow>
            <DetailRow label="Email" icon={Mail}>
              <a href={`mailto:${cp.email}`} className="text-gold hover:text-gold-hover transition-colors">{cp.email}</a>
            </DetailRow>
          </dl>
        </div>
      </div>
    </>
  );
}
