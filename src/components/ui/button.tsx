"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/* ================================================================
   VARIANT / SIZE MAPS
   ================================================================ */

const variantStyles = {
  /** Primary gold CTA */
  primary:
    "bg-gold text-bg hover:bg-gold-hover active:bg-gold-pressed focus-visible:ring-gold/50",
  /** Subtle surface button */
  secondary:
    "border border-border bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text",
  /** Destructive / danger */
  danger:
    "bg-danger/10 text-danger hover:bg-danger/20 active:bg-danger/30 focus-visible:ring-danger/50",
  /** Borderless / ghost */
  ghost:
    "text-text-muted hover:bg-surface-2 hover:text-text",
  /** Transparent link-style */
  link: "text-gold underline-offset-4 hover:underline",
} as const;

const sizeStyles = {
  sm: "h-8 gap-1.5 rounded-[var(--radius-input)] px-3 text-xs",
  md: "h-9 gap-2 rounded-[var(--radius-input)] px-4 text-sm",
  lg: "h-10 gap-2 rounded-[var(--radius-input)] px-5 text-sm",
  icon: "h-9 w-9 rounded-[var(--radius-input)]",
} as const;

/* ================================================================
   PROPS
   ================================================================ */

export type ButtonVariant = keyof typeof variantStyles;
export type ButtonSize = keyof typeof sizeStyles;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** When true the button is disabled and shows a spinner in place of its children. */
  isLoading?: boolean;
  /** Accessible label shown on the spinner while loading (screen-readers). */
  loadingText?: string;
}

/* ================================================================
   COMPONENT
   ================================================================ */

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText = "Processing…",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
            <span className="sr-only">{loadingText}</span>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
