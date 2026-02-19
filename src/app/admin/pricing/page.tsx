"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Shield,
  DollarSign,
  Percent,
  ToggleLeft,
  ToggleRight,
  Loader2,
  CheckCircle2,
  Phone,
} from "lucide-react";
import {
  usePricingConfig,
  useSavePricingConfig,
} from "@/hooks/use-mock-queries";
import { ContactSupportInline } from "@/components/ui/contact-support-inline";
import {
  ADD_ON_CATALOG,
  ADD_ON_CATEGORY_LABELS,
  ADD_ON_CATEGORY_ORDER,
  formatCentsUsd,
  formatBpsPercent,
  defaultPricingConfig,
  type PricingConfig,
  type AddOnCategory,
} from "@/lib/fees/fee-engine";

/* ================================================================
   Admin Pricing Configuration Page
   
   Allows admin to:
   - Adjust core indemnification fee (bps, min, max)
   - Enable/disable add-ons
   - Override add-on pricing parameters
   - Reset to defaults
   ================================================================ */

export default function AdminPricingPage() {
  const router = useRouter();
  const { data: storedConfig, isLoading } = usePricingConfig();
  const saveMutation = useSavePricingConfig();

  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [saved, setSaved] = useState(false);

  // Initialize form from server state
  useEffect(() => {
    if (storedConfig && !config) {
      setConfig(structuredClone(storedConfig));
    }
  }, [storedConfig, config]);

  const handleSave = useCallback(async () => {
    if (!config) return;
    const updated = { ...config, updatedAtUtc: new Date().toISOString() };
    await saveMutation.mutateAsync(updated);
    setConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [config, saveMutation]);

  const handleReset = useCallback(() => {
    const defaults = defaultPricingConfig();
    setConfig(defaults);
  }, []);

  const updateCoreFee = useCallback(
    (field: "indemnificationBps" | "minCents" | "maxCents", value: number) => {
      if (!config) return;
      setConfig({ ...config, coreFee: { ...config.coreFee, [field]: value } });
    },
    [config],
  );

  const toggleAddOn = useCallback(
    (code: string) => {
      if (!config) return;
      const overrides = { ...config.addOnOverrides };
      const existing = overrides[code] ?? { enabled: true };
      overrides[code] = { ...existing, enabled: !existing.enabled };
      setConfig({ ...config, addOnOverrides: overrides });
    },
    [config],
  );

  const updateAddOnOverride = useCallback(
    (code: string, field: string, value: number | boolean | undefined) => {
      if (!config) return;
      const overrides = { ...config.addOnOverrides };
      const existing = overrides[code] ?? { enabled: true };
      overrides[code] = { ...existing, [field]: value };
      setConfig({ ...config, addOnOverrides: overrides });
    },
    [config],
  );

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Pricing Configuration
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Admin-adjustable fee parameters — changes apply to new quotes
              only
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ContactSupportInline compact />
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-md bg-[var(--gold)] text-[var(--bg-primary)] hover:brightness-110 transition-all disabled:opacity-50"
            data-tour="pricing-save-btn"
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </>
            ) : saveMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Core Indemnification Fee */}
      <div className="card-base p-5" data-tour="pricing-edit-btn">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-[var(--gold)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Core Indemnification Fee
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Rate (Basis Points)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config.coreFee.indemnificationBps}
                onChange={(e) =>
                  updateCoreFee(
                    "indemnificationBps",
                    Math.max(0, parseInt(e.target.value) || 0),
                  )
                }
                className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)]"
              />
              <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                = {formatBpsPercent(config.coreFee.indemnificationBps)}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Minimum ($)
            </label>
            <input
              type="number"
              value={config.coreFee.minCents / 100}
              onChange={(e) =>
                updateCoreFee(
                  "minCents",
                  Math.round((parseFloat(e.target.value) || 0) * 100),
                )
              }
              step="1000"
              className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)]"
            />
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {formatCentsUsd(config.coreFee.minCents)}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Maximum Cap ($)
            </label>
            <input
              type="number"
              value={config.coreFee.maxCents / 100}
              onChange={(e) =>
                updateCoreFee(
                  "maxCents",
                  Math.round((parseFloat(e.target.value) || 0) * 100),
                )
              }
              step="1000"
              className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)]"
            />
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {formatCentsUsd(config.coreFee.maxCents)}
            </p>
          </div>
        </div>
      </div>

      {/* Add-On Pricing Overrides */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          Add-On Pricing
        </h2>

        {ADD_ON_CATEGORY_ORDER.map((category) => {
          const entries = ADD_ON_CATALOG.filter(
            (e) => e.category === category,
          );
          if (entries.length === 0) return null;
          return (
            <div key={category} className="space-y-2">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                {ADD_ON_CATEGORY_LABELS[category]}
              </h3>
              {entries.map((entry) => {
                const ov = config.addOnOverrides[entry.code] ?? {
                  enabled: true,
                };
                const isEnabled = ov.enabled;
                return (
                  <div
                    key={entry.code}
                    className={`card-base p-4 transition-opacity ${
                      !isEnabled ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleAddOn(entry.code)}
                          className="transition-colors"
                        >
                          {isEnabled ? (
                            <ToggleRight className="h-6 w-6 text-[var(--gold)]" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-[var(--text-secondary)]" />
                          )}
                        </button>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {entry.label}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {entry.pricingModel.replace(/_/g, " ")} •{" "}
                            {entry.code}
                          </p>
                        </div>
                      </div>
                      {entry.requiresManualApproval && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          MANUAL APPROVAL
                        </span>
                      )}
                    </div>

                    {isEnabled && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {entry.pricingModel === "percent" && (
                          <>
                            <div>
                              <label className="block text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                                BPS
                              </label>
                              <input
                                type="number"
                                value={ov.bps ?? entry.defaultBps ?? 0}
                                onChange={(e) =>
                                  updateAddOnOverride(
                                    entry.code,
                                    "bps",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                                Min ($)
                              </label>
                              <input
                                type="number"
                                value={
                                  (ov.minCents ?? entry.defaultMinCents ?? 0) / 100
                                }
                                onChange={(e) =>
                                  updateAddOnOverride(
                                    entry.code,
                                    "minCents",
                                    Math.round(
                                      (parseFloat(e.target.value) || 0) * 100,
                                    ),
                                  )
                                }
                                className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                                Max ($)
                              </label>
                              <input
                                type="number"
                                value={
                                  (ov.maxCents ?? entry.defaultMaxCents ?? Number.MAX_SAFE_INTEGER) / 100
                                }
                                onChange={(e) =>
                                  updateAddOnOverride(
                                    entry.code,
                                    "maxCents",
                                    Math.round(
                                      (parseFloat(e.target.value) || 0) * 100,
                                    ),
                                  )
                                }
                                className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)]"
                              />
                            </div>
                          </>
                        )}
                        {entry.pricingModel === "flat" && (
                          <div>
                            <label className="block text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                              Flat Fee ($)
                            </label>
                            <input
                              type="number"
                              value={
                                (ov.flatCents ?? entry.defaultFlatCents ?? 0) / 100
                              }
                              onChange={(e) =>
                                updateAddOnOverride(
                                  entry.code,
                                  "flatCents",
                                  Math.round(
                                    (parseFloat(e.target.value) || 0) * 100,
                                  ),
                                )
                              }
                              className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)]"
                            />
                          </div>
                        )}
                        {entry.pricingModel === "pass_through_plus_fee" && (
                          <div>
                            <label className="block text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                              Platform Fee ($)
                            </label>
                            <input
                              type="number"
                              value={
                                (ov.platformFeeFlatCents ??
                                  entry.defaultPlatformFeeFlatCents ??
                                  0) / 100
                              }
                              onChange={(e) =>
                                updateAddOnOverride(
                                  entry.code,
                                  "platformFeeFlatCents",
                                  Math.round(
                                    (parseFloat(e.target.value) || 0) * 100,
                                  ),
                                )
                              }
                              className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)]"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Last Updated */}
      <div className="text-xs text-[var(--text-secondary)] text-center py-4">
        Last updated: {new Date(config.updatedAtUtc).toLocaleString()} •{" "}
        <span className="text-[var(--text-secondary)]">
          Changes apply to new and unfrozen quotes only
        </span>
      </div>
    </div>
  );
}
