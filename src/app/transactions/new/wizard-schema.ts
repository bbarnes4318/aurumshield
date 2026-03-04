import { z } from "zod";

/* ================================================================
   GOLDWIRE SETTLEMENT WIZARD — Schema & State Machine
   ================================================================
   3-step flow: Target Entity → Settlement Parameters → Review & Sign
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
  referenceCode: z.string().min(4, "Reference code must be at least 4 characters"),
});

export const wizardSchema = step1Schema.merge(step2Schema).merge(step3Schema);
export type WizardFormData = z.infer<typeof wizardSchema>;

export const STEP1_FIELDS: (keyof WizardFormData)[] = ["beneficiaryEntityId"];
export const STEP2_FIELDS: (keyof WizardFormData)[] = ["fiatSettlementAmount"];
export const STEP3_FIELDS: (keyof WizardFormData)[] = ["referenceCode"];

/* ── State Machine ── */

export type WizardMachineState = "TARGET" | "PARAMETERS" | "REVIEW";

export type WizardAction =
  | { type: "VALIDATE_TARGET" }
  | { type: "VALIDATE_PARAMETERS" }
  | { type: "EXECUTE" }
  | { type: "EDIT"; target: WizardMachineState };

export function wizardReducer(state: WizardMachineState, action: WizardAction): WizardMachineState {
  switch (action.type) {
    case "VALIDATE_TARGET":
      return state === "TARGET" ? "PARAMETERS" : state;
    case "VALIDATE_PARAMETERS":
      return state === "PARAMETERS" ? "REVIEW" : state;
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
  PARAMETERS: 2,
  REVIEW: 3,
};
