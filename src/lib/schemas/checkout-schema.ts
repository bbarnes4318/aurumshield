/* ================================================================
   CHECKOUT SCHEMA — Zod Validation for 2-Click Checkout Modal
   ================================================================
   Maps directly to the settlement_cases & secure_shipments PostgreSQL
   schema. Delivery method enum matches SQL:
     delivery_method_enum AS ENUM ('VAULT_CUSTODY', 'SECURE_DELIVERY')
   ================================================================ */

import { z } from "zod";

/** USPS Registered Mail maximum insured value in cents ($50,000) */
export const USPS_MAX_DECLARED_VALUE_CENTS = 5_000_000;

/* ── Delivery Method Enum (matches SQL exactly) ── */
export const DELIVERY_METHODS = ["VAULT_CUSTODY", "SECURE_DELIVERY"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

/* ── Step 1: Price Lock ── */
export const stepOneSchema = z.object({
  weightOz: z
    .number({ message: "Weight is required" })
    .positive("Weight must be greater than zero")
    .max(10_000, "Maximum single-order weight is 10,000 oz"),
  lockedPrice: z
    .number({ message: "Price is required" })
    .positive("Locked price must be a valid positive number"),
  /** Server-generated quote ID (set after createQuote succeeds) */
  quoteId: z.string().uuid().optional(),
});

export type StepOneData = z.infer<typeof stepOneSchema>;

/* ── Shipping Address (conditionally required) ── */
export const addressSchema = z.object({
  recipientName: z
    .string()
    .min(2, "Recipient name is required")
    .max(200, "Name is too long"),
  addressLine1: z
    .string()
    .min(5, "Street address is required")
    .max(300, "Address is too long"),
  addressLine2: z.string().max(300, "Address is too long").optional(),
  city: z.string().min(2, "City is required").max(100, "City is too long"),
  stateProvince: z
    .string()
    .min(1, "State/Province is required")
    .max(100, "State/Province is too long"),
  postalCode: z
    .string()
    .min(3, "Postal code is required")
    .max(20, "Postal code is too long"),
  country: z
    .string()
    .min(2, "Country is required")
    .max(100, "Country is too long"),
  /** Optional: links this address to a pre-verified recipient or delegate */
  recipientUserId: z.string().uuid("Invalid recipient user ID").optional(),
});

export type ShippingAddress = z.infer<typeof addressSchema>;

/* ── Step 2: Delivery Routing ── */
export const stepTwoSchema = z
  .object({
    deliveryMethod: z.enum(DELIVERY_METHODS, {
      message: "Please select a delivery method",
    }),
    shippingAddress: addressSchema.optional(),
    /** Total declared value in cents (notional + fees + insurance). Computed client-side, validated server-side. */
    declaredValueCents: z.number().int().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMethod === "SECURE_DELIVERY" && !data.shippingAddress) {
      ctx.addIssue({
        code: "custom",
        message: "Shipping address is required for armored delivery",
        path: ["shippingAddress"],
      });
    }
    if (
      data.deliveryMethod === "SECURE_DELIVERY" &&
      data.shippingAddress
    ) {
      const result = addressSchema.safeParse(data.shippingAddress);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            ...issue,
            path: ["shippingAddress", ...issue.path],
          });
        }
      }
    }
    // Hard rule: USPS Registered Mail cannot insure above $50k
    if (
      data.deliveryMethod === "SECURE_DELIVERY" &&
      data.declaredValueCents != null &&
      data.declaredValueCents > USPS_MAX_DECLARED_VALUE_CENTS
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Registered mail only insures up to $50,000. Please select Vault Custody or contact us for armored transport.",
        path: ["declaredValueCents"],
      });
    }
  });

export type StepTwoData = z.infer<typeof stepTwoSchema>;

/* ── Combined Checkout Schema ── */
export const combinedCheckoutSchema = stepOneSchema.merge(
  z.object({
    deliveryMethod: z.enum(DELIVERY_METHODS, {
      message: "Please select a delivery method",
    }),
    shippingAddress: addressSchema.optional(),
    declaredValueCents: z.number().int().nonnegative().optional(),
  })
).superRefine((data, ctx) => {
  if (data.deliveryMethod === "SECURE_DELIVERY" && !data.shippingAddress) {
    ctx.addIssue({
      code: "custom",
      message: "Shipping address is required for armored delivery",
      path: ["shippingAddress"],
    });
  }
  if (
    data.deliveryMethod === "SECURE_DELIVERY" &&
    data.declaredValueCents != null &&
    data.declaredValueCents > USPS_MAX_DECLARED_VALUE_CENTS
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Registered mail only insures up to $50,000. Please select Vault Custody or contact us for armored transport.",
      path: ["declaredValueCents"],
    });
  }
});

export type CheckoutFormData = z.infer<typeof combinedCheckoutSchema>;

/* ── Delivery Option Metadata ── */
export const DELIVERY_OPTIONS: {
  value: DeliveryMethod;
  label: string;
  description: string;
  icon: "vault" | "truck";
}[] = [
  {
    value: "VAULT_CUSTODY",
    label: "Retain in Vault",
    description:
      "Your allocation remains in the certified vault under your ownership. Zero custody fees for 90 days.",
    icon: "vault",
  },
  {
    value: "SECURE_DELIVERY",
    label: "Secure Armored Delivery",
    description:
      "Brink's Global Services armored transport to your registered address. Fully insured door-to-door.",
    icon: "truck",
  },
];
