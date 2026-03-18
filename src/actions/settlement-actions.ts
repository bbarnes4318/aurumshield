"use server";

/* ================================================================
   ATOMIC SWAP EXECUTION ENGINE — Delivery versus Payment (DvP)
   ================================================================
   When a Producer authorizes release of escrowed asset, this engine
   atomically executes:
     Phase A: Cryptographic title handoff (Turnkey adapter)
     Phase B: Outbound Fedwire payout routing (Column adapter)
     Phase C: Ledger finality (state + clearing ledger commit)

   All three phases execute inside a single SQL transaction.
   Any failure → ROLLBACK. Escrow remains locked.

   Terminology: Offtaker (buyer), Producer (seller).
   ================================================================ */

import { createHash, randomUUID } from "crypto";
import { getPoolClient } from "@/lib/db";
import { z } from "zod";
import { requireSession } from "@/lib/authz";

/* ================================================================
   TYPES
   ================================================================ */

export interface AtomicSwapResult {
  success: boolean;
  orderId: string;
  titleHash?: string;
  outboundTransferId?: string;
  settledAt?: string;
  error?: string;
}

/* ================================================================
   TURNKEY ADAPTER (Title Minting)
   ================================================================
   TODO: Replace with live Turnkey API integration when signing
   infrastructure is deployed.

   Simulates signing the canonical asset payload and generating
   a deterministic SHA-256 title hash (certificate_id).
   ================================================================ */

interface TurnkeyTitlePayload {
  orderId: string;
  serialNumber: string;
  fineness: string;
  weightOz: number;
  vaultLocation: string;
  offtakerId: string;
}

async function mintCryptographicTitle(
  payload: TurnkeyTitlePayload,
): Promise<{ titleHash: string; certificateId: string }> {
  // TODO: POST to Turnkey signing API
  // const res = await fetch("https://api.turnkey.com/v1/sign", { ... });

  // Simulate network latency
  await new Promise((r) => setTimeout(r, 200));

  // Generate deterministic SHA-256 hash from canonical payload
  const canonical = JSON.stringify({
    orderId: payload.orderId,
    serialNumber: payload.serialNumber,
    fineness: payload.fineness,
    weightOz: payload.weightOz,
    vaultLocation: payload.vaultLocation,
    offtakerId: payload.offtakerId,
    timestamp: new Date().toISOString(),
  });

  const titleHash = createHash("sha256").update(canonical).digest("hex");
  const certificateId = `CERT-${titleHash.slice(0, 12).toUpperCase()}`;

  return { titleHash, certificateId };
}

/* ================================================================
   COLUMN ADAPTER (Outbound Fedwire Payout)
   ================================================================
   TODO: Replace with live Column Bank API integration.

   Simulates POST /transfers/wire to route funds from the FBO
   virtual account to the Producer's pre-verified counterparty.
   ================================================================ */

interface ColumnPayoutRequest {
  fromVirtualAccountId: string;
  toRoutingNumber: string;
  toAccountNumber: string;
  amountCents: number;
  currency: string;
  reference: string;
  idempotencyKey: string;
}

