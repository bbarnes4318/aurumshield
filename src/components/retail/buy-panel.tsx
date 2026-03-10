"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Minus, Lock, Truck, Loader2, Copy, Check, ArrowRight, ChevronLeft, Package, ArrowLeft, AlertTriangle } from "lucide-react";
import { z } from "zod";
import {
  generateFiatDepositInstructions,
  type FiatDepositInstructions,
} from "@/actions/banking";
import {
  verifyAddressAndQuote,
  type FreightQuoteResult,
  type FreightAddress,
} from "@/actions/logistics";
import {
  createRetailOrder,
} from "@/lib/retail-order";

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
  image?: string;
  featured?: boolean;
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
      className="ml-2 inline-flex items-center justify-center rounded-sm p-1.5 text-slate-600 transition-colors hover:bg-slate-800 hover:text-slate-300 active:scale-95"
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
   BUY PANEL — Institutional Slide-Out Checkout Terminal
   ================================================================ */

export function BuyPanel({
  product,
  onClose,
}: {
  product: RetailProduct;
  onClose: () => void;
}) {
  const router = useRouter();

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

  /* ── Freight Quote State ── */
  const [freightQuote, setFreightQuote] = useState<FreightQuoteResult | null>(null);
  const [freightLoading, setFreightLoading] = useState(false);
  const [freightError, setFreightError] = useState<string | null>(null);

  /* ── Step 3: Payment ── */
  const [isPending, startTransition] = useTransition();
  const [wireDetails, setWireDetails] = useState<FiatDepositInstructions | null>(null);

  /* ── Order Creation State ── */
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const subtotal = product.priceUsd * quantity;
  const logisticsFee = destination === "ship" && freightQuote ? freightQuote.totalLogisticsFee : 0;
  const grandTotal = subtotal + logisticsFee;

  /* ── Handlers ── */

  const increment = useCallback(() => setQuantity((q) => Math.min(q + 1, 10)), []);
  const decrement = useCallback(() => setQuantity((q) => Math.max(q - 1, 1)), []);

  const updateAddress = useCallback((field: keyof AddressFields, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: field === "zipCode" ? value.replace(/\D/g, "").slice(0, 5) : value }));
    setAddressErrors((prev) => ({ ...prev, [field]: undefined }));
    // Reset freight quote when address changes
    setFreightQuote(null);
    setFreightError(null);
  }, []);

  const advanceToStep2 = useCallback(() => setStep(2), []);

  const advanceToStep3 = useCallback(async () => {
    if (destination === "ship") {
      // ── Validate address with Zod ──
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

      // ── Call verifyAddressAndQuote for freight pricing ──
      if (!freightQuote) {
        setFreightLoading(true);
        setFreightError(null);
        try {
          const freightAddr: FreightAddress = {
            streetAddress: address.streetAddress,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
            addressType: "residential",
          };
          const quote = await verifyAddressAndQuote(freightAddr, subtotal);
          setFreightQuote(quote);
          setFreightLoading(false);
          setStep(3);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to calculate shipping. Please try again.";
          setFreightError(message);
          setFreightLoading(false);
          return;
        }
        return;
      }
    }
    setStep(3);
  }, [destination, address, freightQuote, subtotal]);

  const handleGenerateWire = useCallback(() => {
    startTransition(async () => {
      try {
        const instructions = await generateFiatDepositInstructions(
          "retail-counterparty-id",
          `AurumShield Retail — ${quantity}x ${product.shortName} ($${formatUSD(grandTotal)})`,
        );
        setWireDetails(instructions);
      } catch (err) {
        console.error("[AurumShield Retail] Wire generation failed:", err);
      }
    });
  }, [quantity, product.shortName, grandTotal]);

  const goBack = useCallback(() => {
    if (step === 3 && wireDetails) {
      setWireDetails(null);
      return;
    }
    if (step === 3) {
      setStep(2);
      return;
    }
    setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3);
  }, [step, wireDetails]);

  /* ── Handle "I Have Initiated This Wire" — Create Order & Route ── */
  const handleWireInitiated = useCallback(async () => {
    setIsCreatingOrder(true);
    setOrderError(null);
    try {
      const result = await createRetailOrder({
        productId: product.id,
        productName: product.name,
        weightOzPerUnit: product.weightOz,
        quantity,
        pricePerUnit: product.priceUsd,
        destination,
        shippingAddress: destination === "ship" ? address : undefined,
        logisticsFeeUsd: logisticsFee,
        grandTotalUsd: grandTotal,
      });
      // Route to the order detail page
      router.push(`/orders/${result.orderId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create order. Please try again.";
      setOrderError(message);
      setIsCreatingOrder(false);
    }
  }, [product, quantity, destination, address, logisticsFee, grandTotal, router]);

  /* ── Step Indicator ── */
  const steps = ["Quantity", "Destination", "Pay"];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel — Institutional dark terminal shell */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-slide-in-right">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            {step > 1 && !wireDetails && (
              <button
                type="button"
                onClick={goBack}
                className="flex h-8 w-8 items-center justify-center rounded-sm border border-slate-700 bg-slate-900 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
                aria-label="Go back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-sm border border-[#c6a86b]/25 bg-[#c6a86b]/5 px-2 py-0.5">
                <Lock className="h-2.5 w-2.5 text-[#c6a86b]" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#c6a86b]">
                  Secure Checkout
                </span>
              </div>
              <h2 className="text-base font-semibold text-slate-200">{product.name}</h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600">{product.purity}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-slate-700 bg-slate-900 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Step Indicator Bar ── */}
        <div className="flex items-center gap-1 border-b border-slate-800/60 bg-slate-950 px-6 py-3">
          {steps.map((label, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === step;
            const isComplete = stepNum < step;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-sm font-mono text-[10px] font-bold transition-colors duration-300 ${
                    isComplete
                      ? "bg-[#c6a86b] text-slate-950"
                      : isActive
                        ? "bg-[#c6a86b]/15 text-[#c6a86b] ring-1 ring-[#c6a86b]/40"
                        : "bg-slate-900 text-slate-600 border border-slate-800"
                  }`}
                >
                  {isComplete ? "✓" : stepNum}
                </div>
                <span
                  className={`font-mono text-[10px] font-bold uppercase tracking-widest ${
                    isActive ? "text-[#c6a86b]" : isComplete ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`ml-auto h-px flex-1 ${isComplete ? "bg-[#c6a86b]/40" : "bg-slate-800"}`} />
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
                <span className="mb-3 block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  How many bars?
                </span>
                <div className="flex items-center justify-center gap-6">
                  <button
                    id="qty-decrement"
                    type="button"
                    onClick={decrement}
                    disabled={quantity <= 1}
                    className="flex h-14 w-14 items-center justify-center rounded-sm border border-slate-700 bg-slate-900 text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-6xl font-bold tabular-nums text-white">{quantity}</span>
                    <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-600">
                      {quantity === 1 ? "bar" : "bars"}
                    </span>
                  </div>
                  <button
                    id="qty-increment"
                    type="button"
                    onClick={increment}
                    disabled={quantity >= 10}
                    className="flex h-14 w-14 items-center justify-center rounded-sm border border-slate-700 bg-slate-900 text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Subtotal — Financial ledger style */}
              <div className="border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {quantity} × {product.shortName}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-slate-400">${formatUSD(product.priceUsd)} each</span>
                </div>
                <div className="mt-3 border-t border-slate-800 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Subtotal
                    </span>
                    <span className="font-mono text-3xl font-bold tabular-nums text-[#c6a86b]">
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
                <span className="mb-3 block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Where should we put your gold?
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {/* Vault Option */}
                  <button
                    id="dest-vault-retail"
                    type="button"
                    onClick={() => { setDestination("vault"); setFreightQuote(null); setFreightError(null); }}
                    className={`group flex flex-col items-center gap-3 rounded-sm border p-5 transition-all duration-200 ${
                      destination === "vault"
                        ? "border-[#c6a86b] bg-slate-900 shadow-[inset_0_0_20px_rgba(198,168,107,0.06)]"
                        : "border-slate-800 bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-sm ${
                      destination === "vault" ? "bg-[#c6a86b]/10 border border-[#c6a86b]/25" : "bg-slate-800 border border-slate-700"
                    }`}>
                      <Lock className={`h-6 w-6 ${
                        destination === "vault" ? "text-[#c6a86b]" : "text-slate-500"
                      }`} />
                    </div>
                    <div className="text-center">
                      <span className={`block text-sm font-semibold ${
                        destination === "vault" ? "text-[#c6a86b]" : "text-slate-300"
                      }`}>
                        Keep in Vault
                      </span>
                      <span className={`mt-0.5 block font-mono text-[9px] uppercase tracking-widest ${
                        destination === "vault" ? "text-[#c6a86b]/60" : "text-slate-600"
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
                    className={`group flex flex-col items-center gap-3 rounded-sm border p-5 transition-all duration-200 ${
                      destination === "ship"
                        ? "border-[#c6a86b] bg-slate-900 shadow-[inset_0_0_20px_rgba(198,168,107,0.06)]"
                        : "border-slate-800 bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-sm ${
                      destination === "ship" ? "bg-[#c6a86b]/10 border border-[#c6a86b]/25" : "bg-slate-800 border border-slate-700"
                    }`}>
                      <Truck className={`h-6 w-6 ${
                        destination === "ship" ? "text-[#c6a86b]" : "text-slate-500"
                      }`} />
                    </div>
                    <div className="text-center">
                      <span className={`block text-sm font-semibold ${
                        destination === "ship" ? "text-[#c6a86b]" : "text-slate-300"
                      }`}>
                        Ship to Me
                      </span>
                      <span className={`mt-0.5 block font-mono text-[9px] uppercase tracking-widest ${
                        destination === "ship" ? "text-[#c6a86b]/60" : "text-slate-600"
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
                    ? "max-h-[600px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="space-y-3 border border-slate-800 bg-slate-900 p-4">
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Shipping Address
                  </span>

                  {/* Street */}
                  <div>
                    <label htmlFor="retail-street" className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Street Address
                    </label>
                    <input
                      id="retail-street"
                      type="text"
                      value={address.streetAddress}
                      onChange={(e) => updateAddress("streetAddress", e.target.value)}
                      placeholder="123 Gold Avenue, Suite 400"
                      autoComplete="street-address"
                      className="w-full rounded-sm border border-slate-800 bg-slate-950 px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-700 outline-none transition-colors focus:border-[#c6a86b] focus:ring-1 focus:ring-[#c6a86b]"
                    />
                    {addressErrors.streetAddress && (
                      <p className="mt-1 font-mono text-[10px] text-red-400">{addressErrors.streetAddress}</p>
                    )}
                  </div>

                  {/* City / State / Zip */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-2">
                      <label htmlFor="retail-city" className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        City
                      </label>
                      <input
                        id="retail-city"
                        type="text"
                        value={address.city}
                        onChange={(e) => updateAddress("city", e.target.value)}
                        placeholder="New York"
                        autoComplete="address-level2"
                        className="w-full rounded-sm border border-slate-800 bg-slate-950 px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-700 outline-none transition-colors focus:border-[#c6a86b] focus:ring-1 focus:ring-[#c6a86b]"
                      />
                      {addressErrors.city && (
                        <p className="mt-1 font-mono text-[10px] text-red-400">{addressErrors.city}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="retail-state" className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        State
                      </label>
                      <select
                        id="retail-state"
                        value={address.state}
                        onChange={(e) => updateAddress("state", e.target.value)}
                        autoComplete="address-level1"
                        className="w-full rounded-sm border border-slate-800 bg-slate-950 px-2 py-2.5 font-mono text-sm text-white outline-none transition-colors appearance-none focus:border-[#c6a86b] focus:ring-1 focus:ring-[#c6a86b]"
                      >
                        <option value="" className="bg-slate-950">—</option>
                        {US_STATES.map((s) => (
                          <option key={s} value={s} className="bg-slate-950">{s}</option>
                        ))}
                      </select>
                      {addressErrors.state && (
                        <p className="mt-1 font-mono text-[10px] text-red-400">{addressErrors.state}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="retail-zip" className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
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
                        autoComplete="postal-code"
                        className="w-full rounded-sm border border-slate-800 bg-slate-950 px-3 py-2.5 font-mono text-sm font-semibold tabular-nums text-white placeholder:text-slate-700 outline-none transition-colors focus:border-[#c6a86b] focus:ring-1 focus:ring-[#c6a86b]"
                      />
                      {addressErrors.zipCode && (
                        <p className="mt-1 font-mono text-[10px] text-red-400">{addressErrors.zipCode}</p>
                      )}
                    </div>
                  </div>

                  {/* ── Freight Error Banner ── */}
                  {freightError && (
                    <div className="flex items-start gap-2.5 border border-red-500/30 bg-red-950/30 px-4 py-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <p className="font-mono text-xs leading-relaxed text-red-300">{freightError}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
             STEP 3 — PAY (Order Summary, before wire generation)
             ══════════════════════════════════════════════════════ */}
          {step === 3 && !wireDetails && (
            <div className="space-y-6">
              {/* Order Summary — Financial Ledger */}
              <div className="border border-slate-800 bg-slate-900 p-5 space-y-4">
                <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Order Summary
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Product</span>
                    <span className="font-mono text-sm font-medium text-white">{quantity}× {product.shortName}</span>
                  </div>
                  <div className="border-t border-slate-800" />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Unit Price</span>
                    <span className="font-mono text-sm tabular-nums text-slate-300">${formatUSD(product.priceUsd)}</span>
                  </div>
                  <div className="border-t border-slate-800" />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Subtotal</span>
                    <span className="font-mono text-sm tabular-nums text-slate-300">${formatUSD(subtotal)}</span>
                  </div>
                  <div className="border-t border-slate-800" />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Destination</span>
                    <span className="font-mono text-sm text-slate-300">
                      {destination === "vault" ? "🔒 Vault Storage" : "📦 Ship to Me"}
                    </span>
                  </div>
                  {destination === "ship" && (
                    <>
                      <div className="border-t border-slate-800" />
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Ship To</span>
                        <span className="text-right font-mono text-xs text-slate-500">
                          {address.streetAddress}<br />
                          {address.city}, {address.state} {address.zipCode}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Freight Cost Breakdown (Ship to Me only) ── */}
                {destination === "ship" && freightQuote && (
                  <div className="space-y-2 border-t border-slate-800 pt-3">
                    <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Armored Freight &amp; Insurance
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Base Dispatch</span>
                        <span className="font-mono text-xs tabular-nums text-slate-400">${formatUSD(freightQuote.baseDispatch)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Mileage Surcharge ({freightQuote.distanceMiles} mi)</span>
                        <span className="font-mono text-xs tabular-nums text-slate-400">${formatUSD(freightQuote.mileageSurcharge)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Lloyd&apos;s Insurance (15bps)</span>
                        <span className="font-mono text-xs tabular-nums text-slate-400">${formatUSD(freightQuote.insurancePremium)}</span>
                      </div>
                      <div className="border-t border-slate-800" />
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#c6a86b]/80">Total Logistics Fee</span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-[#c6a86b]">${formatUSD(freightQuote.totalLogisticsFee)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Grand Total ── */}
                <div className="border-t border-slate-800 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {destination === "ship" ? "Wire Total (incl. Freight)" : "Total"}
                    </span>
                    <span className="font-mono text-3xl font-bold tabular-nums text-[#c6a86b]">
                      ${formatUSD(grandTotal)}
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
                className="group flex w-full items-center justify-center gap-3 rounded-sm bg-[#c6a86b] px-6 py-5 text-base font-bold text-slate-950 shadow-lg shadow-[#c6a86b]/10 transition-all hover:bg-[#d4b97a] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
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
              {/* ── Back Button ── */}
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Order Summary
              </button>

              <div className="border border-[#c6a86b]/20 bg-[#c6a86b]/5 px-5 py-3.5">
                <p className="font-mono text-sm leading-relaxed text-[#c6a86b]/80">
                  Wire the exact amount below from your bank account.
                  Your gold will be allocated upon receipt.
                </p>
              </div>

              {/* ── Wire Details — Secure bank document style ── */}
              <div className="space-y-4 border-l-4 border-[#c6a86b] bg-slate-900 p-6">
                {/* Amount Due — INCLUDES FREIGHT */}
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Amount Due
                  </span>
                  <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-[#c6a86b]">
                    ${formatUSD(grandTotal)}
                  </div>
                  {destination === "ship" && freightQuote && (
                    <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                      Includes ${formatUSD(freightQuote.totalLogisticsFee)} armored freight &amp; insurance
                    </p>
                  )}
                </div>

                <div className="h-px bg-slate-800" />

                {/* Bank Name */}
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Bank Name
                  </span>
                  <div className="mt-1 text-lg font-medium text-white">
                    {wireDetails.bankName}
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                {/* Routing Number */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Routing Number
                    </span>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-wider text-white">
                      {wireDetails.routingNumber}
                    </div>
                  </div>
                  <CopyButton value={wireDetails.routingNumber} />
                </div>

                <div className="h-px bg-slate-800" />

                {/* Account Number */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Account Number
                    </span>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-wider text-white">
                      {wireDetails.accountNumber}
                    </div>
                  </div>
                  <CopyButton value={wireDetails.accountNumber} />
                </div>

                <div className="h-px bg-slate-800" />

                {/* Beneficiary */}
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Beneficiary
                  </span>
                  <div className="mt-1 text-lg font-medium text-white">
                    AurumShield FBO [Your Account]
                  </div>
                </div>
              </div>

              {/* ── Order Error Banner ── */}
              {orderError && (
                <div className="flex items-start gap-2.5 border border-red-500/30 bg-red-950/30 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <p className="font-mono text-xs leading-relaxed text-red-300">{orderError}</p>
                </div>
              )}

              {/* ── "I Have Initiated This Wire" → Creates Order → Routes to /orders/[id] ── */}
              <button
                id="wire-done-retail"
                type="button"
                onClick={handleWireInitiated}
                disabled={isCreatingOrder}
                className="group flex w-full items-center justify-center gap-3 rounded-sm border border-[#c6a86b]/30 bg-[#c6a86b]/10 px-6 py-4 font-mono text-sm font-bold text-[#c6a86b] transition-all hover:border-[#c6a86b]/50 hover:bg-[#c6a86b]/20 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Your Order…
                  </>
                ) : (
                  <>
                    ✓ I Have Initiated This Wire
                  </>
                )}
              </button>

              {/* ── View Order Status (also creates order first) ── */}
              <button
                id="view-order-tracking-retail"
                type="button"
                onClick={handleWireInitiated}
                disabled={isCreatingOrder}
                className="group flex w-full items-center justify-center gap-3 rounded-sm border border-slate-700 bg-slate-900 px-6 py-4 font-mono text-sm font-semibold text-slate-400 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    View Order Status & Tracking
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Footer CTA (Steps 1 & 2 only) ── */}
        {step < 3 && (
          <div className="border-t border-slate-800 bg-slate-950 px-6 py-4 space-y-2">
            {/* Back Button (Step 2 only) */}
            {step === 2 && (
              <button
                type="button"
                onClick={goBack}
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-slate-700 bg-slate-900 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-slate-400 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white active:scale-[0.98]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Quantity
              </button>
            )}
            <button
              id={step === 1 ? "continue-to-destination" : "continue-to-pay"}
              type="button"
              onClick={step === 1 ? advanceToStep2 : advanceToStep3}
              disabled={freightLoading}
              className="group flex w-full items-center justify-center gap-3 rounded-sm bg-[#c6a86b] px-6 py-4 text-base font-bold text-slate-950 shadow-lg shadow-[#c6a86b]/10 transition-all hover:bg-[#d4b97a] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
            >
              {freightLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Calculating Armored Freight…
                </>
              ) : (
                <>
                  {step === 1 ? "Choose Destination" : "Review & Pay"}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
