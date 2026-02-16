"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterConfig[];
  className?: string;
}

export function FilterBar({ filters, className }: FilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const clearAll = useCallback(() => {
    router.replace(pathname);
  }, [router, pathname]);

  const activeCount = filters.reduce((acc, f) => {
    return acc + (searchParams.get(f.key) ? 1 : 0);
  }, 0);

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)} role="search" aria-label="Filter controls">
      {filters.map((filter) => {
        const current = searchParams.get(filter.key) ?? "";
        return (
          <div key={filter.key} className="flex items-center gap-1.5">
            <label className="typo-label" htmlFor={`filter-${filter.key}`}>
              {filter.label}
            </label>
            <select
              id={`filter-${filter.key}`}
              value={current}
              onChange={(e) => setFilter(filter.key, e.target.value)}
              className={cn(
                "h-8 rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 text-sm text-text",
                "focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent",
                "transition-colors"
              )}
            >
              <option value="">All</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-muted transition-colors hover:bg-surface-3 hover:text-text focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
          aria-label={`Clear ${activeCount} active filter${activeCount > 1 ? "s" : ""}`}
        >
          <X className="h-3 w-3" aria-hidden="true" />
          <span aria-live="polite">Clear ({activeCount})</span>
        </button>
      )}
    </div>
  );
}

/** Hook to read current URL filter values for a given list of keys */
export function useFilterValues(keys: string[]) {
  const searchParams = useSearchParams();
  const values: Record<string, string> = {};
  for (const key of keys) {
    values[key] = searchParams.get(key) ?? "";
  }
  return values;
}
