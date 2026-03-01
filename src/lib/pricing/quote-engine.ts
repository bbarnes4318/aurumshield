/* ================================================================
   QUOTE ENGINE — Server-Side Price Lock Management
   ================================================================
   Creates, validates, and consumes price-lock quotes during
   checkout. All pricing is authoritative from this module — the
   client shows a countdown but the server enforces expiry.

   Flow:
     1. createQuote()    — buyer clicks "Lock Price"
     2. validateQuote()  — server checks on each subsequent step
     3. consumeQuote()   — settlement finalizes the order
     4. expireStaleQuotes() — periodic cleanup

   Server-side only — do not import in client components.
   ================================================================ */

import "server-only";

/* ── Types ── */

export type QuoteStatus = "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";

export interface Quote {
  id: string;
  userId: string;
  listingId: string;
  weightOz: number;
  spotPrice: number;
  premiumBps: number;
  lockedPrice: number;
  status: QuoteStatus;
  expiresAt: string; // ISO 8601
  createdAt: string;
  usedAt: string | null;
  priceFeedSource: string;
  priceFeedTimestamp: string;
}

export interface CreateQuoteInput {
  userId: string;
  listingId: string;
  weightOz: number;
  /* premiumBps intentionally removed (RSK-011) — server derives from DB listing */
}

export interface QuoteResult {
  quote: Quote;
  /** Seconds remaining until expiry (for client countdown) */
  secondsRemaining: number;
}

/* ── Row → Domain Mapper ── */

function mapRow(row: Record<string, unknown>): Quote {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    listingId: row.listing_id as string,
    weightOz: Number(row.weight_oz),
    spotPrice: Number(row.spot_price),
    premiumBps: Number(row.premium_bps),
    lockedPrice: Number(row.locked_price),
    status: row.status as QuoteStatus,
    expiresAt: (row.expires_at as Date).toISOString(),
    createdAt: (row.created_at as Date).toISOString(),
    usedAt: row.used_at ? (row.used_at as Date).toISOString() : null,
    priceFeedSource: row.price_feed_source as string,
    priceFeedTimestamp: (row.price_feed_timestamp as Date).toISOString(),
  };
}

/* ── Constants ── */

/** Quote validity window in seconds */
const QUOTE_TTL_SECONDS = 60;

/* ================================================================
   PUBLIC API
   ================================================================ */

/**
 * Create a new price-lock quote.
 *
 * RSK-011: Premium is NEVER accepted from the client.
 * The server queries inventory_listings.premium_per_oz for the
 * seller-designated premium and derives premiumBps from spot.
 *
 * Flow:
 *   1. Query the listing's premium_per_oz from the DB
 *   2. Fetch the live spot price from Bloomberg B-PIPE adapter
 *   3. Derive premiumBps = (premiumPerOz / spotPrice) * 10_000
 *   4. Compute lockedPrice = weightOz * (spotPrice + premiumPerOz)
 *   5. Guard: lockedPrice >= spotPrice * weightOz (no negative premiums)
 *   6. Cancel stale ACTIVE quotes for the same user + listing
 *   7. Insert + return the quote
 */
