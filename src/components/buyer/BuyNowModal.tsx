"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Timer,
  RotateCcw,
} from "lucide-react";
import { useAtomicBuy, type AtomicBuyStep } from "@/hooks/use-atomic-buy";
import { useDeliveryRate, useSubmitDeliveryPreference } from "@/hooks/use-delivery-queries";
import { DeliveryMethodSelector } from "./DeliveryMethodSelector";
import { AddressCaptureForm } from "./AddressCaptureForm";
import { DeliveryRateCard } from "./DeliveryRateCard";
import { deliveryAddressSchema } from "@/lib/delivery/delivery-types";
import type { DeliveryMethod, DeliveryAddress } from "@/lib/delivery/delivery-types";
import type { Listing, InventoryPosition } from "@/lib/mock-data";

/* ================================================================
   Zod Schemas
   ================================================================ */

const buySchema = z.object({
  weightOz: z
    .number({ message: "Enter a valid weight" })
    .positive("Weight must be greater than zero"),
});
type BuyFormData = z.infer<typeof buySchema>;

/* ================================================================
   Step Progress Indicator
   ================================================================ */

const STEP_LABELS: Record<AtomicBuyStep, string> = {
  idle: "",
  executing: "Executing atomic checkout…",
  polling: "Confirming transaction…",
  done: "Buy order confirmed",
  error: "Transaction failed",
};

function StepIndicator({ step }: { step: AtomicBuyStep }) {
  if (step === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2.5 text-xs font-medium",
        step === "executing" &&
          "border-gold/20 bg-gold/5 text-gold",
        step === "done" &&
          "border-success/20 bg-success/5 text-success",
        step === "error" &&
          "border-danger/20 bg-danger/5 text-danger",
      )}
    >
      {step === "executing" && (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      )}
      {step === "done" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {step === "error" && <AlertTriangle className="h-3.5 w-3.5" />}
      <span>{STEP_LABELS[step]}</span>
    </div>
  );
}

/* ================================================================
   Lock Countdown Timer — 10-minute deterministic lock
   ================================================================ */

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const WARN_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
const CRITICAL_THRESHOLD_MS = 30 * 1000;  // 30 seconds

