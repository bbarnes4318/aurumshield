"use client";

/* ================================================================
   CHECKOUT MODAL WRAPPER — 2-Click Checkout State Container
   ================================================================
   Glass-panel modal overlay that orchestrates the 2-step checkout:
     Step 1: Price Lock (weight, price, countdown + OANDA spot)
     Step 2: Delivery Routing (method, address, slide-to-execute
                              + Dropbox Sign Bill of Sale iFrame)

   D1 + D6 FIX: Now wired to the real useAtomicBuy pipeline
   (reserve → convert → open settlement) and populates buyer/seller
   identity from the authenticated user context.
   ================================================================ */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, ChevronLeft, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import type { Listing } from "@/lib/mock-data";
import { mockUsers } from "@/lib/mock-data";
import {
  combinedCheckoutSchema,
  type CheckoutFormData,
} from "@/lib/schemas/checkout-schema";
import {
  fetchSpotPrice,
  serverCreateBillOfSale,
  serverGetSigningUrl,
  type SpotPriceResult,
} from "@/lib/actions/checkout-actions";
import { useAuth } from "@/providers/auth-provider";
import { trackEvent } from "@/lib/analytics";
import { useAtomicBuy } from "@/hooks/use-atomic-buy";
import { useOpenSettlementFromOrder } from "@/hooks/use-mock-queries";
import { StepOnePriceLock } from "./StepOnePriceLock";
import { StepTwoRouting } from "./StepTwoRouting";

/* ── Step metadata ── */
const STEPS = [
  { label: "Price Lock", number: 1 },
  { label: "Settlement", number: 2 },
];

/* ================================================================ */

interface CheckoutModalWrapperProps {
  listing: Listing;
  maxWeightOz: number;
  onClose: () => void;
}

