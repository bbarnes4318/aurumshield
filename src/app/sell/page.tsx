"use client";

/* ================================================================
   SELL — 4-Step Listing Wizard
   ================================================================
   Step 1: Asset Details   (form, purity, weight, title)
   Step 2: Custody         (vault/hub selection)
   Step 3: Evidence Pack   (create deterministic evidence stubs)
   Step 4: Price & Review  (set price, view publish gate, publish)
   ================================================================ */

import { useState, useMemo, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/state-views";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import { useHubs } from "@/hooks/use-mock-queries";
import {
  useCreateDraftListing,
  useCreateListingEvidence,
  usePublishListing,
  usePublishGate,
} from "@/hooks/use-mock-queries";
import type { Hub } from "@/lib/mock-data";
import type { ListingEvidenceType } from "@/lib/mock-data";
import { CheckCircle2, ChevronRight, AlertTriangle, Loader2, Package, Building2, ShieldCheck, DollarSign } from "lucide-react";

/* ---------- Zod Schemas ---------- */
const assetSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  form: z.enum(["bar", "coin"], { message: "Select a form" }),
  purity: z.enum(["995", "999", "9999"], { message: "Select purity" }),
  totalWeightOz: z.number({ message: "Enter a valid weight" }).positive("Weight must be positive"),
});
type AssetFormData = z.infer<typeof assetSchema>;

const custodySchema = z.object({
  vaultHubId: z.string().min(1, "Select a vault"),
});
type CustodyFormData = z.infer<typeof custodySchema>;

const priceSchema = z.object({
  pricePerOz: z.number({ message: "Enter a valid price" }).positive("Price must be positive"),
});
type PriceFormData = z.infer<typeof priceSchema>;

