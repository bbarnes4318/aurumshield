"use client";

import { useCallback, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/* ================================================================
   SlideOutPanel — Generic right-side offcanvas drawer
   ================================================================
   Used for Verification, Certificates, and Marketplace overlays 
   so the user NEVER leaves Mission Control.
   
   Body/root stay overflow:hidden. Only the panel body scrolls
   via localized overflow-y:auto.
   ================================================================ */

type PanelSize = "md" | "lg" | "xl" | "full";

const SIZE_MAP: Record<PanelSize, string> = {
  md: "max-w-md", // 448px
  lg: "max-w-2xl", // 640px
  xl: "max-w-4xl", // 800px
  full: "max-w-none", // full screen
};

interface SlideOutPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: PanelSize;
  children: React.ReactNode;
  /** ID for testing / tour targeting */
  id?: string;
}

export function SlideOutPanel({
  open,
  onClose,
  title,
  subtitle,
  size = "lg",
  children,
  id,
}: SlideOutPanelProps) {
  /* Escape key → close */
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className="fixed inset-0 z-40 bg-bg/70 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        id={id}
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full border-l border-border bg-surface-1 shadow-2xl",
          "flex flex-col animate-slide-in-right",
          SIZE_MAP[size],
        )}
        role="dialog"
        aria-label={title}
        aria-modal="true"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-text truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-text-faint mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Large, prominent close button */}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "ml-4 inline-flex items-center gap-2 shrink-0",
              "rounded-[var(--radius-input)] border border-border bg-surface-2",
              "px-3 py-1.5 text-xs font-medium text-text-muted",
              "transition-colors hover:bg-surface-3 hover:text-text hover:border-text-faint",
            )}
            aria-label="Close panel and return to Mission Control"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Return to Mission Control</span>
            <span className="sm:hidden">Close</span>
          </button>

          {/* X icon — compact supplementary close */}
          <button
            type="button"
            onClick={onClose}
            className="ml-2 rounded-[var(--radius-sm)] p-1.5 text-text-faint hover:text-text hover:bg-surface-2 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body — localized overflow-y:auto, never triggers global scrollbar ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </aside>
    </>
  );
}
