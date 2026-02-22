"use client";

/* ================================================================
   DELIVERY METHOD SELECTOR — Vault Custody vs Secure Delivery
   Radio-card pattern with institutional styling.
   ================================================================ */

import { cn } from "@/lib/utils";
import { Landmark, Truck, Shield, ChevronRight } from "lucide-react";
import type { DeliveryMethod } from "@/lib/delivery/delivery-types";

interface DeliveryMethodSelectorProps {
  value: DeliveryMethod;
  onChange: (method: DeliveryMethod) => void;
  disabled?: boolean;
}

interface MethodOption {
  id: DeliveryMethod;
  icon: typeof Landmark;
  title: string;
  subtitle: string;
  detail: string;
  badge?: string;
}

const OPTIONS: MethodOption[] = [
  {
    id: "vault_custody",
    icon: Landmark,
    title: "Vault Custody",
    subtitle: "Gold remains in secure vault",
    detail:
      "Your allocated gold stays at the certified vault facility. Transfer of title is recorded on the AurumShield ledger. No physical movement required.",
  },
  {
    id: "secure_delivery",
    icon: Truck,
    title: "Secure Destination Delivery",
    subtitle: "Brink's armored transport",
    detail:
      "Physical delivery via Brink's Global Services. Armored transport, GPS-tracked, fully insured. Signature required on receipt.",
    badge: "BGS",
  },
];

export function DeliveryMethodSelector({
  value,
  onChange,
  disabled = false,
}: DeliveryMethodSelectorProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-3.5 w-3.5 text-gold" />
        <span className="typo-label">Delivery Method</span>
      </div>

      <div className="grid gap-2.5">
        {OPTIONS.map((option) => {
          const selected = value === option.id;
          const Icon = option.icon;

          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.id)}
              className={cn(
                "group relative w-full rounded-[var(--radius)] border px-4 py-3.5 text-left transition-all duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
                selected
                  ? "border-gold/40 bg-gold/5 shadow-sm"
                  : "border-border bg-surface-2 hover:border-border hover:bg-surface-3",
                disabled && "opacity-50 cursor-not-allowed",
              )}
              data-tour={`delivery-method-${option.id}`}
            >
              {/* Radio indicator */}
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    selected
                      ? "border-gold bg-gold"
                      : "border-text-faint group-hover:border-text-muted",
                  )}
                >
                  {selected && (
                    <div className="h-1.5 w-1.5 rounded-full bg-bg" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selected ? "text-gold" : "text-text-faint",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        selected ? "text-text" : "text-text-muted",
                      )}
                    >
                      {option.title}
                    </span>
                    {option.badge && (
                      <span
                        className={cn(
                          "rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          selected
                            ? "bg-gold/15 text-gold"
                            : "bg-surface-3 text-text-faint",
                        )}
                      >
                        {option.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
                      selected ? "text-text-muted" : "text-text-faint",
                    )}
                  >
                    {option.subtitle}
                  </p>

                  {/* Expanded detail when selected */}
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      selected ? "mt-2 max-h-24 opacity-100" : "max-h-0 opacity-0",
                    )}
                  >
                    <p className="text-[11px] text-text-faint leading-relaxed">
                      {option.detail}
                    </p>
                  </div>
                </div>

                <ChevronRight
                  className={cn(
                    "mt-1.5 h-3.5 w-3.5 shrink-0 transition-transform",
                    selected
                      ? "text-gold rotate-90"
                      : "text-text-faint group-hover:text-text-muted",
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
