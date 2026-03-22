"use client";

/* ================================================================
   PRODUCER COMPLIANCE DASHBOARD — /producer/compliance
   ================================================================
   Upstream mining compliance for gold producers selling raw doré
   to the AurumShield institutional clearinghouse.

   Three Pillars:
     1. Corporate & AML Verification
     2. Sovereign Licensing & Export
     3. ESG & Conflict-Free Origin

   Each item shows verification status (Verified | Under Review |
   Action Required | Expired) and directs the producer to upload
   missing documents or await admin review.

   TODO: Wire to real compliance API endpoints.
   ================================================================ */

import { useState } from "react";
import {
  Shield,
  Building2,
  Users,
  GraduationCap,
  Landmark,
  FileCheck,
  Receipt,
  Globe,
  TreePine,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Upload,
  Eye,
  ChevronRight,
} from "lucide-react";
import { useAmlStatus } from "@/hooks/use-aml-status";

/* ================================================================
   TYPES
   ================================================================ */

type ComplianceStatus = "VERIFIED" | "UNDER_REVIEW" | "ACTION_REQUIRED" | "EXPIRED";

interface ComplianceItem {
  id: string;
  label: string;
  description: string;
  status: ComplianceStatus;
  icon: React.ElementType;
  lastUpdated: string | null;
  expiresAt: string | null;
  documentName: string | null;
  /** true = producer needs to upload; false = AurumShield admin is reviewing */
  producerActionRequired: boolean;
}

interface CompliancePillar {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  accentColor: string;
  items: ComplianceItem[];
}

/* ================================================================
   STATUS STYLING
   ================================================================ */

const STATUS_META: Record<ComplianceStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
}> = {
  VERIFIED: {
    label: "Verified",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    icon: CheckCircle2,
  },
  UNDER_REVIEW: {
    label: "Under Review",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
    icon: Eye,
  },
  ACTION_REQUIRED: {
    label: "Action Required",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/25",
    icon: AlertTriangle,
  },
  EXPIRED: {
    label: "Expired",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/25",
    icon: XCircle,
  },
};

/* ================================================================
   MOCK DATA — Three-Pillar Compliance Model
   ================================================================ */

