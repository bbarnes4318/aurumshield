"use client";

/* ================================================================
   MARKETPLACE FILTER BAR
   ================================================================
   Extracted filter controls for the marketplace page.
   Uses local React state (props) — not URL params — because
   MarketplaceContent is also embedded in the buyer slide-out panel.
   ================================================================ */

import { Filter, X, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */

export interface FilterOption {
  label: string;
  value: string;
}

export type SortKey =
  | ""
  | "price-asc"
  | "price-desc"
  | "weight-asc"
  | "weight-desc"
  | "premium-asc";

export interface MarketplaceFilterBarProps {
  formFilter: string;
  vaultFilter: string;
  sortKey: SortKey;
  onFormChange: (v: string) => void;
  onVaultChange: (v: string) => void;
  onSortChange: (v: SortKey) => void;
  onClearAll: () => void;
}

/* ── Static Option Lists ── */

export const FORM_OPTIONS: FilterOption[] = [
  { label: "All Forms", value: "" },
  { label: "Bar", value: "bar" },
  { label: "Coin", value: "coin" },
];

export const VAULT_OPTIONS: FilterOption[] = [
  { label: "All Vaults", value: "" },
  { label: "Zurich Custody Vault", value: "hub-002" },
  { label: "London Clearing Centre", value: "hub-001" },
  { label: "New York Trading Floor", value: "hub-004" },
  { label: "Singapore Settlement Node", value: "hub-003" },
  { label: "Frankfurt Settlement Hub", value: "hub-005" },
  { label: "Dubai Trade Gateway", value: "hub-006" },
];

export const SORT_OPTIONS: FilterOption[] = [
  { label: "Default", value: "" },
  { label: "Price ↑ Low to High", value: "price-asc" },
  { label: "Price ↓ High to Low", value: "price-desc" },
  { label: "Weight ↑ Low to High", value: "weight-asc" },
  { label: "Weight ↓ High to Low", value: "weight-desc" },
  { label: "Premium ↑ Low to High", value: "premium-asc" },
];

/* ── Single Filter Chip ── */

function FilterChip({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <label
        className="text-[10px] uppercase tracking-widest text-color-3/40 font-semibold"
        htmlFor={id}
      >
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 rounded-lg border bg-color-1/50 px-3 text-xs text-color-3",
          "focus:outline-none focus:ring-2 focus:ring-color-2/30 focus:border-color-2/40",
          "transition-colors cursor-pointer",
          value
            ? "border-color-2/30 bg-color-2/5"
            : "border-color-5/20",
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ── Main Filter Bar ── */

export function MarketplaceFilterBar({
  formFilter,
  vaultFilter,
  sortKey,
  onFormChange,
  onVaultChange,
  onSortChange,
  onClearAll,
}: MarketplaceFilterBarProps) {
  const activeCount =
    (formFilter ? 1 : 0) + (vaultFilter ? 1 : 0) + (sortKey ? 1 : 0);

  return (
    <div
      className="flex flex-wrap items-center gap-4"
      role="search"
      aria-label="Marketplace filter controls"
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 text-color-3/50">
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-widest">
          Filters
        </span>
      </div>

      {/* Form Filter */}
      <FilterChip
        id="filter-form"
        label="Form"
        options={FORM_OPTIONS}
        value={formFilter}
        onChange={onFormChange}
      />

      {/* Vault Filter */}
      <FilterChip
        id="filter-vault"
        label="Vault"
        options={VAULT_OPTIONS}
        value={vaultFilter}
        onChange={onVaultChange}
      />

      {/* Sort Dropdown */}
      <div className="flex items-center gap-1.5">
        <ArrowUpDown className="h-3 w-3 text-color-3/40" aria-hidden="true" />
        <label
          className="text-[10px] uppercase tracking-widest text-color-3/40 font-semibold"
          htmlFor="filter-sort"
        >
          Sort
        </label>
        <select
          id="filter-sort"
          name="filter-sort"
          value={sortKey}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className={cn(
            "h-8 rounded-lg border bg-color-1/50 px-3 text-xs text-color-3",
            "focus:outline-none focus:ring-2 focus:ring-color-2/30 focus:border-color-2/40",
            "transition-colors cursor-pointer",
            sortKey
              ? "border-color-2/30 bg-color-2/5"
              : "border-color-5/20",
          )}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clear All */}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="flex items-center gap-1 rounded-full border border-color-5/20 bg-color-1/50 px-2.5 py-1 text-[10px] font-medium text-color-3/50 transition-colors hover:bg-color-5/10 hover:text-color-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-2/50"
          aria-label={`Clear ${activeCount} active filter${activeCount > 1 ? "s" : ""}`}
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Clear ({activeCount})
        </button>
      )}
    </div>
  );
}
