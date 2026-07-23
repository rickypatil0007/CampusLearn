import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Service-role client. Bypasses RLS entirely — use ONLY for operations that
 * have already been authorized in application code (e.g. issuing a signed
 * URL after confirming the caller owns/can-access the resource, or the
 * `handle_new_user`-adjacent admin actions). NEVER import this module from
 * a Client Component; the `server-only` import guarantees a build failure
 * if that ever happens.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
