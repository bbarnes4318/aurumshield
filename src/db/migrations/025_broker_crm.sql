-- ================================================================
-- 025: Broker CRM — Entity Profiles for Broker Book of Business
-- ================================================================
-- Creates the broker_crm_entities table for the Broker Mini-CRM.
-- This is SEPARATE from broker_clients (024) which is a M:N
-- broker ↔ user mapping. This table stores rich entity profiles
-- (legal_name, jurisdiction, KYC status, AUM, etc.) that brokers
-- manage as their "Book of Business."
--
-- broker_id is stored as TEXT (not UUID FK) to allow placeholder
-- IDs like 'broker_123' during development without requiring a
-- real row in the brokers table.
--
-- Idempotent: Uses IF NOT EXISTS throughout.
-- ================================================================

-- ─────────────────────────────────────────────────────────────────
-- 1. BROKER_CRM_ENTITIES — Entity Profiles
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broker_crm_entities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id        TEXT NOT NULL,
  legal_name       VARCHAR(256) NOT NULL,
  entity_type      VARCHAR(16) NOT NULL DEFAULT 'BUYER',
  contact_email    VARCHAR(256),
  kyc_status       VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  jurisdiction     VARCHAR(128),
  tax_id           VARCHAR(64),
  wallet_address   VARCHAR(128),
  aum_usd          BIGINT DEFAULT 0,
  private_notes    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup by broker
CREATE INDEX IF NOT EXISTS idx_broker_crm_entities_broker_id
  ON broker_crm_entities (broker_id);

-- Entity type constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_broker_crm_entity_type_valid'
  ) THEN
    ALTER TABLE broker_crm_entities
      ADD CONSTRAINT chk_broker_crm_entity_type_valid
      CHECK (entity_type IN ('BUYER', 'SELLER'));
  END IF;
END $$;

-- KYC status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_broker_crm_kyc_status_valid'
  ) THEN
    ALTER TABLE broker_crm_entities
      ADD CONSTRAINT chk_broker_crm_kyc_status_valid
      CHECK (kyc_status IN (
        'PENDING', 'PENDING LIVENESS', 'CLEARED',
        'SANCTIONS BLOCK', 'IN_REVIEW', 'REJECTED'
      ));
  END IF;
END $$;

-- AUM must be non-negative (stored in cents)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_broker_crm_aum_non_negative'
  ) THEN
    ALTER TABLE broker_crm_entities
      ADD CONSTRAINT chk_broker_crm_aum_non_negative
      CHECK (aum_usd >= 0);
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────
-- 2. SEED DATA — 12 Existing Mock Entities for broker_123
-- ─────────────────────────────────────────────────────────────────
-- Maps directly from the MOCK_CLIENTS array in clients/page.tsx.
-- AUM values in cents (BigInt). No floating-point.

