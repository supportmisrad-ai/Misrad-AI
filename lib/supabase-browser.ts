import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { asObject } from '@/lib/shared/unknown';

type ClerkTokenProvider = () => Promise<string | null | undefined>;

export type SupabaseBrowserStorageClient = Pick<SupabaseClient, 'storage'>;

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

  let payload: unknown = null;
  try {
    payload = JSON.parse(decodeBase64UrlToUtf8(parts[1])) as unknown;
  } catch {
    payload = null;
  }

  const obj = asObject(payload);
  const orgId = String(obj?.organization_id || obj?.org_id || obj?.orgId || '').trim();
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

function wrapBrowserStorageOnlyClient(client: SupabaseClient, label: string): SupabaseBrowserStorageClient {
  const clientObj = asObject(client) ?? {};
  const originalFrom = clientObj.from;
  const originalRpc = clientObj.rpc;
  const originalSchema = clientObj.schema;
  const originalRest = clientObj.rest;

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from' && typeof originalFrom === 'function') {
        return (table: string) => {
          throw new Error(
            '[Supabase] Browser storage-only client: PostgREST .from(...) is blocked. ' +
              `label=${String(label)} table=${String(table || '')}`
          );
        };
      }

      if (prop === 'rpc' && typeof originalRpc === 'function') {
        return (fn: string) => {
          throw new Error(
            '[Supabase] Browser storage-only client: PostgREST .rpc(...) is blocked. ' +
              `label=${String(label)} rpc=${String(fn || '')}`
          );
        };
      }

      if (prop === 'schema' && typeof originalSchema === 'function') {
        return (schema: string) => {
          throw new Error(
            '[Supabase] Browser storage-only client: PostgREST .schema(...) is blocked. ' +
              `label=${String(label)} schema=${String(schema || '')}`
          );
        };
      }

      if (prop === 'rest' && originalRest) {
        throw new Error('[Supabase] Browser storage-only client: PostgREST rest client is blocked. ' + `label=${String(label)}`);
      }

      return Reflect.get(target, prop, receiver);
    },
  }) as SupabaseBrowserStorageClient;
}

export function createBrowserStorageClientWithClerk(tokenProvider: ClerkTokenProvider): SupabaseBrowserStorageClient {
  const client = createBrowserClientWithClerk(tokenProvider);
  return wrapBrowserStorageOnlyClient(client, 'createBrowserStorageClientWithClerk');
}
