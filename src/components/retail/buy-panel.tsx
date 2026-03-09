"use client";

import { useState, useCallback, useTransition } from "react";
import { X, Plus, Minus, Lock, Truck, Loader2, Copy, Check, ArrowRight, ChevronLeft } from "lucide-react";
import { z } from "zod";
import {
  generateFiatDepositInstructions,
  type FiatDepositInstructions,
} from "@/actions/banking";

/* ================================================================
   TYPES
   ================================================================ */

export interface RetailProduct {
  id: string;
  name: string;
  shortName: string;
  weightOz: number;
  purity: string;
  subtext: string;
  priceUsd: number;
}

type DestinationType = "vault" | "ship";

/* ================================================================
   ZOD — Address Validation
   ================================================================ */

const addressSchema = z.object({
  streetAddress: z.string().min(3, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().length(2, "Select a state"),
  zipCode: z.string().regex(/^\d{5}$/, "Enter a 5-digit zip code"),
});

type AddressFields = z.infer<typeof addressSchema>;

/* ================================================================
   US STATES
   ================================================================ */

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
] as const;

/* ================================================================
   COPY BUTTON
   ================================================================ */

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300 active:scale-95"
      aria-label={`Copy ${value}`}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

/* ================================================================
   FORMAT HELPER
   ================================================================ */

