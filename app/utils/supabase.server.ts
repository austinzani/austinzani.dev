import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../db_types";

/**
 * Creates a Supabase client for Remix loaders/actions.
 *
 * When an access token is provided, queries execute in the context of that
 * authenticated user so RLS policies apply as expected.
 */
export function createSupabaseServerClient(accessToken?: string) {
  const options = accessToken
    ? {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    : undefined;

  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    options
  );
}
