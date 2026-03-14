/* ================================================================
   CHAIN OF CUSTODY SERVICE — Immutable Event Logger
   ================================================================
   Tracks the physical movement of gold metal through the sovereign
   logistics network. Every custody transfer, transport event, and
   vault deposit is logged as an immutable, append-only event with
   SHA-256 tamper-evident hashing.

   Interfaces with existing carriers:
     - brinks-service.ts (Brink's Global Services)
     - malca-amit-service.ts (Malca-Amit Global Ltd)

   Event Types:
     PICKUP_TARMAC, IN_TRANSIT, CUSTOMS_CLEARANCE,
     VAULT_DEPOSIT, OWNERSHIP_TRANSFERRED

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { createHash } from "crypto";
import { emitAuditEvent } from "@/lib/audit-logger";
import {
  updateAssetCustody,
} from "./asset-registry.service";
import type { AssetCustodian, GoldAssetStatus } from "./asset-registry.types";

/* ================================================================
   Types
   ================================================================ */

/** Custody event types representing physical movement stages. */
export type CustodyEventType =
  | "PICKUP_TARMAC"
  | "IN_TRANSIT"
  | "CUSTOMS_CLEARANCE"
  | "VAULT_DEPOSIT"
  | "OWNERSHIP_TRANSFERRED";

/** A single immutable custody event in the chain. */
export interface CustodyEvent {
  /** Unique event identifier */
  event_id: string;
  /** Asset this event pertains to */
  asset_id: string;
  /** Type of custody event */
  event_type: CustodyEventType;
  /** Entity holding custody at this event */
  custodian: AssetCustodian;
  /** Physical location at time of event */
  location: string;
  /** Cryptographic signature or authorization reference */
  signature: string;
  /** Carrier service used (if applicable) */
  carrier: string | null;
  /** ISO 8601 timestamp of the event */
  timestamp: string;
  /** Previous event hash — forms an immutable chain */
  previous_hash: string | null;
  /** SHA-256 hash of this event record */
  event_hash: string;
}

/** Full custody chain for an asset. */
export interface CustodyChain {
  asset_id: string;
  events: CustodyEvent[];
  current_custodian: AssetCustodian | null;
  current_location: string | null;
  chain_hash: string;
}

/* ================================================================
   In-Memory Chain Store (Append-Only)
   ================================================================
   Immutable event log. Events can only be appended, never modified
   or deleted. Each event references the previous event's hash,
   forming a tamper-evident chain.

   TODO: Wire to PostgreSQL append-only table with DELETE triggers
   blocked at the database level.
   ================================================================ */

const custodyChains: Map<string, CustodyEvent[]> = new Map();

/* ---------- ID Generation ---------- */

let _eventCounter = 0;
function nextEventId(): string {
  _eventCounter += 1;
  return `ce-${Date.now().toString(36)}-${_eventCounter.toString().padStart(4, "0")}`;
}

/* ---------- Hashing ---------- */

function hashEvent(data: Omit<CustodyEvent, "event_hash">): string {
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  return createHash("sha256").update(canonical).digest("hex");
}

function hashChain(events: CustodyEvent[]): string {
  if (events.length === 0) return createHash("sha256").update("EMPTY_CHAIN").digest("hex");
  const lastEvent = events[events.length - 1];
  return lastEvent.event_hash;
}

/* ---------- Event Type → Asset Status Mapping ---------- */

const EVENT_STATUS_MAP: Record<CustodyEventType, GoldAssetStatus> = {
  PICKUP_TARMAC: "IN_TRANSIT",
  IN_TRANSIT: "IN_TRANSIT",
  CUSTOMS_CLEARANCE: "IN_TRANSIT",
  VAULT_DEPOSIT: "IN_VAULT",
  OWNERSHIP_TRANSFERRED: "OWNERSHIP_TRANSFERRED",
};

/* ---------- Carrier Detection ---------- */

/**
 * Determine which carrier service label to attach based on custodian.
 * Interfaces with our existing brinks-service.ts and malca-amit-service.ts.
 */
function resolveCarrier(custodian: AssetCustodian): string | null {
  switch (custodian) {
    case "BRINKS":
      return "Brink's Global Services";
    case "MALCA_AMIT":
      return "Malca-Amit Global Ltd";
    default:
      return null;
  }
}

/* ================================================================
   logCustodyEvent
   ================================================================
   Appends a new immutable event to an asset's custody chain.
   Each event is hash-linked to the previous event, forming a
   tamper-evident chain.

   Also updates the asset registry with the new custodian and
   status via updateAssetCustody().

   @param assetId   - The asset being moved
   @param eventType - Type of custody event
   @param custodian - Entity taking custody
   @param location  - Physical location
   @param signature - Cryptographic signature or authorization ref
   @returns The new CustodyEvent
   ================================================================ */

