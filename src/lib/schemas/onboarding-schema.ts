import { z } from "zod";

/* ================================================================
   ONBOARDING WIZARD — Zod Validation Schemas
   ================================================================
   Nine-step enterprise onboarding flow for institutional KYB
   verification, LEI/GLEIF validation, Source-of-Funds declaration,
   TOTP/WebAuthn MFA enrollment, maker-checker role assignment,
   KYB entity verification, and DocuSign CLM attestation.

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
   Step 2: KYB & Sanctions Screening
   ---------------------------------------------------------------- */
export const stepKYBScreeningSchema = z.object({
  uboDocumentName: z.string().min(1, "A UBO document is required"),
  uboDeclarationAccepted: z.literal(true, {
    message: "You must confirm the UBO declaration",
  }),
  sanctionsScreeningPassed: z.literal(true, {
    message: "Sanctions screening must be completed",
  }),
});

/* ----------------------------------------------------------------
   Step 3: WebAuthn & SSO Enrollment
   ---------------------------------------------------------------- */
export const stepWebAuthnSchema = z.object({
  webauthnEnrolled: z.literal(true, {
    message: "A hardware security key must be registered",
  }),
  ssoProvider: z.enum(["okta", "entra_id", "custom_saml", "none"], {
    message: "Select an SSO provider or choose 'None'",
  }),
});

/* ----------------------------------------------------------------
   Step 4: TOTP Authenticator Enrollment
   ---------------------------------------------------------------- */
export const stepTOTPEnrollmentSchema = z.object({
  totpEnrolled: z.literal(true, {
    message: "An authenticator app must be enrolled for enterprise MFA",
  }),
});

/* ----------------------------------------------------------------
   Step 5: Maker-Checker Role Assignment
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
   Step 6: DocuSign CLM & Attestation (MCA Execution Gate)
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
   Step 7: KYB Entity Verification (company track)
   ---------------------------------------------------------------- */
export const stepKYBEntitySchema = z.object({
  kybVerificationPassed: z.literal(true, {
    message: "Entity verification must complete before proceeding",
  }),
});

/* ----------------------------------------------------------------
   Step 8: Source of Funds Declaration
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
  sourceOfFundsDocumentUrl: z
    .string()
    .min(1, "A supporting document is required"),
  sourceOfFundsAttested: z.literal(true, {
    message:
      "You must attest under penalty of perjury that these funds do not originate from sanctioned, illicit, or conflict-related activities",
  }),
});

/* ----------------------------------------------------------------
   Step 9: Treasury Funding Architecture
   ----------------------------------------------------------------
   Phase 1 (Closed Beta): Stablecoin bridge for instant clearing.
   Phase 2 (General Availability): Legacy correspondent banking.
   ---------------------------------------------------------------- */
export const stepTreasuryFundingSchema = z.object({
  fundingMethod: z.enum(["digital_stablecoin", "legacy_wire"], {
    message: "Select a funding method",
  }),
  /* —— Digital Stablecoin fields (Phase 1) —— */
  walletAddress: z.string().optional(),
  walletNetwork: z
    .enum(["ERC-20 (Ethereum)", "TRC-20 (Tron)", "Solana", "Base"], {
      message: "Select a blockchain network",
    })
    .optional(),
  stablecoinAsset: z
    .enum(["USDC", "USDT"], { message: "Select a stablecoin asset" })
    .optional(),
  /* —— Legacy Wire fields (Phase 2) —— */
  bankName: z.string().optional(),
  bankRoutingNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankSwiftCode: z.string().optional(),
});

/* ----------------------------------------------------------------
   Step 10: Verification Complete (no additional validation)
   ---------------------------------------------------------------- */
export const stepVerificationCompleteSchema = z.object({
  verificationAcknowledged: z.literal(true, {
    message: "Please acknowledge the verification summary",
  }),
});

/* ----------------------------------------------------------------
   Combined Schema
   ---------------------------------------------------------------- */
export const onboardingSchema = stepEntityRegistrationSchema
  .merge(stepKYBScreeningSchema)
  .merge(stepWebAuthnSchema)
  .merge(stepTOTPEnrollmentSchema)
  .merge(stepMakerCheckerSchema)
  .merge(stepDocuSignSchema)
  .merge(stepKYBEntitySchema)
  .merge(stepSourceOfFundsSchema)
  .merge(stepTreasuryFundingSchema)
  .merge(stepVerificationCompleteSchema);

/* ----------------------------------------------------------------
   Inferred Types
   ---------------------------------------------------------------- */
export type StepEntityRegistrationData = z.infer<typeof stepEntityRegistrationSchema>;
export type StepKYBScreeningData = z.infer<typeof stepKYBScreeningSchema>;
export type StepWebAuthnData = z.infer<typeof stepWebAuthnSchema>;
export type StepTOTPEnrollmentData = z.infer<typeof stepTOTPEnrollmentSchema>;
export type StepMakerCheckerData = z.infer<typeof stepMakerCheckerSchema>;
export type StepDocuSignData = z.infer<typeof stepDocuSignSchema>;
export type StepKYBEntityData = z.infer<typeof stepKYBEntitySchema>;
export type StepSourceOfFundsData = z.infer<typeof stepSourceOfFundsSchema>;
export type StepTreasuryFundingData = z.infer<typeof stepTreasuryFundingSchema>;
export type StepVerificationCompleteData = z.infer<typeof stepVerificationCompleteSchema>;
export type OnboardingFormData = z.infer<typeof onboardingSchema>;

/* ----------------------------------------------------------------
   Step Metadata — used by the progress bar (9-step flow)
   ----------------------------------------------------------------
   Sequence:
     1. Corporate Identity & LEI
     2. KYB Entity Verification
     3. UBO & AML Screening
     4. Source of Funds Declaration
     5. Verification Summary
     6. Maker-Checker Roles
     7. TOTP 2FA Enrollment
     8. WebAuthn Enrollment
     9. MCA Execution (DocuSign CLM)
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
    label: "UBO & AML",
    fields: ["uboDocumentName", "uboDeclarationAccepted", "sanctionsScreeningPassed"] as const,
  },
  {
    id: 4,
    label: "Source of Funds",
    fields: ["sourceOfFundsType", "sourceOfFundsDocumentUrl", "sourceOfFundsAttested"] as const,
  },
  {
    id: 5,
    label: "Summary",
    fields: ["verificationAcknowledged"] as const,
  },
  {
    id: 6,
    label: "Roles",
    fields: ["primaryRole", "dualAuthAcknowledged"] as const,
  },
  {
    id: 7,
    label: "TOTP MFA",
    fields: ["totpEnrolled"] as const,
  },
  {
    id: 8,
    label: "WebAuthn",
    fields: ["webauthnEnrolled", "ssoProvider"] as const,
  },
  {
    id: 9,
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