const COMPLIANCE_PILLARS: CompliancePillar[] = [
  {
    id: "corporate-aml",
    title: "Corporate & AML Verification",
    subtitle: "Entity identity, beneficial ownership, and anti-money laundering training",
    icon: Building2,
    accentColor: "text-sky-400",
    items: [
      {
        id: "kyb",
        label: "Corporate KYB Status",
        description: "Entity verification via Veriff/iDenfy — legal incorporation, registered agent, and directorship confirmed.",
        status: "VERIFIED",
        icon: Building2,
        lastUpdated: "2026-03-10T14:30:00Z",
        expiresAt: "2027-03-10T00:00:00Z",
        documentName: "Certificate of Incorporation — Verified",
        producerActionRequired: false,
      },
      {
        id: "ubo",
        label: "Ultimate Beneficial Owner (UBO) Screening",
        description: "All individuals with ≥25% ownership identified and screened against global sanctions and PEP databases.",
        status: "VERIFIED",
        icon: Users,
        lastUpdated: "2026-03-10T14:30:00Z",
        expiresAt: null,
        documentName: "UBO Declaration — 3 owners screened",
        producerActionRequired: false,
      },
      {
        id: "aml-training",
        label: "Mandatory AML Training",
        description: "All designated compliance officers must complete AurumShield AML training modules.",
        status: "ACTION_REQUIRED",
        icon: GraduationCap,
        lastUpdated: null,
        expiresAt: null,
        documentName: null,
        producerActionRequired: true,
      },
    ],
  },
  {
    id: "sovereign-licensing",
    title: "Sovereign Licensing & Export",
    subtitle: "Government-issued mining concessions, export permits, and fiscal clearance",
    icon: Landmark,
    accentColor: "text-[#C6A86B]",
    items: [
      {
        id: "mining-license",
        label: "Government Mining Concession / License",
        description: "Active mining license or concession granted by the sovereign mineral authority of the jurisdiction of extraction.",
        status: "VERIFIED",
        icon: Landmark,
        lastUpdated: "2026-01-15T09:00:00Z",
        expiresAt: "2028-01-15T00:00:00Z",
        documentName: "Mining Concession ML-2024-00812 — Republic of Ghana",
        producerActionRequired: false,
      },
      {
        id: "export-permit",
        label: "Approved Export Authority Permits",
        description: "Active export permit authorizing the cross-border transfer of unrefined gold (doré) to LBMA-accredited refineries.",
        status: "EXPIRED",
        icon: FileCheck,
        lastUpdated: "2025-12-01T00:00:00Z",
        expiresAt: "2026-03-01T00:00:00Z",
        documentName: "Export Permit EXP-2025-4410 — EXPIRED",
        producerActionRequired: true,
      },
      {
        id: "royalty-tax",
        label: "Sovereign Royalty / Tax Clearance",
        description: "Certificate confirming all mineral royalties and tax obligations to the sovereign authority are current.",
        status: "UNDER_REVIEW",
        icon: Receipt,
        lastUpdated: "2026-03-18T11:00:00Z",
        expiresAt: null,
        documentName: "Tax Clearance Certificate — Submitted Mar 18",
        producerActionRequired: false,
      },
    ],
  },
  {
    id: "esg-origin",
    title: "ESG & Conflict-Free Origin",
    subtitle: "Geographic origin verification and environmental impact compliance",
    icon: Globe,
    accentColor: "text-emerald-400",
    items: [
      {
        id: "conflict-free",
        label: "Geographic Origin Certification (Conflict-Free)",
        description: "Verification that all extraction sites are outside OECD-designated conflict and high-risk areas, with validated chain-of-custody documentation.",
        status: "VERIFIED",
        icon: Globe,
        lastUpdated: "2026-02-20T10:00:00Z",
        expiresAt: "2027-02-20T00:00:00Z",
        documentName: "OECD Conflict-Free Due Diligence Report — Cleared",
        producerActionRequired: false,
      },
      {
        id: "eia",
        label: "Government Environmental Operating Permit (EIA)",
        description: "Active Environmental Impact Assessment clearance from the sovereign environmental authority for all registered extraction sites.",
        status: "ACTION_REQUIRED",
        icon: TreePine,
        lastUpdated: null,
        expiresAt: null,
        documentName: null,
        producerActionRequired: true,
      },
    ],
  },
];

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function ProducerCompliancePage() {
  const { data: amlStatus } = useAmlStatus();
  const [expandedPillar, setExpandedPillar] = useState<string | null>(COMPLIANCE_PILLARS[0].id);

  /* ── Override AML training status from hook ── */
  const pillarsWithLiveAml = COMPLIANCE_PILLARS.map((pillar) => ({
    ...pillar,
    items: pillar.items.map((item) => {
      if (item.id === "aml-training" && amlStatus) {
        return {
          ...item,
          status: (amlStatus.isComplete ? "VERIFIED" : "ACTION_REQUIRED") as ComplianceStatus,
          lastUpdated: amlStatus.isComplete ? amlStatus.completedAt ?? null : null,
          producerActionRequired: !amlStatus.isComplete,
        };
      }
      return item;
    }),
  }));

  /* ── Aggregate stats ── */
  const allItems = pillarsWithLiveAml.flatMap((p) => p.items);
  const verifiedCount = allItems.filter((i) => i.status === "VERIFIED").length;
  const actionCount = allItems.filter((i) => i.status === "ACTION_REQUIRED" || i.status === "EXPIRED").length;
  const reviewCount = allItems.filter((i) => i.status === "UNDER_REVIEW").length;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-slate-800 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Shield className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight">
                Producer Compliance Dashboard
              </h1>
              <p className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">
                Upstream Mining · Sovereign Licensing · ESG Origin
              </p>
            </div>
          </div>

          {/* Status strip */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-mono text-[10px] text-emerald-400 font-bold">{verifiedCount}</span>
              <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider">Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-mono text-[10px] text-sky-400 font-bold">{reviewCount}</span>
              <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider">In Review</span>
            </div>
            {actionCount > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                <span className="font-mono text-[10px] text-yellow-400 font-bold">{actionCount}</span>
                <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider">Needs Attention</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Pillar Cards ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
        {pillarsWithLiveAml.map((pillar) => {
          const PillarIcon = pillar.icon;
          const isExpanded = expandedPillar === pillar.id;
          const pillarVerified = pillar.items.every((i) => i.status === "VERIFIED");
          const pillarAction = pillar.items.some((i) => i.status === "ACTION_REQUIRED" || i.status === "EXPIRED");

          return (
            <div
              key={pillar.id}
              className={`rounded border transition-colors ${
                pillarAction
                  ? "border-yellow-500/30 bg-yellow-500/[0.02]"
                  : pillarVerified
                    ? "border-emerald-500/20 bg-emerald-500/[0.02]"
                    : "border-slate-800 bg-slate-900/30"
              }`}
            >
              {/* Pillar Header — clickable */}
              <button
                type="button"
                onClick={() => setExpandedPillar(isExpanded ? null : pillar.id)}
                className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-800/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <PillarIcon className={`h-4 w-4 ${pillar.accentColor}`} />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{pillar.title}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{pillar.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Mini status dots */}
                  <div className="flex items-center gap-1">
                    {pillar.items.map((item) => {
                      const meta = STATUS_META[item.status];
                      return (
                        <span
                          key={item.id}
                          className={`h-2 w-2 rounded-full ${
                            item.status === "VERIFIED"
                              ? "bg-emerald-400"
                              : item.status === "UNDER_REVIEW"
                                ? "bg-sky-400"
                                : item.status === "EXPIRED"
                                  ? "bg-red-400"
                                  : "bg-yellow-400 animate-pulse"
                          }`}
                          title={`${item.label}: ${meta.label}`}
                        />
                      );
                    })}
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 text-slate-600 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </div>
              </button>

              {/* Expanded Items */}
              {isExpanded && (
                <div className="border-t border-slate-800/50 divide-y divide-slate-800/30">
                  {pillar.items.map((item) => {
                    const meta = STATUS_META[item.status];
                    const StatusIcon = meta.icon;
                    const ItemIcon = item.icon;

                    return (
                      <div
                        key={item.id}
                        className="px-5 py-3 flex items-start gap-4 hover:bg-slate-800/10 transition-colors"
                      >
                        {/* Icon */}
                        <div className={`shrink-0 mt-0.5 h-7 w-7 rounded flex items-center justify-center ${meta.bg}`}>
                          <ItemIcon className={`h-3.5 w-3.5 ${meta.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-medium text-white">{item.label}</p>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${meta.color} ${meta.bg} border ${meta.border}`}>
                              <StatusIcon className="h-2.5 w-2.5" />
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed mb-1.5">
                            {item.description}
                          </p>

                          {/* Document / date info */}
                          <div className="flex items-center gap-4 flex-wrap">
                            {item.documentName && (
                              <span className="font-mono text-[9px] text-slate-400 tracking-wider">
                                📄 {item.documentName}
                              </span>
                            )}
                            {item.lastUpdated && (
                              <span className="font-mono text-[9px] text-slate-600 tracking-wider">
                                Updated: {new Date(item.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            )}
                            {item.expiresAt && (
                              <span className={`font-mono text-[9px] tracking-wider ${
                                item.status === "EXPIRED" ? "text-red-400 font-bold" : "text-slate-600"
                              }`}>
                                {item.status === "EXPIRED" ? "⚠ Expired: " : "Expires: "}
                                {new Date(item.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="shrink-0">
                          {item.producerActionRequired ? (
                            <button
                              type="button"
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                                item.status === "EXPIRED"
                                  ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                  : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                              }`}
                            >
                              <Upload className="h-3 w-3" />
                              {item.status === "EXPIRED" ? "Re-Upload" : "Upload"}
                            </button>
                          ) : item.status === "UNDER_REVIEW" ? (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[9px] text-sky-400/70 tracking-wider uppercase border border-sky-500/20 bg-sky-500/5">
                              <Clock className="h-3 w-3" />
                              Admin Reviewing
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[9px] text-emerald-400/60 tracking-wider uppercase">
                              <CheckCircle2 className="h-3 w-3" />
                              Complete
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-slate-800 bg-black/60 px-5 py-2 flex items-center justify-between">
        <p className="font-mono text-[8px] text-slate-700 tracking-wider uppercase">
          AurumShield Compliance Network · Producer Upstream Verification · OECD Due Diligence Guidance
        </p>
        <p className="font-mono text-[9px] text-slate-600 tracking-wider">
          {verifiedCount}/{allItems.length} checks passed
        </p>
      </div>
    </div>
  );
}
