"use client";

import { Phone } from "lucide-react";

interface ContactSupportInlineProps {
  /** Optional className for outer wrapper. */
  className?: string;
  /** Show in compact mode (icon + number only). */
  compact?: boolean;
}

/**
 * Reusable 24/7 support contact component.
 * Displays clickable phone number with `tel:` link.
 * Placed in: activation panel header, payment modal, manual approval,
 * receipt view, demo console footer.
 */
export function ContactSupportInline({
  className = "",
  compact = false,
}: ContactSupportInlineProps) {
  if (compact) {
    return (
      <a
        href="tel:+15717811974"
        data-tour="support-phone"
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors ${className}`}
      >
        <Phone className="h-3 w-3" />
        <span className="font-mono">(571) 781-1974</span>
      </a>
    );
  }

  return (
    <div
      data-tour="support-phone"
      className={`inline-flex items-center gap-2 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs ${className}`}
    >
      <Phone className="h-3.5 w-3.5 text-[var(--gold)]" />
      <span className="text-[var(--text-secondary)]">24/7 Support:</span>
      <a
        href="tel:+15717811974"
        className="font-mono font-semibold text-[var(--text-primary)] hover:text-[var(--gold)] transition-colors"
      >
        (571) 781-1974
      </a>
    </div>
  );
}
