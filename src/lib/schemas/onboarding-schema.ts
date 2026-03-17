import { z } from "zod";

/* ================================================================
   ONBOARDING WIZARD — Zod Validation Schemas
   ================================================================
   Seven-step enterprise onboarding flow for institutional KYB
   verification, LEI/GLEIF validation, UBO declaration, automated
   AML screening, Source-of-Funds declaration, maker-checker role
   assignment, and DocuSign CLM attestation.

   MFA (TOTP / WebAuthn / SSO) is handled by the Identity Provider
   and is NOT part of this onboarding flow.

   Each step has its own sub-schema; the combined schema is used
   by react-hook-form with zodResolver to validate per-step.
   ================================================================ */

/* ----------------------------------------------------------------
   Step 1: Entity Registration & LEI
   ---------------------------------------------------------------- */
export const stepEntityRegistrationSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(255, "Company name must be under 255 characters"),
  legalEntityIdentifier: z
    .string()
    .refine(
      (v) => v === "" || /^[A-Za-z0-9]{20}$/.test(v),
      "LEI must be exactly 20 alphanumeric characters (e.g. 5493001KJTIIGC8Y1R12)",
    ),
  leiVerified: z.boolean(),
  registrationNumber: z
    .string()
    .max(100, "Registration number must be under 100 characters")
    .optional()
    .or(z.literal("")),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
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
   Step 2: KYB Entity Verification (company track)
   ---------------------------------------------------------------- */
export const stepKYBEntitySchema = z.object({
  kybVerificationPassed: z.literal(true, {
    message: "Entity verification must complete before proceeding",
  }),
});

/* ----------------------------------------------------------------
   Step 3: UBO Declaration (dynamic array of UBOs)
   ---------------------------------------------------------------- */
export const uboEntrySchema = z.object({
  name: z.string().min(2, "UBO name must be at least 2 characters"),
  ownershipPercentage: z
    .string()
    .min(1, "Ownership percentage is required")
    .refine(
      (v) => {
        const n = parseFloat(v);
        return !isNaN(n) && n >= 25 && n <= 100;
      },
      "Must be between 25% and 100%",
    ),
});

export const stepUBODeclarationSchema = z.object({
  ubos: z
    .array(uboEntrySchema)
    .min(1, "At least one UBO with 25%+ ownership is required"),
  uboDeclarationAccepted: z.literal(true, {
    message: "You must confirm the UBO declaration",
  }),
});

/* ----------------------------------------------------------------
   Step 4: AML Screening (auto-run on mount)
   ---------------------------------------------------------------- */
export const stepAMLScreeningSchema = z.object({
  sanctionsScreeningPassed: z.literal(true, {
    message: "Sanctions screening must be completed",
  }),
});

/* ----------------------------------------------------------------
   Step 5: Source of Funds Declaration
   ----------------------------------------------------------------
   No document upload — vendors handle evidence collection.
   Only requires type selection + legal attestation.
   ---------------------------------------------------------------- */
export const SOURCE_OF_FUNDS_TYPES = [
  { value: "AUDITED_FINANCIALS", label: "Audited Financials" },
  { value: "BANK_LETTER_OF_CREDIT", label: "Bank Letter of Credit" },
  { value: "TREASURY_ALLOCATION", label: "Corporate Treasury Allocation" },
] as const;

export type SourceOfFundsType = (typeof SOURCE_OF_FUNDS_TYPES)[number]["value"];

export const stepSourceOfFundsSchema = z.object({
  sourceOfFundsType: z.enum(
    ["AUDITED_FINANCIALS", "BANK_LETTER_OF_CREDIT", "TREASURY_ALLOCATION"],
    { message: "Select the origin of capital" },
  ),
  sourceOfFundsAttested: z.literal(true, {
    message:
      "You must attest under penalty of perjury that these funds do not originate from sanctioned, illicit, or conflict-related activities",
  }),
});

