import { z } from "zod";

/* ================================================================
   GOLDWIRE SETTLEMENT WIZARD — Schema & State Machine
   ================================================================
   4-step flow:
     1. Counterparty & Asset Selection
     2. Compliance Verification (fail-closed)
     3. Funding Route (Fedwire vs MPC Stablecoin)
     4. Cryptographic Sign-Off
   ================================================================ */

export const step1Schema = z.object({
  beneficiaryEntityId: z.string().min(1, "Select a beneficiary entity"),
});

export const step2Schema = z.object({
  fiatSettlementAmount: z
    .number({ error: "Enter a valid settlement amount" })
    .positive("Amount must be positive"),
  memo: z.string().optional(),
});

export const step3Schema = z.object({
  fundingRoute: z.enum(["fedwire", "stablecoin"], {
    error: "Select a funding route",
  }),
});

export const step4Schema = z.object({
  referenceCode: z.string().min(4, "Reference code must be at least 4 characters"),
});

export const wizardSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema);

export type WizardFormData = z.infer<typeof wizardSchema>;

export const STEP1_FIELDS: (keyof WizardFormData)[] = ["beneficiaryEntityId"];
export const STEP2_FIELDS: (keyof WizardFormData)[] = ["fiatSettlementAmount"];
export const STEP3_FIELDS: (keyof WizardFormData)[] = ["fundingRoute"];
export const STEP4_FIELDS: (keyof WizardFormData)[] = ["referenceCode"];

/* ── State Machine ── */

export type WizardMachineState = "TARGET" | "COMPLIANCE" | "FUNDING" | "SIGNOFF";

export type WizardAction =
  | { type: "VALIDATE_TARGET" }
  | { type: "VALIDATE_COMPLIANCE" }
  | { type: "VALIDATE_FUNDING" }
  | { type: "EXECUTE" }
  | { type: "EDIT"; target: WizardMachineState };

export function wizardReducer(state: WizardMachineState, action: WizardAction): WizardMachineState {
  switch (action.type) {
    case "VALIDATE_TARGET":
      return state === "TARGET" ? "COMPLIANCE" : state;
    case "VALIDATE_COMPLIANCE":
      return state === "COMPLIANCE" ? "FUNDING" : state;
    case "VALIDATE_FUNDING":
      return state === "FUNDING" ? "SIGNOFF" : state;
    case "EXECUTE":
      return state; // handled externally
    case "EDIT":
      return action.target;
    default:
      return state;
  }
}

export const STATE_TO_STEP: Record<WizardMachineState, number> = {
  TARGET: 1,
  COMPLIANCE: 2,
  FUNDING: 3,
  SIGNOFF: 4,
};
