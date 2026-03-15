"use client";

/* ================================================================
   STEP 2: JURISDICTIONAL STRUCTURING — Vault, Legal & Insurance
   ================================================================
   Institutional routing and custody structuring. No retail address
   forms, no itemized shipping fees.

   Transit Pipeline:
   - RAW_DORE:      Extraction ➔ Valcambi SA (Refining/Assay) ➔ Final Allocation
   - Good Delivery: Current Custody ➔ Final Allocation

   All logistical costs rolled into a single Landed Execution Premium.
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
  Shield,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FileSignature,
  Loader2,
  DollarSign,
  ShieldCheck,
  Scale,
  Globe,
  Lock,
  Truck,
  FlaskConical,
  Vault,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { useReverification } from "@/hooks/useReverification";
import {
  type CheckoutFormData,
} from "@/lib/schemas/checkout-schema";
import {
  serverGetPlatformFeeEstimate,
  serverValidateQuote,
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

/* ── Sovereign Freeport Destinations ── */
const FREEPORT_DESTINATIONS = [
  {
    value: "zurich-malcaamit-1",
    label: "Zurich — Malca-Amit Hub 1",
    region: "EMEA",
    bps: 12,
  },
  {
    value: "london-brinks-sovereign",
    label: "London — Brink's Sovereign",
    region: "EMEA",
    bps: 10,
  },
  {
    value: "singapore-malcaamit-asia",
    label: "Singapore — Malca-Amit Asia",
    region: "APAC",
    bps: 14,
  },
  {
    value: "newyork-brinks-conus",
    label: "New York — Brink's CONUS",
    region: "AMER",
    bps: 8,
  },
  {
    value: "dubai-brinks-dmcc",
    label: "Dubai — Brink's DMCC Freeport",
    region: "MENA",
    bps: 11,
  },
] as const;

/* ── Asset Type for Transit Pipeline ── */
type AssetClassification = "RAW_DORE" | "GOOD_DELIVERY";

/* ================================================================
   Algorithmic Transit Pipeline Visualizer
   ================================================================ */