function formatUSD(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ================================================================
   BUY PANEL — Slide-out 3-step Checkout
   ================================================================ */

export function BuyPanel({
  product,
  onClose,
}: {
  product: RetailProduct;
  onClose: () => void;
}) {
  /* ── Step State ── */
  const [step, setStep] = useState<1 | 2 | 3>(1);

  /* ── Step 1: Quantity ── */
  const [quantity, setQuantity] = useState(1);

  /* ── Step 2: Destination ── */
  const [destination, setDestination] = useState<DestinationType>("vault");
  const [address, setAddress] = useState<AddressFields>({
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof AddressFields, string>>>({});

  /* ── Step 3: Payment ── */
  const [isPending, startTransition] = useTransition();
  const [wireDetails, setWireDetails] = useState<FiatDepositInstructions | null>(null);

  const subtotal = product.priceUsd * quantity;

  /* ── Handlers ── */

  const increment = useCallback(() => setQuantity((q) => Math.min(q + 1, 10)), []);
  const decrement = useCallback(() => setQuantity((q) => Math.max(q - 1, 1)), []);

  const updateAddress = useCallback((field: keyof AddressFields, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: field === "zipCode" ? value.replace(/\D/g, "").slice(0, 5) : value }));
    setAddressErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const advanceToStep2 = useCallback(() => setStep(2), []);

  const advanceToStep3 = useCallback(() => {
    if (destination === "ship") {
      const result = addressSchema.safeParse(address);
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof AddressFields, string>> = {};
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as keyof AddressFields;
          if (!fieldErrors[field]) fieldErrors[field] = issue.message;
        });
        setAddressErrors(fieldErrors);
        return;
      }
    }
    setStep(3);
  }, [destination, address]);

  const handleGenerateWire = useCallback(() => {
    startTransition(async () => {
      try {
        const instructions = await generateFiatDepositInstructions(
          "retail-counterparty-id",
          `AurumShield Retail — ${quantity}x ${product.shortName} ($${formatUSD(subtotal)})`,
        );
        setWireDetails(instructions);
      } catch (err) {
        console.error("[AurumShield Retail] Wire generation failed:", err);
      }
    });
  }, [quantity, product.shortName, subtotal]);

  const goBack = useCallback(() => {
    if (step === 3 && wireDetails) {
      setWireDetails(null);
      return;
    }
    setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3);
  }, [step, wireDetails]);

  /* ── Step Indicator ── */
  const steps = ["Quantity", "Destination", "Pay"];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-2xl shadow-black/50 animate-slide-in-right">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            {step > 1 && !wireDetails && (
              <button
                type="button"
                onClick={goBack}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                aria-label="Go back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-slate-100">{product.name}</h2>
              <p className="text-xs text-slate-500">{product.purity}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Step Indicator Bar ── */}
        <div className="flex items-center gap-1 border-b border-slate-800/60 px-6 py-3">
          {steps.map((label, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === step;
            const isComplete = stepNum < step;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300 ${
                    isComplete
                      ? "bg-emerald-600 text-white"
                      : isActive
                        ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50"
                        : "bg-slate-800 text-slate-600"
                  }`}
                >
                  {isComplete ? "✓" : stepNum}
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    isActive ? "text-emerald-400" : isComplete ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`ml-auto h-px flex-1 ${isComplete ? "bg-emerald-700" : "bg-slate-800"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {/* ══════════════════════════════════════════════════════
             STEP 1 — QUANTITY
             ══════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <span className="mb-3 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  How many bars?
                </span>
                <div className="flex items-center justify-center gap-6">
                  <button
                    id="qty-decrement"
                    type="button"
                    onClick={decrement}
                    disabled={quantity <= 1}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-6xl font-bold tabular-nums text-white">{quantity}</span>
                    <span className="mt-1 text-xs text-slate-500">
                      {quantity === 1 ? "bar" : "bars"}
                    </span>
                  </div>
                  <button
                    id="qty-increment"
                    type="button"
                    onClick={increment}
                    disabled={quantity >= 10}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Subtotal */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    {quantity} × {product.shortName}
                  </span>
                  <span className="text-sm text-slate-500">${formatUSD(product.priceUsd)} each</span>
                </div>
                <div className="mt-3 border-t border-slate-800 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      Subtotal
                    </span>
                    <span className="font-mono text-3xl font-bold tabular-nums text-white">
                      ${formatUSD(subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
             STEP 2 — DESTINATION
             ══════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <span className="mb-3 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Where should we put your gold?
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {/* Vault Option */}
                  <button
                    id="dest-vault-retail"
                    type="button"
                    onClick={() => setDestination("vault")}
                    className={`group flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all duration-200 ${
                      destination === "vault"
                        ? "border-emerald-700/60 bg-emerald-950/30 shadow-lg shadow-emerald-900/20"
                        : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      destination === "vault" ? "bg-emerald-600/20" : "bg-slate-800"
                    }`}>
                      <Lock className={`h-6 w-6 ${
                        destination === "vault" ? "text-emerald-400" : "text-slate-500"
                      }`} />
                    </div>
                    <div className="text-center">
                      <span className={`block text-sm font-semibold ${
                        destination === "vault" ? "text-emerald-300" : "text-slate-300"
                      }`}>
                        Keep in Vault
                      </span>
                      <span className={`mt-0.5 block text-[10px] ${
                        destination === "vault" ? "text-emerald-500/70" : "text-slate-600"
                      }`}>
                        Insured LBMA Storage
                      </span>
                    </div>
                  </button>

                  {/* Ship Option */}
                  <button
                    id="dest-ship-retail"
                    type="button"
                    onClick={() => setDestination("ship")}
                    className={`group flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all duration-200 ${
                      destination === "ship"
                        ? "border-amber-700/60 bg-amber-950/30 shadow-lg shadow-amber-900/20"
                        : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      destination === "ship" ? "bg-amber-600/20" : "bg-slate-800"
                    }`}>
                      <Truck className={`h-6 w-6 ${
                        destination === "ship" ? "text-amber-400" : "text-slate-500"
                      }`} />
                    </div>
                    <div className="text-center">
                      <span className={`block text-sm font-semibold ${
                        destination === "ship" ? "text-amber-300" : "text-slate-300"
                      }`}>
                        Ship to Me
                      </span>
                      <span className={`mt-0.5 block text-[10px] ${
                        destination === "ship" ? "text-amber-500/70" : "text-slate-600"
                      }`}>
                        Armored Delivery
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* ── Shipping Address Form (conditional) ── */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  destination === "ship"
                    ? "max-h-[500px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    Shipping Address
                  </span>

                  {/* Street */}
                  <div>
                    <label htmlFor="retail-street" className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Street Address
                    </label>
                    <input
                      id="retail-street"
                      type="text"
                      value={address.streetAddress}
                      onChange={(e) => updateAddress("streetAddress", e.target.value)}
                      placeholder="123 Gold Avenue, Suite 400"
                      autoComplete="off"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-slate-600 focus:ring-1 focus:ring-slate-600/50"
                    />
                    {addressErrors.streetAddress && (
                      <p className="mt-1 text-[10px] text-red-400">{addressErrors.streetAddress}</p>
                    )}
                  </div>

                  {/* City / State / Zip */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-2">
                      <label htmlFor="retail-city" className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        City
                      </label>
                      <input
                        id="retail-city"
                        type="text"
                        value={address.city}
                        onChange={(e) => updateAddress("city", e.target.value)}
                        placeholder="New York"
                        autoComplete="off"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-slate-600 focus:ring-1 focus:ring-slate-600/50"
                      />
                      {addressErrors.city && (
                        <p className="mt-1 text-[10px] text-red-400">{addressErrors.city}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="retail-state" className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        State
                      </label>
                      <select
                        id="retail-state"
                        value={address.state}
                        onChange={(e) => updateAddress("state", e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2.5 text-sm text-slate-200 outline-none transition-colors appearance-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600/50"
                      >
                        <option value="" className="bg-slate-900">—</option>
                        {US_STATES.map((s) => (
                          <option key={s} value={s} className="bg-slate-900">{s}</option>
                        ))}
                      </select>
                      {addressErrors.state && (
                        <p className="mt-1 text-[10px] text-red-400">{addressErrors.state}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="retail-zip" className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Zip Code
                      </label>
                      <input
                        id="retail-zip"
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        value={address.zipCode}
                        onChange={(e) => updateAddress("zipCode", e.target.value)}
                        placeholder="10005"
                        autoComplete="off"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono font-semibold tabular-nums text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-slate-600 focus:ring-1 focus:ring-slate-600/50"
                      />
                      {addressErrors.zipCode && (
                        <p className="mt-1 text-[10px] text-red-400">{addressErrors.zipCode}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
             STEP 3 — PAY
             ══════════════════════════════════════════════════════ */}
          {step === 3 && !wireDetails && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
                <span className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Order Summary
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Product</span>
                    <span className="font-medium text-slate-200">{quantity}× {product.shortName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Unit Price</span>
                    <span className="font-mono tabular-nums text-slate-300">${formatUSD(product.priceUsd)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Destination</span>
                    <span className="text-slate-300">
                      {destination === "vault" ? "🔒 Vault Storage" : "📦 Ship to Me"}
                    </span>
                  </div>
                  {destination === "ship" && (
                    <div className="flex items-start justify-between text-sm">
                      <span className="text-slate-400">Ship To</span>
                      <span className="text-right text-xs text-slate-400">
                        {address.streetAddress}<br />
                        {address.city}, {address.state} {address.zipCode}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-slate-300">Total</span>
                    <span className="font-mono text-3xl font-bold tabular-nums text-white">
                      ${formatUSD(subtotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Generate Wire Button */}
              <button
                id="generate-wire-retail"
                type="button"
                onClick={handleGenerateWire}
                disabled={isPending}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-5 text-base font-bold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Wire Instructions…
                  </>
                ) : (
                  <>
                    Generate Wire Instructions
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
             STEP 3 — WIRE DETAILS (after generation)
             ══════════════════════════════════════════════════════ */}
          {step === 3 && wireDetails && (
            <div className="space-y-6">
              <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/20 px-5 py-3.5">
                <p className="text-sm leading-relaxed text-emerald-300/80">
                  Wire the exact amount below from your bank account.
                  Your gold will be allocated upon receipt.
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                {/* Amount Due */}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Amount Due
                  </span>
                  <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-white">
                    ${formatUSD(subtotal)}
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                {/* Bank Name */}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Bank Name
                  </span>
                  <div className="mt-1 text-lg font-medium text-slate-200">
                    {wireDetails.bankName}
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                {/* Routing Number */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      Routing Number
                    </span>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-wider text-slate-100">
                      {wireDetails.routingNumber}
                    </div>
                  </div>
                  <CopyButton value={wireDetails.routingNumber} />
                </div>

                <div className="h-px bg-slate-800" />

                {/* Account Number */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      Account Number
                    </span>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-wider text-slate-100">
                      {wireDetails.accountNumber}
                    </div>
                  </div>
                  <CopyButton value={wireDetails.accountNumber} />
                </div>

                <div className="h-px bg-slate-800" />

                {/* Beneficiary */}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Beneficiary
                  </span>
                  <div className="mt-1 text-lg font-medium text-slate-200">
                    AurumShield FBO [Your Account]
                  </div>
                </div>
              </div>

              {/* Done */}
              <button
                id="wire-done-retail"
                type="button"
                onClick={onClose}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-emerald-700/40 bg-emerald-950/30 px-6 py-4 text-sm font-semibold text-emerald-400 transition-all hover:border-emerald-600/60 hover:bg-emerald-950/50 active:scale-[0.98]"
              >
                ✓ I Have Initiated This Wire
              </button>
            </div>
          )}
        </div>

        {/* ── Footer CTA (Steps 1 & 2 only) ── */}
        {step < 3 && (
          <div className="border-t border-slate-800 px-6 py-4">
            <button
              id={step === 1 ? "continue-to-destination" : "continue-to-pay"}
              type="button"
              onClick={step === 1 ? advanceToStep2 : advanceToStep3}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-500 active:scale-[0.98]"
            >
              {step === 1 ? "Choose Destination" : "Review & Pay"}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
