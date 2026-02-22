"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ListingEvidenceItem,
  ListingEvidenceType,
  Purity,
} from "@/lib/mock-data";

/* ================================================================
   EVIDENCE PACK CARD
   Displays the 3 required evidence types with status badges,
   inline Textract cross-check results, and actionable error text.
   ================================================================ */

const EVIDENCE_META: Record<
  ListingEvidenceType,
  { label: string; description: string; icon: typeof FileText }
> = {
  ASSAY_REPORT: {
    label: "Assay Report",
    description: "Independent lab analysis of purity & weight",
    icon: FileText,
  },
  CHAIN_OF_CUSTODY: {
    label: "Chain of Custody",
    description: "Provenance record from refiner to vault",
    icon: Link2,
  },
  SELLER_ATTESTATION: {
    label: "Seller Attestation",
    description: "Signed declaration of ownership & authority",
    icon: ShieldCheck,
  },
};

const REQUIRED_TYPES: ListingEvidenceType[] = [
  "ASSAY_REPORT",
  "CHAIN_OF_CUSTODY",
  "SELLER_ATTESTATION",
];

/* ---------- Textract mismatch detection ---------- */

interface MismatchWarning {
  field: string;
  expected: string;
  actual: string;
  fix: string;
}

function detectMismatches(
  evidence: ListingEvidenceItem,
  listingPurity: Purity,
  listingWeightOz: number,
): MismatchWarning[] {
  if (evidence.type !== "ASSAY_REPORT" || !evidence.extractedMetadata) return [];
  const meta = evidence.extractedMetadata;
  if (!meta.analysisSucceeded) return [];

  const warnings: MismatchWarning[] = [];

  if (meta.extractedPurity && meta.extractedPurity !== listingPurity) {
    warnings.push({
      field: "Purity",
      expected: `.${listingPurity}`,
      actual: `.${meta.extractedPurity}`,
      fix: "Go back to Step 1 and update your listing purity to match the document, or upload the correct Assay Report.",
    });
  }

  if (
    meta.extractedWeightOz !== null &&
    meta.extractedWeightOz !== listingWeightOz
  ) {
    warnings.push({
      field: "Weight",
      expected: `${listingWeightOz} oz`,
      actual: `${meta.extractedWeightOz} oz`,
      fix: "Go back to Step 1 and update your listing weight to match the document, or upload the correct Assay Report.",
    });
  }

  return warnings;
}

/* ---------- Props ---------- */

interface EvidencePackCardProps {
  evidenceItems: ListingEvidenceItem[];
  listingPurity: Purity;
  listingWeightOz: number;
  /** Callback to create a specific evidence type */
  onCreateEvidence?: (type: ListingEvidenceType) => void;
  /** Whether a mutation is in progress */
  isCreating?: boolean;
  className?: string;
}

export function EvidencePackCard({
  evidenceItems,
  listingPurity,
  listingWeightOz,
  onCreateEvidence,
  isCreating,
  className,
}: EvidencePackCardProps) {
  const evidenceMap = useMemo(() => {
    const map = new Map<ListingEvidenceType, ListingEvidenceItem>();
    for (const item of evidenceItems) {
      map.set(item.type, item);
    }
    return map;
  }, [evidenceItems]);

  const allPresent = REQUIRED_TYPES.every((t) => evidenceMap.has(t));

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-faint">
          Evidence Pack
        </h3>
        {allPresent ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            {REQUIRED_TYPES.filter((t) => !evidenceMap.has(t)).length} missing
          </span>
        )}
      </div>

      {/* Evidence type cards */}
      <div className="space-y-2">
        {REQUIRED_TYPES.map((type) => {
          const item = evidenceMap.get(type);
          const meta = EVIDENCE_META[type];
          const Icon = meta.icon;
          const isPresent = !!item;

          // Textract mismatches (only for Assay Report)
          const mismatches = item
            ? detectMismatches(item, listingPurity, listingWeightOz)
            : [];

          // Textract analysis error
          const analysisError =
            item?.extractedMetadata &&
            !item.extractedMetadata.analysisSucceeded
              ? item.extractedMetadata.analysisError
              : null;

          return (
            <div
              key={type}
              className={cn(
                "rounded-[var(--radius-sm)] border px-4 py-3",
                isPresent && mismatches.length === 0 && !analysisError
                  ? "border-success/20 bg-success/5"
                  : isPresent && (mismatches.length > 0 || analysisError)
                    ? "border-warning/30 bg-warning/5"
                    : "border-border bg-surface-2",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      isPresent
                        ? mismatches.length > 0 || analysisError
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                        : "bg-text-faint/10 text-text-faint",
                    )}
                  >
                    {isPresent ? (
                      mismatches.length > 0 || analysisError ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">
                      {meta.label}
                    </p>
                    <p className="text-[11px] text-text-faint">
                      {meta.description}
                    </p>
                  </div>
                </div>

                {/* Status / Action */}
                {isPresent ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                      mismatches.length > 0 || analysisError
                        ? "border-warning/20 bg-warning/10 text-warning"
                        : "border-success/20 bg-success/10 text-success",
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {mismatches.length > 0
                      ? "Mismatch"
                      : analysisError
                        ? "Error"
                        : "Uploaded"}
                  </span>
                ) : onCreateEvidence ? (
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => onCreateEvidence(type)}
                    className={cn(
                      "rounded-[var(--radius-input)] border border-gold/30 bg-gold/10 px-3 py-1.5",
                      "text-xs font-medium text-gold transition-colors",
                      "hover:bg-gold/20 disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    {isCreating ? "Creating…" : "Upload"}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-danger/20 bg-danger/10 text-danger px-2 py-0.5 text-xs font-medium">
                    <XCircle className="h-3 w-3" />
                    Missing
                  </span>
                )}
              </div>

              {/* Textract mismatch warnings */}
              {mismatches.length > 0 && (
                <div className="mt-3 space-y-2">
                  {mismatches.map((m) => (
                    <div
                      key={m.field}
                      className="rounded-[var(--radius-sm)] border border-warning/20 bg-warning/5 px-3 py-2"
                    >
                      <p className="text-xs font-medium text-warning">
                        {m.field} mismatch: Document shows {m.actual}, listing
                        specifies {m.expected}
                      </p>
                      <p className="text-[11px] text-text-muted mt-1">
                        {m.fix}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Analysis error */}
              {analysisError && (
                <div className="mt-3 rounded-[var(--radius-sm)] border border-danger/20 bg-danger/5 px-3 py-2">
                  <p className="text-xs font-medium text-danger">
                    Document analysis failed
                  </p>
                  <p className="text-[11px] text-text-muted mt-1">
                    {analysisError}. Try uploading a clearer scan of the Assay
                    Report.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
