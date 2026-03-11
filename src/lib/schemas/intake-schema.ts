import { z } from "zod";

/* ================================================================
   OFFTAKER INTAKE DOSSIER — Zod Validation Schema
   ================================================================
   Pre-Veriff compliance intake form. Captures the foundational
   corporate identity data required before biometric verification.
   ================================================================ */

export const intakeDossierSchema = z.object({
  legalEntityName: z
    .string()
    .min(2, "Legal entity name must be at least 2 characters")
    .max(255, "Legal entity name must be under 255 characters"),

  legalEntityIdentifier: z
    .string()
    .min(1, "LEI is required for institutional onboarding")
    .regex(
      /^[A-Z0-9]{20}$/,
      "LEI must be exactly 20 alphanumeric characters (e.g. 5493001KJTIIGC8Y1R12)",
    ),

  jurisdictionOfIncorporation: z
    .string()
    .min(1, "Jurisdiction of incorporation is required"),

  registrationDate: z
    .string()
    .min(1, "Registration date is required")
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Date must be in YYYY-MM-DD format",
    ),

  ultimateBeneficialOwners: z
    .string()
    .min(10, "UBO disclosure must be at least 10 characters")
    .max(5000, "UBO disclosure must be under 5000 characters"),

  sourceOfFundsDeclaration: z
    .string()
    .min(20, "Source of funds narrative must be at least 20 characters")
    .max(5000, "Source of funds narrative must be under 5000 characters"),
});

export type IntakeDossierData = z.infer<typeof intakeDossierSchema>;
