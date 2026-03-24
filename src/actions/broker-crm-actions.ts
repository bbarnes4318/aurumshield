"use server";

/* ================================================================
   BROKER CRM — Server Actions
   ================================================================
   Strictly-typed, broker_id-isolated CRUD operations for the
   broker_crm_entities table (Mini-CRM / Book of Business).
   
   AML PERIMETER (027):
     createBrokerClient now screens every entity against the
     air-gapped OpenSanctions/Yente engine BEFORE inserting.
     Fail-closed: if screening is unavailable, the insert is blocked.

   Security:
     - Every query scopes by broker_id to prevent IDOR
     - createBrokerClient validates payload via Zod
     - All currency stored as BigInt (cents)

   Connection:
     - Uses getPoolClient() (shared pool, NOT legacy per-call client)
     - Caller pattern: try { ... } finally { client.release() }
   ================================================================ */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { screenCounterpartyEntity } from "@/actions/compliance-screening-actions";
import { emitAuditEvent } from "@/lib/audit-logger";

/* ── Row type returned by the database ── */

export interface BrokerCrmEntity {
  id: string;
  broker_id: string;
  legal_name: string;
  entity_type: "BUYER" | "SELLER";
  contact_email: string | null;
  kyc_status: string;
  jurisdiction: string | null;
  tax_id: string | null;
  wallet_address: string | null;
  aum_usd: string; // BigInt comes back as string from pg
  private_notes: string | null;
  created_at: Date;
}

/* ── Zod schema for creating a new entity ── */

const CreateBrokerClientSchema = z.object({
  brokerId: z.string().min(1, "brokerId is required"),
  legalName: z
    .string()
    .min(1, "Legal name is required")
    .max(256, "Legal name must be 256 characters or fewer"),
  contactEmail: z
    .string()
    .email("Must be a valid email address"),
  entityType: z.enum(["BUYER", "SELLER"], {
    message: "Entity type must be BUYER or SELLER",
  }),
  jurisdiction: z.string().max(128).optional(),
  taxId: z.string().max(64).optional(),
  walletAddress: z.string().max(128).optional(),
  aumUsd: z
    .number()
    .int("AUM must be an integer (cents)")
    .min(0, "AUM cannot be negative")
    .optional()
    .default(0),
});

export type CreateBrokerClientPayload = z.infer<typeof CreateBrokerClientSchema>;

/* ── Result types ── */

export interface CrmActionSuccess<T = void> {
  success: true;
  data: T;
}

export interface CrmActionError {
  success: false;
  error: string;
  code: string;
}

type CrmResult<T = void> = CrmActionSuccess<T> | CrmActionError;

/* ================================================================
   1. GET ALL BROKER CLIENTS
   ================================================================
   Returns all CRM entities belonging to the given broker,
   ordered by creation date (newest first).
   ================================================================ */

export async function getBrokerClients(
  brokerId: string,
): Promise<BrokerCrmEntity[]> {
  /* ── Role Auth: Broker CRM is role-gated ── */
  const { requireRole } = await import("@/lib/authz");
  await requireRole("BROKER");

  const { getPoolClient } = await import("@/lib/db");
  const client = await getPoolClient();

  try {
    const { rows } = await client.query<BrokerCrmEntity>(
      `SELECT id, broker_id, legal_name, entity_type, contact_email,
              kyc_status, jurisdiction, tax_id, wallet_address,
              aum_usd, private_notes, created_at
       FROM broker_crm_entities
       WHERE broker_id = $1
       ORDER BY created_at DESC`,
      [brokerId],
    );

    return rows;
  } finally {
    client.release();
  }
}

/* ================================================================
   2. GET SINGLE BROKER CLIENT BY ID
   ================================================================
   Security Mandate: WHERE clause includes BOTH id AND broker_id
   to prevent Insecure Direct Object Reference (IDOR) attacks.
   A broker can only access their own entities.
   ================================================================ */

export async function getBrokerClientById(
  clientId: string,
  brokerId: string,
): Promise<BrokerCrmEntity | null> {
  /* ── Role Auth: Broker CRM is role-gated ── */
  const { requireRole } = await import("@/lib/authz");
  await requireRole("BROKER");

  const { getPoolClient } = await import("@/lib/db");
  const client = await getPoolClient();

  try {
    const { rows } = await client.query<BrokerCrmEntity>(
      `SELECT id, broker_id, legal_name, entity_type, contact_email,
              kyc_status, jurisdiction, tax_id, wallet_address,
              aum_usd, private_notes, created_at
       FROM broker_crm_entities
       WHERE id = $1 AND broker_id = $2`,
      [clientId, brokerId],
    );

    return rows[0] ?? null;
  } finally {
    client.release();
  }
}

/* ================================================================
   3. CREATE BROKER CLIENT
   ================================================================
   AML PERIMETER ENFORCEMENT:
     Before any database write, the entity is screened against the
     air-gapped OpenSanctions/Yente engine.

     - REJECTED → audit log + abort + COMPLIANCE_REJECTED error
     - Network error → abort + COMPLIANCE_OFFLINE error
     - CLEARED → proceed with INSERT

   INVARIANT: This function NEVER inserts an unscreened entity.
   ================================================================ */

