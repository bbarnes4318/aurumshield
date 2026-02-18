/* ================================================================
   TOUR REGISTRY — Maps real role IDs to tour definitions
   
   Tours are keyed by the actual UserRole values:
   buyer, seller, treasury, compliance, vault_ops, admin
   
   No separate demo role system.
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";
import { buyerTour } from "./buyer";
import { sellerTour } from "./seller";
import { opsTour } from "./ops";
import { riskTour } from "./risk";
import { treasuryTour } from "./treasury";
import { adminTour } from "./admin";

/** Registry of all available tours, keyed by UserRole */
export const TOUR_REGISTRY: Record<string, TourDefinition> = {
  buyer: buyerTour,
  seller: sellerTour,
  vault_ops: opsTour,
  compliance: riskTour,
  treasury: treasuryTour,
  admin: adminTour,
};

/** Get a tour definition for a given role ID */
export function getTourForRole(roleId: string): TourDefinition | undefined {
  return TOUR_REGISTRY[roleId];
}

/** Get all available tour definitions as an array */
export function getAllTours(): TourDefinition[] {
  return Object.values(TOUR_REGISTRY);
}
