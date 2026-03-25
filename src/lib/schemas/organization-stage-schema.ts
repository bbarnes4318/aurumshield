/* ================================================================
   ORGANIZATION STAGE — Zod Schema
   ================================================================
   Validation schema for the guided Organization stage at:
     /institutional/get-started/organization

   Captures the minimum institutional entity identity and the
   authorized representative acting on behalf of the entity.

   Reuses proven validation rules from the legacy
   stepEntityRegistrationSchema (LEI format, jurisdiction, phone)
   but scoped to just this stage's fields.
   ================================================================ */

import { z } from "zod";

/* ── Organization Stage Schema ── */

export const organizationStageSchema = z.object({
  /* ── Entity Identity ── */
  companyName: z
    .string()
    .min(2, "Legal entity name must be at least 2 characters")
    .max(255, "Legal entity name must be under 255 characters"),

  jurisdiction: z.string().min(1, "Jurisdiction is required"),

  legalEntityIdentifier: z
    .string()
    .refine(
      (v) => v === "" || /^[A-Za-z0-9]{20}$/.test(v),
      "LEI must be exactly 20 alphanumeric characters",
    ),

  leiVerified: z.boolean(),

  registrationNumber: z
    .string()
    .max(100, "Registration number must be under 100 characters"),

  /* ── Authorized Representative ── */
  representativeName: z
    .string()
    .min(2, "Representative name must be at least 2 characters")
    .max(255, "Representative name must be under 255 characters"),

  representativeTitle: z
    .string()
    .min(2, "Title / role is required")
    .max(255, "Title must be under 255 characters"),

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

/* ── Inferred Type ── */

export type OrganizationStageFormData = z.infer<typeof organizationStageSchema>;

/* ── Default Values — used by useForm ── */

export const ORGANIZATION_STAGE_DEFAULTS: OrganizationStageFormData = {
  companyName: "",
  jurisdiction: "",
  legalEntityIdentifier: "",
  leiVerified: false,
  registrationNumber: "",
  representativeName: "",
  representativeTitle: "",
  contactEmail: "",
  contactPhone: "",
};
