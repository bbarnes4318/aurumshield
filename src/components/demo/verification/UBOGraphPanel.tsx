/* ================================================================
   UBO GRAPH PANEL — Beneficial ownership structure visualization
   
   Shows:
   - Parent entity node with jurisdiction and LEI
   - Ownership branches with percentage splits
   - Individual UBO nodes with role, nationality, ID type
   - Authorized representative designation
   - PEP / Sanctions / Adverse Media screening pills per owner
   - Jurisdiction tags

   All data is demonstration material — labeled as such.
   ================================================================ */

"use client";

import { Users, ShieldCheck, AlertTriangle, Building2, User, Landmark, FileCheck } from "lucide-react";
import { DEMO_UBO_STRUCTURE, DEMO_ENTITY, DEMO_REPRESENTATIVE } from "@/demo/data/demoConstants";

interface Props {
  isVisible: boolean;
}

export function UBOGraphPanel({ isVisible }: Props) {
  if (!isVisible) return null;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#C6A86B]" />
          <h4 className="text-xs font-semibold text-slate-300 tracking-wide">
            Beneficial Ownership Structure
          </h4>
        </div>
        <span className="text-[9px] text-slate-600 font-mono">
          LEI: {DEMO_ENTITY.lei}
        </span>
      </div>

      {/* ── Parent entity node ── */}
      <div className="flex items-center justify-center">
        <div className="relative rounded-xl border border-[#C6A86B]/25 bg-linear-to-b from-[#C6A86B]/8 to-transparent px-6 py-3 text-center shadow-[0_0_20px_rgba(198,168,107,0.04)]">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Building2 className="h-3.5 w-3.5 text-[#C6A86B]/70" />
            <p className="text-[11px] font-semibold text-[#C6A86B]">
              {DEMO_UBO_STRUCTURE.parentEntity}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 text-[8px] text-slate-500 font-mono">
            <span>{DEMO_ENTITY.entityType}</span>
            <span className="text-slate-700">·</span>
            <span>{DEMO_ENTITY.stateOfIncorporation}</span>
            <span className="text-slate-700">·</span>
            <span>Inc. {DEMO_ENTITY.incorporationDate}</span>
          </div>
        </div>
      </div>

      {/* ── Ownership connector lines ── */}
      <div className="flex items-end justify-center gap-0">
        <div className="flex-1 flex justify-end">
          <div className="flex flex-col items-center">
            <div className="w-px h-3 bg-slate-700" />
            <div className="w-[calc(50%+1px)] h-px bg-slate-700 self-end" />
          </div>
        </div>
        <div className="w-px h-3 bg-slate-700" />
        <div className="flex-1 flex justify-start">
          <div className="flex flex-col items-center">
            <div className="w-px h-3 bg-slate-700" />
            <div className="w-[calc(50%+1px)] h-px bg-slate-700 self-start" />
          </div>
        </div>
      </div>

      {/* ── Beneficial owners grid ── */}
      <div className="grid grid-cols-3 gap-3">
        {DEMO_UBO_STRUCTURE.beneficialOwners.map((owner, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3.5 space-y-2.5 transition-all duration-200 hover:border-slate-700/60"
          >
            {/* Name + ownership */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {owner.role === "Passive Trust Vehicle" ? (
                  <Landmark className="h-3 w-3 text-slate-500 shrink-0" />
                ) : (
                  <User className="h-3 w-3 text-slate-500 shrink-0" />
                )}
                <p className="text-[10px] font-semibold text-slate-300 leading-tight">{owner.name}</p>
              </div>
              <span className="font-mono text-[11px] font-bold text-[#C6A86B] tabular-nums shrink-0">
                {owner.ownership}%
              </span>
            </div>

            {/* Role */}
            <p className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold">{owner.role}</p>

            {/* Details */}
            <div className="space-y-1 text-[9px]">
              <DetailLine label="Nationality" value={owner.nationality} />
              <DetailLine label="ID Document" value={owner.idDocumentType} />
              <DetailLine label="Jurisdiction" value={owner.jurisdiction} />
            </div>

            {/* ── Screening pills ── */}
            <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-800/30">
              <ScreeningPill label="PEP" clear={!owner.pep} />
              <ScreeningPill label="SANCTIONS" clear={!owner.sanctioned} />
              <ScreeningPill label="ADV. MEDIA" clear={!owner.adverseMedia} />
            </div>

            {/* ── Jurisdiction tag ── */}
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded border border-slate-700/40 bg-slate-900/80 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-500">
                <FileCheck className="h-2 w-2" />
                {owner.jurisdiction} JURISDICTION
              </span>
              {owner.screened && (
                <span className="inline-flex items-center gap-0.5 rounded border border-emerald-500/15 bg-emerald-500/5 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-emerald-400/70">
                  <ShieldCheck className="h-2 w-2" />
                  SCREENED
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Authorized Representative ── */}
      <div className="flex items-center justify-between rounded-lg border border-slate-800/40 bg-slate-900/20 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="h-3 w-3 text-emerald-400/80" />
          </div>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Authorized Representative
            </p>
            <p className="text-[10px] text-slate-300 font-medium">
              {DEMO_REPRESENTATIVE.name} — {DEMO_REPRESENTATIVE.title}
            </p>
          </div>
        </div>
        <span className="text-[8px] text-slate-600 font-mono">
          {DEMO_REPRESENTATIVE.email}
        </span>
      </div>

      {/* ── Demo footer ── */}
      <p className="text-[8px] text-[#C6A86B]/50 text-center tracking-wider uppercase">
        Demonstration ownership structure — not a live entity or filing
      </p>
    </div>
  );
}

/* ── Sub-components ── */

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[8px] text-slate-600 uppercase tracking-wider">{label}</span>
      <span className="text-slate-400 font-medium">{value}</span>
    </div>
  );
}

function ScreeningPill({ label, clear }: { label: string; clear: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider ${
        clear
          ? "bg-emerald-500/8 text-emerald-400/80 border border-emerald-500/15"
          : "bg-red-500/10 text-red-400/80 border border-red-500/20"
      }`}
    >
      {clear ? (
        <ShieldCheck className="h-2 w-2" />
      ) : (
        <AlertTriangle className="h-2 w-2" />
      )}
      {label}
    </span>
  );
}
