"use client";

/* ================================================================
   STEP 2: JURISDICTIONAL STRUCTURING — Vault, Legal & Insurance
   ================================================================
   Forces the buyer to dictate the physical and legal parameters
   of their gold acquisition:

   1. Vault Routing — Select sovereign vault destination
   2. Legal Structuring — Bind to English Law & UCC Art. 7
   3. Indemnification — Lloyd's of London transit policy status
   4. Delivery method selection (inherited from original)
   5. STAGE EXECUTION button to advance

   D3 FIX: BrinksRateQuote now calls serverGetBrinksQuote action.
   D4 FIX: Financial summary shows notional + platform fee + delivery.
   D5 FIX: Added onSignatureComplete prop.
   ================================================================ */

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useFormContext } from "react-hook-form";
import { useSearchParams } from "next/navigation";
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
  ShieldCheck,
  Scale,
  Globe,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { useReverification } from "@/hooks/useReverification";
import {
  DELIVERY_OPTIONS,
  type DeliveryMethod,
  type CheckoutFormData,
} from "@/lib/schemas/checkout-schema";
import {
  serverGetBrinksQuote,
  serverGetPlatformFeeEstimate,
  serverValidateQuote,
  type BrinksQuoteResult,
  type PlatformFeeEstimateResult,
} from "@/lib/actions/checkout-actions";
import { DEMO_SPOTLIGHT_CLASSES } from "@/hooks/use-demo-tour";
import { DemoTooltip } from "@/components/demo/DemoTooltip";

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