function LockCountdown({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const elapsed = now - startedAt;
  const remaining = Math.max(0, LOCK_DURATION_MS - elapsed);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const progress = Math.max(0, Math.min(1, remaining / LOCK_DURATION_MS));

  const isWarn = remaining <= WARN_THRESHOLD_MS && remaining > CRITICAL_THRESHOLD_MS;
  const isCritical = remaining <= CRITICAL_THRESHOLD_MS;
  const isExpired = remaining <= 0;

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-medium text-danger">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Price lock expired — please start a new order</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-sm border px-3 py-2 text-xs font-medium tabular-nums transition-colors",
        isCritical && "border-danger/30 bg-danger/5 text-danger animate-pulse",
        isWarn && "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
        !isWarn && !isCritical && "border-border bg-surface-2 text-text-muted",
      )}
    >
      <Timer className={cn("h-3.5 w-3.5", isCritical && "animate-bounce")} />
      <span>
        Price locked for{" "}
        <span className="font-semibold">
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </span>
      {/* Mini progress ring */}
      <svg className="ml-auto h-4 w-4 -rotate-90" viewBox="0 0 20 20">
        <circle
          cx="10" cy="10" r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity={0.15}
        />
        <circle
          cx="10" cy="10" r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${progress * 50.27} 50.27`}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/* ================================================================
   Checkout Step Indicator (1 → 2)
   ================================================================ */

function CheckoutStepBar({ currentStep }: { currentStep: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border bg-surface-2/50">
      {/* Step 1 */}
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
            currentStep >= 1
              ? "bg-gold text-bg"
              : "bg-surface-3 text-text-faint",
          )}
        >
          {currentStep > 1 ? <CheckCircle2 className="h-3 w-3" /> : "1"}
        </div>
        <span
          className={cn(
            "text-[11px] font-medium",
            currentStep >= 1 ? "text-text" : "text-text-faint",
          )}
        >
          Order
        </span>
      </div>

      {/* Connector */}
      <div
        className={cn(
          "h-px flex-1",
          currentStep >= 2 ? "bg-gold/40" : "bg-border",
        )}
      />

      {/* Step 2 */}
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
            currentStep >= 2
              ? "bg-gold text-bg"
              : "bg-surface-3 text-text-faint",
          )}
        >
          2
        </div>
        <span
          className={cn(
            "text-[11px] font-medium",
            currentStep >= 2 ? "text-text" : "text-text-faint",
          )}
        >
          Delivery
        </span>
      </div>
    </div>
  );
}

/* ================================================================
   BuyNowModal Component — 2-Step Checkout
   ================================================================ */

interface BuyNowModalProps {
  listing: Listing;
  inventory: InventoryPosition | undefined;
  onClose: () => void;
}

const MOCK_USER_ID = "user-1";

export function BuyNowModal({ listing, inventory, onClose }: BuyNowModalProps) {
  const router = useRouter();
  const atomicBuy = useAtomicBuy();
  const deliveryPrefMutation = useSubmitDeliveryPreference();
  const available = inventory?.availableWeightOz ?? 0;
  /** Timestamp when the modal opened — used for countdown */
  const [lockStartedAt] = useState(() => Date.now());

  /* --- Step State --- */
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("vault_custody");

  /* --- Buy Form (Step 1) --- */
  const form = useForm<BuyFormData>({
    resolver: zodResolver(buySchema),
    defaultValues: { weightOz: 0 },
    mode: "onTouched",
  });

  /* --- Address Form (Step 2) --- */
  const addressForm = useForm<DeliveryAddress>({
    resolver: zodResolver(deliveryAddressSchema),
    defaultValues: {
      fullName: "",
      streetAddress: "",
      streetAddress2: "",
      city: "",
      stateProvince: "",
      postalCode: "",
      country: "",
      phone: "",
    },
    mode: "onTouched",
  });

  const weightVal = form.watch("weightOz");
  const total =
    Number.isFinite(weightVal) && weightVal > 0
      ? weightVal * listing.pricePerOz
      : 0;
  const exceedsAvailable = weightVal > available;

  /* --- Delivery Rate Query --- */
  const addressValues = addressForm.watch();
  const isAddressComplete =
    deliveryMethod === "secure_delivery" &&
    !!addressValues.fullName &&
    !!addressValues.streetAddress &&
    !!addressValues.city &&
    !!addressValues.stateProvince &&
    !!addressValues.postalCode &&
    !!addressValues.country &&
    !!addressValues.phone;

  const rateQuery = useDeliveryRate(
    isAddressComplete ? addressValues : null,
    weightVal,
    total,
  );

  // Close on Escape (but not during pending or error state)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !atomicBuy.isPending && atomicBuy.step !== "error") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, atomicBuy.isPending, atomicBuy.step]);

  /* --- Step 1 → Step 2 --- */
  const handleAdvanceToDelivery = useCallback(() => {
    if (exceedsAvailable || !weightVal || weightVal <= 0) return;
    setCheckoutStep(2);
  }, [exceedsAvailable, weightVal]);

  /* --- Final Submit --- */
  const onSubmit = useCallback(
    async () => {
      const data = form.getValues();
      if (data.weightOz > available) {
        form.setError("weightOz", {
          message: `Exceeds available ${available} oz`,
        });
        setCheckoutStep(1);
        return;
      }

      // Validate address if secure delivery
      if (deliveryMethod === "secure_delivery") {
        const addressValid = await addressForm.trigger();
        if (!addressValid) return;
      }

      try {
        const result = await atomicBuy.execute({
          listingId: listing.id,
          userId: MOCK_USER_ID,
          weightOz: data.weightOz,
          // TODO(RSK-004): BuyNowModal is a legacy demo path.
          // In production, this modal must go through the price-lock flow.
          quoteId: "",
        });

        // Save delivery preference
        // Note: settlementId would come from the backend in production.
        // For the mock, we use the order ID as reference.
        deliveryPrefMutation.mutate({
          settlementId: result.order.id,
          method: deliveryMethod,
          address: deliveryMethod === "secure_delivery" ? addressForm.getValues() : undefined,
          rateQuote: deliveryMethod === "secure_delivery" ? rateQuery.data ?? undefined : undefined,
        });

        // Brief delay to show success state, then redirect
        setTimeout(() => {
          router.push(`/orders/${result.order.id}`);
        }, 800);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transaction failed";
        form.setError("weightOz", { message });
      }
    },
    [available, atomicBuy, listing.id, listing.pricePerOz, form, router, deliveryMethod, addressForm, rateQuery.data, deliveryPrefMutation],
  );

  const isPending = atomicBuy.isPending;
  const isDone = atomicBuy.step === "done";
  const isError = atomicBuy.step === "error";

  /** Reset error state and allow retry without closing the modal */
  const handleRetry = useCallback(() => {
    atomicBuy.reset();
    form.clearErrors();
  }, [atomicBuy, form]);

  /** Can proceed to confirm from step 2 */
  const canConfirmDelivery =
    deliveryMethod === "vault_custody" ||
    (deliveryMethod === "secure_delivery" && isAddressComplete && !!rateQuery.data);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm"
      onClick={isPending || isDone || isError ? undefined : onClose}
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius)] border border-border bg-surface-1 shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text flex items-center gap-2">
              <Lock className="h-4 w-4 text-gold" />
              Buy Gold
            </h2>
            <p className="mt-0.5 text-xs text-text-faint">
              Atomic lock + order in one step. Price guaranteed for 10 minutes.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-[var(--radius-sm)] p-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Bar */}
        <CheckoutStepBar currentStep={checkoutStep} />

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* ===== STEP 1: Order Details ===== */}
          {checkoutStep === 1 && (
            <>
              {/* Listing summary */}
              <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-faint">Listing</span>
                  <span className="font-mono text-text text-xs">
                    {listing.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-faint">Title</span>
                  <span className="text-text text-right max-w-[200px] truncate">
                    {listing.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-faint">Purity</span>
                  <span className="tabular-nums text-text">
                    {listing.purity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-faint">Available</span>
                  <span className="tabular-nums text-text">
                    {available} oz
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-faint">Price / oz</span>
                  <span className="tabular-nums text-text">
                    $
                    {listing.pricePerOz.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Weight form */}
              <form id="buy-form">
                <label
                  className="typo-label mb-1.5 block"
                  htmlFor="buy-weight"
                >
                  Weight (oz)
                </label>
                <input
                  id="buy-weight"
                  type="number"
                  step="any"
                  disabled={isPending || isDone}
                  {...form.register("weightOz", { valueAsNumber: true })}
                  className={cn(
                    "w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm tabular-nums text-text",
                    "placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors",
                    exceedsAvailable && "border-danger",
                    (isPending || isDone) && "opacity-60",
                  )}
                  placeholder="Enter weight in troy ounces"
                  data-tour="buy-weight-input"
                />
                {form.formState.errors.weightOz && (
                  <p className="mt-1 text-xs text-danger">
                    {form.formState.errors.weightOz.message}
                  </p>
                )}
                {exceedsAvailable && !form.formState.errors.weightOz && (
                  <p className="mt-1 text-xs text-danger">
                    Exceeds available {available} oz — deterministic
                    rejection.
                  </p>
                )}
              </form>

              {/* Notional total */}
              <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-faint">Total Notional</span>
                  <span className="font-semibold tabular-nums text-text">
                    $
                    {total.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Lock countdown timer */}
              {!isDone && <LockCountdown startedAt={lockStartedAt} />}

              <p className="text-[11px] text-text-faint">
                This action will atomically reserve inventory and create a
                buy order. Price is locked for 10 minutes.
              </p>
            </>
          )}

          {/* ===== STEP 2: Delivery Selection ===== */}
          {checkoutStep === 2 && (
            <>
              {/* Order summary compact */}
              <div className="rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-text-faint">Order</span>
                  <span className="tabular-nums text-text">
                    {weightVal} oz @ $
                    {listing.pricePerOz.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    = ${total.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Lock countdown stays visible */}
              {!isDone && <LockCountdown startedAt={lockStartedAt} />}

              {/* Delivery Method Selection */}
              <DeliveryMethodSelector
                value={deliveryMethod}
                onChange={setDeliveryMethod}
                disabled={isPending || isDone}
              />

              {/* Address Form (only for secure delivery) */}
              {deliveryMethod === "secure_delivery" && (
                <FormProvider {...addressForm}>
                  <AddressCaptureForm disabled={isPending || isDone} />
                </FormProvider>
              )}

              {/* Rate Card (only for secure delivery with complete address) */}
              {deliveryMethod === "secure_delivery" && isAddressComplete && (
                <DeliveryRateCard
                  quote={rateQuery.data ?? null}
                  isLoading={rateQuery.isLoading}
                  error={rateQuery.error}
                />
              )}

              {/* Step indicator */}
              <StepIndicator step={atomicBuy.step} />

              {/* Error detail with retry CTA */}
              {isError && atomicBuy.error && (
                <div className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-danger">
                        Transaction Failed
                      </p>
                      <p className="text-xs text-danger/80 mt-0.5">
                        {atomicBuy.error}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 rounded-sm border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Try Again
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 shrink-0">
          {/* Left side — Back button on Step 2 */}
          <div>
            {checkoutStep === 2 && !isPending && !isDone && (
              <button
                type="button"
                onClick={() => setCheckoutStep(1)}
                className="flex items-center gap-1.5 rounded-[var(--radius-input)] border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
          </div>

          {/* Right side — Primary actions */}
          <div className="flex items-center gap-3">
            {isDone ? (
              <button
                type="button"
                onClick={() =>
                  router.push(`/orders/${atomicBuy.result?.order.id}`)
                }
                className="rounded-[var(--radius-input)] bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover flex items-center gap-1.5"
                data-tour="buy-go-to-order"
              >
                Go to Transaction
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : checkoutStep === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="rounded-[var(--radius-input)] border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdvanceToDelivery}
                  disabled={
                    exceedsAvailable ||
                    !weightVal ||
                    weightVal <= 0
                  }
                  className="rounded-[var(--radius-input)] bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  data-tour="buy-next-step"
                >
                  Next: Delivery
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="rounded-[var(--radius-input)] border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={
                    isPending ||
                    !canConfirmDelivery
                  }
                  className="rounded-[var(--radius-input)] bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  data-tour="buy-confirm-cta"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      Confirm Purchase
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
