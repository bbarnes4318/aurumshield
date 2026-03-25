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
  /** Lucide icon component displayed in the header container */
  icon: LucideIcon;
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
  icon: Icon,
  headline,
  description,
  children,
  footer,
}: StepShellProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* ── Icon Container ── */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50 mb-8">
        <Icon className="h-8 w-8 text-[#C6A86B]" />
      </div>

      {/* ── Headline ── */}
      <h1 className="text-2xl font-semibold text-white tracking-tight mb-3">
        {headline}
      </h1>

      {/* ── Description ── */}
      <p className="text-sm text-slate-400 leading-relaxed max-w-md mb-10">
        {description}
      </p>

      {/* ── Body ── */}
      <div className="w-full">{children}</div>

      {/* ── Footer ── */}
      {footer && <div className="mt-6 w-full">{footer}</div>}
    </div>
  );
}