/* ---------- Step indicator ---------- */
const STEPS = [
  { label: "Asset", icon: Package },
  { label: "Custody", icon: Building2 },
  { label: "Evidence", icon: ShieldCheck },
  { label: "Price & Review", icon: DollarSign },
] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === current;
        const isDone = i < current;
        return (
          <div key={step.label} className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              isDone ? "bg-success/10 text-success" :
              isActive ? "bg-gold/10 text-gold border border-gold/30" :
              "bg-surface-2 text-text-faint"
            )}>
              {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-text-faint" />}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   WIZARD CONTENT
   ================================================================ */

function WizardContent() {
  const router = useRouter();
  const { user, org } = useAuth();
  const hubsQ = useHubs();

  const [step, setStep] = useState(0);
  const [assetData, setAssetData] = useState<AssetFormData | null>(null);
  const [custodyData, setCustodyData] = useState<CustodyFormData | null>(null);
  const [draftListingId, setDraftListingId] = useState<string | null>(null);
  const [evidenceCreated, setEvidenceCreated] = useState<Set<ListingEvidenceType>>(new Set());

  const createDraftMut = useCreateDraftListing();
  const createEvidenceMut = useCreateListingEvidence();
  const publishMut = usePublishListing();

  const userId = user?.id ?? "";
  const orgId = org?.id ?? "";
  const sellerName = org?.legalName ?? user?.name ?? "Unknown";

  // Resolve vault info
  const selectedHub: Hub | undefined = useMemo(() => {
    if (!custodyData?.vaultHubId || !hubsQ.data) return undefined;
    return hubsQ.data.find((h) => h.id === custodyData.vaultHubId);
  }, [custodyData?.vaultHubId, hubsQ.data]);

  // Gate query (only when we have a listing)
  const gateQ = usePublishGate(draftListingId ?? "", userId);

  /* ---------- Role Gate ---------- */
  const userRole = user?.role ?? "buyer";
  if (userRole !== "seller" && userRole !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-warning mb-3" />
        <h2 className="text-sm font-semibold text-text">Access Restricted</h2>
        <p className="mt-1 text-sm text-text-muted max-w-sm">
          Only seller or admin accounts may create listings. Log in with a seller account to access this feature.
        </p>
      </div>
    );
  }

  /* ================================================================
     STEP 1: Asset Details
     ================================================================ */
  if (step === 0) {
    return (
      <>
        <StepIndicator current={0} />
        <AssetStep onNext={(data) => { setAssetData(data); setStep(1); }} initial={assetData} />
      </>
    );
  }

  /* ================================================================
     STEP 2: Custody (Vault Selection)
     ================================================================ */
  if (step === 1) {
    return (
      <>
        <StepIndicator current={1} />
        <CustodyStep
          hubs={hubsQ.data ?? []}
          loading={hubsQ.isLoading}
          onNext={(data) => { setCustodyData(data); setStep(2); }}
          onBack={() => setStep(0)}
          initial={custodyData}
        />
      </>
    );
  }

  /* ================================================================
     STEP 3: Evidence Pack
     ================================================================ */
  if (step === 2) {
    // Create draft listing if not yet created
    const handleCreateDraft = async () => {
      if (draftListingId || !assetData || !custodyData || !selectedHub) return;
      const result = await createDraftMut.mutateAsync({
        title: assetData.title,
        form: assetData.form,
        purity: assetData.purity,
        totalWeightOz: assetData.totalWeightOz,
        pricePerOz: 0, // Will be set in step 4
        vaultHubId: custodyData.vaultHubId,
        vaultName: selectedHub.name,
        jurisdiction: selectedHub.country,
        sellerUserId: userId,
        sellerOrgId: orgId,
        sellerName,
      });
      setDraftListingId(result.id);
    };

    const handleCreateEvidence = async (type: ListingEvidenceType) => {
      if (!draftListingId) return;
      await createEvidenceMut.mutateAsync({
        listingId: draftListingId,
        evidenceType: type,
        userId,
      });
      setEvidenceCreated((prev) => new Set(prev).add(type));
    };

    return (
      <>
        <StepIndicator current={2} />
        <EvidenceStep
          draftListingId={draftListingId}
          onCreateDraft={handleCreateDraft}
          onCreateEvidence={handleCreateEvidence}
          evidenceCreated={evidenceCreated}
          isCreatingDraft={createDraftMut.isPending}
          isCreatingEvidence={createEvidenceMut.isPending}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      </>
    );
  }

  /* ================================================================
     STEP 4: Price & Review
     ================================================================ */
  if (step === 3) {
    const handlePublish = async (pricePerOz: number) => {
      if (!draftListingId) return;
      // First update price on the draft
      const { apiUpdateDraftListing } = await import("@/lib/api");
      await apiUpdateDraftListing(draftListingId, { pricePerOz });
      // Then publish
      const result = await publishMut.mutateAsync({
        listingId: draftListingId,
        userId,
      });
      if (result.gateResult.allowed) {
        router.push(`/sell/listings/${draftListingId}`);
      }
    };

    return (
      <>
        <StepIndicator current={3} />
        <PriceReviewStep
          assetData={assetData!}
          custodyData={custodyData!}
          hub={selectedHub}
          draftListingId={draftListingId}
          gateResult={gateQ.data ?? null}
          isGateLoading={gateQ.isLoading}
          onPublish={handlePublish}
          isPublishing={publishMut.isPending}
          publishResult={publishMut.data ?? null}
          onBack={() => setStep(2)}
        />
      </>
    );
  }

  return null;
}

/* ================================================================
   STEP COMPONENTS
   ================================================================ */

