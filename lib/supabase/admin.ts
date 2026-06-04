import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type SupabaseAdminClient = ReturnType<typeof createClient<Database>>;

let supabaseAdmin: SupabaseAdminClient | null = null;

export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role miljøvariabler mangler.");
  }

  supabaseAdmin ??= createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdmin;
}