INSERT INTO broker_crm_entities (broker_id, legal_name, entity_type, contact_email, kyc_status, jurisdiction, tax_id, wallet_address, aum_usd, private_notes, created_at)
VALUES
  ('broker_123', 'Aurelia Sovereign Fund',    'BUYER',  'ops@aureliafund.ky',         'CLEARED',          'Cayman Islands',   'KY-882441',  '0xA1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2', 7500000000,   'Tier-1 sovereign wealth allocation. IRA custodian: Equity Trust Co. 4 active deals.',         NOW() - INTERVAL '90 days'),
  ('broker_123', 'Meridian Capital Partners',  'BUYER',  'treasury@meridiancap.co.uk', 'CLEARED',          'United Kingdom',   'GB-991203',  NULL,                                              3200000000,   'UK-regulated fund. No IRA custodian (N/A). 2 active deals.',                                   NOW() - INTERVAL '85 days'),
  ('broker_123', 'Pacific Bullion Trust',      'BUYER',  'compliance@pacbullion.sg',   'PENDING LIVENESS', 'Singapore',        'SG-110482',  '0xF6E5D4C3B2A1F6E5D4C3B2A1F6E5D4C3B2A1F6E5', 5100000000,   'Awaiting liveness check. IRA custodian: GoldStar Trust. 3 active deals.',                      NOW() - INTERVAL '75 days'),
  ('broker_123', 'Nordic Reserve AG',          'SELLER', 'legal@nordicreserve.ch',     'CLEARED',          'Switzerland',      'CH-556001',  '0x1A2B3C4D5E6F1A2B3C4D5E6F1A2B3C4D5E6F1A2B', 12800000000,  'Swiss-domiciled seller. IRA custodian: Kingdom Trust. 1 active deal.',                         NOW() - INTERVAL '60 days'),
  ('broker_123', 'Caspian Trade Finance',      'BUYER',  'deals@caspiantrade.ae',      'CLEARED',          'UAE (DIFC)',        'AE-770312',  NULL,                                              1900000000,   'DIFC-regulated entity. No IRA custodian. 1 active deal.',                                      NOW() - INTERVAL '55 days'),
  ('broker_123', 'Emirates Gold DMCC',         'SELLER', 'compliance@emiratesgold.ae', 'SANCTIONS BLOCK',  'UAE (DMCC)',        'AE-880101',  NULL,                                              800000000,    'SANCTIONS BLOCK — under OFAC review. No active deals permitted.',                              NOW() - INTERVAL '50 days'),
  ('broker_123', 'Perth Mint Direct',          'SELLER', 'institutional@perthmint.au', 'CLEARED',          'Australia',        'AU-443209',  '0x2B3C4D5E6F1A2B3C4D5E6F1A2B3C4D5E6F1A2B3C', 22000000000,  'Government-backed mint. No IRA custodian. 5 active deals — top seller.',                       NOW() - INTERVAL '120 days'),
  ('broker_123', 'Shanghai Gold Exchange',     'BUYER',  'intl@sge.cn',               'PENDING LIVENESS', 'China (Mainland)', 'CN-990100',  NULL,                                              45000000000,  'Awaiting liveness — mainland compliance delay. No IRA custodian. 1 pending deal.',             NOW() - INTERVAL '30 days'),
  ('broker_123', 'Helvetia Heritage SA',       'BUYER',  'private@helvetiaheritage.ch','CLEARED',          'Switzerland',      'CH-667002',  '0x3C4D5E6F1A2B3C4D5E6F1A2B3C4D5E6F1A2B3C4D', 6400000000,   'Swiss private wealth. IRA custodian: Preferred Trust Co. 2 active deals.',                     NOW() - INTERVAL '45 days'),
  ('broker_123', 'Banco del Oro SA',           'BUYER',  'compliance@bancodeloro.pa',  'PENDING LIVENESS', 'Panama',           'PA-221033',  NULL,                                              950000000,    'Awaiting liveness verification. IRA custodian: STRATA Trust. No active deals yet.',            NOW() - INTERVAL '20 days'),
  ('broker_123', 'Rand Refinery Ltd',          'SELLER', 'trade@randrefinery.co.za',   'CLEARED',          'South Africa',     'ZA-334501',  '0x4D5E6F1A2B3C4D5E6F1A2B3C4D5E6F1A2B3C4D5E', 8700000000,   'Major African refinery. No IRA custodian. 3 active deals.',                                    NOW() - INTERVAL '100 days'),
  ('broker_123', 'Tanaka Kikinzoku Kogyo',     'BUYER',  'global@tanaka.co.jp',       'CLEARED',          'Japan',            'JP-112200',  '0x5E6F1A2B3C4D5E6F1A2B3C4D5E6F1A2B3C4D5E6F', 15500000000,  'Japans largest precious metals refiner. No IRA custodian. 2 active deals.',                    NOW() - INTERVAL '110 days')
ON CONFLICT DO NOTHING;