export function CheckoutModalWrapper({
  listing,
  maxWeightOz,
  onClose,
}: CheckoutModalWrapperProps) {
  const router = useRouter();
  const { user } = useAuth();
  const atomicBuy = useAtomicBuy();
  const openSettlement = useOpenSettlementFromOrder();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ── OANDA spot price state ── */
  const [spotPrice, setSpotPrice] = useState<SpotPriceResult | null>(null);

  /* ── Dropbox Sign embedded signing state ── */
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [signatureRequestId, setSignatureRequestId] = useState<string | null>(null);

  /* ── Track generated order / settlement IDs ── */
  const settlementIdRef = useRef<string | null>(null);

  /* ── Resolve seller email from user store ── */
  const sellerUser = mockUsers.find((u) => u.id === listing.sellerUserId);
  const buyerEmail = user?.email ?? "buyer@aurumshield.com";
  const buyerName = user?.name ?? "Buyer";
  const sellerEmail = sellerUser?.email ?? "seller@aurumshield.com";
  const sellerName = listing.sellerName ?? sellerUser?.name ?? "Seller";

  /* Fetch live spot price on mount */
  useEffect(() => {
    let cancelled = false;
    fetchSpotPrice()
      .then((result) => {
        if (!cancelled) setSpotPrice(result);
      })
      .catch((err) => {
        console.warn("[AurumShield] Failed to fetch spot price:", err);
      });
    return () => { cancelled = true; };
  }, []);

  /* ── Track modal open ── */
  useEffect(() => {
    trackEvent("CheckoutModalOpened", { listingId: listing.id });
  }, [listing.id]);

  const activePrice = spotPrice?.pricePerOz ?? listing.pricePerOz;

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(combinedCheckoutSchema),
    defaultValues: {
      weightOz: undefined as unknown as number,
      lockedPrice: activePrice,
      deliveryMethod: undefined as unknown as "VAULT_CUSTODY" | "SECURE_DELIVERY",
      shippingAddress: undefined,
    },
    mode: "onTouched",
  });

  const advanceToStepTwo = useCallback(() => {
    setCurrentStep(2);
  }, []);

  const goBackToStepOne = useCallback(() => {
    setCurrentStep(1);
  }, []);

  /**
   * D1 FIX: Full E2E pipeline
   * 1. Reserve inventory + convert to order via useAtomicBuy
   * 2. Open settlement from the real order
   * 3. Create Bill of Sale via Dropbox Sign with real identities
   * 4. Navigation gated on signature completion (D5)
   */
  const handleFinalSubmit = useCallback(async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsSubmitting(true);
    setSubmitError(null);
    const data = form.getValues();
    const userId = user?.id ?? "user-1";

    try {
      // 1. Atomic reserve → convert (creates reservation + order in state store)
      const buyResult = await atomicBuy.execute({
        listingId: listing.id,
        userId,
        weightOz: data.weightOz,
        notional: data.weightOz * data.lockedPrice,
      });

      const realOrderId = buyResult.order.id;

      // 2. Open settlement case from the real order
      const settlement = await openSettlement.mutateAsync({
        orderId: realOrderId,
        actorRole: user?.role ?? "buyer",
        actorUserId: userId,
      });

      settlementIdRef.current = settlement.id;

      // 3. Create Bill of Sale via Dropbox Sign with real identities (D6 fix)
      const billOfSaleResult = await serverCreateBillOfSale({
        buyer: {
          name: buyerName,
          emailAddress: buyerEmail,
          role: "buyer",
        },
        seller: {
          name: sellerName,
          emailAddress: sellerEmail,
          role: "seller",
        },
        billOfSale: {
          listingTitle: listing.title,
          weightOz: data.weightOz,
          pricePerOz: data.lockedPrice,
          notionalUsd: data.weightOz * data.lockedPrice,
          deliveryMethod: data.deliveryMethod,
          orderId: realOrderId,
          listingId: listing.id,
          settlementDate: new Date().toISOString(),
        },
      });

      setSignatureRequestId(billOfSaleResult.signatureRequestId);

      // 4. Get embedded signing URL for buyer
      if (billOfSaleResult.buyerSignatureId) {
        const urlResult = await serverGetSigningUrl(
          billOfSaleResult.buyerSignatureId,
        );
        setSigningUrl(urlResult.signUrl);
      }

      console.log("[AurumShield] Checkout pipeline complete:", {
        listingId: listing.id,
        orderId: realOrderId,
        settlementId: settlement.id,
        signatureRequestId: billOfSaleResult.signatureRequestId,
        isMock: billOfSaleResult.isMock,
        buyerEmail,
        sellerEmail,
      });

      setIsSubmitting(false);
      setIsSuccess(true);

      trackEvent("CheckoutCompleted", {
        listingId: listing.id,
        orderId: realOrderId,
        total: data.weightOz * data.lockedPrice,
      });

      // D5 FIX: Route to the real settlement ID.
      // Navigation is deferred until signature completion event fires
      // (handled by onSignatureComplete callback from StepTwoRouting).
      // If running in mock mode (no embedded signing), navigate after brief delay.
      if (billOfSaleResult.isMock) {
        setTimeout(() => {
          router.push(`/settlements/${settlement.id}`);
        }, 1500);
      }
      // Otherwise, StepTwoRouting will call onSignatureComplete when
      // the Dropbox Sign embedded SDK fires 'sign' or 'finish' event.
    } catch (err) {
      console.error("[AurumShield] Checkout submission failed:", err);
      const message = err instanceof Error ? err.message : "Transaction failed";
      setSubmitError(message);
      setIsSubmitting(false);
      // Modal stays open on failure — user can retry
    }
  }, [form, listing.id, listing.title, router, user, atomicBuy, openSettlement, buyerName, buyerEmail, sellerName, sellerEmail]);

  /**
   * D5 FIX: Called by StepTwoRouting when the Dropbox Sign embedded
   * SDK fires the signature completion event. Only then do we navigate.
   */
  const handleSignatureComplete = useCallback(() => {
    const sid = settlementIdRef.current;
    if (sid) {
      router.push(`/settlements/${sid}`);
    }
  }, [router]);

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={isSubmitting ? undefined : () => {
          if (!isSuccess) {
            trackEvent("CheckoutAbandoned", { listingId: listing.id, step: currentStep });
          }
          onClose();
        }}
        aria-hidden="true"
      />

      {/* ── Modal Container ── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div
          className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Checkout"
        >
          {/* ── Modal Header ── */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-color-5/10 bg-color-1/95 backdrop-blur-sm px-5 py-4">
            <div className="flex items-center gap-3">
              {currentStep === 2 && !isSuccess && !isSubmitting && (
                <button
                  type="button"
                  onClick={goBackToStepOne}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-color-5/20 text-color-3/50 hover:text-color-3 hover:border-color-5/40 transition-colors"
                  aria-label="Back to step 1"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <h2 className="text-sm font-semibold text-color-3">
                  Checkout
                </h2>
                <p
                  className="text-[10px] text-color-3/40 truncate max-w-[200px]"
                  title={listing.title}
                >
                  {listing.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Step indicator */}
              {!isSuccess && (
                <div className="flex items-center gap-1.5">
                  {STEPS.map((step) => (
                    <div key={step.number} className="flex items-center gap-1">
                      <div
                        className={`
                          flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold
                          ${
                            currentStep >= step.number
                              ? "bg-color-2 text-color-1"
                              : "bg-color-5/15 text-color-3/30"
                          }
                        `}
                      >
                        {step.number}
                      </div>
                      {step.number < STEPS.length && (
                        <div
                          className={`h-px w-4 ${
                            currentStep > step.number
                              ? "bg-color-2"
                              : "bg-color-5/15"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!isSuccess) {
                    trackEvent("CheckoutAbandoned", { listingId: listing.id, step: currentStep });
                  }
                  onClose();
                }}
                disabled={isSubmitting}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-color-5/20 text-color-3/50 hover:text-color-3 hover:border-color-5/40 transition-colors disabled:opacity-50"
                aria-label="Close checkout"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Modal Body ── */}
          <div className="px-5 py-5">
            {isSuccess ? (
              /* ── Success State ── */
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 animate-in zoom-in-95 fade-in duration-300">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <ShieldCheck className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-color-3">
                    Settlement Executed
                  </h3>
                  <p className="text-xs text-color-3/50 mt-1 max-w-xs">
                    Your order has been locked and routed for settlement. You
                    will receive confirmation via your registered email.
                  </p>
                </div>
              </div>
            ) : (
              <FormProvider {...form}>
                <form onSubmit={(e) => e.preventDefault()}>
                  {currentStep === 1 && (
                    <StepOnePriceLock
                      pricePerOz={listing.pricePerOz}
                      maxWeightOz={maxWeightOz}
                      onAdvance={advanceToStepTwo}
                      liveSpotPrice={spotPrice?.pricePerOz ?? null}
                      priceSource={spotPrice?.source ?? "listing"}
                    />
                  )}
                  {currentStep === 2 && (
                    <StepTwoRouting
                      onSubmit={handleFinalSubmit}
                      isSubmitting={isSubmitting}
                      signingUrl={signingUrl}
                      signatureRequestId={signatureRequestId}
                      onSignatureComplete={handleSignatureComplete}
                    />
                  )}
                </form>
              </FormProvider>
            )}

            {/* ── Submission error ── */}
            {submitError && !isSubmitting && !isSuccess && (
              <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-red-400">
                      Transaction Failed
                    </p>
                    <p className="text-xs text-red-400/80 mt-0.5">
                      {submitError}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ── Pipeline progress during submission ── */}
            {isSubmitting && (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-color-2/20 bg-color-2/5 px-4 py-3 text-xs text-color-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {atomicBuy.step === "reserving" && "Locking inventory…"}
                  {atomicBuy.step === "converting" && "Creating order…"}
                  {atomicBuy.step === "done" && openSettlement.isPending && "Opening settlement…"}
                  {atomicBuy.step === "done" && !openSettlement.isPending && "Preparing Bill of Sale…"}
                  {atomicBuy.step === "idle" && "Initializing…"}
                </span>
              </div>
            )}
          </div>

          {/* ── Trust Badge ── */}
          <div className="border-t border-color-5/10 px-5 py-3 text-center">
            <p className="text-[10px] text-color-3/25 leading-relaxed">
              Secured by AurumShield · End-to-end encrypted · Append-only
              settlement ledger
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
