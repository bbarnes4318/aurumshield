import { cn } from "@/lib/utils";
import { Loader2, Inbox, AlertCircle } from "lucide-react";

/* ----------------------------------------------------------------
   Loading State
   ---------------------------------------------------------------- */
interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading…", className }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)} role="status" aria-busy="true">
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-gold" aria-hidden="true" />
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

/* ----------------------------------------------------------------
   Empty State
   ---------------------------------------------------------------- */
interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Primary recovery action (e.g. "Reset filters" button) */
  action?: React.ReactNode;
  /** Secondary action (e.g. "Create transaction" link) */
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = "No data available",
  message = "There are no records to display at this time.",
  icon: Icon = Inbox,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)} role="status">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2">
        <Icon className="h-6 w-6 text-text-faint" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{message}</p>
      {(action || secondaryAction) && (
        <div className="mt-4 flex items-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   Error State
   ---------------------------------------------------------------- */
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)} role="alert">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
        <AlertCircle className="h-6 w-6 text-danger" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-[var(--radius-input)] bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
