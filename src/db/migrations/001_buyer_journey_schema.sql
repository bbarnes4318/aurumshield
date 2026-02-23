-- =============================================================================
-- AurumShield — 4-Phase Buyer Journey Schema
-- Migration: 001_buyer_journey_schema
-- Date: 2026-02-22
-- =============================================================================
-- This migration establishes the relational schema for the frictionless
-- 4-Phase Buyer Journey:
--   Phase 1: Identity Perimeter (KYC/KYB)
--   Phase 2: Curated Marketplace (Liquidity)
--   Phase 3: Underwriting Checkout (DvP)
--   Phase 4: Post-Trade Telemetry (Brink's Integration)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS for Deterministic Statuses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE kyc_status_enum AS ENUM ('PENDING', 'APPROVED', 'ELEVATED', 'REJECTED');
CREATE TYPE settlement_status_enum AS ENUM ('ESCROW_OPEN', 'AWAITING_FUNDS', 'READY_TO_SETTLE', 'SETTLED', 'CANCELLED');
CREATE TYPE delivery_method_enum AS ENUM ('VAULT_CUSTODY', 'SECURE_DELIVERY');
CREATE TYPE shipment_status_enum AS ENUM ('PENDING', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED');

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 1: The Identity Perimeter (KYC/KYB)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'buyer',
  kyc_status kyc_status_enum DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kyb_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  jurisdiction VARCHAR(100),
  liveness_cleared BOOLEAN DEFAULT FALSE,
  ubo_document_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2: The Marketplace (Curated Liquidity)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE inventory_listings (
  id VARCHAR(50) PRIMARY KEY,
  seller_id UUID NOT NULL,
  form VARCHAR(50) NOT NULL,
  purity NUMERIC(5,4) NOT NULL,
  total_weight_oz NUMERIC(10,2) NOT NULL,
  premium_per_oz NUMERIC(10,2) NOT NULL,
  vault_location VARCHAR(255) NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3: The Underwriting Checkout (DvP)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE settlement_cases (
  id VARCHAR(50) PRIMARY KEY,
  buyer_id UUID REFERENCES users(id),
  listing_id VARCHAR(50) REFERENCES inventory_listings(id),
  order_id VARCHAR(50) UNIQUE NOT NULL,
  locked_price_per_oz NUMERIC(10,2) NOT NULL,
  weight_oz NUMERIC(10,2) NOT NULL,
  total_notional NUMERIC(15,2) NOT NULL,
  settlement_rail VARCHAR(50) NOT NULL,
  delivery_method delivery_method_enum NOT NULL,
  status settlement_status_enum DEFAULT 'ESCROW_OPEN',
  clearing_certificate_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4: The Post-Trade Telemetry (Brink's Integration)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE secure_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id VARCHAR(50) REFERENCES settlement_cases(id) ON DELETE CASCADE,
  brinks_tracking_number VARCHAR(100),
  destination_address JSONB NOT NULL,
  status shipment_status_enum DEFAULT 'PENDING',
  shipping_cost NUMERIC(10,2),
  insurance_cost NUMERIC(10,2),
  delivery_manifest_url TEXT,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Performance Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_settlement_buyer ON settlement_cases(buyer_id);
CREATE INDEX idx_listings_published ON inventory_listings(is_published) WHERE is_published = TRUE;
