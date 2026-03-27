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
  /* Determine if icon is a Lucide component (function) or a ReactNode (JSX element) */
  const isLucide = typeof icon === "function";

  return (
    <div className="flex flex-col items-center text-center">
      {/* ── Icon Container ── */}
      {isLucide ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50 mb-5 overflow-hidden">
          {(() => { const Icon = icon as LucideIcon; return <Icon className="h-7 w-7 text-[#C6A86B]" />; })()}
        </div>
      ) : (
        <div className="mb-5">{icon}</div>
      )}

      {/* ── Headline ── */}
      <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
        {headline}
      </h1>

      {/* ── Description ── */}
      <p className="text-sm text-slate-400 leading-relaxed max-w-md mb-6">
        {description}
      </p>

      {/* ── Body ── */}
      <div className="w-full">{children}</div>

      {/* ── Footer ── */}
      {footer && <div className="mt-4 w-full">{footer}</div>}
    </div>
  );
}

