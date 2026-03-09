-- 013_waitlist_leads.sql
-- Waitlist lead capture for A/B landing pages

CREATE TABLE IF NOT EXISTS waitlist_leads (
  id          SERIAL        PRIMARY KEY,
  email       VARCHAR(255)  NOT NULL,
  source      VARCHAR(50)   NOT NULL DEFAULT 'simple-home',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_waitlist_leads_email UNIQUE (email)
);

-- Index for admin queries by source (A/B variant reporting)
CREATE INDEX IF NOT EXISTS idx_waitlist_leads_source ON waitlist_leads (source);
