"use client";

/* ================================================================
   TRUST BADGE — Reusable Trust Signal Pill
   ================================================================
   Small inline badge showing a verification/trust signal.
   Used on AssetCard to communicate assay status, LBMA conformance,
   insurance coverage, and seller verification.
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

/* ── Variant Styles ── */

const VARIANT_STYLES: Record<TrustBadgeVariant, string> = {
  gold: "border-color-2/30 bg-color-2/5 text-color-2",
  neutral: "border-color-5/20 bg-color-5/5 text-color-3/60",
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
