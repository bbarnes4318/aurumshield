"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { useAtomicBuy, type AtomicBuyStep } from "@/hooks/use-atomic-buy";
import type { Listing, InventoryPosition } from "@/lib/mock-data";

/* ================================================================
   Zod Schema — weight validation
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
  reserving: "Locking inventory…",
  converting: "Creating order…",
  done: "Buy order confirmed",
  error: "Transaction failed",
};

function StepIndicator({ step }: { step: AtomicBuyStep }) {
  if (step === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2.5 text-xs font-medium",
        step === "reserving" &&
          "border-gold/20 bg-gold/5 text-gold",
        step === "converting" &&
          "border-gold/20 bg-gold/5 text-gold",
        step === "done" &&
          "border-success/20 bg-success/5 text-success",
        step === "error" &&
          "border-danger/20 bg-danger/5 text-danger",
      )}
    >
      {(step === "reserving" || step === "converting") && (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      )}
      {step === "done" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {step === "error" && <AlertTriangle className="h-3.5 w-3.5" />}
      <span>{STEP_LABELS[step]}</span>

      {/* Sub-step dots */}
      {(step === "reserving" || step === "converting") && (
        <div className="ml-auto flex items-center gap-1">
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              step === "reserving"
                ? "bg-gold animate-pulse"
                : "bg-success",
            )}
          />
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              step === "converting"
                ? "bg-gold animate-pulse"
                : "bg-border",
            )}
          />
        </div>
      )}
    </div>
  );
}

/* ================================================================
   BuyNowModal Component
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
  const available = inventory?.availableWeightOz ?? 0;

  const form = useForm<BuyFormData>({
    resolver: zodResolver(buySchema),
    defaultValues: { weightOz: 0 },
    mode: "onTouched",
  });

  const weightVal = form.watch("weightOz");
  const total =
    Number.isFinite(weightVal) && weightVal > 0
      ? weightVal * listing.pricePerOz
      : 0;
  const exceedsAvailable = weightVal > available;

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !atomicBuy.isPending) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, atomicBuy.isPending]);

  const onSubmit = useCallback(
    async (data: BuyFormData) => {
      if (data.weightOz > available) {
        form.setError("weightOz", {
          message: `Exceeds available ${available} oz`,
        });
        return;
      }

      try {
        const result = await atomicBuy.execute({
          listingId: listing.id,
          userId: MOCK_USER_ID,
          weightOz: data.weightOz,
          notional: data.weightOz * listing.pricePerOz,
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
    [available, atomicBuy, listing.id, listing.pricePerOz, form, router],
  );

  const isPending = atomicBuy.isPending;
  const isDone = atomicBuy.step === "done";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm"
      onClick={isPending || isDone ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius)] border border-border bg-surface-1 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
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

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
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
          <form onSubmit={form.handleSubmit(onSubmit)} id="buy-form">
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
              {...form.register("weightOz")}
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

          {/* Step indicator */}
          <StepIndicator step={atomicBuy.step} />

          {/* Error detail */}
          {atomicBuy.error && (
            <p className="text-xs text-danger">{atomicBuy.error}</p>
          )}

          <p className="text-[11px] text-text-faint">
            This action will atomically reserve inventory and create a
            buy order. Price is locked for 10 minutes.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
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
                type="submit"
                form="buy-form"
                disabled={
                  isPending ||
                  exceedsAvailable ||
                  !weightVal ||
                  weightVal <= 0
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
                    Buy Now
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
