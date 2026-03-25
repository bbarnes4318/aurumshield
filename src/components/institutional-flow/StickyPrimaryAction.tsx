"use client";

/* ================================================================
   STICKY PRIMARY ACTION — Consistent CTA for guided steps
   ================================================================
   Every guided step has one obvious action. This component renders
   that action as a prominent gold button with optional secondary
   "I'll do this later" escape hatch.

   Supports both link (href) and button (onClick) modes.
   ================================================================ */

import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { type LucideIcon } from "lucide-react";

interface StickyPrimaryActionProps {
  /** Button label text */
  label: string;
  /** Navigate to a route — renders as Link */
  href?: string;
  /** Click handler — renders as button */
  onClick?: () => void;
  /** Whether the action is in progress */
  loading?: boolean;
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Optional icon before the label */
  icon?: LucideIcon;
  /** Optional secondary action text (e.g. "I'll do this later") */
  secondaryLabel?: string;
  /** Secondary action route */
  secondaryHref?: string;
  /** Secondary action click handler */
  secondaryOnClick?: () => void;
}

const PRIMARY_CLASSES = `
  group inline-flex items-center justify-center gap-2.5 rounded-lg px-8 py-3.5
  bg-[#C6A86B] text-slate-950 text-sm font-semibold
  hover:bg-[#d4b87a] active:bg-[#b89a5d]
  transition-colors duration-150
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A86B]/50
  shadow-[0_0_20px_rgba(198,168,107,0.15)]
  disabled:opacity-40 disabled:pointer-events-none
  w-full sm:w-auto
`;

export function StickyPrimaryAction({
  label,
  href,
  onClick,
  loading = false,
  disabled = false,
  icon: Icon,
  secondaryLabel,
  secondaryHref,
  secondaryOnClick,
}: StickyPrimaryActionProps) {
  const isDisabled = disabled || loading;

  const content = (
    <>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      {label}
      {!loading && (
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      )}
    </>
  );

  return (
    <div className="flex flex-col items-center gap-3 mt-8">
      {href && !isDisabled ? (
        <Link href={href} className={PRIMARY_CLASSES}>
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={isDisabled}
          className={PRIMARY_CLASSES}
        >
          {content}
        </button>
      )}

      {/* Secondary escape hatch */}
      {secondaryLabel && (
        secondaryHref ? (
          <Link
            href={secondaryHref}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            {secondaryLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={secondaryOnClick}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            {secondaryLabel}
          </button>
        )
      )}
    </div>
  );
}
