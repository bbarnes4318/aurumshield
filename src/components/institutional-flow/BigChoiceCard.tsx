"use client";

/* ================================================================
   BIG CHOICE CARD — Full-width selection card
   ================================================================
   For binary or few-option decisions in the guided journey:
     - Delivery method (Vault vs Physical)
     - Funding method (Stablecoin vs Wire)
     - Asset category selection

   Selected = gold border + subtle tint.
   Unselected = neutral slate.
   ================================================================ */

import { type LucideIcon } from "lucide-react";

interface BigChoiceCardProps {
  /** Lucide icon for the choice */
  icon: LucideIcon;
  /** Choice title */
  title: string;
  /** One or two line description */
  description: string;
  /** Whether this choice is currently selected */
  selected: boolean;
  /** Optional badge text (e.g. "Recommended", "Instant") */
  badge?: string;
  /** Optional badge variant for color */
  badgeVariant?: "gold" | "success" | "warning";
  /** Selection handler */
  onClick: () => void;
}

function getBadgeClasses(variant: "gold" | "success" | "warning"): string {
  switch (variant) {
    case "success":
      return "text-[#3fae7a] bg-[#3fae7a]/10 border-[#3fae7a]/20";
    case "warning":
      return "text-[#C6A86B] bg-[#C6A86B]/10 border-[#C6A86B]/20";
    case "gold":
    default:
      return "text-[#C6A86B] bg-[#C6A86B]/10 border-[#C6A86B]/20";
  }
}

export function BigChoiceCard({
  icon: Icon,
  title,
  description,
  selected,
  badge,
  badgeVariant = "gold",
  onClick,
}: BigChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative w-full text-left rounded-xl border p-5 transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A86B]/50
        ${
          selected
            ? "border-[#C6A86B]/50 bg-[#C6A86B]/4 shadow-[0_0_20px_rgba(198,168,107,0.08)]"
            : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50"
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`
            flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200
            ${
              selected
                ? "bg-[#C6A86B]/10 border border-[#C6A86B]/20"
                : "bg-slate-800/50 border border-slate-800"
            }
          `}
        >
          <Icon
            className={`h-5 w-5 transition-colors duration-200 ${
              selected ? "text-[#C6A86B]" : "text-slate-500"
            }`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`text-sm font-semibold transition-colors duration-200 ${
                selected ? "text-white" : "text-slate-300"
              }`}
            >
              {title}
            </p>
            {badge && (
              <span
                className={`
                  inline-flex items-center rounded-full border px-2 py-0.5
                  text-[9px] font-bold uppercase tracking-wider
                  ${getBadgeClasses(badgeVariant)}
                `}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            {description}
          </p>
        </div>

        {/* Selection indicator */}
        <div
          className={`
            flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200
            ${
              selected
                ? "border-[#C6A86B] bg-[#C6A86B]"
                : "border-slate-700 bg-transparent"
            }
          `}
        >
          {selected && (
            <div className="h-2 w-2 rounded-full bg-slate-950" />
          )}
        </div>
      </div>
    </button>
  );
}
