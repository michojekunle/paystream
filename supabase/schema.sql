-- PayStream — Supabase Database Schema
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor → New Query
-- Paste this entire file and click "Run"

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Payment Receipts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_receipts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_id         TEXT UNIQUE NOT NULL,          -- on-chain txId (replay guard)
  payer         TEXT NOT NULL,                 -- STX address of payer
  payee         TEXT NOT NULL,                 -- STX address of merchant
  amount        TEXT NOT NULL,                 -- micro-units (string to avoid bigint loss)
  token         TEXT NOT NULL DEFAULT 'STX',   -- STX | sBTC | USDCx
  resource      TEXT NOT NULL,                 -- protected URL path
  block_height  INTEGER,                       -- Stacks block if known
  settled_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast merchant lookups
CREATE INDEX IF NOT EXISTS idx_receipts_payee ON payment_receipts (payee, settled_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_payer ON payment_receipts (payer, settled_at DESC);

-- ─── Nonce Store (replay protection) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS used_nonces (
  nonce       TEXT PRIMARY KEY,
  used_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-expire nonces older than 24 hours via a DB function + pg_cron
-- Or just run: DELETE FROM used_nonces WHERE used_at < NOW() - INTERVAL '24 hours';
-- on a schedule via Supabase Edge Functions.

CREATE INDEX IF NOT EXISTS idx_nonces_used_at ON used_nonces (used_at);

-- ─── Compute Jobs ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS compute_jobs (
  job_id        TEXT PRIMARY KEY,
  status        TEXT NOT NULL DEFAULT 'running', -- running | done | failed
  gpu           TEXT,
  model         TEXT,
  payer         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- ─── Row-Level Security (enable for production) ───────────────────────────────

ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE compute_jobs ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by the API server with SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "service_role_all" ON payment_receipts TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON used_nonces TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON compute_jobs TO service_role USING (true) WITH CHECK (true);

-- Anonymous/public can read receipts (for the dashboard's anon key)
CREATE POLICY "public_read_receipts" ON payment_receipts FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_jobs" ON compute_jobs FOR SELECT TO anon USING (true);
