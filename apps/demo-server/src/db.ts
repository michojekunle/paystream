/**
 * PayStream API — Supabase Database Client
 *
 * Handles all persistence for the production API server:
 *   - Payment receipts (with real txIds from Stacks)
 *   - Nonce store for replay protection
 *   - Compute job tracking
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. " +
          "Create a Supabase project at https://supabase.com and set these in .env.local",
      );
    }
    _client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

// ─── Payment Receipts ────────────────────────────────────────────────────────

export interface PaymentRecordInsert {
  tx_id: string;
  payer: string;
  payee: string;
  amount: string;
  token: string;
  resource: string;
  block_height?: number;
}

/**
 * Insert a confirmed payment receipt.
 * tx_id has a UNIQUE constraint — duplicate settlements are rejected.
 */
export async function recordPayment(data: PaymentRecordInsert): Promise<void> {
  const { error } = await getClient().from("payment_receipts").insert(data);
  if (error && !error.message.includes("duplicate")) {
    throw new Error(`Failed to record payment: ${error.message}`);
  }
}

/**
 * Get all receipts for a merchant address.
 */
export async function getMerchantReceipts(payee: string) {
  const { data, error } = await getClient()
    .from("payment_receipts")
    .select("*")
    .eq("payee", payee)
    .order("settled_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Failed to fetch receipts: ${error.message}`);
  return data ?? [];
}

/**
 * Get total stats for a merchant.
 */
export async function getMerchantStats(payee: string) {
  const { data, error } = await getClient()
    .from("payment_receipts")
    .select("amount, token")
    .eq("payee", payee);

  if (error) throw new Error(`Failed to fetch stats: ${error.message}`);

  const stats: Record<string, { total: bigint; count: number }> = {};
  for (const row of data ?? []) {
    const token = row.token as string;
    if (!stats[token]) stats[token] = { total: 0n, count: 0 };
    stats[token].total += BigInt(row.amount as string);
    stats[token].count += 1;
  }
  return stats;
}

// ─── Nonce Store (replay protection) ─────────────────────────────────────────

/**
 * Check if a payment nonce has already been used.
 * Nonces expire after 24 hours via scheduled Supabase function or cron.
 */
export async function isNonceUsed(nonce: string): Promise<boolean> {
  const { data } = await getClient()
    .from("used_nonces")
    .select("nonce")
    .eq("nonce", nonce)
    .maybeSingle();
  return data !== null;
}

/**
 * Mark a nonce as used. Should be called immediately after verifying payment.
 */
export async function markNonceUsed(nonce: string): Promise<void> {
  const { error } = await getClient().from("used_nonces").insert({ nonce });
  if (error && !error.message.includes("duplicate")) {
    throw new Error(`Failed to store nonce: ${error.message}`);
  }
}

// ─── Compute Jobs ─────────────────────────────────────────────────────────────

export interface ComputeJob {
  job_id: string;
  status: "running" | "done" | "failed";
  gpu?: string;
  model?: string;
  payer?: string;
}

export async function createComputeJob(job: ComputeJob): Promise<void> {
  const { error } = await getClient().from("compute_jobs").insert(job);
  if (error) throw new Error(`Failed to create compute job: ${error.message}`);
}

export async function getComputeJob(jobId: string): Promise<ComputeJob | null> {
  const { data, error } = await getClient()
    .from("compute_jobs")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch compute job: ${error.message}`);
  return data as ComputeJob | null;
}

export async function completeComputeJob(jobId: string): Promise<void> {
  const { error } = await getClient()
    .from("compute_jobs")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("job_id", jobId);
  if (error) throw new Error(`Failed to update compute job: ${error.message}`);
}
