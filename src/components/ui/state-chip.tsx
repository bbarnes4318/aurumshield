import { cn } from "@/lib/utils";

type StatusVariant = "active" | "pending" | "under-review" | "closed" | "suspended";

const variantStyles: Record<StatusVariant, string> = {
  active: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  "under-review": "bg-info/10 text-info border-info/20",
  closed: "bg-text-faint/10 text-text-faint border-text-faint/20",
  suspended: "bg-danger/10 text-danger border-danger/20",
};

const labelMap: Record<StatusVariant, string> = {
  active: "Active",
  pending: "Pending",
  "under-review": "Under Review",
  closed: "Closed",
  suspended: "Suspended",
};

interface StateChipProps {
  status: StatusVariant;
  className?: string;
}

export function StateChip({ status, className }: StateChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[status],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labelMap[status]}
    </span>
  );
}