function TransitPipeline({
  assetType,
  destination,
}: {
  assetType: AssetClassification;
  destination: string;
}) {
  const destLabel =
    FREEPORT_DESTINATIONS.find((d) => d.value === destination)?.label ??
    "Final Allocation";

  const legs =
    assetType === "RAW_DORE"
      ? [
          {
            icon: Truck,
            label: "Extraction Point",
            detail: "Armored collection from mine site",
            color: "text-amber-400",
            borderColor: "border-amber-400/30",
            bgColor: "bg-amber-400/5",
          },
          {
            icon: FlaskConical,
            label: "Valcambi SA",
            detail: "Refining & Assay (99.99% purity verification)",
            color: "text-blue-400",
            borderColor: "border-blue-400/30",
            bgColor: "bg-blue-400/5",
          },
          {
            icon: Vault,
            label: destLabel,
            detail: "Final allocated custody & title transfer",
            color: "text-emerald-400",
            borderColor: "border-emerald-400/30",
            bgColor: "bg-emerald-400/5",
          },
        ]
      : [
          {
            icon: Shield,
            label: "Current Custody",
            detail: "LBMA Good Delivery — verified chain of integrity",
            color: "text-slate-300",
            borderColor: "border-slate-700",
            bgColor: "bg-slate-800/30",
          },
          {
            icon: Vault,
            label: destLabel,
            detail: "Final allocated custody & title transfer",
            color: "text-emerald-400",
            borderColor: "border-emerald-400/30",
            bgColor: "bg-emerald-400/5",
          },
        ];

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-3.5 w-3.5 text-gold-primary" />
        <span className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase font-bold">
          Algorithmic Transit Route —{" "}
          {assetType === "RAW_DORE" ? "3-Leg Doré Pipeline" : "2-Leg Direct Transfer"}
        </span>
      </div>

      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-5 top-8 bottom-8 w-px bg-linear-to-b from-gold-primary/40 via-gold-primary/20 to-emerald-400/40" />

        <div className="space-y-0">
          {legs.map((leg, idx) => {
            const Icon = leg.icon;
            const isLast = idx === legs.length - 1;

            return (
              <div key={idx} className="relative flex items-start gap-4 py-3">
                {/* Node */}
                <div
                  className={`relative z-10 shrink-0 h-10 w-10 rounded-sm border ${leg.borderColor} ${leg.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`h-4 w-4 ${leg.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-xs font-bold ${leg.color}`}>
                      {leg.label}
                    </span>
                    {isLast && (
                      <span className="font-mono text-[8px] bg-emerald-400/10 text-emerald-400 px-1.5 py-0.5 tracking-wider uppercase border border-emerald-400/20">
                        DESTINATION
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                    {leg.detail}
                  </p>
                </div>

                {/* Arrow between legs */}
                {!isLast && (
                  <div className="absolute left-5 -bottom-1 z-20">
                    <ArrowRight className="h-3 w-3 text-gold-primary/50 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
        "relative h-14 w-full select-none overflow-hidden border",
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
            "cursor-grab active:cursor-grabbing touch-none",
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
   Financial Summary — Landed Execution Premium
   ================================================================ */

function LandedExecutionPremium({
  notionalUsd,
  transitBps,
}: {
  notionalUsd: number;
  transitBps: number;
}) {
  const [feeEstimate, setFeeEstimate] =
    useState<PlatformFeeEstimateResult | null>(null);

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

  const totalBps = transitBps + (feeEstimate?.bps ?? 0);
  const totalPremiumUsd = notionalUsd * (totalBps / 10000);

  return (
    <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <DollarSign className="h-3.5 w-3.5 text-gold-primary" />
        <span className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase font-bold">
          Landed Execution Premium
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
          <span className="font-mono text-[10px] text-slate-500 tracking-wider uppercase">
            Transit & Custody ({transitBps} bps)
          </span>
          <span className="font-mono text-xs text-slate-300 tabular-nums">
            ${fmtUsd(notionalUsd * (transitBps / 10000))}
          </span>
        </div>

        {feeEstimate && (
          <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
            <span className="font-mono text-[10px] text-slate-500 tracking-wider uppercase">
              Platform Indemnification ({feeEstimate.bps / 100}%)
            </span>
            <span className="font-mono text-xs text-slate-300 tabular-nums">
              {feeEstimate.feeUsd}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between py-2 border-t border-gold-primary/30">
          <span className="font-mono text-[10px] text-gold-primary tracking-widest uppercase font-bold">
            Total Premium (Spot + {totalBps} bps)
          </span>
          <span className="font-mono text-sm text-gold-primary font-bold tabular-nums">
            ${fmtUsd(totalPremiumUsd)}
          </span>
        </div>
      </div>

      <p className="font-mono text-[9px] text-slate-600 leading-relaxed">
        All transit, insurance, custody, and platform fees consolidated into a
        single landed premium. No itemized shipping charges.
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
    watch,
  } = useFormContext<CheckoutFormData>();

  const searchParams = useSearchParams();
  const isDemoActive = searchParams.get("demo") === "active";

  const { execute, isReverifying } = useReverification();

  const weightOz = watch("weightOz");
  const lockedPrice = watch("lockedPrice");
  const quoteId = watch("quoteId");
  const notional = (weightOz || 0) * (lockedPrice || 0);

  /* ── Determine asset classification from weight ── */
  const assetType: AssetClassification =
    weightOz && weightOz >= 350 ? "GOOD_DELIVERY" : "RAW_DORE";

  /* ── Freeport Destination State ── */
  const [freeportDestination, setFreeportDestination] = useState("");
  const [legalStructuringAccepted, setLegalStructuringAccepted] =
    useState(false);

  const selectedFreeport = FREEPORT_DESTINATIONS.find(
    (d) => d.value === freeportDestination
  );
  const transitBps = selectedFreeport?.bps ?? 0;

  /** All structuring prerequisites met */
  const structuringComplete =
    freeportDestination !== "" && legalStructuringAccepted;

  /* ── Quote Validation (on mount) ── */
  const [quoteValid, setQuoteValid] = useState<boolean | null>(() =>
    quoteId ? null : true
  );
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

    return () => {
      cancelled = true;
    };
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
          Jurisdictional Structuring & Transit Routing
        </h2>
      </div>

      {/* ── Order Summary ── */}
      <div className="rounded-sm border border-color-2/15 bg-color-2/5 px-4 py-3 flex items-center justify-between">
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

      {/* ════════════════════════════════════════════════════════════
         INSTITUTIONAL DESTINATION SELECTOR
         ════════════════════════════════════════════════════════════ */}
      <div className="rounded-sm border border-slate-800 bg-black/30 p-4 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)]">
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="h-3.5 w-3.5 text-color-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-color-3/50">
            Sovereign Freeport — Custody Destination
          </span>
        </div>
        <select
          value={freeportDestination}
          onChange={(e) => setFreeportDestination(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2.5 font-mono text-sm text-white focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors appearance-none cursor-pointer"
        >
          <option value="" disabled>
            Select sovereign freeport destination…
          </option>
          {FREEPORT_DESTINATIONS.map((dest) => (
            <option key={dest.value} value={dest.value}>
              {dest.label} · {dest.region} · +{dest.bps} bps
            </option>
          ))}
        </select>
        {!freeportDestination && (
          <p className="mt-2 font-mono text-[10px] text-red-400/70">
            Custody destination is required to proceed.
          </p>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
         ALGORITHMIC TRANSIT PIPELINE VISUALIZER
         ════════════════════════════════════════════════════════════ */}
      {freeportDestination && (
        <div className="rounded-sm border border-slate-800 bg-black/30 p-4 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)]">
          <TransitPipeline
            assetType={assetType}
            destination={freeportDestination}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         LEGAL STRUCTURING CHECKBOX
         ════════════════════════════════════════════════════════════ */}
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
            Bind asset to{" "}
            <strong className="text-gold-primary">
              English Law & UCC Article 7 Bailment
            </strong>{" "}
            (Bankruptcy-Remote). Title is held as allocated bailment under the
            Warehouse Act. The asset is legally segregated from the
            custodian&apos;s balance sheet and protected from third-party claims.
          </span>
        </label>
        {!legalStructuringAccepted && (
          <p className="mt-2 font-mono text-[10px] text-red-400/70">
            Legal structuring must be accepted to proceed.
          </p>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
         INDEMNIFICATION STATUS
         ════════════════════════════════════════════════════════════ */}
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
            <span className="font-mono text-xs text-emerald-400 font-bold">
              ACTIVE
            </span>
          </div>
          <span className="font-mono text-xs text-slate-300">
            Lloyd&apos;s of London Transit Specie Policy
          </span>
        </div>
        <p className="font-mono text-[10px] text-slate-500 mt-2 leading-relaxed">
          Full replacement value coverage during transit. Policy number on file
          with the clearing desk. No deductible on LBMA Good Delivery bars.
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════
         LANDED EXECUTION PREMIUM (CONSOLIDATED FEES)
         ════════════════════════════════════════════════════════════ */}
      {freeportDestination && notional > 0 && (
        <LandedExecutionPremium
          notionalUsd={notional}
          transitBps={transitBps}
        />
      )}

      {/* ── Quote Expired Warning ── */}
      {quoteValid === false && quoteId && (
        <div className="flex items-start gap-2.5 border border-red-500/15 bg-red-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs text-red-400 leading-relaxed">
            Your price lock quote has expired. Please return to Step 1 to lock a
            new price.
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         STAGE EXECUTION — Gated on structuring completion
         ════════════════════════════════════════════════════════════ */}
      <div className="pt-2">
        {!structuringComplete && (
          <div className="flex items-center gap-2 mb-3 text-amber-400/70">
            <Lock className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Complete freeport selection and legal structuring to unlock
              execution
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

        {isDemoActive ? (
          <div className="relative">
            <DemoTooltip
              text="Stage the execution for dual-authorization signing →"
              position="top"
            />
            <button
              type="button"
              onClick={async () => {
                if (quoteId) {
                  const outcome = await execute(async () => {
                    const validation = await serverValidateQuote(quoteId);
                    if (!validation.data?.valid) {
                      return {
                        error: "Quote expired. Please return to Step 1.",
                      };
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
              disabled={
                !structuringComplete ||
                quoteValid === false ||
                isSubmitting
              }
              className={`
                w-full py-3.5 font-bold text-sm tracking-[0.15em] uppercase
                cursor-pointer transition-all duration-200
                flex items-center justify-center gap-2
                ${
                  structuringComplete
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
                    return {
                      error: "Quote expired. Please return to Step 1.",
                    };
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
            disabled={
              !structuringComplete || quoteValid === false
            }
            isSubmitting={isSubmitting || isReverifying}
          />
        )}
        <p className="text-center text-[10px] text-color-3/30 mt-2 font-mono">
          By executing, you agree to AurumShield&apos;s settlement terms,
          English Law bailment provisions, and custody conditions.
        </p>
      </div>

      {/* ── Dropbox Sign Embedded iFrame ── */}
      {signingUrl && (
        <div className="space-y-2">
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
          <div className="border border-color-5/15 overflow-hidden bg-white">
            <iframe
              src={signingUrl}
              title="Dropbox Sign — Bill of Sale"
              className="w-full border-0"
              style={{ height: 500 }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
          <p className="text-[10px] text-color-3/25 text-center font-mono">
            Powered by Dropbox Sign · Legally binding electronic signature
          </p>
        </div>
      )}
    </div>
  );
}