export async function logCustodyEvent(
  assetId: string,
  eventType: CustodyEventType,
  custodian: AssetCustodian,
  location: string,
  signature: string,
): Promise<CustodyEvent> {
  const now = new Date().toISOString();
  const eventId = nextEventId();

  // Get existing chain
  const existingEvents = custodyChains.get(assetId) ?? [];
  const previousHash = existingEvents.length > 0
    ? existingEvents[existingEvents.length - 1].event_hash
    : null;

  // Resolve carrier from custodian
  const carrier = resolveCarrier(custodian);

  // Build event data (without hash — hash computed from this)
  const eventData: Omit<CustodyEvent, "event_hash"> = {
    event_id: eventId,
    asset_id: assetId,
    event_type: eventType,
    custodian,
    location,
    signature,
    carrier,
    timestamp: now,
    previous_hash: previousHash,
  };

  const eventHash = hashEvent(eventData);

  const event: CustodyEvent = {
    ...eventData,
    event_hash: eventHash,
  };

  // Append to chain (immutable — only additions)
  const updatedChain = [...existingEvents, event];
  custodyChains.set(assetId, updatedChain);

  // Update asset registry with new custody status
  const newStatus = EVENT_STATUS_MAP[eventType];
  try {
    updateAssetCustody(assetId, newStatus, custodian, location);
  } catch (err) {
    // Asset may not exist in registry yet (e.g., external asset)
    // Log but don't block the custody event
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[CHAIN_OF_CUSTODY] Could not update asset registry for ${assetId}: ${message}`,
    );
  }

  // Audit trail
  emitAuditEvent(
    "chain_of_custody.event_logged",
    "INFO",
    {
      eventId,
      assetId,
      eventType,
      custodian,
      location,
      carrier: carrier ?? "NONE",
      signature,
      previousHash: previousHash ?? "GENESIS",
      eventHash,
      chainLength: updatedChain.length,
    },
  );

  console.log(
    `[CHAIN_OF_CUSTODY] Event logged: ${eventType} | asset=${assetId} ` +
    `custodian=${custodian} location=${location} ` +
    `carrier=${carrier ?? "N/A"} chain_length=${updatedChain.length}`,
  );

  return event;
}

/* ================================================================
   getCustodyChain
   ================================================================
   Returns the full immutable event log for an asset.
   ================================================================ */

export function getCustodyChain(assetId: string): CustodyChain {
  const events = custodyChains.get(assetId) ?? [];
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  return {
    asset_id: assetId,
    events,
    current_custodian: lastEvent?.custodian ?? null,
    current_location: lastEvent?.location ?? null,
    chain_hash: hashChain(events),
  };
}

/* ================================================================
   getCurrentCustodian
   ================================================================
   Returns the latest custodian from the chain for a given asset.
   Returns null if no custody events have been logged.
   ================================================================ */

export function getCurrentCustodian(assetId: string): AssetCustodian | null {
  const events = custodyChains.get(assetId) ?? [];
  if (events.length === 0) return null;
  return events[events.length - 1].custodian;
}

/* ================================================================
   verifyCustodyChainIntegrity
   ================================================================
   Validates that the hash chain is intact (no tampered events).
   Returns true if all hashes are valid and properly linked.
   ================================================================ */

export function verifyCustodyChainIntegrity(assetId: string): {
  valid: boolean;
  brokenAt: number | null;
  detail: string;
} {
  const events = custodyChains.get(assetId) ?? [];

  if (events.length === 0) {
    return { valid: true, brokenAt: null, detail: "Empty chain — no events to verify" };
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Verify hash linkage
    if (i === 0) {
      if (event.previous_hash !== null) {
        return {
          valid: false,
          brokenAt: 0,
          detail: `Genesis event has non-null previous_hash: ${event.previous_hash}`,
        };
      }
    } else {
      const expectedPrevHash = events[i - 1].event_hash;
      if (event.previous_hash !== expectedPrevHash) {
        return {
          valid: false,
          brokenAt: i,
          detail: `Hash link broken at event ${i}: expected previous_hash=${expectedPrevHash}, got=${event.previous_hash}`,
        };
      }
    }

    // Verify event self-hash
    const { event_hash: _storedHash, ...eventData } = event;
    const computedHash = hashEvent(eventData);
    if (computedHash !== _storedHash) {
      return {
        valid: false,
        brokenAt: i,
        detail: `Event ${i} hash mismatch: computed=${computedHash}, stored=${_storedHash}. Event may have been tampered.`,
      };
    }
  }

  emitAuditEvent(
    "chain_of_custody.integrity_verified",
    "INFO",
    {
      assetId,
      chainLength: events.length,
      chainHash: hashChain(events),
      result: "VALID",
    },
  );

  return {
    valid: true,
    brokenAt: null,
    detail: `Chain integrity verified — ${events.length} events, all hashes valid`,
  };
}
