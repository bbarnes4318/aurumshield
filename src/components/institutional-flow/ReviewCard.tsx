"use client";

/* ================================================================
   REVIEW CARD — Key-value summary card
   ================================================================
   Used on review/confirmation screens to display a clean summary
   of selections and computed values.

   Each item is a labeled key-value pair. The `mono` flag forces
   monospace rendering for financial figures and reference IDs.
   ================================================================ */

interface ReviewItem {
  /** Label displayed on the left */
  label: string;
  /** Value displayed on the right */
  value: string;
  /** If true, value renders in monospace for financial data */
  mono?: boolean;
}

interface ReviewCardProps {
  /** Card title / section heading */
  title: string;
  /** Array of key-value items */
  items: ReviewItem[];
}

export function ReviewCard({ title, items }: ReviewCardProps) {
  return (
    <div className="w-full rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
      {/* Title bar */}
      <div className="px-5 py-3 border-b border-slate-800/50 bg-slate-900/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h3>
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-800/30">
        {items.map((item, i) => (
          <div
            key={`${item.label}-${i}`}
            className="flex items-center justify-between px-5 py-3"
          >
            <span className="text-xs text-slate-500">{item.label}</span>
            <span
              className={`
                text-sm text-slate-200
                ${item.mono ? "font-mono tabular-nums tracking-tight" : "font-medium"}
              `}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
