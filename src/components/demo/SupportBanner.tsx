/* ================================================================
   SUPPORT BANNER — 24/7 Operations Support

   Compact banner with phone number as clickable tel: link.
   Used on activation pages, buyer home, and demo console footer.
   ================================================================ */

"use client";

import { Phone } from "lucide-react";

interface SupportBannerProps {
  compact?: boolean;
  className?: string;
}

export function SupportBanner({ compact = false, className = "" }: SupportBannerProps) {
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 text-xs text-text-muted ${className}`}
        data-tour="support-phone"
      >
        <Phone className="h-3 w-3 text-text-faint" />
        <span>24/7 Support:</span>
        <a
          href="tel:+15717811974"
          className="font-mono text-text hover:text-gold transition-colors"
        >
          (571) 781-1974
        </a>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-sm border border-border bg-surface-2 px-4 py-2.5 ${className}`}
      data-tour="support-phone"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface-3 border border-border">
        <Phone className="h-3.5 w-3.5 text-text-muted" />
      </div>
      <div>
        <p className="text-xs font-medium text-text">
          24/7 Operations Support
        </p>
        <a
          href="tel:+15717811974"
          className="font-mono text-sm text-text-muted hover:text-gold transition-colors"
        >
          (571) 781-1974
        </a>
      </div>
    </div>
  );
}
