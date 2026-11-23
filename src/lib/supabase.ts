import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://vbcdopdttqmplwnknppl.supabase.co";

/**
 * Returns the target Supabase URL.
 * In the browser, it routes through window.location.origin + '/supabase'
 * so that requests travel through Vercel's edge proxy, bypassing Myanmar
 * ISP SNI filtering and DNS blocking without requiring a VPN.
 */
export const getSupabaseUrl = (useDirectConnection: boolean = false): string => {
  const directUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  if (typeof window !== "undefined" && !useDirectConnection) {
    return `${window.location.origin}/supabase`;
  }

  return directUrl;
};

export const getSupabaseKey = (): string => {
  if (typeof window !== "undefined") {
    return (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ""
    );
  }

  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
};

export function isSupabaseConfigured(): boolean {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const key = getSupabaseKey();
  return Boolean(url && key);
}

let cachedServerClient: SupabaseClient | null = null;
let cachedBrowserClient: SupabaseClient | null = null;

export function getSupabaseClient(useDirectConnection: boolean = false): SupabaseClient {
  const isBrowser = typeof window !== "undefined";
  const url = getSupabaseUrl(useDirectConnection);
  const key = getSupabaseKey();

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }

  if (isBrowser) {
    if (!cachedBrowserClient) {
      cachedBrowserClient = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    }
    return cachedBrowserClient;
  }

  if (!cachedServerClient) {
    cachedServerClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedServerClient;
}
