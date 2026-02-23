"use client";

/* ================================================================
   CHECKOUT MODAL WRAPPER — 2-Click Checkout State Container
   ================================================================
   Glass-panel modal overlay that orchestrates the 2-step checkout:
     Step 1: Price Lock (weight, price, countdown + OANDA spot)
     Step 2: Delivery Routing (method, address, slide-to-execute
                              + Dropbox Sign Bill of Sale iFrame)
   ================================================================ */

import { useState, useCallback, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, ChevronLeft, ShieldCheck } from "lucide-react";
import type { Listing } from "@/lib/mock-data";
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
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  /* ── OANDA spot price state ── */
  const [spotPrice, setSpotPrice] = useState<SpotPriceResult | null>(null);

  /* ── Dropbox Sign embedded signing state ── */
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [signatureRequestId, setSignatureRequestId] = useState<string | null>(null);

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

  const handleFinalSubmit = useCallback(async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsSubmitting(true);
    const data = form.getValues();

    try {
      // 1. Create Bill of Sale via Dropbox Sign
      const billOfSaleResult = await serverCreateBillOfSale({
        buyer: {
          name: "Buyer", // TODO: Pull from authenticated user context
          emailAddress: "buyer@aurumshield.com",
          role: "buyer",
        },
        seller: {
          name: "Seller", // TODO: Pull from listing owner data
          emailAddress: "seller@aurumshield.com",
          role: "seller",
        },
        billOfSale: {
          listingTitle: listing.title,
          weightOz: data.weightOz,
          pricePerOz: data.lockedPrice,
          notionalUsd: data.weightOz * data.lockedPrice,
          deliveryMethod: data.deliveryMethod,
          orderId: `ORD-${Date.now()}`,
          listingId: listing.id,
          settlementDate: new Date().toISOString(),
        },
      });

      setSignatureRequestId(billOfSaleResult.signatureRequestId);

      // 2. Get embedded signing URL for buyer
      if (billOfSaleResult.buyerSignatureId) {
        const urlResult = await serverGetSigningUrl(
          billOfSaleResult.buyerSignatureId,
        );
        setSigningUrl(urlResult.signUrl);
      }

      console.log("Checkout submitted:", {
        listingId: listing.id,
        signatureRequestId: billOfSaleResult.signatureRequestId,
        isMock: billOfSaleResult.isMock,
        ...data,
      });

      setIsSubmitting(false);
      setIsSuccess(true);

      // Auto-close after success (delayed to allow signing)
      setTimeout(() => {
        onClose();
      }, signingUrl ? 10000 : 2000);
    } catch (err) {
      console.error("[AurumShield] Checkout submission failed:", err);
      setIsSubmitting(false);
    }
  }, [form, listing.id, listing.title, onClose, signingUrl]);

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
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
              {currentStep === 2 && !isSuccess && (
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
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-color-5/20 text-color-3/50 hover:text-color-3 hover:border-color-5/40 transition-colors"
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
                    />
                  )}
                </form>
              </FormProvider>
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
