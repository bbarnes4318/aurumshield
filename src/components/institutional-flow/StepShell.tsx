"use client";

/* ================================================================
   STEP SHELL — Per-step content wrapper
   ================================================================
   Every guided screen uses this for consistent visual framing.
   Provides: icon container, headline, description, body slot,
   and optional footer slot (for trust signals).

   Does NOT handle layout, progress, or navigation — those belong
   to MissionLayout and StickyPrimaryAction respectively.
   ================================================================ */

import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

interface StepShellProps {
  /** Lucide icon component OR a ReactNode (e.g. logo image) */
  icon: LucideIcon | ReactNode;
  /** Primary headline — one line, direct */
  headline: string;
  /** Supporting description — one or two lines max */
  description: string;
  /** Optional sub-label badge (e.g. "PHASE 02 OF 04") */
  badge?: string;
  /** Main body content */
  children: ReactNode;
  /** Optional footer slot — trust signals, legal microcopy, etc. */
  footer?: ReactNode;
}

export function StepShell({
  icon,
  headline,
  description,
  badge,
  children,
  footer,
}: StepShellProps) {
  /* Lucide icons are forwardRef objects ({$$typeof, render}), not plain functions.
     Detect both plain function components and forwardRef components. */
  const isLucide = typeof icon === "function" || (typeof icon === "object" && icon !== null && "render" in (icon as unknown as Record<string, unknown>));

  return (
    <div className="flex flex-col items-center text-center w-full max-w-2xl mx-auto space-y-6">
      {/* ── Icon Container — Sovereign Shield ── */}
      <div className="relative">
        {/* Gold radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[120px] w-[120px] bg-[#C6A86B]/6 rounded-full blur-[60px] pointer-events-none" />

        {isLucide ? (
          <div className="relative flex h-16 w-16 items-center justify-center border-2 border-[#C6A86B]/30 bg-linear-to-b from-[#C6A86B]/15 to-transparent shadow-[0_0_50px_rgba(198,168,107,0.12)]">
            {(() => { const Icon = icon as LucideIcon; return <Icon className="h-8 w-8 text-[#C6A86B]" strokeWidth={1.2} />; })()}
          </div>
        ) : (
          <div>{icon}</div>
        )}
      </div>

      {/* ── Badge ── */}
      {badge && (
        <div className="inline-flex items-center gap-2">
          <div className="h-px w-6 bg-linear-to-r from-transparent to-[#C6A86B]/40" />
          <span className="font-mono text-[9px] text-[#C6A86B]/70 tracking-[0.25em] uppercase font-bold">
            {badge}
          </span>
          <div className="h-px w-6 bg-linear-to-l from-transparent to-[#C6A86B]/40" />
        </div>
      )}

      {/* ── Headline — High-Trust Financial ── */}
      <h1 className="text-3xl font-heading font-bold text-white tracking-tight">
        {headline}
      </h1>

      {/* ── Description ── */}
      <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
        {description}
      </p>

      {/* ── Body ── */}
      <div className="w-full border border-slate-800/50 bg-linear-to-b from-slate-900/60 to-slate-950/60 p-8 backdrop-blur-sm shadow-[0_4px_40px_rgba(0,0,0,0.3)]">
        {children}
      </div>

      {/* ── Footer ── */}
      {footer && (
        <div className="w-full opacity-50 hover:opacity-80 transition-opacity duration-300">
          {footer}
        </div>
      )}
    </div>
  );
}
