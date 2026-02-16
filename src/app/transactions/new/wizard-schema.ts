import { z } from "zod";

export const step1Schema = z.object({
  counterpartyId: z.string().min(1, "Select a counterparty"),
  amount: z.number({ error: "Enter a valid amount" }).positive("Amount must be positive"),
  currency: z.string().min(3, "Select a currency").max(3),
  type: z.enum(["wire", "swift", "settlement", "collateral", "margin-call", "dividend"]),
});

export const step2Schema = z.object({
  corridorId: z.string().min(1, "Select a corridor"),
  hubId: z.string().min(1, "Select a hub"),
});

export const step4Schema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
});

export const wizardSchema = step1Schema.merge(step2Schema).merge(step4Schema);
export type WizardFormData = z.infer<typeof wizardSchema>;

export const STEP1_FIELDS: (keyof WizardFormData)[] = ["counterpartyId", "amount", "currency", "type"];
export const STEP2_FIELDS: (keyof WizardFormData)[] = ["corridorId", "hubId"];
export const STEP4_FIELDS: (keyof WizardFormData)[] = ["description"];

export type WizardMachineState = "DRAFT" | "PARTIES_VALID" | "CORRIDOR_VALID" | "COMPLIANCE_PASSED" | "READY_TO_CREATE";

export type WizardAction =
  | { type: "VALIDATE_PARTIES" }
  | { type: "VALIDATE_CORRIDOR" }
  | { type: "PASS_COMPLIANCE" }
  | { type: "VALIDATE_REVIEW" }
  | { type: "EDIT"; target: "DRAFT" | "PARTIES_VALID" };

export function wizardReducer(state: WizardMachineState, action: WizardAction): WizardMachineState {
  switch (action.type) {
    case "VALIDATE_PARTIES":
      return state === "DRAFT" ? "PARTIES_VALID" : state;
    case "VALIDATE_CORRIDOR":
      return state === "PARTIES_VALID" ? "CORRIDOR_VALID" : state;
    case "PASS_COMPLIANCE":
      return state === "CORRIDOR_VALID" ? "COMPLIANCE_PASSED" : state;
    case "VALIDATE_REVIEW":
      return state === "COMPLIANCE_PASSED" ? "READY_TO_CREATE" : state;
    case "EDIT":
      return action.target;
    default:
      return state;
  }
}

export const STATE_TO_STEP: Record<WizardMachineState, number> = {
  DRAFT: 1, PARTIES_VALID: 2, CORRIDOR_VALID: 3, COMPLIANCE_PASSED: 4, READY_TO_CREATE: 4,
};
