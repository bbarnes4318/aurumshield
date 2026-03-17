/* ================================================================
   TOUR REGISTRY — Maps real role IDs to tour definitions
   
   Tours are keyed by the actual UserRole values:
   sender, recipient, treasury, compliance, vault_ops, admin
   
   Plus the cinematic demo tour for investor presentations.
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";
import { senderTour } from "./sender";
import { recipientTour } from "./recipient";
import { opsTour } from "./ops";
import { riskTour } from "./risk";
import { treasuryTour } from "./treasury";
import { adminTour } from "./admin";
import { cinematicTour } from "./cinematic";

/** Registry of all available tours, keyed by UserRole or tour ID */
export const TOUR_REGISTRY: Record<string, TourDefinition> = {
  buyer: senderTour,       // Legacy alias → new sender tour
  seller: recipientTour,   // Legacy alias → new recipient tour
  sender: senderTour,
  recipient: recipientTour,
  vault_ops: opsTour,
  compliance: riskTour,
  treasury: treasuryTour,
  admin: adminTour,
  cinematic: cinematicTour,
};

/** Get a tour definition for a given role ID */
export function getTourForRole(roleId: string): TourDefinition | undefined {
  return TOUR_REGISTRY[roleId];
}

/** Get all available tour definitions as an array */
export function getAllTours(): TourDefinition[] {
  return Object.values(TOUR_REGISTRY);
}
