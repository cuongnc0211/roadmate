import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/db/types";

/**
 * Browser Supabase client. Uses the ANON key + RLS.
 * Safe to call from Client Components.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
