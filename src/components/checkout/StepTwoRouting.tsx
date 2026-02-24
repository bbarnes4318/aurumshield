"use client";

/* ================================================================
   STEP 2: DELIVERY ROUTING — Method Selection & Slide-to-Execute
   ================================================================
   Two selectable radio-cards for delivery method. If SECURE_DELIVERY
   is selected, a Zod-validated address form expands smoothly below,
   followed by a live Brink's rate quote card (D3 fix).

   Settlement is finalized via a custom "Slide-to-Execute" component
   instead of a standard button.

   D3 FIX: BrinksRateQuote now calls serverGetBrinksQuote action.
   D4 FIX: Financial summary shows notional + platform fee + delivery.
   D5 FIX: Added onSignatureComplete prop — gates navigation on BoS
           signature completion.
   ================================================================ */

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useFormContext } from "react-hook-form";
import {
  Landmark,
  Truck,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Package,
  MapPin,
  ArrowRight,
  FileSignature,
  Loader2,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import {
  DELIVERY_OPTIONS,
  type DeliveryMethod,
  type CheckoutFormData,
} from "@/lib/schemas/checkout-schema";
import {
  serverGetBrinksQuote,
  serverGetPlatformFeeEstimate,
  type BrinksQuoteResult,
  type PlatformFeeEstimateResult,
} from "@/lib/actions/checkout-actions";

/* ── Formatters ── */
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ── Icon map ── */
const DELIVERY_ICONS = {
  vault: Landmark,
  truck: Truck,
} as const;

/* ================================================================
   SlideToExecute — Custom slider submission control
   ================================================================ */

function SlideToExecute({
  onComplete,
  disabled,
  isSubmitting,
}: {
  onComplete: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [trackWidth, setTrackWidth] = useState(300);
  const startX = useRef(0);

  const THRESHOLD = 0.92;
  const KEYBOARD_STEP = 0.05;
  const thumbWidth = 48;

  /* Track width via ResizeObserver — avoids reading ref during render */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setTrackWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Complete handler (shared by pointer & keyboard) ── */
  const completeSlide = useCallback(() => {
    setIsComplete(true);
    setProgress(1);
    trackEvent("CheckoutExecuted", {});
    onComplete();
  }, [onComplete]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || isComplete || isSubmitting) return;
      setDragging(true);
      startX.current = e.clientX;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled, isComplete, isSubmitting]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const maxTravel = trackWidth - thumbWidth;
      const dx = Math.max(0, Math.min(e.clientX - startX.current, maxTravel));
      setProgress(dx / maxTravel);
    },
    [dragging, trackWidth]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (progress >= THRESHOLD) {
      completeSlide();
    } else {
      setProgress(0);
    }
  }, [dragging, progress, completeSlide]);

  /* ── Keyboard support: Left/Right arrow keys ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || isComplete || isSubmitting) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setProgress((prev) => {
          const next = Math.min(prev + KEYBOARD_STEP, 1);
          if (next >= THRESHOLD) {
            // Schedule completion after state update
            requestAnimationFrame(() => completeSlide());
          }
          return next;
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setProgress((prev) => Math.max(prev - KEYBOARD_STEP, 0));
      }
    },
    [disabled, isComplete, isSubmitting, completeSlide]
  );

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled || isComplete || isSubmitting ? -1 : 0}
      aria-label="Slide to confirm purchase"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative h-14 w-full select-none overflow-hidden rounded-xl border",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-2/40 focus-visible:ring-offset-2 focus-visible:ring-offset-color-1",
        isComplete
          ? "border-emerald-500/30 bg-emerald-500/8"
          : disabled
            ? "border-color-5/10 bg-color-1/30 opacity-50"
            : "border-color-5/20 bg-color-1/50"
      )}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isSubmitting ? (
          <div className="flex items-center gap-2 text-color-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-semibold tracking-wider uppercase">
              Processing…
            </span>
          </div>
        ) : isComplete ? (
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-semibold tracking-wider uppercase">
              Executed
            </span>
          </div>
        ) : (
          <span
            className={cn(
              "text-xs font-semibold tracking-wider uppercase",
              disabled ? "text-color-3/20" : "text-color-3/30"
            )}
          >
            Slide to Execute Settlement
          </span>
        )}
      </div>

      {/* Draggable thumb */}
      {!isComplete && !isSubmitting && (
        <div
          onPointerDown={handlePointerDown}
          className={cn(
            "absolute top-1 left-1 bottom-1 z-10 flex items-center justify-center",
            "rounded-lg cursor-grab active:cursor-grabbing touch-none",
            "bg-color-2 text-color-1 transition-shadow",
            "shadow-[0_0_12px_rgba(208,168,92,0.3)]",
            disabled ? "opacity-40 cursor-not-allowed" : ""
          )}
          style={{
            width: thumbWidth,
            transform: `translateX(${progress * (trackWidth - thumbWidth - 8)}px)`,
            transition: dragging ? "none" : "transform 0.3s ease-out",
          }}
        >
          <ArrowRight
            className="h-5 w-5 animate-[slide-hint_2s_ease-in-out_infinite]"
            style={{
              animation: dragging || progress > 0 ? "none" : undefined,
            }}
          />
          {/* Keyframe for gentle horizontal float */}
          <style>{`
            @keyframes slide-hint {
              0%, 100% { transform: translateX(0); }
              50% { transform: translateX(3px); }
            }
          `}</style>
        </div>
      )}

      {/* Progress fill */}
      {!isComplete && !isSubmitting && (
        <div
          className="absolute top-0 left-0 h-full bg-color-2/5 pointer-events-none transition-all"
          style={{
            width: `${progress * 100}%`,
            transition: dragging ? "none" : "width 0.3s ease-out",
          }}
        />
      )}
    </div>
  );
}

