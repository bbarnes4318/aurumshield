"use client";

/* ================================================================
   ADDRESS CAPTURE FORM — Zod-validated delivery address input
   Compact institutional styling matching BuyNowModal aesthetic.
   ================================================================ */

import { useFormContext, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import type { DeliveryAddress } from "@/lib/delivery/delivery-types";

/* ---------- Country Options ---------- */

const COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CH", label: "Switzerland" },
  { code: "DE", label: "Germany" },
  { code: "SG", label: "Singapore" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "HK", label: "Hong Kong" },
  { code: "AU", label: "Australia" },
  { code: "CA", label: "Canada" },
  { code: "JP", label: "Japan" },
  { code: "LU", label: "Luxembourg" },
  { code: "NO", label: "Norway" },
] as const;

/* ---------- Shared Input ---------- */

function FormInput({
  name,
  label,
  placeholder,
  type = "text",
  className,
  disabled,
}: {
  name: keyof DeliveryAddress;
  label: string;
  placeholder: string;
  type?: string;
  className?: string;
  disabled?: boolean;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<DeliveryAddress>();

  const error = errors[name];

  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={`addr-${name}`} className="typo-label block">
        {label}
      </label>
      <input
        id={`addr-${name}`}
        type={type}
        disabled={disabled}
        {...register(name)}
        className={cn(
          "w-full rounded-[var(--radius-input)] border bg-surface-2 px-3 py-2 text-sm text-text",
          "placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors",
          error ? "border-danger" : "border-border",
          disabled && "opacity-60",
        )}
        placeholder={placeholder}
      />
      {error && (
        <p className="text-[11px] text-danger">{error.message}</p>
      )}
    </div>
  );
}

/* ---------- Component ---------- */

interface AddressCaptureFormProps {
  disabled?: boolean;
}

export function AddressCaptureForm({ disabled = false }: AddressCaptureFormProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<DeliveryAddress>();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-gold" />
        <span className="typo-label">Delivery Address</span>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-3 space-y-3">
        <FormInput
          name="fullName"
          label="Full Name"
          placeholder="John Smith"
          disabled={disabled}
        />

        <FormInput
          name="streetAddress"
          label="Street Address"
          placeholder="100 Wall Street"
          disabled={disabled}
        />

        <FormInput
          name="streetAddress2"
          label="Suite / Floor (optional)"
          placeholder="Suite 4200"
          disabled={disabled}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            name="city"
            label="City"
            placeholder="New York"
            disabled={disabled}
          />
          <FormInput
            name="stateProvince"
            label="State / Province"
            placeholder="NY"
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            name="postalCode"
            label="Postal Code"
            placeholder="10005"
            disabled={disabled}
          />

          {/* Country dropdown */}
          <div className="space-y-1">
            <label htmlFor="addr-country" className="typo-label block">
              Country
            </label>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <select
                  id="addr-country"
                  disabled={disabled}
                  {...field}
                  className={cn(
                    "w-full rounded-[var(--radius-input)] border bg-surface-2 px-3 py-2 text-sm text-text",
                    "focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors",
                    errors.country ? "border-danger" : "border-border",
                    disabled && "opacity-60",
                  )}
                >
                  <option value="">Select…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.country && (
              <p className="text-[11px] text-danger">
                {errors.country.message}
              </p>
            )}
          </div>
        </div>

        <FormInput
          name="phone"
          label="Phone"
          placeholder="+1 (212) 555-0100"
          type="tel"
          disabled={disabled}
        />

        <p className="text-[10px] text-text-faint">
          Address is used solely for Brink&apos;s secure transport routing.
          All data is encrypted at rest.
        </p>
      </div>
    </div>
  );
}
