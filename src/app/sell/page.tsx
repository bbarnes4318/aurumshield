"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Package,
  FileStack,
  Send,
  Vault,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EvidencePackCard } from "@/components/seller/EvidencePackCard";
import { PublishGatePanel } from "@/components/seller/PublishGatePanel";
import { useAuth } from "@/providers/auth-provider";
import {
  useCreateDraftListing,
  useCreateListingEvidence,
  usePublishListing,
  usePublishGate,
  useListingEvidenceItems,
  useListing,
} from "@/hooks/use-mock-queries";
import { mockHubs } from "@/lib/mock-data";
import type { Listing, ListingEvidenceType, Purity } from "@/lib/mock-data";

/* ================================================================
   SELLER GOLDEN PATH — 3-Step Listing Wizard

   Step 1: Specifications (asset details + vault) → auto-saves draft
   Step 2: Evidence Pack (upload 3 required documents w/ Textract)
   Step 3: Verify & Publish (price, gate review, publish)

   Auto-Save: Draft is created at end of Step 1 so the seller
   won't lose work if they leave to find their Assay Report PDF.
   ================================================================ */

/* ---------- Constants ---------- */

const STEPS = [
  { id: 1, label: "Specifications", icon: Package },
  { id: 2, label: "Evidence Pack", icon: FileStack },
  { id: 3, label: "Verify & Publish", icon: Send },
] as const;

const VAULT_OPTIONS = mockHubs
  .filter((h) => h.status === "operational")
  .map((h) => ({
    id: h.id,
    name: h.name,
    country: h.country,
  }));

/* ---------- Zod Schema for Step 1 ---------- */

const specSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(120, "Title must be 120 characters or less"),
  form: z.enum(["bar", "coin"], {
    message: "Select a form factor",
  }),
  purity: z.enum(["995", "999", "9999"], {
    message: "Select a purity level",
  }),
  totalWeightOz: z
    .number({ message: "Weight is required" })
    .positive("Weight must be positive")
    .max(10_000, "Max 10,000 oz per listing"),
  vaultHubId: z.string().min(1, "Select a vault"),
});

type SpecFormData = z.infer<typeof specSchema>;

/* ---------- Zod Schema for Step 3 (Price) ---------- */

const priceSchema = z.object({
  pricePerOz: z
    .number({ message: "Price is required" })
    .positive("Price must be positive")
    .max(100_000, "Maximum $100,000 / oz"),
});

type PriceFormData = z.infer<typeof priceSchema>;

/* ================================================================
   STEP INDICATOR
   ================================================================ */

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isComplete = step.id < currentStep;
        return (
          <div key={step.id} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-8 mx-1",
                  isComplete ? "bg-success" : "bg-border",
                )}
              />
            )}
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isComplete
                  ? "border-success/20 bg-success/10 text-success"
                  : isActive
                    ? "border-gold/30 bg-gold/10 text-gold"
                    : "border-border bg-surface-2 text-text-faint",
              )}
            >
              {isComplete ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.id}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   STEP 1: SPECIFICATIONS
   ================================================================ */