export async function createQuote(input: CreateQuoteInput): Promise<QuoteResult> {
  const { getDbClient } = await import("@/lib/db");
  const { getSpotPrice } = await import("@/lib/pricing/bpipe-adapter");
  const db = await getDbClient();

  try {
    // ── RSK-011: Query authoritative premium from inventory_listings ──
    const { rows: listingRows } = await db.query<{
      premium_per_oz: string;
    }>(
      `SELECT premium_per_oz FROM inventory_listings WHERE id = $1`,
      [input.listingId],
    );

    if (listingRows.length === 0) {
      throw new Error(
        `LISTING_NOT_FOUND: Listing ${input.listingId} does not exist. Cannot create quote against phantom listing.`,
      );
    }

    const premiumPerOz = parseFloat(listingRows[0].premium_per_oz);

    // Fetch authoritative spot price
    const spot = await getSpotPrice();
    const spotPrice = spot.pricePerOz;
    const priceFeedSource = spot.source;
    const priceFeedTimestamp = spot.timestamp;

    // Derive premium in basis points from the DB-sourced premium_per_oz
    const premiumBps = spotPrice > 0
      ? Math.round((premiumPerOz / spotPrice) * 10_000)
      : 0;

    // Compute locked price: weight * (spot + seller premium)
    const lockedPrice = Number((input.weightOz * (spotPrice + premiumPerOz)).toFixed(4));

    // ── RSK-011 GUARD: lockedPrice must never be below spot ──
    const spotFloor = Number((input.weightOz * spotPrice).toFixed(4));
    if (lockedPrice < spotFloor) {
      throw new Error(
        `NEGATIVE_PREMIUM_REJECTED: lockedPrice (${lockedPrice}) < spot floor (${spotFloor}). ` +
        `premium_per_oz=${premiumPerOz} is invalid — cannot sell below spot.`,
      );
    }

    // Cancel any existing active quotes for this user + listing
    await db.query(
      `UPDATE quotes SET status = 'CANCELLED'
       WHERE user_id = $1 AND listing_id = $2 AND status = 'ACTIVE'`,
      [input.userId, input.listingId],
    );

    // Insert the new quote
    const expiresAt = new Date(Date.now() + QUOTE_TTL_SECONDS * 1000).toISOString();

    const { rows } = await db.query(
      `INSERT INTO quotes (
         user_id, listing_id, weight_oz, spot_price, premium_bps,
         locked_price, expires_at, price_feed_source, price_feed_timestamp
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.userId,
        input.listingId,
        input.weightOz,
        spotPrice,
        premiumBps,
        lockedPrice,
        expiresAt,
        priceFeedSource,
        priceFeedTimestamp,
      ],
    );

    const quote = mapRow(rows[0]);

    return {
      quote,
      secondsRemaining: QUOTE_TTL_SECONDS,
    };
  } finally {
    try { await db.end(); } catch { /* ignore cleanup */ }
  }
}

/**
 * Validate that a quote is still active and owned by the user.
 *
 * Returns the quote if valid, or null if expired/invalid.
 * Does NOT consume the quote — call consumeQuote() for that.
 */
export async function validateQuote(
  quoteId: string,
  userId: string,
): Promise<Quote | null> {
  const { getDbClient } = await import("@/lib/db");
  const db = await getDbClient();

  try {
    // Auto-expire first
    await db.query(
      `UPDATE quotes SET status = 'EXPIRED'
       WHERE id = $1 AND status = 'ACTIVE' AND expires_at < now()`,
      [quoteId],
    );

    const { rows } = await db.query(
      `SELECT * FROM quotes
       WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE' AND expires_at >= now()`,
      [quoteId, userId],
    );

    if (rows.length === 0) return null;
    return mapRow(rows[0]);
  } finally {
    try { await db.end(); } catch { /* ignore cleanup */ }
  }
}

/**
 * Consume a quote — atomically mark it as USED.
 *
 * Returns the consumed quote or null if the quote was already
 * used/expired/not found. Uses a CTE to prevent race conditions.
 */
export async function consumeQuote(
  quoteId: string,
  userId: string,
): Promise<Quote | null> {
  const { getDbClient } = await import("@/lib/db");
  const db = await getDbClient();

  try {
    const { rows } = await db.query(
      `UPDATE quotes
       SET    status = 'USED', used_at = now()
       WHERE  id = $1
         AND  user_id = $2
         AND  status = 'ACTIVE'
         AND  expires_at >= now()
       RETURNING *`,
      [quoteId, userId],
    );

    if (rows.length === 0) return null;
    return mapRow(rows[0]);
  } finally {
    try { await db.end(); } catch { /* ignore cleanup */ }
  }
}

/**
 * Expire all stale ACTIVE quotes past their expiry time.
 *
 * Call periodically (e.g. cron) or on-demand.
 * Returns the number of quotes expired.
 */
export async function expireStaleQuotes(): Promise<number> {
  const { getDbClient } = await import("@/lib/db");
  const db = await getDbClient();

  try {
    const { rows } = await db.query(`SELECT expire_stale_quotes() AS count`);
    return Number(rows[0]?.count ?? 0);
  } finally {
    try { await db.end(); } catch { /* ignore cleanup */ }
  }
}

/**
 * Get a quote by ID (any status). Used for audit/display.
 */
export async function getQuoteById(quoteId: string): Promise<Quote | null> {
  const { getDbClient } = await import("@/lib/db");
  const db = await getDbClient();

  try {
    const { rows } = await db.query(
      `SELECT * FROM quotes WHERE id = $1`,
      [quoteId],
    );
    if (rows.length === 0) return null;
    return mapRow(rows[0]);
  } finally {
    try { await db.end(); } catch { /* ignore cleanup */ }
  }
}