export async function createBrokerClient(
  rawPayload: unknown,
): Promise<CrmResult<BrokerCrmEntity>> {
  /* ── Role Auth: Broker CRM is role-gated ── */
  const { requireRole } = await import("@/lib/authz");
  await requireRole("BROKER");

  // ── 1. Validate ──
  const parsed = CreateBrokerClientSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      code: "VALIDATION_ERROR",
    };
  }

  const payload = parsed.data;

  // ── 2. AML/PEP Screening ── FAIL-CLOSED ──
  try {
    const screening = await screenCounterpartyEntity(
      payload.legalName,
      payload.jurisdiction,
    );

    if (screening.status === "REJECTED") {
      // Log the rejection to the audit table
      const { getPoolClient: getAuditClient } = await import("@/lib/db");
      const auditClient = await getAuditClient();
      try {
        await auditClient.query(
          `INSERT INTO aml_screening_audit
             (entity_name, jurisdiction, screening_result, match_score, match_id, reason, screened_by, source_action)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            payload.legalName,
            payload.jurisdiction ?? null,
            "REJECTED",
            screening.matchScore,
            screening.matchId,
            screening.reason,
            payload.brokerId,
            "CREATE_BROKER_CLIENT",
          ],
        );
      } finally {
        auditClient.release();
      }

      emitAuditEvent("AML_WATCHLIST_BLOCK", "CRITICAL", {
        legalName: payload.legalName,
        jurisdiction: payload.jurisdiction ?? "N/A",
        matchId: screening.matchId,
        matchScore: screening.matchScore,
        matchName: screening.matchName,
        brokerId: payload.brokerId,
      });

      return {
        success: false,
        error: "COMPLIANCE_LOCK: Entity flagged by global AML perimeter.",
        code: "COMPLIANCE_REJECTED",
      };
    }

    // Screening CLEARED — log for audit trail
    const { getPoolClient: getAuditClient2 } = await import("@/lib/db");
    const auditClient2 = await getAuditClient2();
    try {
      await auditClient2.query(
        `INSERT INTO aml_screening_audit
           (entity_name, jurisdiction, screening_result, match_score, match_id, reason, screened_by, source_action)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          payload.legalName,
          payload.jurisdiction ?? null,
          "CLEARED",
          null,
          null,
          null,
          payload.brokerId,
          "CREATE_BROKER_CLIENT",
        ],
      );
    } finally {
      auditClient2.release();
    }
  } catch (err) {
    // FAIL-CLOSED: If screening is offline, block the insert entirely
    const message = err instanceof Error ? err.message : "Unknown screening error";
    console.error("[BrokerCRM] AML screening failed:", message);

    emitAuditEvent("AML_SCREENING_OFFLINE", "P1_ALERT", {
      legalName: payload.legalName,
      jurisdiction: payload.jurisdiction ?? "N/A",
      error: message,
      brokerId: payload.brokerId,
    });

    return {
      success: false,
      error: "COMPLIANCE_OFFLINE: Cannot verify entity at this time.",
      code: "COMPLIANCE_OFFLINE",
    };
  }

  // ── 3. Insert (only reached if screening CLEARED) ──
  const { getPoolClient } = await import("@/lib/db");
  const client = await getPoolClient();

  try {
    const { rows } = await client.query<BrokerCrmEntity>(
      `INSERT INTO broker_crm_entities (
         broker_id, legal_name, entity_type, contact_email,
         jurisdiction, tax_id, wallet_address, aum_usd
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, broker_id, legal_name, entity_type, contact_email,
                 kyc_status, jurisdiction, tax_id, wallet_address,
                 aum_usd, private_notes, created_at`,
      [
        payload.brokerId,
        payload.legalName,
        payload.entityType,
        payload.contactEmail,
        payload.jurisdiction ?? null,
        payload.taxId ?? null,
        payload.walletAddress ?? null,
        payload.aumUsd,
      ],
    );

    // ── 4. Revalidate roster page ──
    revalidatePath("/broker/clients");

    return { success: true, data: rows[0] };
  } catch (err) {
    console.error("[BrokerCRM] createBrokerClient failed:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unknown error during entity creation",
      code: "INTERNAL_ERROR",
    };
  } finally {
    client.release();
  }
}

/* ================================================================
   4. UPDATE BROKER CLIENT NOTES
   ================================================================
   Updates the private_notes field for a specific entity.
   Scoped by broker_id to prevent cross-broker modification.
   ================================================================ */

export async function updateBrokerClientNotes(
  clientId: string,
  brokerId: string,
  notes: string,
): Promise<CrmResult> {
  if (!clientId || !brokerId) {
    return {
      success: false,
      error: "clientId and brokerId are required",
      code: "VALIDATION_ERROR",
    };
  }

  /* ── Role Auth: Broker CRM is role-gated ── */
  const { requireRole } = await import("@/lib/authz");
  await requireRole("BROKER");

  const { getPoolClient } = await import("@/lib/db");
  const client = await getPoolClient();

  try {
    const { rowCount } = await client.query(
      `UPDATE broker_crm_entities
       SET private_notes = $1
       WHERE id = $2 AND broker_id = $3`,
      [notes, clientId, brokerId],
    );

    if (rowCount === 0) {
      return {
        success: false,
        error: "Entity not found or access denied",
        code: "NOT_FOUND",
      };
    }

    revalidatePath(`/broker/clients/${clientId}`);
    revalidatePath("/broker/clients");

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[BrokerCRM] updateBrokerClientNotes failed:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Unknown error updating notes",
      code: "INTERNAL_ERROR",
    };
  } finally {
    client.release();
  }
}