function StepSpecifications({
  onNext,
  defaultValues,
  isCreating,
}: {
  onNext: (data: SpecFormData) => void;
  defaultValues?: Partial<SpecFormData>;
  isCreating: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SpecFormData>({
    resolver: zodResolver(specSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      form: defaultValues?.form ?? undefined,
      purity: defaultValues?.purity ?? undefined,
      totalWeightOz: defaultValues?.totalWeightOz ?? undefined,
      vaultHubId: defaultValues?.vaultHubId ?? "",
    },
  });

  const selectedForm = watch("form");
  const selectedPurity = watch("purity");
  const selectedVault = watch("vaultHubId");

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-text-faint mb-2">
          Listing Title
        </label>
        <input
          type="text"
          {...register("title")}
          placeholder="e.g. LBMA Good Delivery Bar — 400 oz"
          className={cn(
            "w-full rounded-[var(--radius-input)] border bg-surface-2 px-4 py-2.5",
            "text-sm text-text placeholder:text-text-faint/50",
            "focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20",
            errors.title ? "border-danger/50" : "border-border",
          )}
        />
        {errors.title && (
          <p className="text-xs text-danger mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Form Factor */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-text-faint mb-2">
          Form Factor
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(["bar", "coin"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setValue("form", f, { shouldValidate: true })}
              className={cn(
                "flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-4 py-3",
                "text-sm font-medium transition-colors",
                selectedForm === f
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-border bg-surface-2 text-text-muted hover:border-gold/20",
              )}
            >
              <Package className="h-4 w-4" />
              {f === "bar" ? "Bar" : "Coin"}
            </button>
          ))}
        </div>
        {errors.form && (
          <p className="text-xs text-danger mt-1">{errors.form.message}</p>
        )}
      </div>

      {/* Purity */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-text-faint mb-2">
          Purity
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(["995", "999", "9999"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setValue("purity", p, { shouldValidate: true })}
              className={cn(
                "flex items-center justify-center rounded-[var(--radius-sm)] border px-4 py-3",
                "text-sm font-medium tabular-nums transition-colors",
                selectedPurity === p
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-border bg-surface-2 text-text-muted hover:border-gold/20",
              )}
            >
              .{p}
            </button>
          ))}
        </div>
        {errors.purity && (
          <p className="text-xs text-danger mt-1">{errors.purity.message}</p>
        )}
      </div>

      {/* Weight */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-text-faint mb-2">
          Total Weight (troy ounces)
        </label>
        <input
          type="number"
          step="any"
          {...register("totalWeightOz", { valueAsNumber: true })}
          placeholder="e.g. 400"
          className={cn(
            "w-full rounded-[var(--radius-input)] border bg-surface-2 px-4 py-2.5",
            "text-sm text-text tabular-nums placeholder:text-text-faint/50",
            "focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20",
            errors.totalWeightOz ? "border-danger/50" : "border-border",
          )}
        />
        {errors.totalWeightOz && (
          <p className="text-xs text-danger mt-1">
            {errors.totalWeightOz.message}
          </p>
        )}
      </div>

      {/* Vault Selection */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-text-faint mb-2">
          <Vault className="h-3.5 w-3.5 inline mr-1" />
          Custody Vault
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VAULT_OPTIONS.map((hub) => (
            <button
              key={hub.id}
              type="button"
              onClick={() =>
                setValue("vaultHubId", hub.id, { shouldValidate: true })
              }
              className={cn(
                "flex items-start gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition-colors",
                selectedVault === hub.id
                  ? "border-gold/50 bg-gold/10"
                  : "border-border bg-surface-2 hover:border-gold/20",
              )}
            >
              <Vault
                className={cn(
                  "h-4 w-4 mt-0.5 shrink-0",
                  selectedVault === hub.id
                    ? "text-gold"
                    : "text-text-faint",
                )}
              />
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    selectedVault === hub.id
                      ? "text-gold"
                      : "text-text",
                  )}
                >
                  {hub.name}
                </p>
                <p className="text-[11px] text-text-faint">{hub.country}</p>
              </div>
            </button>
          ))}
        </div>
        {errors.vaultHubId && (
          <p className="text-xs text-danger mt-1">
            {errors.vaultHubId.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isCreating}
          className={cn(
            "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
            "bg-gold px-6 py-2.5 text-sm font-medium text-bg",
            "transition-colors hover:bg-gold-hover",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving Draft…
            </>
          ) : (
            <>
              Save & Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ================================================================
   STEP 2: EVIDENCE PACK
   ================================================================ */

function StepEvidence({
  listing,
  userId,
  onBack,
  onNext,
}: {
  listing: Listing;
  userId: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const evidenceQ = useListingEvidenceItems(listing.id);
  const createEvidence = useCreateListingEvidence();

  const handleCreate = useCallback(
    (type: ListingEvidenceType) => {
      createEvidence.mutate(
        { listingId: listing.id, evidenceType: type, userId },
        {
          onSuccess: () => {
            toast.success(
              `${type.replace(/_/g, " ").toLowerCase()} created`,
            );
          },
          onError: (err: Error) => {
            toast.error(`Failed: ${err.message}`);
          },
        },
      );
    },
    [createEvidence, listing.id, userId],
  );

  const evidenceItems = evidenceQ.data ?? [];
  const allPresent =
    evidenceItems.filter((e) =>
      ["ASSAY_REPORT", "CHAIN_OF_CUSTODY", "SELLER_ATTESTATION"].includes(
        e.type,
      ),
    ).length >= 3;

  return (
    <div className="space-y-6">
      {/* Listing Summary Header */}
      <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text">{listing.title}</p>
            <p className="text-[11px] text-text-faint mt-0.5">
              {listing.totalWeightOz} oz · .{listing.purity} ·{" "}
              {listing.form} · {listing.vaultName}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning/10 text-warning px-2 py-0.5 text-xs font-medium">
            Draft
          </span>
        </div>
      </div>

      {/* Evidence Pack Card */}
      <EvidencePackCard
        evidenceItems={evidenceItems}
        listingPurity={listing.purity as Purity}
        listingWeightOz={listing.totalWeightOz}
        onCreateEvidence={handleCreate}
        isCreating={createEvidence.isPending}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
            "border border-border px-4 py-2 text-sm font-medium text-text-muted",
            "transition-colors hover:border-gold/20 hover:text-text",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!allPresent}
          className={cn(
            "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
            "bg-gold px-6 py-2.5 text-sm font-medium text-bg",
            "transition-colors hover:bg-gold-hover",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          Continue to Review
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {!allPresent && (
        <p className="text-xs text-text-faint text-center">
          Upload all 3 required evidence documents to continue.
        </p>
      )}
    </div>
  );
}

/* ================================================================
   STEP 3: VERIFY & PUBLISH
   ================================================================ */

function StepPublish({
  listing,
  userId,
  onBack,
}: {
  listing: Listing;
  userId: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const gateQ = usePublishGate(listing.id, userId);
  const evidenceQ = useListingEvidenceItems(listing.id);
  const publishMutation = usePublishListing();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PriceFormData>({
    resolver: zodResolver(priceSchema),
    defaultValues: {
      pricePerOz: listing.pricePerOz > 0 ? listing.pricePerOz : undefined,
    },
  });

  const pricePerOz = watch("pricePerOz");
  const notional =
    pricePerOz && listing.totalWeightOz
      ? pricePerOz * listing.totalWeightOz
      : 0;

  const handlePublish = useCallback(
    (data: PriceFormData) => {
      // TODO: Update price on draft before publishing if different
      publishMutation.mutate(
        { listingId: listing.id, userId },
        {
          onSuccess: (result) => {
            if (result.gateResult.allowed) {
              toast.success("Listing published to marketplace");
              router.push("/seller");
            } else {
              toast.error("Publish blocked — review gate results below");
            }
          },
          onError: (err: Error) => {
            toast.error(`Publish failed: ${err.message}`);
          },
        },
      );
    },
    [publishMutation, listing.id, userId, router],
  );

  return (
    <form onSubmit={handleSubmit(handlePublish)} className="space-y-6">
      {/* Listing Summary */}
      <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-[11px] text-text-faint uppercase">Title</p>
            <p className="text-text font-medium truncate">{listing.title}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-faint uppercase">Weight</p>
            <p className="text-text font-medium tabular-nums">
              {listing.totalWeightOz} oz
            </p>
          </div>
          <div>
            <p className="text-[11px] text-text-faint uppercase">Purity</p>
            <p className="text-text font-medium">.{listing.purity}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-faint uppercase">Vault</p>
            <p className="text-text font-medium truncate">
              {listing.vaultName}
            </p>
          </div>
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-text-faint mb-2">
          Price per Troy Ounce (USD)
        </label>
        <input
          type="number"
          step="0.01"
          {...register("pricePerOz", { valueAsNumber: true })}
          placeholder="e.g. 2055.00"
          className={cn(
            "w-full rounded-[var(--radius-input)] border bg-surface-2 px-4 py-2.5",
            "text-sm text-text tabular-nums placeholder:text-text-faint/50",
            "focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20",
            errors.pricePerOz ? "border-danger/50" : "border-border",
          )}
        />
        {errors.pricePerOz && (
          <p className="text-xs text-danger mt-1">
            {errors.pricePerOz.message}
          </p>
        )}
        {notional > 0 && (
          <p className="text-xs text-text-faint mt-1">
            Total notional: $
            {notional.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Evidence Pack Summary */}
      <EvidencePackCard
        evidenceItems={evidenceQ.data ?? []}
        listingPurity={listing.purity as Purity}
        listingWeightOz={listing.totalWeightOz}
      />

      {/* Publish Gate */}
      <PublishGatePanel
        gateResult={gateQ.data}
        isLoading={gateQ.isLoading}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
            "border border-border px-4 py-2 text-sm font-medium text-text-muted",
            "transition-colors hover:border-gold/20 hover:text-text",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="submit"
          disabled={
            publishMutation.isPending || !gateQ.data?.allowed
          }
          className={cn(
            "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
            "bg-gold px-6 py-2.5 text-sm font-medium text-bg",
            "transition-colors hover:bg-gold-hover",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {publishMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Publish Listing
            </>
          )}
        </button>
      </div>

      {gateQ.data && !gateQ.data.allowed && (
        <p className="text-xs text-danger text-center">
          Resolve all gate blockers above before publishing.
        </p>
      )}
    </form>
  );
}

/* ================================================================
   MAIN WIZARD PAGE
   ================================================================ */

export default function SellPage() {
  const { user, org } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const userId = user?.id ?? "";
  const orgId = org?.id ?? "";
  const orgName = org?.legalName ?? "";

  // Support resuming a draft via ?listing=<id>
  const resumeListingId = searchParams.get("listing");
  const resumeListingQ = useListing(resumeListingId ?? "");

  const [step, setStep] = useState<number>(resumeListingId ? 2 : 1);
  const [draftListing, setDraftListing] = useState<Listing | null>(null);
  const [specData, setSpecData] = useState<SpecFormData | null>(null);

  // The active listing is either the resumed draft or the newly created one
  const activeListing = draftListing ?? resumeListingQ.data ?? null;

  // Create draft mutation
  const createDraft = useCreateDraftListing();

  /* ---------- Step 1 → Step 2 transition (auto-save draft) ---------- */

  const handleSpecSubmit = useCallback(
    (data: SpecFormData) => {
      setSpecData(data);

      const vault = VAULT_OPTIONS.find((v) => v.id === data.vaultHubId);

      createDraft.mutate(
        {
          title: data.title,
          form: data.form as "bar" | "coin",
          purity: data.purity as Purity,
          totalWeightOz: data.totalWeightOz,
          pricePerOz: 0, // Price set in Step 3
          vaultHubId: data.vaultHubId,
          vaultName: vault?.name ?? "",
          jurisdiction: vault?.country ?? "",
          sellerUserId: userId,
          sellerOrgId: orgId,
          sellerName: orgName,
        },
        {
          onSuccess: (listing: Listing) => {
            setDraftListing(listing);
            setStep(2);
            toast.success("Draft saved — your progress is safe");
          },
          onError: (err: Error) => {
            toast.error(`Failed to save draft: ${err.message}`);
          },
        },
      );
    },
    [createDraft, userId, orgId, orgName],
  );

  /* ---------- Render ---------- */

  if (!user) {
    return (
      <div className="card-base border border-border p-8 text-center">
        <p className="text-sm text-text-muted">
          Please log in as a seller to create listings.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="New Listing"
        description="Three steps to publish your gold to the marketplace"
        actions={
          <button
            type="button"
            onClick={() => router.push("/seller")}
            className={cn(
              "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
              "border border-border px-4 py-2 text-sm font-medium text-text-muted",
              "transition-colors hover:border-gold/20 hover:text-text",
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        }
      />

      {/* Step Indicator */}
      <div className="mt-4 mb-6 flex justify-center">
        <StepIndicator currentStep={step} />
      </div>

      {/* Step Content */}
      <div className="max-w-2xl mx-auto">
        {step === 1 && (
          <div className="card-base border border-border p-6">
            <StepSpecifications
              onNext={handleSpecSubmit}
              defaultValues={specData ?? undefined}
              isCreating={createDraft.isPending}
            />
          </div>
        )}

        {step === 2 && activeListing && (
          <div className="card-base border border-border p-6">
            <StepEvidence
              listing={activeListing}
              userId={userId}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          </div>
        )}

        {step === 3 && activeListing && (
          <div className="card-base border border-border p-6">
            <StepPublish
              listing={activeListing}
              userId={userId}
              onBack={() => setStep(2)}
            />
          </div>
        )}

        {/* Loading state for resumed listing */}
        {step >= 2 && !activeListing && resumeListingId && (
          <div className="card-base border border-border p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold mx-auto mb-2" />
            <p className="text-sm text-text-muted">Loading draft listing…</p>
          </div>
        )}
      </div>
    </>
  );
}
