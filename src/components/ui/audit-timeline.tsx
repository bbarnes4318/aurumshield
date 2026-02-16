import { cn } from "@/lib/utils";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Monitor,
} from "lucide-react";

type EventCategory = "review" | "approval" | "alert" | "update" | "system";

const categoryConfig: Record<
  EventCategory,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    borderColor: string;
  }
> = {
  review: {
    icon: Search,
    color: "text-info",
    bg: "bg-info/10",
    borderColor: "border-info/30",
  },
  approval: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
    borderColor: "border-success/30",
  },
  alert: {
    icon: AlertTriangle,
    color: "text-danger",
    bg: "bg-danger/10",
    borderColor: "border-danger/30",
  },
  update: {
    icon: RefreshCw,
    color: "text-gold",
    bg: "bg-gold/10",
    borderColor: "border-gold/30",
  },
  system: {
    icon: Monitor,
    color: "text-text-faint",
    bg: "bg-surface-3",
    borderColor: "border-text-faint/30",
  },
};

interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  detail: string;
  category: EventCategory;
}

interface AuditTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function AuditTimeline({ events, className }: AuditTimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-6">
        {events.map((event) => {
          const config = categoryConfig[event.category];
          const Icon = config.icon;

          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Icon node */}
              <div
                className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                  config.bg,
                  config.borderColor
                )}
              >
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 pb-1">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                  <p className="text-sm font-semibold text-text">
                    {event.action}
                  </p>
                  <span className="text-xs text-text-faint">
                    {new Date(event.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">
                  {event.detail}
                </p>
                <p className="mt-1 text-xs text-text-faint">by {event.actor}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
