"use client";

/* ================================================================
   PRODUCER COMPLIANCE — /producer/compliance
   ================================================================
   Compliance and accreditation status for producer entities.
   Shows refinery certifications, LBMA accreditation, and
   environmental compliance status.
   ================================================================ */

import { Shield, CheckCircle2, Clock, FileText, Award } from "lucide-react";

/* ── Mock compliance data ── */
const CERTIFICATIONS = [
  { id: "lbma", label: "LBMA Good Delivery Accreditation", status: "active" as const, expiresAt: "2027-12-31", issuedBy: "London Bullion Market Association" },
  { id: "rjc", label: "Responsible Jewellery Council (RJC)", status: "active" as const, expiresAt: "2027-06-30", issuedBy: "RJC Certification" },
  { id: "conflict-free", label: "Conflict-Free Gold Standard", status: "active" as const, expiresAt: "2026-12-31", issuedBy: "World Gold Council" },
  { id: "iso-14001", label: "ISO 14001 Environmental Management", status: "pending" as const, expiresAt: null, issuedBy: "ISO Certification Body" },
  { id: "chain-of-custody", label: "Chain of Custody Certification", status: "active" as const, expiresAt: "2027-09-30", issuedBy: "LBMA / RMI" },
] as const;

const STATUS_STYLES = {
  active: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "ACTIVE" },
  pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "PENDING" },
  expired: { icon: Shield, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "EXPIRED" },
} as const;

export default function ProducerCompliancePage() {
  const activeCerts = CERTIFICATIONS.filter((c) => c.status === "active").length;

  return (
    <div className="absolute inset-0 flex flex-col p-4 overflow-hidden gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Award className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">
              Compliance & Accreditation
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
              LBMA · RJC · Conflict-Free Gold · ISO 14001
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider font-bold">
            {activeCerts} / {CERTIFICATIONS.length} Active
          </span>
        </div>
      </div>

      {/* Certifications */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {CERTIFICATIONS.map((cert) => {
          const style = STATUS_STYLES[cert.status];
          const Icon = style.icon;

          return (
            <div
              key={cert.id}
              className={`flex items-center justify-between px-5 py-4 rounded border ${style.border} ${style.bg}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${style.color}`} />
                <div>
                  <p className="text-sm font-medium text-white">{cert.label}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {cert.issuedBy}
                    {cert.expiresAt && ` · Expires ${new Date(cert.expiresAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                  </p>
                </div>
              </div>
              <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${style.color}`}>
                {style.label}
              </span>
            </div>
          );
        })}

        {/* Audit History */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="font-mono text-[9px] text-slate-500 uppercase tracking-[0.15em] font-bold mb-3">
            Audit History
          </h3>
          <div className="space-y-2">
            {[
              { event: "LBMA Good Delivery Renewal", date: "Dec 15, 2025", result: "Passed" },
              { event: "RJC On-Site Audit", date: "Nov 8, 2025", result: "Passed" },
              { event: "Chain of Custody Review", date: "Sep 22, 2025", result: "Passed" },
              { event: "Environmental Impact Assessment", date: "Aug 1, 2025", result: "In Progress" },
            ].map((audit) => (
              <div key={audit.event} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs text-slate-300">{audit.event}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-[10px] font-bold ${audit.result === "Passed" ? "text-emerald-400" : "text-yellow-400"}`}>
                    {audit.result}
                  </span>
                  <span className="font-mono text-[10px] text-slate-600">{audit.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
