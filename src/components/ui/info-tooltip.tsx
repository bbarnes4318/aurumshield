"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  /** Multi-line calculation definition shown on hover/focus */
  content: string;
  /** Optional side — defaults to "top" */
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/**
 * Accessible ⓘ tooltip — keyboard-focusable, screen-reader friendly,
 * portal-rendered (works inside overflow containers).
 */
export function InfoTooltip({ content, side = "top", className }: InfoTooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full p-0.5 text-text-faint transition-colors",
              "hover:text-gold focus-visible:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
              className
            )}
            aria-label="More information"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={cn(
              "z-50 max-w-xs rounded-[var(--radius-sm)] border border-border bg-surface-1 px-3 py-2.5",
              "text-xs leading-relaxed text-text-muted shadow-md",
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2",
              "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2"
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-border" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
