"use client";

/* ================================================================
   BANK DETAILS FORM — Seller Counterparty Onboarding

   Captures the seller's banking details (name, routing number,
   account number) and submits them directly to the registerSellerBank
   Server Action.  Sensitive data is NEVER stored in local / global
   state — only the returned counterparty_id is surfaced.
   ================================================================ */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Landmark, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { registerSellerBank } from "@/actions/onboarding";

/* ---------- Schema ---------- */

const bankDetailsSchema = z.object({
  name: z.string().min(1, "Account holder name is required"),
  routingNumber: z
    .string()
    .regex(/^\d{9}$/, "ABA routing number must be exactly 9 digits"),
  accountNumber: z
    .string()
    .regex(/^\d{4,17}$/, "Account number must be 4–17 digits"),
});

type BankDetailsForm = z.infer<typeof bankDetailsSchema>;

/* ---------- Props ---------- */

interface BankDetailsFormProps {
  /** Called with the Modern Treasury counterparty ID after successful registration */
  onSuccess?: (counterpartyId: string) => void;
}

/* ---------- Component ---------- */

export function BankDetailsForm({ onSuccess }: BankDetailsFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [linkedId, setLinkedId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BankDetailsForm>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      name: "",
      routingNumber: "",
      accountNumber: "",
    },
  });

  const onSubmit = async (data: BankDetailsForm) => {
    setServerError(null);

    const result = await registerSellerBank(
      data.name,
      data.routingNumber,
      data.accountNumber,
    );

    if (result.success && result.counterpartyId) {
      setLinkedId(result.counterpartyId);
      reset();
      onSuccess?.(result.counterpartyId);
    } else {
      setServerError(result.error ?? "Failed to link bank account.");
    }
  };

  /* ── Input class (matches project design system) ── */
  const inputCls =
    "w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors";

  /* ── Success state ── */
  if (linkedId) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-6 shadow-md">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 ring-2 ring-gold/30">
            <ShieldCheck className="h-7 w-7 text-gold" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text">
              Bank Account Linked Securely
            </h3>
            <p className="mt-1 text-xs text-text-faint">
              Counterparty ID:{" "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-gold">
                {linkedId}
              </code>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLinkedId(null)}
            className="mt-2 text-xs font-medium text-gold hover:text-gold-hover transition-colors"
          >
            Link another account →
          </button>
        </div>
      </div>
    );
  }

  /* ── Form state ── */
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-6 shadow-md">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <Landmark className="h-5 w-5 text-gold" />
        <h2 className="text-sm font-semibold text-text tracking-tight">
          Link Bank Account
        </h2>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Account Holder Name */}
        <div>
          <label
            htmlFor="bank-name"
            className="block text-xs font-medium text-text-muted mb-1.5"
          >
            Account Holder Name
          </label>
          <input
            id="bank-name"
            type="text"
            autoComplete="off"
            placeholder="Aurelia Sovereign Fund Ltd."
            className={inputCls}
            {...register("name")}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
          )}
        </div>

        {/* Routing + Account side-by-side */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* ABA Routing Number */}
          <div>
            <label
              htmlFor="bank-routing"
              className="block text-xs font-medium text-text-muted mb-1.5"
            >
              ABA Routing Number
            </label>
            <input
              id="bank-routing"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={9}
              placeholder="021000021"
              className={inputCls}
              {...register("routingNumber")}
            />
            {errors.routingNumber && (
              <p className="mt-1 text-xs text-danger">
                {errors.routingNumber.message}
              </p>
            )}
          </div>

          {/* Account Number */}
          <div>
            <label
              htmlFor="bank-account"
              className="block text-xs font-medium text-text-muted mb-1.5"
            >
              Account Number
            </label>
            <input
              id="bank-account"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={17}
              placeholder="••••••••1234"
              className={inputCls}
              {...register("accountNumber")}
            />
            {errors.accountNumber && (
              <p className="mt-1 text-xs text-danger">
                {errors.accountNumber.message}
              </p>
            )}
          </div>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-gold/20 bg-gold/5 px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-gold" />
          <p className="text-[11px] leading-relaxed text-text-muted">
            Your banking details are transmitted directly to our banking
            partner (Modern Treasury) over an encrypted channel. AurumShield{" "}
            <strong className="text-text">never stores</strong> your routing
            or account numbers.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-input)] bg-gold px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Linking…
            </>
          ) : (
            <>
              <Landmark className="h-4 w-4" />
              Link Bank Account
            </>
          )}
        </button>
      </form>
    </div>
  );
}