/* ================================================================
   Brink's Rate Quote Card — D3 FIX: Uses serverGetBrinksQuote
   ================================================================ */

function BrinksRateQuote({
  weightOz,
  notionalUsd,
}: {
  weightOz: number;
  notionalUsd: number;
}) {
  const [quote, setQuote] = useState<BrinksQuoteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (weightOz <= 0 || notionalUsd <= 0) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    serverGetBrinksQuote({
      weightOz,
      notionalUsd,
      countryCode: "US", // TODO: Derive from shipping address country
    })
      .then((result) => {
        if (!cancelled) {
          setQuote(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[AurumShield] Brink's quote failed:", err);
          setError("Rate quote unavailable");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [weightOz, notionalUsd]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-color-5/15 bg-color-1/30 px-4 py-3 flex items-center gap-2 text-xs text-color-3/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Fetching Brink&apos;s rate quote…
      </div>
    );
  }

  if (error || !quote) {
    // Fallback to simulated rates if server action fails
    const baseFee = weightOz * 2.5;
    const armoredFee = 150;
    const insurance = weightOz * 1.25;
    const totalShipping = baseFee + armoredFee + insurance;

    return (
      <div className="rounded-lg border border-color-5/15 bg-color-1/30 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-3.5 w-3.5 text-color-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-color-3/50">
            Brink&apos;s Global Services — Rate Quote (Est.)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <span className="text-color-3/40">Transport Fee</span>
          <span className="font-mono tabular-nums text-color-3 text-right">
            ${fmtUsd(baseFee)}
          </span>
          <span className="text-color-3/40">Armored Surcharge</span>
          <span className="font-mono tabular-nums text-color-3 text-right">
            ${fmtUsd(armoredFee)}
          </span>
          <span className="text-color-3/40">Insurance (All-Risk)</span>
          <span className="font-mono tabular-nums text-color-3 text-right">
            ${fmtUsd(insurance)}
          </span>
          <span className="text-color-3/50 font-semibold border-t border-color-5/10 pt-1.5">
            Total Shipping
          </span>
          <span className="font-mono tabular-nums text-color-2 font-semibold text-right border-t border-color-5/10 pt-1.5">
            ${fmtUsd(totalShipping)}
          </span>
        </div>
        <p className="text-[10px] text-color-3/30 italic">
          Est. delivery: 5–7 business days · Fully insured · GPS-tracked
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-color-5/15 bg-color-1/30 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Package className="h-3.5 w-3.5 text-color-2" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-color-3/50">
          {quote.carrier} — Rate Quote
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <span className="text-color-3/40">Transport Fee</span>
        <span className="font-mono tabular-nums text-color-3 text-right">
          ${fmtUsd(quote.baseFee)}
        </span>

        <span className="text-color-3/40">Handling &amp; Packaging</span>
        <span className="font-mono tabular-nums text-color-3 text-right">
          ${fmtUsd(quote.handlingFee)}
        </span>

        <span className="text-color-3/40">Insurance (All-Risk)</span>
        <span className="font-mono tabular-nums text-color-3 text-right">
          ${fmtUsd(quote.insuranceFee)}
        </span>

        <span className="text-color-3/50 font-semibold border-t border-color-5/10 pt-1.5">
          Total Shipping
        </span>
        <span className="font-mono tabular-nums text-color-2 font-semibold text-right border-t border-color-5/10 pt-1.5">
          ${fmtUsd(quote.totalFee)}
        </span>
      </div>
      <p className="text-[10px] text-color-3/30 italic">
        Est. delivery: {quote.estimatedDays} business days · Fully insured · GPS-tracked ·
        Quote valid {quote.validForMinutes} min
      </p>
    </div>
  );
}

/* ================================================================
   Financial Summary — D4 FIX: Shows notional + fees + delivery
   ================================================================ */

function FinancialSummary({
  notionalUsd,
}: {
  notionalUsd: number;
}) {
  const [feeEstimate, setFeeEstimate] = useState<PlatformFeeEstimateResult | null>(null);

  useEffect(() => {
    if (notionalUsd <= 0) return;

    let cancelled = false;
    const notionalCents = Math.round(notionalUsd * 100);

    serverGetPlatformFeeEstimate({ notionalCents })
      .then((result) => {
        if (!cancelled) setFeeEstimate(result);
      })
      .catch((err) => {
        console.warn("[AurumShield] Fee estimate failed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [notionalUsd]);

  if (!feeEstimate) return null;

  return (
    <div className="rounded-lg border border-color-5/15 bg-color-1/30 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <DollarSign className="h-3.5 w-3.5 text-color-2" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-color-3/50">
          Fee Schedule
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <span className="text-color-3/40">
          Indemnification ({feeEstimate.bps / 100}%)
        </span>
        <span className="font-mono tabular-nums text-color-3 text-right">
          {feeEstimate.feeUsd}
        </span>
      </div>
      <p className="text-[10px] text-color-3/30 italic">
        Add-on fees (compliance, insurance upgrades) calculated at settlement finalization.
      </p>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

interface StepTwoRoutingProps {
  onSubmit: () => void;
  isSubmitting: boolean;
  /** Embedded Dropbox Sign URL for Bill of Sale signing */
  signingUrl?: string | null;
  /** Signature request ID for tracking */
  signatureRequestId?: string | null;
  /** D5 FIX: Called when the buyer completes BoS signature */
  onSignatureComplete?: () => void;
}

export function StepTwoRouting({
  onSubmit,
  isSubmitting,
  signingUrl,
  signatureRequestId,
  onSignatureComplete,
}: StepTwoRoutingProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CheckoutFormData>();

  const deliveryMethod = watch("deliveryMethod");
  const weightOz = watch("weightOz");
  const lockedPrice = watch("lockedPrice");
  const notional = (weightOz || 0) * (lockedPrice || 0);

  const selectDelivery = (method: DeliveryMethod) => {
    setValue("deliveryMethod", method, { shouldValidate: true });
    if (method === "VAULT_CUSTODY") {
      setValue("shippingAddress", undefined);
    }
    trackEvent("DeliveryOptionSelected", { method });
  };

  const addressErrors = errors.shippingAddress as
    | Record<string, { message?: string }>
    | undefined;

  /**
   * D5 FIX: Listen for postMessage from Dropbox Sign embedded iFrame.
   * The HS embedded SDK sends a "signature_request_all_signed" event
   * when all parties have signed. In embedded mode (iFrame), the
   * signed message is sent via window.postMessage.
   */
  useEffect(() => {
    if (!signingUrl || !onSignatureComplete) return;

    const handleMessage = (event: MessageEvent) => {
      // Dropbox Sign embedded SDK sends events via postMessage
      if (
        typeof event.data === "string" &&
        (event.data.includes("signature_request_all_signed") ||
          event.data.includes('"type":"signature_request_signed"'))
      ) {
        console.log("[AurumShield] BoS signature completed via postMessage");
        onSignatureComplete();
      }

      // Also handle JSON-formatted events
      if (typeof event.data === "object" && event.data !== null) {
        const data = event.data as Record<string, unknown>;
        if (
          data.type === "hellosign:userFinishRequest" ||
          data.type === "hellosign:userSignRequest" ||
          data.event === "signature_request_all_signed"
        ) {
          console.log("[AurumShield] BoS signature completed via SDK event");
          onSignatureComplete();
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [signingUrl, onSignatureComplete]);

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          Delivery &amp; Settlement
        </h2>
      </div>

      {/* ── Order Summary ── */}
      <div className="rounded-lg border border-color-2/15 bg-color-2/5 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-color-3/40">
            Locked Order
          </p>
          <p className="font-mono text-sm tabular-nums text-color-3">
            {weightOz?.toLocaleString() ?? "—"} oz @ $
            {fmtUsd(lockedPrice || 0)}/oz
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-color-3/40">
            Notional
          </p>
          <p className="font-mono text-lg font-bold tabular-nums text-color-2">
            ${fmtUsd(notional)}
          </p>
        </div>
      </div>

      {/* ── D4 FIX: Financial Summary (platform fee) ── */}
      {notional > 0 && <FinancialSummary notionalUsd={notional} />}

      {/* ── Delivery Method Radio Cards ── */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-color-3/40 font-semibold mb-2">
          Select Delivery Method
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DELIVERY_OPTIONS.map((opt) => {
            const Icon = DELIVERY_ICONS[opt.icon];
            const isSelected = deliveryMethod === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => selectDelivery(opt.value)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-lg border px-4 py-3.5 text-left",
                  "transition-all duration-150",
                  isSelected
                    ? "border-color-2/40 bg-color-2/8 shadow-[0_0_16px_rgba(208,168,92,0.06)]"
                    : "border-color-5/15 bg-color-1/30 hover:border-color-5/30 hover:bg-color-1/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      isSelected ? "bg-color-2/15" : "bg-color-5/10"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isSelected ? "text-color-2" : "text-color-3/40"
                      )}
                    />
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isSelected ? "text-color-2" : "text-color-3"
                      )}
                    >
                      {opt.label}
                    </p>
                  </div>
                  {/* Radio indicator */}
                  <div
                    className={cn(
                      "ml-auto h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      isSelected
                        ? "border-color-2 bg-color-2"
                        : "border-color-5/30"
                    )}
                  >
                    {isSelected && (
                      <div className="h-1.5 w-1.5 rounded-full bg-color-1" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-color-3/50 leading-relaxed">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
        {errors.deliveryMethod && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
            <AlertTriangle className="h-3 w-3" />
            {errors.deliveryMethod.message}
          </p>
        )}
      </div>

      {/* ── Conditional Address Form (SECURE_DELIVERY) ── */}
      {deliveryMethod === "SECURE_DELIVERY" && (
        <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-color-2" />
            <p className="text-[10px] uppercase tracking-widest text-color-3/40 font-semibold">
              Delivery Address
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AddressField
              label="Recipient Name"
              name="shippingAddress.recipientName"
              placeholder="Full legal name"
              register={register}
              error={addressErrors?.recipientName?.message}
              fullWidth
            />
            <AddressField
              label="Street Address"
              name="shippingAddress.addressLine1"
              placeholder="123 Main Street"
              register={register}
              error={addressErrors?.addressLine1?.message}
              fullWidth
            />
            <AddressField
              label="Address Line 2"
              name="shippingAddress.addressLine2"
              placeholder="Suite, unit, building (optional)"
              register={register}
              error={addressErrors?.addressLine2?.message}
              fullWidth
            />
            <AddressField
              label="City"
              name="shippingAddress.city"
              placeholder="City"
              register={register}
              error={addressErrors?.city?.message}
            />
            <AddressField
              label="State / Province"
              name="shippingAddress.stateProvince"
              placeholder="State"
              register={register}
              error={addressErrors?.stateProvince?.message}
            />
            <AddressField
              label="Postal Code"
              name="shippingAddress.postalCode"
              placeholder="10001"
              register={register}
              error={addressErrors?.postalCode?.message}
            />
            <AddressField
              label="Country"
              name="shippingAddress.country"
              placeholder="United States"
              register={register}
              error={addressErrors?.country?.message}
            />
          </div>

          {/* ── D3 FIX: Brink's Rate Quote via server action ── */}
          <BrinksRateQuote
            weightOz={weightOz || 0}
            notionalUsd={notional}
          />
        </div>
      )}

      {/* ── Vault Custody Confirmation ── */}
      {deliveryMethod === "VAULT_CUSTODY" && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 animate-in slide-in-from-top-2 fade-in duration-300">
          <Shield className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
          <p className="text-xs text-color-3/60 leading-relaxed">
            Your gold will remain in its current certified vault under allocated
            custody. Ownership is transferred on the ledger immediately upon
            settlement finality. Zero custody fees for the first 90 days.
          </p>
        </div>
      )}

      {/* ── Slide-to-Execute ── */}
      {deliveryMethod && (
        <div className="pt-2">
          <SlideToExecute
            onComplete={onSubmit}
            disabled={!deliveryMethod}
            isSubmitting={isSubmitting}
          />
          <p className="text-center text-[10px] text-color-3/30 mt-2">
            By executing, you agree to AurumShield&apos;s settlement terms and
            delivery conditions.
          </p>
        </div>
      )}

      {/* ── Dropbox Sign Embedded iFrame ── */}
      {signingUrl && (
        <div className="space-y-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="flex items-center gap-2">
            <FileSignature className="h-3.5 w-3.5 text-color-2" />
            <p className="text-[10px] uppercase tracking-widest text-color-3/40 font-semibold">
              Bill of Sale — Digital Signature
            </p>
            {signatureRequestId && (
              <span className="ml-auto text-[9px] font-mono text-color-3/20 truncate max-w-[120px]">
                {signatureRequestId}
              </span>
            )}
          </div>
          <div className="rounded-lg border border-color-5/15 overflow-hidden bg-white">
            <iframe
              src={signingUrl}
              title="Dropbox Sign — Bill of Sale"
              className="w-full border-0"
              style={{ height: 500 }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
          <p className="text-[10px] text-color-3/25 text-center">
            Powered by Dropbox Sign · Legally binding electronic signature
          </p>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Address Field — reusable form input
   ================================================================ */

function AddressField({
  label,
  name,
  placeholder,
  register,
  error,
  fullWidth,
}: {
  label: string;
  name: string;
  placeholder: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  error?: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <label
        htmlFor={`addr-${name}`}
        className="text-[10px] uppercase tracking-widest text-color-3/40 font-semibold mb-1 block"
      >
        {label}
      </label>
      <input
        id={`addr-${name}`}
        type="text"
        placeholder={placeholder}
        className={cn(
          "w-full rounded-lg border bg-color-1/50 px-3 py-2",
          "text-sm text-color-3 placeholder:text-color-3/20",
          "focus:outline-none focus:ring-2 focus:ring-color-2/30 focus:border-color-2/40",
          "transition-colors",
          error ? "border-red-500/50" : "border-color-5/20"
        )}
        {...register(name)}
      />
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
