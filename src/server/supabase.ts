import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { serverEnv } from "./env";

let publicClient: SupabaseClient | null = null;

/**
 * Anonymous client for public catalog reads. It sends no cookies, so pages that use only this
 * client can be statically rendered and revalidated (ISR). Row Level Security limits it to what any
 * shopper may see.
 */
export function createPublicClient(): SupabaseClient {
  if (publicClient) return publicClient;
  const env = serverEnv();
  publicClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return publicClient;
}

/** Client acting as the signed-in shopper (reads the Supabase auth cookies). Makes the route dynamic. */
export async function createSessionClient(): Promise<SupabaseClient> {
  const env = serverEnv();
  const store = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are refreshed by the next Server Action or Route Handler.
        }
      },
    },
  });
}

/** Service-role client that bypasses RLS. Server-only (guest carts, jobs); never pass its results to the browser unfiltered. */
export function createServiceClient(): SupabaseClient {
  const env = serverEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
