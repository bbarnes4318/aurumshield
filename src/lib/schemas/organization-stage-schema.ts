/* ================================================================
   ORGANIZATION STAGE — Zod Schema (Minimal Pre-Screen)
   ================================================================
   Streamlined for KYCaid integration. Only collects the minimum
   data needed to create a KYCaid COMPANY applicant:

     1. Company name  — required for KYCaid POST /applicants
     2. Country        — required registration_country field

   Everything else (LEI, UBOs, documents, liveness, rep details)
   is collected by KYCaid's hosted verification form.
   ================================================================ */

import { z } from "zod";

/* ── Organization Stage Schema ── */

export const organizationStageSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(255, "Company name must be under 255 characters"),
 
  jurisdiction: z.string().min(1, "Country is required"),
 
  repName: z
    .string()
    .min(2, "Representative name must be at least 2 characters")
    .max(100, "Representative name must be under 100 characters"),
});
 
/* ── Inferred Type ── */
 
export type OrganizationStageFormData = z.infer<typeof organizationStageSchema>;
 
/* ── Default Values — used by useForm ── */
 
export const ORGANIZATION_STAGE_DEFAULTS: OrganizationStageFormData = {
  companyName: "",
  jurisdiction: "",
  repName: "",
};