function AssetStep({ onNext, initial }: { onNext: (data: AssetFormData) => void; initial: AssetFormData | null }) {
  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: initial ?? { title: "", form: undefined, purity: undefined, totalWeightOz: 0 },
    mode: "onTouched",
  });

  return (
    <div className="max-w-lg">
      <h2 className="typo-h3 mb-1">Asset Details</h2>
      <p className="text-sm text-text-muted mb-6">Specify the gold form, purity, weight, and listing title.</p>

      <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
        {/* Title */}
        <div>
          <label className="typo-label mb-1.5 block" htmlFor="asset-title">Listing Title</label>
          <input
            id="asset-title"
            {...form.register("title")}
            className="w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors"
            placeholder="e.g. LBMA Good Delivery Bar — 400 oz"
          />
          {form.formState.errors.title && <p className="mt-1 text-xs text-danger">{form.formState.errors.title.message}</p>}
        </div>

        {/* Form */}
        <div>
          <label className="typo-label mb-1.5 block">Gold Form</label>
          <div className="flex gap-3">
            {(["bar", "coin"] as const).map((f) => (
              <label key={f} className={cn(
                "flex items-center gap-2 rounded-[var(--radius-input)] border px-4 py-2 cursor-pointer transition-colors text-sm",
                form.watch("form") === f ? "border-gold bg-gold/5 text-gold" : "border-border text-text-muted hover:bg-surface-2"
              )}>
                <input type="radio" value={f} {...form.register("form")} className="sr-only" />
                <span className="capitalize">{f}</span>
              </label>
            ))}
          </div>
          {form.formState.errors.form && <p className="mt-1 text-xs text-danger">{form.formState.errors.form.message}</p>}
        </div>

        {/* Purity */}
        <div>
          <label className="typo-label mb-1.5 block">Purity</label>
          <div className="flex gap-3">
            {(["995", "999", "9999"] as const).map((p) => (
              <label key={p} className={cn(
                "flex items-center gap-2 rounded-[var(--radius-input)] border px-4 py-2 cursor-pointer transition-colors text-sm tabular-nums",
                form.watch("purity") === p ? "border-gold bg-gold/5 text-gold" : "border-border text-text-muted hover:bg-surface-2"
              )}>
                <input type="radio" value={p} {...form.register("purity")} className="sr-only" />
                <span>.{p}</span>
              </label>
            ))}
          </div>
          {form.formState.errors.purity && <p className="mt-1 text-xs text-danger">{form.formState.errors.purity.message}</p>}
        </div>

        {/* Weight */}
        <div>
          <label className="typo-label mb-1.5 block" htmlFor="asset-weight">Total Weight (oz)</label>
          <input
            id="asset-weight"
            type="number"
            step="any"
            {...form.register("totalWeightOz", { valueAsNumber: true })}
            className="w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm tabular-nums text-text placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors"
            placeholder="Enter weight in troy ounces"
          />
          {form.formState.errors.totalWeightOz && <p className="mt-1 text-xs text-danger">{form.formState.errors.totalWeightOz.message}</p>}
        </div>

        <button
          type="submit"
          className="rounded-[var(--radius-input)] bg-gold px-5 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed"
        >
          Next: Custody →
        </button>
      </form>
    </div>
  );
}

function CustodyStep({
  hubs, loading, onNext, onBack, initial,
}: {
  hubs: Hub[];
  loading: boolean;
  onNext: (data: CustodyFormData) => void;
  onBack: () => void;
  initial: CustodyFormData | null;
}) {
  const form = useForm<CustodyFormData>({
    resolver: zodResolver(custodySchema),
    defaultValues: initial ?? { vaultHubId: "" },
    mode: "onTouched",
  });

  if (loading) return <LoadingState message="Loading custody hubs…" />;

  const custodyHubs = hubs.filter((h) => h.type === "custody" || h.type === "clearing");

  return (
    <div className="max-w-lg">
      <h2 className="typo-h3 mb-1">Custody Selection</h2>
      <p className="text-sm text-text-muted mb-6">Select the vault or clearing hub where the gold is held.</p>

      <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
        <div className="space-y-2">
          {custodyHubs.map((hub) => (
            <label
              key={hub.id}
              className={cn(
                "flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 cursor-pointer transition-all",
                form.watch("vaultHubId") === hub.id
                  ? "border-gold bg-gold/5"
                  : "border-border hover:bg-surface-2"
              )}
            >
              <input type="radio" value={hub.id} {...form.register("vaultHubId")} className="sr-only" />
              <div className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                form.watch("vaultHubId") === hub.id ? "border-gold bg-gold" : "border-border"
              )}>
                {form.watch("vaultHubId") === hub.id && <span className="h-2 w-2 rounded-full bg-bg" />}
              </div>
              <div>
                <p className="text-sm font-medium text-text">{hub.name}</p>
                <p className="text-xs text-text-faint">{hub.location} · {hub.type} · {hub.status}</p>
              </div>
            </label>
          ))}
        </div>
        {form.formState.errors.vaultHubId && <p className="mt-1 text-xs text-danger">{form.formState.errors.vaultHubId.message}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="rounded-[var(--radius-input)] border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2">
            ← Back
          </button>
          <button type="submit" className="rounded-[var(--radius-input)] bg-gold px-5 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover">
            Next: Evidence →
          </button>
        </div>
      </form>
    </div>
  );
}

