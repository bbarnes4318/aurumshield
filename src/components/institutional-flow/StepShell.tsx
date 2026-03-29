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
  /** Main body content */
  children: ReactNode;
  /** Optional footer slot — trust signals, legal microcopy, etc. */
  footer?: ReactNode;
}

export function StepShell({
  icon,
  headline,
  description,
  children,
  footer,
}: StepShellProps) {
  /* Lucide icons are forwardRef objects ({$$typeof, render}), not plain functions.
     Detect both plain function components and forwardRef components. */
  const isLucide = typeof icon === "function" || (typeof icon === "object" && icon !== null && "render" in (icon as unknown as Record<string, unknown>));

  return (
    <div className="flex flex-col items-center text-center w-full max-w-2xl mx-auto">
      {/* ── Icon Container — Sovereign Shield ── */}
      {isLucide ? (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C6A86B]/30 bg-slate-900/40 mb-6 shadow-[0_0_40px_rgba(198,168,107,0.12)] relative group">
          <div className="absolute inset-0 rounded-2xl bg-linear-to-b from-[#C6A86B]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {(() => { const Icon = icon as LucideIcon; return <Icon className="h-8 w-8 text-[#C6A86B]" strokeWidth={1} />; })()}
        </div>
      ) : (
        <div className="mb-6">{icon}</div>
      )}
 
      {/* ── Headline — High-Trust Financial ── */}
      <h1 className="text-3xl font-heading font-semibold text-white tracking-tight mb-3">
        {headline}
      </h1>
 
      {/* ── Description ── */}
      <p className="text-base text-slate-400 leading-relaxed max-w-lg mb-8">
        {description}
      </p>
 
      {/* ── Body ── */}
      <div className="w-full bg-slate-900/40 rounded-2xl border border-slate-800/40 p-8 backdrop-blur-sm shadow-xl">
        {children}
      </div>
 
      {/* ── Footer ── */}
      {footer && (
        <div className="mt-6 w-full opacity-60 hover:opacity-100 transition-opacity">
          {footer}
        </div>
      )}
    </div>
  );
}

