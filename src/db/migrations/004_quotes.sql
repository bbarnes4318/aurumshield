/* ================================================================
   Migration 004: Price-Lock Quotes
   ================================================================
   Server-authoritative quote model for checkout price locking.
   Each quote records the price feed provenance (source + timestamp)
   for audit/dispute resolution.

   Status lifecycle:
     ACTIVE → USED     (consumed at settlement)
     ACTIVE → EXPIRED  (past expires_at)
     ACTIVE → CANCELLED (user navigated away)
   ================================================================ */

-- Enum for quote lifecycle
CREATE TYPE quote_status_enum AS ENUM (
  'ACTIVE',
  'USED',
  'EXPIRED',
  'CANCELLED'
);

-- Core quotes table
CREATE TABLE quotes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id          UUID NOT NULL,

  -- Pricing data
  weight_oz           NUMERIC(12,4)  NOT NULL CHECK (weight_oz > 0),
  spot_price          NUMERIC(12,4)  NOT NULL CHECK (spot_price > 0),
  premium_bps         INTEGER        NOT NULL DEFAULT 0,
  locked_price        NUMERIC(14,4)  NOT NULL CHECK (locked_price > 0),

  -- Lifecycle
  status              quote_status_enum NOT NULL DEFAULT 'ACTIVE',
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at             TIMESTAMPTZ,

  -- Price feed provenance (for audit trail)
  price_feed_source    VARCHAR(50) NOT NULL DEFAULT 'mock',
  price_feed_timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_quotes_user_status ON quotes (user_id, status);
CREATE INDEX idx_quotes_expires     ON quotes (expires_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_quotes_listing     ON quotes (listing_id);

-- Auto-expire stale quotes (called by cron or on-demand)
-- This function is idempotent and safe to call repeatedly.
CREATE OR REPLACE FUNCTION expire_stale_quotes()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE quotes
  SET    status = 'EXPIRED'
  WHERE  status = 'ACTIVE'
    AND  expires_at < now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

COMMENT ON TABLE quotes IS 'Server-authoritative price lock quotes for checkout flow. Each quote captures spot price, premium, locked total, and price feed provenance for regulatory audit.';
COMMENT ON COLUMN quotes.price_feed_source IS 'Price feed identifier (e.g. oanda_live, mock, listing)';
COMMENT ON COLUMN quotes.price_feed_timestamp IS 'Timestamp of the price feed reading used for this quote';
