"use client";

/* ================================================================
   TRUST BADGE — Institutional Trust Signal Pill
   ================================================================
   Stark, dark-slate badge with gold or neutral accent.
   All cheap CSS variables eradicated — hardcoded premium values.
   ================================================================ */

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */

export type TrustBadgeVariant = "gold" | "neutral";

export interface TrustBadgeProps {
  label: string;
  icon: LucideIcon;
  variant?: TrustBadgeVariant;
}

/* ── Variant Styles — Hardcoded institutional values ── */

const VARIANT_STYLES: Record<TrustBadgeVariant, string> = {
  gold: "border-[#c6a86b]/30 bg-[#c6a86b]/5 text-[#c6a86b]",
  neutral: "border-slate-700 bg-slate-800/50 text-slate-400",
};

/* ================================================================ */

export function TrustBadge({ label, icon: Icon, variant = "gold" }: TrustBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5",
        "text-[9px] font-bold uppercase tracking-widest leading-none",
        "select-none whitespace-nowrap",
        VARIANT_STYLES[variant],
      )}
      title={label}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
