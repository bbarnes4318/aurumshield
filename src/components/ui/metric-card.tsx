import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  change: number;
  trend: "up" | "down" | "flat";
  period: string;
  className?: string;
}

const trendConfig = {
  up: {
    icon: TrendingUp,
    color: "text-success",
    bg: "bg-success/10",
    prefix: "+",
  },
  down: {
    icon: TrendingDown,
    color: "text-danger",
    bg: "bg-danger/10",
    prefix: "",
  },
  flat: {
    icon: Minus,
    color: "text-text-faint",
    bg: "bg-surface-3",
    prefix: "",
  },
};

export function MetricCard({
  label,
  value,
  change,
  trend,
  period,
  className,
}: MetricCardProps) {
  const t = trendConfig[trend];
  const TrendIcon = t.icon;
  const showChange = change !== 0;

  return (
    <div className={cn("card-base p-5", className)} aria-label={`${label}: ${value}`}>
      <p className="typo-label mb-1">{label}</p>
      <p className="typo-h2 font-bold tabular-nums tracking-tight mb-2">{value}</p>
      <div className="flex items-center gap-2">
        {showChange && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
              t.bg,
              t.color
            )}
          >
            <TrendIcon className="h-3 w-3" aria-hidden="true" />
            {t.prefix}{Math.abs(change).toFixed(1)}%
          </span>
        )}
        <span className="text-xs text-text-faint">{period}</span>
      </div>
    </div>
  );
}
