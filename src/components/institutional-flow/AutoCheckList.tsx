"use client";

/* ================================================================
   AUTO CHECK LIST — Animated verification checklist
   ================================================================
   Renders a list of items with status indicators for verification
   and screening guided pages. Items transition through:
     pending → active → done (or error)

   Used by: verification, AML screening, KYB verification stages.
   ================================================================ */

import { CheckCircle2, Loader2, Clock, AlertTriangle } from "lucide-react";

/* ── Types ── */

export type CheckItemStatus = "pending" | "active" | "done" | "error";

export interface CheckItem {
  /** Unique key for the item */
  key: string;
  /** Display label */
  label: string;
  /** Optional sublabel / description */
  description?: string;
  /** Current status */
  status: CheckItemStatus;
}

interface AutoCheckListProps {
  /** List of check items to render */
  items: CheckItem[];
}

/* ── Status icon mapping ── */

function StatusIcon({ status }: { status: CheckItemStatus }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-[#3fae7a]" />;
    case "active":
      return <Loader2 className="h-4 w-4 text-[#C6A86B] animate-spin" />;
    case "error":
      return <AlertTriangle className="h-4 w-4 text-[#d16a5d]" />;
    case "pending":
    default:
      return <Clock className="h-4 w-4 text-slate-700" />;
  }
}

/* ── Status border / background colors ── */

function getStatusStyles(status: CheckItemStatus): string {
  switch (status) {
    case "done":
      return "border-[#3fae7a]/20 bg-[#3fae7a]/[0.03]";
    case "active":
      return "border-[#C6A86B]/25 bg-[#C6A86B]/[0.03]";
    case "error":
      return "border-[#d16a5d]/25 bg-[#d16a5d]/[0.03]";
    case "pending":
    default:
      return "border-slate-800/50 bg-slate-900/30";
  }
}

/* ── Component ── */

export function AutoCheckList({ items }: AutoCheckListProps) {
  return (
    <div className="w-full space-y-1.5">
      {items.map((item) => (
        <div
          key={item.key}
          className={`
            flex items-center justify-between rounded-lg border px-3 py-2
            transition-all duration-300
            ${getStatusStyles(item.status)}
          `}
        >
          <div className="flex-1 min-w-0">
            <p
              className={`
                text-sm font-medium transition-colors duration-300
                ${
                  item.status === "done"
                    ? "text-[#3fae7a]"
                    : item.status === "active"
                      ? "text-slate-300"
                      : item.status === "error"
                        ? "text-[#d16a5d]"
                        : "text-slate-500"
                }
              `}
            >
              {item.label}
            </p>
            {item.description && (
              <p className="text-[11px] text-slate-600 mt-0.5">
                {item.description}
              </p>
            )}
          </div>
          <div className="ml-3 shrink-0">
            <StatusIcon status={item.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