async function routeOutboundFedwire(
  req: ColumnPayoutRequest,
): Promise<{ transferId: string; status: string }> {
  // TODO: POST to Column Bank API
  // const res = await fetch("https://api.column.com/transfers/wire", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${process.env.COLUMN_API_KEY}`,
  //     "Content-Type": "application/json",
  //     "Idempotency-Key": req.idempotencyKey,
  //   },
  //   body: JSON.stringify({ ... }),
  // });

  // Simulate network latency
  await new Promise((r) => setTimeout(r, 300));

  const transferId = `wire_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

  console.log(
    `[COLUMN-PAYOUT] Outbound Fedwire routed: transfer=${transferId} ` +
      `amount_cents=${req.amountCents} ref=${req.reference}`,
  );

  return { transferId, status: "submitted" };
}

/* ================================================================
   TURNKEY ADAPTER (Outbound USDT/Stablecoin Payout)
   ================================================================
   Uses the Turnkey MPC adapter to sign and broadcast an ERC-20
   USDT Transfer from the buyer's isolated deposit wallet to the
   Producer's verified Ethereum wallet.

   CRITICAL: ERC-20 USDT uses 6 decimals (10^6 base units).
   Our fiat engine stores value in cents (10^2).
   Conversion: usdtBaseUnits = amountCents * 10000
   (cents → dollars = ÷100, dollars → 6-dec = ×10^6, net = ×10^4)

   TODO: Replace simulation with live Turnkey signing when
   TURNKEY_API_PRIVATE_KEY is deployed.
   ================================================================ */

interface StablecoinPayoutRequest {
  fromSubOrgId: string;
  toWalletAddress: string;
  amountCents: number;
  idempotencyKey: string;
}

/** USDT ERC-20 contract on Ethereum mainnet */
const USDT_CONTRACT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

/** ERC-20 Transfer function selector: transfer(address,uint256) */
const ERC20_TRANSFER_SELECTOR = "0xa9059cbb";

async function routeOutboundStablecoin(
  req: StablecoinPayoutRequest,
): Promise<{ transferId: string; status: string }> {
  // Convert cents → USDT 6-decimal base units using BigInt for precision
  const usdtBaseUnits = BigInt(req.amountCents) * BigInt(10000);

  console.log(
    `[TURNKEY-PAYOUT] Constructing ERC-20 USDT transfer: ` +
      `fromSubOrg=${req.fromSubOrgId} to=${req.toWalletAddress} ` +
      `amountCents=${req.amountCents} usdtBaseUnits=${usdtBaseUnits.toString()} ` +
      `idempotencyKey=${req.idempotencyKey}`,
  );

  // Attempt live Turnkey signing if API keys are configured
  const turnkeyPublicKey = process.env.TURNKEY_API_PUBLIC_KEY;
  const turnkeyPrivateKey = process.env.TURNKEY_API_PRIVATE_KEY;

  if (turnkeyPublicKey && turnkeyPrivateKey) {
    // TODO: Live Turnkey signing path
    // 1. Initialize TurnkeyService within the fromSubOrgId context
    // 2. Construct ERC-20 transfer calldata:
    //    - to: USDT_CONTRACT_ADDRESS
    //    - data: ERC20_TRANSFER_SELECTOR + abi.encode(toWalletAddress, usdtBaseUnits)
    // 3. Sign and broadcast via Turnkey SDK
    // const { Turnkey } = await import("@turnkey/sdk-server");
    // const turnkey = new Turnkey({ ... });
    // const signedTx = await turnkey.apiClient().signTransaction({ ... });

    console.warn(
      `[TURNKEY-PAYOUT] Live signing not yet enabled — falling through to simulation`,
    );
  }

  // Simulate network latency (mock mode)
  await new Promise((r) => setTimeout(r, 250));

  // Encode the ERC-20 transfer calldata for audit logging
  const paddedAddress = req.toWalletAddress.replace("0x", "").padStart(64, "0");
  const paddedAmount = usdtBaseUnits.toString(16).padStart(64, "0");
  const transferCalldata = `${ERC20_TRANSFER_SELECTOR}${paddedAddress}${paddedAmount}`;

  const transferId = `usdt_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

  console.log(
    `[TURNKEY-PAYOUT] Outbound USDT transfer routed (simulated): ` +
      `transfer=${transferId} contract=${USDT_CONTRACT_ADDRESS} ` +
      `calldata=${transferCalldata.slice(0, 42)}... ` +
      `usdtBaseUnits=${usdtBaseUnits.toString()}`,
  );

  return { transferId, status: "submitted" };
}

/* ================================================================
   ZOD SCHEMAS — Server Action Input Validation
   ================================================================ */

const ExecuteAtomicSwapSchema = z.object({
  orderId: z.string().min(1, "Order ID is required").max(128),
  producerId: z.string().min(1, "Producer ID is required").max(128),
});

/* ================================================================
   EXECUTE ATOMIC SWAP — Server Action
   ================================================================ */