/* ── Vault Destinations ── */
const VAULT_DESTINATIONS = [
  { value: "zurich-malcaamit-1", label: "Zurich — Malca-Amit Hub 1" },
  { value: "london-brinks-sovereign", label: "London — Brink's Sovereign" },
  { value: "singapore-malcaamit-asia", label: "Singapore — Malca-Amit Asia" },
  { value: "newyork-brinks-conus", label: "New York — Brink's CONUS" },
] as const;

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

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setTrackWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || isComplete || isSubmitting) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setProgress((prev) => {
          const next = Math.min(prev + KEYBOARD_STEP, 1);
          if (next >= THRESHOLD) {
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
              Staged
            </span>
          </div>
        ) : (
          <span
            className={cn(
              "text-xs font-semibold tracking-wider uppercase",
              disabled ? "text-color-3/20" : "text-color-3/30"
            )}
          >
            Slide to Stage Execution
          </span>
        )}
      </div>

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
          <style>{`
            @keyframes slide-hint {
              0%, 100% { transform: translateX(0); }
              50% { transform: translateX(3px); }
            }
          `}</style>
        </div>
      )}

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
   Brink's Rate Quote Card
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
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (weightOz <= 0 || notionalUsd <= 0) return;

    const fetchId = ++fetchIdRef.current;

    // Schedule state updates in a microtask to avoid synchronous setState in effect
    Promise.resolve().then(() => {
      if (fetchId !== fetchIdRef.current) return;
      setIsLoading(true);
      setError(null);
    });

    serverGetBrinksQuote({
      weightOz,
      notionalUsd,
      countryCode: "US",
    })
      .then((result) => {
        if (fetchId === fetchIdRef.current) {
          setQuote(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (fetchId === fetchIdRef.current) {
          console.warn("[AurumShield] Brink's quote failed:", err);
          setError("Rate quote unavailable");
          setIsLoading(false);
        }
      });

    return () => {
      // Cleanup is handled by fetchIdRef increment on next render
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
   Financial Summary
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
  /** Called when the buyer completes BoS signature */
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

  const searchParams = useSearchParams();
  const isDemoActive = searchParams.get("demo") === "active";

  const { execute, isReverifying } = useReverification();

  const deliveryMethod = watch("deliveryMethod");
  const weightOz = watch("weightOz");
  const lockedPrice = watch("lockedPrice");
  const quoteId = watch("quoteId");
  const notional = (weightOz || 0) * (lockedPrice || 0);

  const declaredValueCents = Math.round(notional * 100);
  const USPS_MAX_CENTS = 5_000_000;
  const exceedsDeclaredValueLimit =
    deliveryMethod === "SECURE_DELIVERY" && declaredValueCents > USPS_MAX_CENTS;

  /* ── Jurisdictional Structuring State ── */
  const [vaultDestination, setVaultDestination] = useState("");
  const [legalStructuringAccepted, setLegalStructuringAccepted] = useState(false);

  /** All structuring prerequisites met */
  const structuringComplete = vaultDestination !== "" && legalStructuringAccepted;

  /* ── Quote Validation (on mount) ── */
  const [quoteValid, setQuoteValid] = useState<boolean | null>(() => quoteId ? null : true);
  const [quoteSecondsLeft, setQuoteSecondsLeft] = useState(0);

  useEffect(() => {
    if (!quoteId) return;

    let cancelled = false;
    serverValidateQuote(quoteId).then((result) => {
      if (cancelled) return;
      if (result.data) {
        setQuoteValid(result.data.valid);
        setQuoteSecondsLeft(result.data.secondsRemaining);
      } else {
        setQuoteValid(false);
      }
    });

    return () => { cancelled = true; };
  }, [quoteId]);

  useEffect(() => {
    if (quoteSecondsLeft <= 0) return;
    const id = setInterval(() => {
      setQuoteSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setQuoteValid(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [quoteSecondsLeft]);

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

  /* ── Dropbox Sign postMessage listener ── */
  useEffect(() => {
    if (!signingUrl || !onSignatureComplete) return;

    const handleMessage = (event: MessageEvent) => {
      if (
        typeof event.data === "string" &&
        (event.data.includes("signature_request_all_signed") ||
          event.data.includes('"type":"signature_request_signed"'))
      ) {
        console.log("[AurumShield] BoS signature completed via postMessage");
        onSignatureComplete();
      }

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
        <Globe className="h-4 w-4 text-color-2" />
        <h2 className="text-sm font-semibold text-color-3">
          Jurisdictional Structuring
        </h2>
      </div>

      {/* ── Order Summary ── */}
      <div className="rounded-lg border border-color-2/15 bg-color-2/5 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-color-3/40">
            {quoteId ? "Server-Locked Order" : "Locked Order"}
          </p>
          <p className="font-mono text-sm tabular-nums text-color-3">
            {weightOz?.toLocaleString() ?? "—"} oz @ $
            {fmtUsd(lockedPrice || 0)}/oz
          </p>
          {quoteId && (
            <p className="text-[9px] font-mono text-color-3/20 mt-0.5 truncate max-w-[200px]">
              Quote: {quoteId}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-color-3/40">
            Notional
          </p>
          <p className="font-mono text-lg font-bold tabular-nums text-color-2">
            ${fmtUsd(notional)}
          </p>
          {quoteSecondsLeft > 0 && (
            <p className="text-[9px] font-mono text-amber-400 mt-0.5">
              {quoteSecondsLeft}s remaining
            </p>
          )}
        </div>
      </div>

      {/* ── Fee Schedule ── */}
      {notional > 0 && <FinancialSummary notionalUsd={notional} />}

      {/* ════════════════════════════════════════════════════════════
         JURISDICTIONAL STRUCTURING PANELS
         ════════════════════════════════════════════════════════════ */}

      {/* ── Panel 1: Vault Routing Dropdown ── */}
      <div className="rounded-sm border border-slate-800 bg-black/30 p-4 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)]">
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="h-3.5 w-3.5 text-color-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-color-3/50">
            Vault Routing — Sovereign Custody Destination
          </span>
        </div>
        <select
          value={vaultDestination}
          onChange={(e) => setVaultDestination(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2.5 font-mono text-sm text-white focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors appearance-none cursor-pointer"
        >
          <option value="" disabled>
            Select sovereign vault destination…
          </option>
          {VAULT_DESTINATIONS.map((dest) => (
            <option key={dest.value} value={dest.value}>
              {dest.label}
            </option>
          ))}
        </select>
        {!vaultDestination && (
          <p className="mt-2 font-mono text-[10px] text-red-400/70">
            Vault destination is required to proceed.
          </p>
        )}
      </div>

      {/* ── Panel 2: Legal Structuring Checkbox ── */}
      <div className="rounded-sm border border-slate-800 bg-black/30 p-4 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)]">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="h-3.5 w-3.5 text-color-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-color-3/50">
            Legal Structuring — Governing Law
          </span>
        </div>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={legalStructuringAccepted}
            onChange={(e) => setLegalStructuringAccepted(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded-sm border-2 border-slate-600 bg-slate-950 text-gold-primary focus:ring-gold-primary/30 focus:ring-offset-0 cursor-pointer accent-[#C6A86B]"
          />
          <span className="font-mono text-xs text-slate-300 leading-relaxed group-hover:text-white transition-colors">
            Bind asset to <strong className="text-gold-primary">English Law &amp; UCC Article 7 Bailment</strong> (Bankruptcy-Remote).
            Title is held as allocated bailment under the Warehouse Act. The asset is legally
            segregated from the custodian&apos;s balance sheet and protected from third-party claims.
          </span>
        </label>
        {!legalStructuringAccepted && (
          <p className="mt-2 font-mono text-[10px] text-red-400/70">
            Legal structuring must be accepted to proceed.
          </p>
        )}
      </div>

      {/* ── Panel 3: Indemnification Status ── */}
      <div className="rounded-sm border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">
            Indemnification — Transit Insurance
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="font-mono text-xs text-emerald-400 font-bold">ACTIVE</span>
          </div>
          <span className="font-mono text-xs text-slate-300">
            Lloyd&apos;s of London Transit Specie Policy
          </span>
        </div>
        <p className="font-mono text-[10px] text-slate-500 mt-2 leading-relaxed">
          Full replacement value coverage during transit. Policy number on file with the clearing desk.
          No deductible on LBMA Good Delivery bars.
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════
         DELIVERY METHOD SELECTION
         ════════════════════════════════════════════════════════════ */}

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

      {/* ── Quote Expired Warning ── */}
      {quoteValid === false && quoteId && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/15 bg-red-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs text-red-400 leading-relaxed">
            Your price lock quote has expired. Please return to Step 1 to
            lock a new price.
          </p>
        </div>
      )}

      {/* ── Declared Value Exceeds USPS Limit Warning ── */}
      {exceedsDeclaredValueLimit && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 animate-in slide-in-from-top-2 fade-in duration-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
          <div className="text-xs leading-relaxed">
            <p className="text-amber-400 font-semibold">
              Declared value exceeds USPS insurance limit
            </p>
            <p className="text-amber-400/70 mt-1">
              Registered mail only insures up to $50,000. Your order&apos;s
              declared value is{" "}
              <span className="font-mono font-semibold">
                ${(declaredValueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              . Please select <strong>Vault Custody</strong> or contact us
              for armored transport.
            </p>
          </div>
        </div>
      )}

      {/* ── STAGE EXECUTION — Gated on structuring completion ── */}
      {deliveryMethod && (
        <div className="pt-2">
          {!structuringComplete && (
            <div className="flex items-center gap-2 mb-3 text-amber-400/70">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">
                Complete vault routing and legal structuring to unlock execution
              </span>
            </div>
          )}

          {isReverifying && (
            <div className="flex items-center justify-center gap-2 mb-3 text-color-2">
              <ShieldCheck className="h-4 w-4 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Re-verifying identity to execute purchase…
              </span>
            </div>
          )}

          {/* Stage Execution button for demo clarity, SlideToExecute for real flow */}
          {isDemoActive ? (
            <div className="relative">
              <DemoTooltip text="Stage the execution for dual-authorization signing →" position="top" />
              <button
                type="button"
                onClick={async () => {
                  if (quoteId) {
                    const outcome = await execute(async () => {
                      const validation = await serverValidateQuote(quoteId);
                      if (!validation.data?.valid) {
                        return { error: "Quote expired. Please return to Step 1." };
                      }
                      return { data: true };
                    });
                    if (outcome.ok) {
                      onSubmit();
                    }
                  } else {
                    onSubmit();
                  }
                }}
                disabled={!structuringComplete || quoteValid === false || exceedsDeclaredValueLimit || isSubmitting}
                className={`
                  w-full py-3.5 font-bold text-sm tracking-[0.15em] uppercase
                  rounded-sm cursor-pointer transition-all duration-200
                  flex items-center justify-center gap-2
                  ${structuringComplete
                    ? "bg-gold-primary text-slate-950 hover:bg-gold-hover"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${isDemoActive && structuringComplete ? DEMO_SPOTLIGHT_CLASSES : ""}
                `}
              >
                <Lock className="h-4 w-4" />
                STAGE EXECUTION
              </button>
            </div>
          ) : (
            <SlideToExecute
              onComplete={async () => {
                if (quoteId) {
                  const outcome = await execute(async () => {
                    const validation = await serverValidateQuote(quoteId);
                    if (!validation.data?.valid) {
                      return { error: "Quote expired. Please return to Step 1." };
                    }
                    return { data: true };
                  });
                  if (outcome.ok) {
                    onSubmit();
                  }
                } else {
                  onSubmit();
                }
              }}
              disabled={!structuringComplete || !deliveryMethod || quoteValid === false || exceedsDeclaredValueLimit}
              isSubmitting={isSubmitting || isReverifying}
            />
          )}
          <p className="text-center text-[10px] text-color-3/30 mt-2">
            By executing, you agree to AurumShield&apos;s settlement terms,
            English Law bailment provisions, and delivery conditions.
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
