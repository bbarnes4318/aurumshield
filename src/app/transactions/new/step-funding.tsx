"use client";

import type { UseFormReturn } from "react-hook-form";
import type { WizardFormData } from "./wizard-schema";
import { cn } from "@/lib/utils";
import { Landmark, Coins, CheckCircle2 } from "lucide-react";

/* ================================================================
   STEP 3 — Funding Route
   ================================================================
   Select BaaS Fedwire or Enterprise MPC Stablecoin Bridge.
   ================================================================ */

interface Props {
  form: UseFormReturn<WizardFormData>;
  disabled?: boolean;
}

interface RouteDetail {
  label: string;
  value: string;
  mono?: boolean;
}

interface FundingRouteOption {
  id: "fedwire" | "stablecoin";
  icon: typeof Landmark;
  title: string;
  subtitle: string;
  details: RouteDetail[];
  badgeText: string;
  badgeColor: string;
}

const ROUTES: FundingRouteOption[] = [
  {
    id: "fedwire",
    icon: Landmark,
    title: "BaaS Fedwire",
    subtitle: "Domestic USD Wire via Fedwire FBO",
    details: [
      { label: "Routing", value: "021000021", mono: true },
      { label: "Network", value: "Federal Reserve Wire Network" },
      { label: "Settlement", value: "Same-Day (T+0)" },
      { label: "Limit", value: "No cap — institutional grade" },
    ],
    badgeText: "USD",
    badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  {
    id: "stablecoin",
    icon: Coins,
    title: "Enterprise MPC Stablecoin",
    subtitle: "USDC / USDT via Multi-Party Computation Bridge",
    details: [
      { label: "Bridge", value: "0x7a25...f3e9", mono: true },
      { label: "Protocol", value: "MPC Threshold Signing (3-of-5)" },
      { label: "Settlement", value: "< 15 minutes" },
      { label: "Supported", value: "USDC · USDT · DAI" },
    ],
    badgeText: "DIGITAL",
    badgeColor: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  },
];

export function StepFunding({ form, disabled }: Props) {
  const { setValue, watch, formState: { errors } } = form;
  const selected = watch("fundingRoute");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 border border-gold/20">
          <Landmark className="h-4 w-4 text-gold" />
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold text-text">
            Step 3 — Funding Route
          </h2>
          <p className="text-xs text-text-faint">
            Select the settlement rail for fund disbursement.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ROUTES.map((route) => {
          const Icon = route.icon;
          const isSelected = selected === route.id;

          return (
            <button
              key={route.id}
              type="button"
              disabled={disabled}
              onClick={() => setValue("fundingRoute", route.id, { shouldValidate: true })}
              className={cn(
                "group relative flex flex-col rounded-lg border-2 p-6 text-left transition-all duration-150",
                isSelected
                  ? "border-gold bg-gold/[0.04] shadow-[0_0_20px_rgba(198,168,107,0.08)]"
                  : "border-border bg-surface-1 hover:border-text-faint hover:bg-surface-2/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Selected check */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="h-5 w-5 text-gold" />
                </div>
              )}

              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    isSelected
                      ? "bg-gold/15 border border-gold/30"
                      : "bg-surface-3 border border-border"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isSelected ? "text-gold" : "text-text-faint"
                    )}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text">{route.title}</h3>
                  <p className="text-xs text-text-faint">{route.subtitle}</p>
                </div>
              </div>

              {/* Badge */}
              <div className="mb-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                    route.badgeColor
                  )}
                >
                  {route.badgeText}
                </span>
              </div>

              {/* Details */}
              <dl className="space-y-1.5">
                {route.details.map((d) => (
                  <div key={d.label} className="flex items-baseline justify-between text-xs">
                    <dt className="text-text-faint">{d.label}</dt>
                    <dd
                      className={cn(
                        "text-text-muted",
                        d.mono && "font-mono tracking-wider"
                      )}
                    >
                      {d.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </button>
          );
        })}
      </div>

      {errors.fundingRoute && (
        <p className="text-xs text-danger">{errors.fundingRoute.message}</p>
      )}
    </div>
  );
}
