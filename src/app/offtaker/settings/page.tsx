"use client";

/* ================================================================
   ENTITY MANAGEMENT TERMINAL — /offtaker/settings
   ================================================================
   Post-KYB corporate dossier viewer with Material Change revocation.

   Zero-Scroll Layout: h-full flex flex-col overflow-hidden
   Aesthetic:           bg-slate-950, high-contrast, institutional
   ================================================================ */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  Building2,
  Hash,
  MapPin,
  Mail,
  Phone,
  Fingerprint,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { revokeCompliance } from "@/actions/revoke-compliance";

/* ----------------------------------------------------------------
   Dossier Field Card
   ---------------------------------------------------------------- */

function DossierField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
          {label}
        </span>
      </div>
      <p className="text-sm font-medium text-slate-200 font-mono tracking-wide">
        {value || "—"}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------
   Material Change Alert Modal
   ---------------------------------------------------------------- */

function MaterialChangeModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 max-w-lg rounded-xl border border-red-500/30 bg-[#0B0E14] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Material Change — Compliance Revocation
          </h3>
        </div>

        {/* Warning Copy */}
        <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-4 mb-6">
          <p className="text-sm text-red-200/90 leading-relaxed">
            <strong className="text-red-300">WARNING:</strong> Modifying your
            corporate dossier constitutes a{" "}
            <strong className="text-white">Material Change</strong> under AML
            regulations. Your current KYB clearance will be{" "}
            <strong className="text-red-300">immediately revoked</strong>, and
            your trading access will be{" "}
            <strong className="text-red-300">locked</strong> until
            re-verification is complete.
          </p>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          Do you wish to proceed? Your existing data will be preserved for
          editing.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="
              flex-1 inline-flex items-center justify-center rounded-lg
              px-5 py-2.5 text-sm font-semibold
              border border-slate-700 bg-slate-800 text-slate-300
              hover:bg-slate-700 hover:text-white
              disabled:opacity-50 disabled:pointer-events-none
              transition-colors duration-150
            "
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="
              flex-1 inline-flex items-center justify-center gap-2 rounded-lg
              px-5 py-2.5 text-sm font-semibold
              bg-red-500/15 text-red-400
              border border-red-500/30
              hover:bg-red-500/25 active:bg-red-500/30
              disabled:opacity-50 disabled:pointer-events-none
              transition-colors duration-150
            "
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Revoking…
              </>
            ) : (
              "Proceed — Revoke Clearance"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
   Entity Management Page
   ---------------------------------------------------------------- */

export default function EntityManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: onboardingState, isLoading: isLoadingState } =
    useOnboardingState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  /* ── Dossier data from metadataJson ── */
  const meta = (onboardingState?.metadataJson ?? {}) as Record<string, unknown>;
  const companyName = (meta.companyName as string) || "";
  const registrationNumber = (meta.registrationNumber as string) || "";
  const jurisdiction = (meta.jurisdiction as string) || "";
  const contactEmail = (meta.contactEmail as string) || "";
  const contactPhone = (meta.contactPhone as string) || "";
  const lei = (meta.legalEntityIdentifier as string) || "";

  /* ── Cleared timestamp ── */
  const clearedAt = onboardingState?.updatedAt
    ? new Date(onboardingState.updatedAt).toLocaleString("en-US", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "—";

  /* ── Material Change handler ── */
  const handleRevoke = useCallback(async () => {
    setIsRevoking(true);
    try {
      const result = await revokeCompliance({});
      if (result.success) {
        // Invalidate client-side cache so sidebar re-renders with State A
        await queryClient.invalidateQueries({ queryKey: ["onboarding-state"] });
        router.push("/offtaker/onboarding/intake");
      } else {
        console.error("[AurumShield] Revocation failed:", result.error);
        setIsRevoking(false);
      }
    } catch (err) {
      console.error("[AurumShield] Revocation exception:", err);
      setIsRevoking(false);
    }
  }, [queryClient, router]);

  /* ── Loading state ── */
  if (isLoadingState) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-slate-600 animate-spin" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Syncing Telemetry...
          </span>
        </div>
      </div>
    );
  }

  /* ── Hard Ejection: non-cleared users get pushed out ── */
  if (onboardingState?.status !== "COMPLETED") {
    router.replace("/offtaker/org/select");
    return <div className="h-full bg-slate-950" />;
  }

  return (
    /* ── Task 2: Absolute Inset Root Lock ── */
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-950">

      {/* ── Task 3: Locked Header ── */}
      <div className="shrink-0 px-6 py-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
            <Shield className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">
              Entity Management
            </h1>
            <p className="text-xs text-slate-500">
              Corporate Dossier · KYB Compliance Record
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Cleared
            </p>
            <p className="text-[9px] text-emerald-400/60 font-mono">
              {clearedAt}
            </p>
          </div>
        </div>
      </div>

      {/* ── Task 4: Clean Scroll Zone ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">

        {/* Dossier Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <DossierField
            icon={Building2}
            label="Company Name"
            value={companyName}
          />
          <DossierField
            icon={Hash}
            label="Registration Number"
            value={registrationNumber}
          />
          <DossierField
            icon={MapPin}
            label="Jurisdiction"
            value={jurisdiction}
          />
          <DossierField
            icon={Fingerprint}
            label="Legal Entity Identifier (LEI)"
            value={lei}
          />
          <DossierField
            icon={Mail}
            label="Contact Email"
            value={contactEmail}
          />
          <DossierField
            icon={Phone}
            label="Contact Phone"
            value={contactPhone}
          />
        </div>

        {/* Compliance Record */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-5">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
            Compliance Record
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-500 text-xs">Onboarding Status</span>
              <p className="text-emerald-400 font-semibold font-mono mt-0.5">
                COMPLETED
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Verification Step</span>
              <p className="text-slate-300 font-mono mt-0.5">
                {onboardingState.currentStep} / 7
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Last Updated</span>
              <p className="text-slate-300 font-mono mt-0.5">{clearedAt}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Task 5: Locked Action Footer ── */}
      <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="
            inline-flex items-center gap-2 rounded-lg px-5 py-2.5
            text-sm font-semibold
            border border-amber-500/30 bg-amber-500/10 text-amber-400
            hover:bg-amber-500/20 active:bg-amber-500/25
            transition-colors duration-150
          "
        >
          <AlertTriangle className="h-4 w-4" />
          Amend Entity Dossier
        </button>
      </div>

      {/* ── Material Change Modal ── */}
      <MaterialChangeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleRevoke}
        isLoading={isRevoking}
      />
    </div>
  );
}
