/* ================================================================
   DOCUMENT PACKAGE PANEL — Institutional corporate document review
   
   Shows 8 corporate KYB documents with:
   - filename + file size
   - upload status with timestamp
   - authenticity verification status
   - registry match status
   - reviewer annotations

   All data is explictly labeled as demonstration material.
   ================================================================ */

"use client";

import { CheckCircle2, AlertCircle, FileText, Upload, Clock } from "lucide-react";
import { DEMO_DOCUMENT_PACKAGE, DEMO_ENTITY } from "@/demo/data/demoConstants";

interface Props {
  isVisible: boolean;
}

export function DocumentPackagePanel({ isVisible }: Props) {
  if (!isVisible) return null;

  const totalDocs = DEMO_DOCUMENT_PACKAGE.length;
  const uploaded = DEMO_DOCUMENT_PACKAGE.filter((d) => d.uploaded).length;
  const authenticated = DEMO_DOCUMENT_PACKAGE.filter((d) => d.authenticityChecked).length;
  const registryMatched = DEMO_DOCUMENT_PACKAGE.filter((d) => d.registryMatched).length;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#C6A86B]" />
          <h4 className="text-xs font-semibold text-slate-300 tracking-wide">
            Corporate Document Package
          </h4>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-slate-600 font-mono">
            {DEMO_ENTITY.companyName} · {DEMO_ENTITY.stateOfIncorporation} · {DEMO_ENTITY.entityType}
          </span>
        </div>
      </div>

      {/* ── Summary bar ── */}
      <div className="grid grid-cols-3 gap-2">
        <SummaryCell label="Uploaded" value={`${uploaded}/${totalDocs}`} ok={uploaded === totalDocs} />
        <SummaryCell label="Authenticated" value={`${authenticated}/${totalDocs}`} ok={authenticated === totalDocs} />
        <SummaryCell label="Registry Matched" value={`${registryMatched}/${totalDocs}`} ok={false} note={registryMatched < totalDocs ? "Enhanced review applied" : undefined} />
      </div>

      {/* ── Document table ── */}
      <div className="overflow-hidden rounded-lg border border-slate-800/60">
        {/* Header row */}
        <div className="grid grid-cols-[1.4fr_1.1fr_52px_52px_52px_1.2fr] gap-0 bg-slate-900/70 px-3 py-2">
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">Document</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">Filename</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 text-center">Upload</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 text-center">Auth</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 text-center">Reg.</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">Reviewer Note</span>
        </div>

        {/* Document rows */}
        {DEMO_DOCUMENT_PACKAGE.map((doc, i) => (
          <div
            key={doc.id}
            className={`
              grid grid-cols-[1.4fr_1.1fr_52px_52px_52px_1.2fr] gap-0 items-center px-3 py-2.5
              border-t border-slate-800/30 transition-colors duration-150
              hover:bg-slate-900/30
              ${i % 2 === 0 ? "bg-slate-950/20" : "bg-transparent"}
            `}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Document label */}
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-slate-600 shrink-0" />
              <span className="text-[10px] text-slate-300 font-medium leading-tight">{doc.label}</span>
            </div>

            {/* Filename + size */}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-mono truncate" title={doc.filename}>
                {doc.filename}
              </span>
              <span className="text-[7px] text-slate-600 font-mono">{doc.fileSize}</span>
            </div>

            {/* Upload status */}
            <StatusPill ok={doc.uploaded} />

            {/* Authenticity status */}
            <StatusPill ok={doc.authenticityChecked} />

            {/* Registry match */}
            <StatusPill ok={doc.registryMatched} warn={!doc.registryMatched && doc.authenticityChecked} />

            {/* Reviewer notes */}
            <span className="text-[9px] text-slate-500 leading-snug">{doc.reviewerNotes}</span>
          </div>
        ))}
      </div>

      {/* ── Upload timeline ── */}
      <div className="flex items-center gap-2 px-1">
        <Upload className="h-3 w-3 text-slate-600 shrink-0" />
        <span className="text-[9px] text-slate-600">
          Package uploaded 2026-03-27 09:14–09:21 UTC · {totalDocs} files · All documents current within 90 days
        </span>
      </div>

      {/* ── Demo footer ── */}
      <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-800/20">
        <Clock className="h-2.5 w-2.5 text-[#C6A86B]/40" />
        <span className="text-[8px] text-[#C6A86B]/50 tracking-wider">
          DEMONSTRATION DOCUMENT PACKAGE — NOT A LIVE ENTITY FILING
        </span>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatusPill({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (warn) {
    return (
      <div className="flex justify-center">
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="h-2.5 w-2.5 text-amber-400/80" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      {ok ? (
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400/80" />
        </div>
      ) : (
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800/50 border border-slate-700/30">
          <AlertCircle className="h-2.5 w-2.5 text-slate-600" />
        </div>
      )}
    </div>
  );
}

function SummaryCell({ label, value, ok, note }: { label: string; value: string; ok: boolean; note?: string }) {
  return (
    <div className={`
      rounded-lg border px-3 py-2 text-center
      ${ok
        ? "border-emerald-500/15 bg-emerald-500/5"
        : "border-slate-800/60 bg-slate-900/30"
      }
    `}>
      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`text-sm font-mono font-bold tabular-nums mt-0.5 ${ok ? "text-emerald-400" : "text-slate-400"}`}>
        {value}
      </p>
      {note && <p className="text-[7px] text-amber-400/60 mt-0.5">{note}</p>}
    </div>
  );
}
