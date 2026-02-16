import { cn } from "@/lib/utils";

export type RiskLevel = "low" | "medium" | "high" | "critical";

const riskConfig: Record<
  RiskLevel,
  {
    label: string;
    color: string;
    bg: string;
    ring: string;
  }
> = {
  low: {
    label: "Low",
    color: "text-success",
    bg: "bg-success/10",
    ring: "border-success",
  },
  medium: {
    label: "Medium",
    color: "text-warning",
    bg: "bg-warning/10",
    ring: "border-warning",
  },
  high: {
    label: "High",
    color: "text-danger",
    bg: "bg-danger/10",
    ring: "border-danger",
  },
  critical: {
    label: "Critical",
    color: "text-danger",
    bg: "bg-danger/15",
    ring: "border-danger",
  },
};

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const config = riskConfig[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        config.bg,
        config.color,
        className
      )}
    >
      {/* Neutral ring indicator — no shield iconography */}
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full border-[1.5px]",
          config.ring,
          level === "critical" ? "bg-danger" : "bg-transparent"
        )}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
