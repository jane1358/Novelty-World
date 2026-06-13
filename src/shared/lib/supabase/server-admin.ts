import { createClient } from "@supabase/supabase-js";

/** Server-only Supabase client authenticated with the service-role key.
 *  Bypasses RLS, so it must never be imported into client code — keep it to
 *  route handlers and server actions. It's the single authoritative writer
 *  for game tables locked read-only at the RLS layer (see supabase/*.sql).
 *
 *  No session persistence: route handlers are stateless and there is no user
 *  auth to carry — the service role is the identity. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
