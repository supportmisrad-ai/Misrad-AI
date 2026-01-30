import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

type ClerkTokenProvider = () => Promise<string | null | undefined>;

const ORG_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeBase64UrlToUtf8(input: string): string {
  const b64 = String(input || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');

  if (typeof atob !== 'function') {
    return '';
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function assertClerkSupabaseJwtHasOrganizationId(token: string, context: string) {
  const t = String(token || '').trim();
  if (!t) return;

  const parts = t.split('.');
  if (parts.length < 2) return;

  let payload: any = null;
  try {
    payload = JSON.parse(decodeBase64UrlToUtf8(parts[1]));
  } catch {
    payload = null;
  }

  const orgId = String(payload?.organization_id || payload?.org_id || payload?.orgId || '').trim();
  if (!orgId || !ORG_UUID_REGEX.test(orgId)) {
    throw new Error(
      `[Supabase] חסר/לא תקין organization_id ב-JWT של Clerk שנשלח ל-Supabase (client). Context: ${context}`
    );
  }
}

export function createBrowserClientWithClerk(tokenProvider: ClerkTokenProvider): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('Supabase URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!anonKey) {
    throw new Error('Supabase anon key not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const token = await tokenProvider();
        const headers = new Headers(init?.headers);
        if (token && String(token).length > 0) {
          assertClerkSupabaseJwtHasOrganizationId(String(token), 'browser_client_with_clerk');
          headers.set('Authorization', `Bearer ${token}`);
        }
        return fetch(input, { ...init, headers });
      },
    },
  });
}
