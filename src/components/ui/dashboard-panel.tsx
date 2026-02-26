import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface DashboardPanelProps {
  /** Section heading shown as a typo-label */
  title: string;
  /** Exact calculation/methodology shown in the ⓘ tooltip */
  tooltip: string;
  /** ISO timestamp returned from the mock API for this dataset */
  asOf: string;
  /** Panel content */
  children: React.ReactNode;
  /** Optional: full-width flag (removes inner grid constraints) */
  fullWidth?: boolean;
  className?: string;
}

/**
 * Institutional dashboard panel wrapper.
 * Header: label + ⓘ tooltip.  Footer: "As of {timestamp} UTC".
 * Print-safe: avoids page breaks inside panels.
 */
export function DashboardPanel({
  title,
  tooltip,
  asOf,
  children,
  fullWidth,
  className,
}: DashboardPanelProps) {
  const ts = new Date(asOf);
  const formattedTime = ts.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });

  return (
    <div
      className={cn(
        "card-base flex flex-col overflow-hidden print:break-inside-avoid border border-slate-800/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] bg-[#0f1219]",
        fullWidth ? "col-span-full" : "",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 bg-[#0a0d14] px-6 py-3">
        <h3 className="typo-label">{title}</h3>
        <InfoTooltip content={tooltip} side="right" />
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-5">{children}</div>

      {/* Footer — timestamp */}
      <div className="border-t border-border px-6 py-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 tabular-nums">
          As of {formattedTime}
        </p>
      </div>
    </div>
  );
}
