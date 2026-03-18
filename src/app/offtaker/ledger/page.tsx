"use client";

/* ================================================================
   AUDIT VAULT — /offtaker/ledger
   ================================================================
   Compliance repository for the Offtaker's accounting team.
   Horizontal tabbed interface: Clearing Certificates, Wire Receipts,
   Insurance Policies. Each tab presents settled documents with
   "Download Cryptographic PDF" actions.

   Zero-Scroll Layout: h-full flex flex-col overflow-hidden
   Aesthetic:           bg-slate-950, 1px border-slate-800, font-mono
   ================================================================ */

import { useState, useCallback } from "react";
import {
  ShieldCheck,
  FileText,
  Download,
  Landmark,
  Shield,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";

/* ── Tab Types ── */

type AuditTab = "certificates" | "wire_receipts" | "insurance";

const TABS: { value: AuditTab; label: string }[] = [
  { value: "certificates",  label: "Clearing Certificates" },
  { value: "wire_receipts",  label: "Wire Receipts" },
  { value: "insurance",      label: "Insurance Policies" },
];

/* ── Document Types ── */

interface AuditDocument {
  id: string;
  tradeRef: string;
  date: string;
  type: string;
  status: "verified" | "pending" | "archived";
  hash: string;
  size: string;
}

/* ── Mock Data ── */

const CLEARING_CERTIFICATES: AuditDocument[] = [
  {
    id: "CC-2026-00412",
    tradeRef: "ORD-8801-XAU",
    date: "2026-03-15",
    type: "DVP Clearing Certificate",
    status: "verified",
    hash: "0x7a3f…e91b",
    size: "342 KB",
  },
  {
    id: "CC-2026-00398",
    tradeRef: "ORD-8790-XAU",
    date: "2026-03-12",
    type: "DVP Clearing Certificate",
    status: "verified",
    hash: "0x4c8d…a23f",
    size: "318 KB",
  },
  {
    id: "CC-2026-00371",
    tradeRef: "ORD-8775-XAU",
    date: "2026-03-10",
    type: "DVP Clearing Certificate",
    status: "verified",
    hash: "0x1e5b…d74c",
    size: "296 KB",
  },
  {
    id: "CC-2026-00355",
    tradeRef: "ORD-8760-XAU",
    date: "2026-03-08",
    type: "Token Mint Certificate",
    status: "verified",
    hash: "0x9f2a…b168",
    size: "284 KB",
  },
];

const WIRE_RECEIPTS: AuditDocument[] = [
  {
    id: "WR-2026-00890",
    tradeRef: "ORD-8801-XAU",
    date: "2026-03-15",
    type: "Fedwire Confirmation",
    status: "verified",
    hash: "0x3b7e…f294",
    size: "128 KB",
  },
  {
    id: "WR-2026-00882",
    tradeRef: "ORD-8790-XAU",
    date: "2026-03-12",
    type: "Fedwire Confirmation",
    status: "verified",
    hash: "0x6d1c…a853",
    size: "124 KB",
  },
  {
    id: "WR-2026-00871",
    tradeRef: "ORD-8775-XAU",
    date: "2026-03-10",
    type: "USDT On-Chain Receipt",
    status: "verified",
    hash: "0x8e4f…c917",
    size: "96 KB",
  },
];

const INSURANCE_POLICIES: AuditDocument[] = [
  {
    id: "INS-2026-00045",
    tradeRef: "ORD-8801-XAU",
    date: "2026-03-15",
    type: "Lloyd's Specie Policy",
    status: "verified",
    hash: "0x2a9d…e463",
    size: "512 KB",
  },
  {
    id: "INS-2026-00042",
    tradeRef: "ORD-8790-XAU",
    date: "2026-03-12",
    type: "Lloyd's Transit Insurance",
    status: "verified",
    hash: "0x5f8b…d721",
    size: "486 KB",
  },
  {
    id: "INS-2026-00038",
    tradeRef: "ORD-8775-XAU",
    date: "2026-03-10",
    type: "Lloyd's Specie Policy",
    status: "verified",
    hash: "0x7c3e…a195",
    size: "504 KB",
  },
  {
    id: "INS-2026-00035",
    tradeRef: "ORD-8760-XAU",
    date: "2026-03-08",
    type: "Lloyd's Custody Insurance",
    status: "verified",
    hash: "0x1d6a…f832",
    size: "478 KB",
  },
];

const TAB_DATA: Record<AuditTab, AuditDocument[]> = {
  certificates: CLEARING_CERTIFICATES,
  wire_receipts: WIRE_RECEIPTS,
  insurance: INSURANCE_POLICIES,
};

/* ── Status Badge ── */

function StatusBadge({ status }: { status: AuditDocument["status"] }) {
  const styles = {
    verified: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    pending:  "text-[#C6A86B] border-[#C6A86B]/30 bg-[#C6A86B]/5",
    archived: "text-slate-500 border-slate-700 bg-slate-800/50",
  };
  const icons = {
    verified: CheckCircle2,
    pending:  Clock,
    archived: FileText,
  };
  const Icon = icons[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 border font-mono text-[9px] uppercase tracking-wider font-bold ${styles[status]}`}>
      <Icon className="h-2.5 w-2.5" />
      {status}
    </span>
  );
}

/* ── Download Handler ── */

function handleDownload(docId: string) {
  // TODO: POST to /api/documents/download
  // Defined interface: { documentId: string } → { url: string, expiresAt: string }
  console.log(`[AUDIT-VAULT] Download requested: ${docId}`);
  alert(`Cryptographic PDF download initiated for ${docId}.\n\nTODO: Implement /api/documents/download endpoint.`);
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function AuditVaultPage() {
  const [activeTab, setActiveTab] = useState<AuditTab>("certificates");

  const documents = TAB_DATA[activeTab];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C6A86B]/10">
              <ShieldCheck className="h-4.5 w-4.5 text-[#C6A86B]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                Audit Vault
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                Compliance Repository · Cryptographic Document Archive
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono text-[10px] text-emerald-400 tracking-wider uppercase font-bold">
              Tamper-Proof Archive
            </span>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-900/30 px-6">
        <div className="flex items-center gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`px-5 py-3 font-mono text-[11px] uppercase tracking-wider font-bold transition-colors border-b-2 -mb-px ${
                activeTab === tab.value
                  ? "text-[#C6A86B] border-[#C6A86B]"
                  : "text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="font-mono text-[9px] text-slate-600 tracking-wider">
              {documents.length} DOCUMENT{documents.length !== 1 ? "S" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── Document Table ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Sticky Header */}
        <div className="shrink-0 grid grid-cols-12 gap-2 px-6 py-3 border-b border-slate-800 bg-black/40">
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">
            Document ID
          </span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">
            Trade Reference
          </span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">
            Date
          </span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">
            Type
          </span>
          <span className="col-span-1 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">
            Status
          </span>
          <span className="col-span-3 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold text-right">
            Actions
          </span>
        </div>

        {/* Scrollable Rows */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="grid grid-cols-12 gap-2 px-6 py-3.5 border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors items-center"
            >
              {/* Document ID */}
              <span className="col-span-2 font-mono text-xs text-white font-bold">
                {doc.id}
              </span>

              {/* Trade Reference */}
              <span className="col-span-2 font-mono text-xs text-slate-400">
                {doc.tradeRef}
              </span>

              {/* Date */}
              <span className="col-span-2 font-mono text-xs text-slate-400 tabular-nums">
                {doc.date}
              </span>

              {/* Type */}
              <span className="col-span-2 font-mono text-[10px] text-slate-300 truncate">
                {doc.type}
              </span>

              {/* Status */}
              <span className="col-span-1">
                <StatusBadge status={doc.status} />
              </span>

              {/* Actions */}
              <span className="col-span-3 flex items-center justify-end gap-3">
                <span className="font-mono text-[8px] text-slate-600 tabular-nums">
                  {doc.hash} · {doc.size}
                </span>
                <button
                  type="button"
                  onClick={() => handleDownload(doc.id)}
                  className="inline-flex items-center gap-1.5 rounded border border-[#C6A86B]/30 bg-[#C6A86B]/5 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#C6A86B] hover:bg-[#C6A86B]/15 active:bg-[#C6A86B]/20 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Cryptographic PDF
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-slate-800 bg-black/60 px-6 py-2">
        <p className="font-mono text-[9px] text-slate-700 text-center tracking-wider">
          AurumShield Audit Vault · SHA-256 Integrity Verified · Append-Only Immutable Archive
        </p>
      </div>

      {/* ── Telemetry Footer ── */}
      <TelemetryFooter />
    </div>
  );
}