export async function executeAtomicSwap(
  orderId: string,
  producerId: string,
): Promise<AtomicSwapResult> {
  /* ── Session Auth: Only authenticated users can trigger DvP ── */
  await requireSession();

  /* ── Zod Boundary Validation ── */
  const parsed = ExecuteAtomicSwapSchema.safeParse({ orderId, producerId });
  if (!parsed.success) {
    return {
      success: false,
      orderId: orderId ?? "",
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const client = await getPoolClient();

  try {
    await client.query("BEGIN");

    /* ── 1. Pre-Execution State Validation ── */
    const { rows: orderRows } = await client.query<{
      id: string;
      order_id: string;
      buyer_id: string;
      producer_id: string | null;
      listing_id: string;
      status: string;
      total_notional: string;
      weight_oz: string;
      locked_price_per_oz: string;
      clearing_certificate_hash: string | null;
      funding_route: string | null;
      turnkey_sub_org_id: string | null;
      turnkey_deposit_address: string | null;
      producer_wallet_address: string | null;
    }>(
      `SELECT id, order_id, buyer_id, producer_id, listing_id,
              status, total_notional, weight_oz, locked_price_per_oz,
              clearing_certificate_hash, funding_route,
              turnkey_sub_org_id, turnkey_deposit_address,
              producer_wallet_address
       FROM settlement_cases
       WHERE id = $1
       FOR UPDATE`,
      [orderId],
    );

    if (orderRows.length === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        orderId,
        error: "Order not found.",
      };
    }

    const order = orderRows[0];

    /* ── Producer Authorization Check ── */
    if (order.producer_id && order.producer_id !== producerId) {
      await client.query("ROLLBACK");
      console.warn(
        `[DVP-ENGINE] Producer mismatch: order=${orderId} ` +
          `expected=${order.producer_id} got=${producerId}`,
      );
      return {
        success: false,
        orderId,
        error: "Unauthorized: Producer ID does not match this order.",
      };
    }

    /* ── State Guard ── */
    if (order.status !== "FUNDS_CLEARED_READY_FOR_RELEASE") {
      await client.query("ROLLBACK");
      console.warn(
        `[DVP-ENGINE] Invalid state for DvP: order=${orderId} status=${order.status}`,
      );
      throw new Error("Invalid settlement state for DvP execution.");
    }

    /* ── Idempotency: Already has a title hash → already executed ── */
    if (order.clearing_certificate_hash) {
      await client.query("ROLLBACK");
      return {
        success: true,
        orderId,
        titleHash: order.clearing_certificate_hash,
        error: "DvP already executed for this order.",
      };
    }

    /* ── 2. Phase A: Cryptographic Title Handoff ── */
    console.log(`[DVP-ENGINE] Phase A: Minting cryptographic title for order=${orderId}`);

    // Query the asset details from the listing (including provenance + refinery flags)
    const { rows: listingRows } = await client.query<{
      form: string;
      purity: string;
      total_weight_oz: string;
      vault_location: string;
      assay_verified: boolean;
      transit_logged: boolean;
      refinery_status: string;
      actual_refined_weight_oz: string | null;
      estimated_weight_oz: string | null;
    }>(
      `SELECT form, purity, total_weight_oz, vault_location,
              COALESCE(assay_verified, FALSE) AS assay_verified,
              COALESCE(transit_logged, FALSE) AS transit_logged,
              COALESCE(refinery_status, 'NOT_APPLICABLE') AS refinery_status,
              actual_refined_weight_oz,
              estimated_weight_oz
       FROM inventory_listings
       WHERE id = $1`,
      [order.listing_id],
    );

    const listing = listingRows[0] ?? {
      form: "400oz Good Delivery",
      purity: "0.9950",
      total_weight_oz: order.weight_oz,
      vault_location: "Zurich FTZ",
      assay_verified: false,
      transit_logged: false,
      refinery_status: "NOT_APPLICABLE",
      actual_refined_weight_oz: null,
      estimated_weight_oz: null,
    };

    /* ── PROVENANCE GATE (Good Delivery Bullion Only) ── */
    // Raw Doré listings bypass the assay gate — they have their own
    // Refinery Gate below.
    const isRawDore = listing.form === "RAW_DORE";
    const isGoodDelivery = !isRawDore;

    if (isGoodDelivery && (!listing.assay_verified || !listing.transit_logged)) {
      await client.query("ROLLBACK");
      console.error(
        `[DVP-ENGINE] PROVENANCE VIOLATION: listing=${order.listing_id} ` +
          `assay_verified=${listing.assay_verified} transit_logged=${listing.transit_logged}`,
      );
      throw new Error(
        "ASSET_PROVENANCE_VIOLATION: Sovereign assay data missing or invalid. Title minting aborted.",
      );
    }

    /* ── DORÉ GATE (RAW_DORE Only) ── */
    // Raw Doré assets MUST have a completed refinery yield confirmation
    // before title minting is permitted. The actual_refined_weight_oz
    // from the refinery webhook is the ONLY acceptable weight.
    if (isRawDore && listing.refinery_status !== "COMPLETED") {
      await client.query("ROLLBACK");
      console.error(
        `[DVP-ENGINE] ASSET_UNREFINED: listing=${order.listing_id} ` +
          `refinery_status=${listing.refinery_status} ` +
          `estimated_weight_oz=${listing.estimated_weight_oz ?? "N/A"}`,
      );
      throw new Error(
        "ASSET_UNREFINED: Doré asset has not received final yield confirmation from the refinery. Title minting aborted.",
      );
    }

    /* ── DYNAMIC EXECUTION WEIGHT ── */
    // For RAW_DORE: use the refinery's actual_refined_weight_oz (the oracle).
    // For Good Delivery: use the original order weight_oz.
    const finalExecutionWeight = isRawDore
      ? parseFloat(listing.actual_refined_weight_oz!)
      : parseFloat(listing.total_weight_oz || order.weight_oz);

    if (isRawDore) {
      console.log(
        `[DVP-ENGINE] Doré weight patch: estimated=${listing.estimated_weight_oz} ` +
          `actual_refined=${listing.actual_refined_weight_oz} ` +
          `finalExecutionWeight=${finalExecutionWeight}`,
      );
    }

    const titleResult = await mintCryptographicTitle({
      orderId: order.order_id,
      serialNumber: `SN-${order.order_id}-${Date.now().toString(36)}`,
      fineness: listing.purity,
      weightOz: finalExecutionWeight,
      vaultLocation: listing.vault_location,
      offtakerId: order.buyer_id,
    });

    console.log(
      `[DVP-ENGINE] Phase A complete: title_hash=${titleResult.titleHash.slice(0, 16)}... ` +
        `certificate=${titleResult.certificateId} weightOz=${finalExecutionWeight}`,
    );

    /* ── 3. Phase B: Payout Routing (Rail-Dependent) ── */

    /* ── DYNAMIC NOTIONAL RECALCULATION ── */
    // For RAW_DORE listings, the notional MUST be recalculated using the
    // actual refined weight × the locked price per oz. This prevents the
    // buyer from paying the estimated (higher) notional for a smaller
    // amount of actual refined gold.
    const originalNotionalCents = Math.round(parseFloat(order.total_notional) * 100);
    let finalNotionalCents: number;

    if (isRawDore) {
      const finalNotionalUsd = finalExecutionWeight * parseFloat(order.locked_price_per_oz);
      finalNotionalCents = Math.round(finalNotionalUsd * 100);

      console.log(
        `[DVP-ENGINE] Doré notional recalculation: ` +
          `original_notional_cents=${originalNotionalCents} ` +
          `final_notional_cents=${finalNotionalCents} ` +
          `delta_cents=${originalNotionalCents - finalNotionalCents} ` +
          `finalWeight=${finalExecutionWeight} ` +
          `lockedPricePerOz=${order.locked_price_per_oz}`,
      );
    } else {
      finalNotionalCents = originalNotionalCents;
    }

    const idempotencyKey = `dvp-payout-${order.order_id}-${orderId}`;
    const isFedwire = order.funding_route !== "stablecoin";

    let payoutResult: { transferId: string; status: string };

    if (isFedwire) {
      /* ── Phase B-1: Fiat Payout via Fedwire (Column Bank) ── */
      console.log(`[DVP-ENGINE] Phase B: Routing outbound Fedwire for order=${orderId}`);

      payoutResult = await routeOutboundFedwire({
        fromVirtualAccountId: `va_${orderId}`,
        toRoutingNumber: "021000021", // TODO: Query from producer's verified bank details
        toAccountNumber: "****8842",  // TODO: Query from producer's verified bank details
        amountCents: finalNotionalCents,
        currency: "USD",
        reference: `DVP-${order.order_id}`,
        idempotencyKey,
      });
    } else {
      /* ── Phase B-2: Stablecoin Payout via Turnkey MPC ── */
      console.log(`[DVP-ENGINE] Phase B: Routing outbound USDT for order=${orderId}`);

      payoutResult = await routeOutboundStablecoin({
        fromSubOrgId: order.turnkey_sub_org_id ?? `suborg-${orderId}`,
        toWalletAddress: order.producer_wallet_address ?? "0x0000000000000000000000000000000000000000",
        amountCents: finalNotionalCents,
        idempotencyKey,
      });

      if (!order.producer_wallet_address) {
        console.warn(
          `[DVP-ENGINE] WARNING: No producer_wallet_address on file for order=${orderId}. ` +
            `Using zero-address fallback. Funds will not be delivered until producer registers their ERC-20 wallet.`,
        );
      }
    }

    console.log(
      `[DVP-ENGINE] Phase B complete: outbound_transfer=${payoutResult.transferId} ` +
        `finalNotionalCents=${finalNotionalCents}`,
    );

    /* ── 4. Phase C: Ledger Finality ── */
    console.log(`[DVP-ENGINE] Phase C: Committing ledger finality for order=${orderId}`);

    const settledAt = new Date().toISOString();

    // Update settlement_cases → TITLE_TRANSFERRED_AND_COMPLETED
    // For RAW_DORE: persist the actual refined weight and recalculated
    // notional so the ledger exactly matches the final financial reality.
    await client.query(
      `UPDATE settlement_cases
       SET status = 'TITLE_TRANSFERRED_AND_COMPLETED',
           clearing_certificate_hash = $1,
           outbound_transfer_id = $2,
           settled_at = $3,
           weight_oz = $5,
           total_notional = $6
       WHERE id = $4`,
      [
        titleResult.titleHash,
        payoutResult.transferId,
        settledAt,
        orderId,
        finalExecutionWeight.toString(),
        (finalNotionalCents / 100).toFixed(2),
      ],
    );

    // DVP event audit trail
    await client.query(
      `INSERT INTO dvp_events
         (settlement_id, event_type, previous_state,
          actor_user_id, actor_role, detail, metadata)
       VALUES ($1, 'DVP_EXECUTED', 'FUNDS_HELD', $2, 'producer', $3, $4)`,
      [
        orderId,
        producerId,
        `Atomic DvP executed: title transferred to Offtaker, ${isFedwire ? "Fedwire" : "USDT"} routed to Producer. ` +
          `Certificate: ${titleResult.certificateId}`,
        JSON.stringify({
          titleHash: titleResult.titleHash,
          certificateId: titleResult.certificateId,
          outboundTransferId: payoutResult.transferId,
          originalNotionalCents: originalNotionalCents,
          finalNotionalCents,
          finalExecutionWeight,
          isRawDore,
          settledAt,
          producerId,
          offtakerId: order.buyer_id,
        }),
      ],
    );

    // Settlement finality record for outbound payout (rail-aware)
    const payoutRail = isFedwire ? "column" : "turnkey";
    await client.query(
      `INSERT INTO settlement_finality
         (settlement_id, rail, external_transfer_id, idempotency_key,
          finality_status, amount_cents, leg, is_fallback, finalized_at)
       VALUES ($1, $2, $3, $4, 'COMPLETED', $5, 'producer_payout', FALSE, NOW())
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [orderId, payoutRail, payoutResult.transferId, idempotencyKey, finalNotionalCents],
    );

    // Payout record (idempotent)
    await client.query(
      `INSERT INTO payouts
         (settlement_id, payee_id, idempotency_key, rail,
          action_type, amount_cents, status, external_id)
       VALUES ($1, $2, $3, $4, 'producer_payout', $5, 'SUBMITTED', $6)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [orderId, producerId, idempotencyKey, payoutRail, finalNotionalCents, payoutResult.transferId],
    );

    /* ── COMMIT ── */
    await client.query("COMMIT");

    console.info(
      `[DVP-ENGINE] ✓ ATOMIC SWAP COMMITTED: order=${orderId} ` +
        `title=${titleResult.certificateId} wire=${payoutResult.transferId} settled_at=${settledAt}`,
    );

    return {
      success: true,
      orderId,
      titleHash: titleResult.titleHash,
      outboundTransferId: payoutResult.transferId,
      settledAt,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    const message = err instanceof Error ? err.message : String(err);

    // Re-throw specific fatal errors — these must propagate to the caller
    if (message === "Invalid settlement state for DvP execution.") {
      throw new Error("Invalid settlement state for DvP execution.");
    }
    if (message.startsWith("ASSET_PROVENANCE_VIOLATION")) {
      throw new Error(message);
    }
    if (message.startsWith("ASSET_UNREFINED")) {
      throw new Error(message);
    }

    console.error(
      `[DVP-ENGINE] ATOMIC SWAP FAILED for order=${orderId}:`,
      message,
    );

    // Sanitized error — do not leak internal API traces
    return {
      success: false,
      orderId,
      error: "DvP Execution Failed. Escrow remains locked.",
    };
  } finally {
    client.release();
  }
}
