/**
 * Supabase Admin Client (Service Role Key).
 * Nur für Server-side Ingest-Scripts verwenden – nie im Browser/Edge-Runtime.
 *
 * Setzt SUPABASE_SERVICE_ROLE_KEY und NEXT_PUBLIC_SUPABASE_URL voraus.
 * Läuft gegen .env.local (via dotenv in Scripts).
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase-Credentials fehlen. Bitte NEXT_PUBLIC_SUPABASE_URL und " +
        "SUPABASE_SERVICE_ROLE_KEY in .env.local setzen."
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}
