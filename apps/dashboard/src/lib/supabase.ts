import { createClient } from "@supabase/supabase-js";

// Ensure variables are defined
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

// Read-only client for the dashboard to fetch receipt history securely
export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for Supabase payment_receipts table
export interface PaymentReceipt {
  id: string;
  tx_id: string;
  payer: string;
  payee: string;
  amount: string;
  token: string;
  resource: string;
  settled_at: string;
}