/* ----------------------------------------------------------------
   Step 6: Maker-Checker Role Assignment
   ---------------------------------------------------------------- */
export const stepMakerCheckerSchema = z.object({
  primaryRole: z.enum(["TRADER", "TREASURY"], {
    message: "Select either TRADER (Maker) or TREASURY (Checker)",
  }),
  dualAuthAcknowledged: z.literal(true, {
    message: "You must acknowledge the dual-authorization policy",
  }),
});

/* ----------------------------------------------------------------
   Step 7: DocuSign CLM & Attestation (MCA Execution Gate)
   ---------------------------------------------------------------- */
export const stepDocuSignSchema = z.object({
  agreementSigned: z.literal(true, {
    message:
      "Legal indemnification required. The Master Commercial Agreement must be executed by an authorized corporate officer before treasury routing is enabled.",
  }),
  complianceAttested: z.literal(true, {
    message: "You must attest to AML/compliance obligations",
  }),
});

/* ----------------------------------------------------------------
   Combined Schema
   ---------------------------------------------------------------- */
export const onboardingSchema = stepEntityRegistrationSchema
  .merge(stepKYBEntitySchema)
  .merge(stepAMLScreeningSchema)
  .merge(stepSourceOfFundsSchema)
  .merge(stepMakerCheckerSchema)
  .merge(stepDocuSignSchema)
  .extend({
    ubos: z
      .array(uboEntrySchema)
      .min(1, "At least one UBO with 25%+ ownership is required"),
    uboDeclarationAccepted: z.literal(true, {
      message: "You must confirm the UBO declaration",
    }),
  });

/* ----------------------------------------------------------------
   Inferred Types
   ---------------------------------------------------------------- */
export type StepEntityRegistrationData = z.infer<typeof stepEntityRegistrationSchema>;
export type StepKYBEntityData = z.infer<typeof stepKYBEntitySchema>;
export type UBOEntry = z.infer<typeof uboEntrySchema>;
export type StepUBODeclarationData = z.infer<typeof stepUBODeclarationSchema>;
export type StepAMLScreeningData = z.infer<typeof stepAMLScreeningSchema>;
export type StepSourceOfFundsData = z.infer<typeof stepSourceOfFundsSchema>;
export type StepMakerCheckerData = z.infer<typeof stepMakerCheckerSchema>;
export type StepDocuSignData = z.infer<typeof stepDocuSignSchema>;
export type OnboardingFormData = z.infer<typeof onboardingSchema>;

/* ----------------------------------------------------------------
   Step Metadata — used by the progress bar (7-step flow)
   ----------------------------------------------------------------
   Sequence:
     1. Corporate Identity & LEI
     2. KYB Entity Verification
     3. UBO Declaration
     4. AML Screening (auto-run)
     5. Source of Funds Declaration
     6. Maker-Checker Roles
     7. MCA Execution (DocuSign CLM)
   ---------------------------------------------------------------- */
export const ONBOARDING_STEPS = [
  {
    id: 1,
    label: "Entity & LEI",
    fields: ["companyName", "legalEntityIdentifier", "registrationNumber", "jurisdiction", "contactEmail", "contactPhone"] as const,
  },
  {
    id: 2,
    label: "Entity KYB",
    fields: ["kybVerificationPassed"] as const,
  },
  {
    id: 3,
    label: "UBO",
    fields: ["ubos", "uboDeclarationAccepted"] as const,
  },
  {
    id: 4,
    label: "AML",
    fields: ["sanctionsScreeningPassed"] as const,
  },
  {
    id: 5,
    label: "Source of Funds",
    fields: ["sourceOfFundsType", "sourceOfFundsAttested"] as const,
  },
  {
    id: 6,
    label: "Roles",
    fields: ["primaryRole", "dualAuthAcknowledged"] as const,
  },
  {
    id: 7,
    label: "MCA Gate",
    fields: ["agreementSigned", "complianceAttested"] as const,
  },
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