const EVIDENCE_TYPES: { type: ListingEvidenceType; label: string; description: string }[] = [
  { type: "ASSAY_REPORT", label: "Certified Assay Report", description: "Independent laboratory assay certificate confirming purity and weight." },
  { type: "CHAIN_OF_CUSTODY", label: "Chain of Custody Certificate", description: "Documented custody chain from refiner to current vault." },
  { type: "SELLER_ATTESTATION", label: "Seller Attestation Declaration", description: "Seller declaration of title, ownership, and encumbrance status." },
];

function EvidenceStep({
  draftListingId, onCreateDraft, onCreateEvidence, evidenceCreated,
  isCreatingDraft, isCreatingEvidence, onNext, onBack,
}: {
  draftListingId: string | null;
  onCreateDraft: () => Promise<void>;
  onCreateEvidence: (type: ListingEvidenceType) => Promise<void>;
  evidenceCreated: Set<ListingEvidenceType>;
  isCreatingDraft: boolean;
  isCreatingEvidence: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  const allCreated = EVIDENCE_TYPES.every((e) => evidenceCreated.has(e.type));

  return (
    <div className="max-w-lg">
      <h2 className="typo-h3 mb-1">Evidence Pack</h2>
      <p className="text-sm text-text-muted mb-6">
        Create deterministic evidence stubs for the publish gate. All three types are required.
      </p>

      {/* Step 1: Create draft listing first */}
      {!draftListingId && (
        <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-5 mb-4">
          <p className="text-sm text-text mb-3">
            Before creating evidence, we need to save your listing as a draft.
          </p>
          <button
            onClick={onCreateDraft}
            disabled={isCreatingDraft}
            className="rounded-[var(--radius-input)] bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover disabled:opacity-50"
          >
            {isCreatingDraft ? (
              <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Draft…</span>
            ) : "Save Draft Listing"}
          </button>
        </div>
      )}

      {/* Step 2: Create evidence items */}
      {draftListingId && (
        <div className="space-y-3 mb-6">
          {EVIDENCE_TYPES.map((ev) => {
            const created = evidenceCreated.has(ev.type);
            return (
              <div key={ev.type} className={cn(
                "rounded-[var(--radius)] border px-4 py-3 transition-all",
                created ? "border-success/30 bg-success/5" : "border-border bg-surface-1"
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text">{ev.label}</p>
                    <p className="text-xs text-text-faint mt-0.5">{ev.description}</p>
                  </div>
                  {created ? (
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  ) : (
                    <button
                      onClick={() => onCreateEvidence(ev.type)}
                      disabled={isCreatingEvidence}
                      className="shrink-0 rounded-[var(--radius-input)] border border-gold/30 bg-gold/5 px-3 py-1 text-xs font-medium text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
                    >
                      {isCreatingEvidence ? "…" : "Create"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="rounded-[var(--radius-input)] border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2">
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!draftListingId}
          className="rounded-[var(--radius-input)] bg-gold px-5 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover disabled:opacity-50"
        >
          Next: Price & Review →
          {allCreated && <span className="ml-1">✓</span>}
        </button>
      </div>
    </div>
  );
}

function PriceReviewStep({
  assetData, custodyData, hub, draftListingId,
  gateResult, isGateLoading, onPublish, isPublishing, publishResult, onBack,
}: {
  assetData: AssetFormData;
  custodyData: CustodyFormData;
  hub: Hub | undefined;
  draftListingId: string | null;
  gateResult: import("@/lib/marketplace-engine").GateResult | null;
  isGateLoading: boolean;
  onPublish: (pricePerOz: number) => Promise<void>;
  isPublishing: boolean;
  publishResult: { listing: import("@/lib/mock-data").Listing; gateResult: import("@/lib/marketplace-engine").GateResult } | null;
  onBack: () => void;
}) {
  const form = useForm<PriceFormData>({
    resolver: zodResolver(priceSchema),
    defaultValues: { pricePerOz: 0 },
    mode: "onTouched",
  });

  const priceVal = form.watch("pricePerOz");
  const totalValue = (Number.isFinite(priceVal) && priceVal > 0)
    ? priceVal * assetData.totalWeightOz
    : 0;

  const canPublish = gateResult?.allowed === true && priceVal > 0;
  const publishFailed = publishResult && !publishResult.gateResult.allowed;

  const handleSubmit = async (data: PriceFormData) => {
    await onPublish(data.pricePerOz);
  };

  return (
    <div className="max-w-2xl">
      <h2 className="typo-h3 mb-1">Price & Review</h2>
      <p className="text-sm text-text-muted mb-6">Set the price per ounce and review the publish gate status before publishing.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Review summary */}
        <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-5 space-y-4">
          <h3 className="typo-label">Listing Summary</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-text-faint">Title</dt><dd className="text-text text-right max-w-[220px] truncate">{assetData.title}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Form</dt><dd className="text-text capitalize">{assetData.form}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Purity</dt><dd className="tabular-nums text-text">.{assetData.purity}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Weight</dt><dd className="tabular-nums text-text">{assetData.totalWeightOz} oz</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Vault</dt><dd className="text-text">{hub?.name ?? custodyData.vaultHubId}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Draft ID</dt><dd className="font-mono text-xs text-text">{draftListingId ?? "—"}</dd></div>
          </dl>
        </div>

        {/* Right: Price + Gate */}
        <div className="space-y-4">
          <form onSubmit={form.handleSubmit(handleSubmit)} id="price-form" className="rounded-[var(--radius)] border border-border bg-surface-1 p-5 space-y-4">
            <h3 className="typo-label">Price</h3>
            <div>
              <label className="typo-label mb-1.5 block" htmlFor="price-per-oz">Price per Troy Ounce ($)</label>
              <input
                id="price-per-oz"
                type="number"
                step="0.01"
                {...form.register("pricePerOz", { valueAsNumber: true })}
                className="w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm tabular-nums text-text placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent"
                placeholder="e.g. 2050.00"
              />
              {form.formState.errors.pricePerOz && <p className="mt-1 text-xs text-danger">{form.formState.errors.pricePerOz.message}</p>}
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-faint">Total Value</span>
                <span className="font-semibold tabular-nums text-text">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </form>

          {/* Publish Gate */}
          <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-5">
            <h3 className="typo-label mb-3">Publish Gate</h3>
            {isGateLoading ? (
              <div className="flex items-center gap-2 text-xs text-text-faint"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Evaluating gate…</div>
            ) : gateResult ? (
              <div className="space-y-2">
                <div className={cn(
                  "flex items-center gap-2 text-sm font-medium",
                  gateResult.allowed ? "text-success" : "text-danger"
                )}>
                  {gateResult.allowed ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {gateResult.allowed ? "All checks passed — ready to publish" : `${gateResult.blockers.length} blocker(s) found`}
                </div>
                {gateResult.blockers.length > 0 && (
                  <ul className="space-y-1.5 mt-2">
                    {gateResult.blockers.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-bold text-danger bg-danger/10">BLOCK</span>
                        <span className="text-text-muted">{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-faint">Gate will evaluate when listing draft is saved.</p>
            )}
          </div>

          {/* Publish result error */}
          {publishFailed && publishResult && (
            <div className="rounded-[var(--radius-sm)] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              Publish blocked: {publishResult.gateResult.blockers.join(" | ")}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button type="button" onClick={onBack} className="rounded-[var(--radius-input)] border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2">
          ← Back
        </button>
        <button
          type="submit"
          form="price-form"
          disabled={isPublishing || !canPublish}
          className={cn(
            "rounded-[var(--radius-input)] px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            canPublish ? "bg-gold text-bg hover:bg-gold-hover" : "bg-surface-3 text-text-faint"
          )}
        >
          {isPublishing ? (
            <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Publishing…</span>
          ) : "Publish Listing"}
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   PAGE
   ================================================================ */

export default function SellPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingState message="Loading wizard…" />}>
        <PageHeader
          title="Create Listing"
          description="Step-by-step listing wizard — asset, custody, evidence, pricing"
        />
        <div className="mt-6">
          <WizardContent />
        </div>
      </Suspense>
    </RequireAuth>
  );
}
