import { z } from "zod";

/* ================================================================
   ONBOARDING WIZARD — Zod Validation Schemas
   ================================================================
   Three-step progressive disclosure for KYC/KYB verification.
   Each step has its own sub-schema; the combined schema is used
   by react-hook-form with zodResolver to validate per-step.
   ================================================================ */

/* ----------------------------------------------------------------
   Step 1: Corporate Identity & Contact
   ---------------------------------------------------------------- */
export const stepCorporateIdentitySchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(255, "Company name must be under 255 characters"),
  registrationNumber: z
    .string()
    .max(100, "Registration number must be under 100 characters")
    .optional()
    .or(z.literal("")),
  jurisdiction: z
    .string()
    .min(1, "Jurisdiction is required"),
  contactEmail: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  contactPhone: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^\+?[1-9]\d{6,14}$/,
      "Enter a valid international phone number (e.g. +14155551234)",
    ),
});

/* ----------------------------------------------------------------
   Step 2: UBO Documents
   ---------------------------------------------------------------- */
export const stepUBODocumentsSchema = z.object({
  uboDocumentName: z
    .string()
    .min(1, "A UBO document is required"),
  uboDeclarationAccepted: z
    .literal(true, {
      message: "You must confirm the UBO declaration",
    }),
});

/* ----------------------------------------------------------------
   Step 3: Biometric Liveness Check
   ---------------------------------------------------------------- */
export const stepLivenessCheckSchema = z.object({
  livenessCompleted: z
    .literal(true, {
      message: "Biometric verification must be completed",
    }),
});

/* ----------------------------------------------------------------
   Combined Schema
   ---------------------------------------------------------------- */
export const onboardingSchema = stepCorporateIdentitySchema
  .merge(stepUBODocumentsSchema)
  .merge(stepLivenessCheckSchema);

/* ----------------------------------------------------------------
   Inferred Types
   ---------------------------------------------------------------- */
export type StepCorporateIdentityData = z.infer<typeof stepCorporateIdentitySchema>;
export type StepUBODocumentsData = z.infer<typeof stepUBODocumentsSchema>;
export type StepLivenessCheckData = z.infer<typeof stepLivenessCheckSchema>;
export type OnboardingFormData = z.infer<typeof onboardingSchema>;

/* ----------------------------------------------------------------
   Step Metadata — used by the progress bar
   ---------------------------------------------------------------- */
export const ONBOARDING_STEPS = [
  { id: 1, label: "Corporate Identity", fields: ["companyName", "registrationNumber", "jurisdiction", "contactEmail", "contactPhone"] as const },
  { id: 2, label: "UBO Documents",      fields: ["uboDocumentName", "uboDeclarationAccepted"] as const },
  { id: 3, label: "Biometric Verification", fields: ["livenessCompleted"] as const },
] as const;

/** Jurisdiction options for the dropdown */
export const JURISDICTION_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CH", label: "Switzerland" },
  { value: "SG", label: "Singapore" },
  { value: "HK", label: "Hong Kong" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "LU", label: "Luxembourg" },
  { value: "JE", label: "Jersey" },
  { value: "GG", label: "Guernsey" },
  { value: "BM", label: "Bermuda" },
  { value: "KY", label: "Cayman Islands" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
  { value: "DE", label: "Germany" },
  { value: "JP", label: "Japan" },
] as const;
