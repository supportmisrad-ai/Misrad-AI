import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { asObject } from '@/lib/shared/unknown';

type ClerkTokenProvider = () => Promise<string | null | undefined>;

export type SupabaseBrowserStorageClient = Pick<SupabaseClient, 'storage'>;

// ---------------------------------------------------------------------------
// globalThis-based singleton registry.
// Next.js App Router can bundle the same module into multiple webpack chunks
// (one per 'use client' boundary). Module-level `let` variables are separate
// per chunk copy, so a plain module singleton does NOT prevent duplicate
// GoTrueClient instances.  Symbol.for() returns the same symbol across ALL
// module copies, making globalThis slots truly shared within a browser tab.
// ---------------------------------------------------------------------------
declare global {
   
  var __MISRAD_SUPABASE_CLIENT__: SupabaseClient | undefined;
   
  var __MISRAD_SUPABASE_TOKEN_PROVIDER__: ClerkTokenProvider | undefined;
   
  var __MISRAD_SUPABASE_STORAGE__: SupabaseBrowserStorageClient | undefined;
}

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

// ---------------------------------------------------------------------------
// Singleton: one GoTrueClient per browser tab.
// Uses globalThis slots (declared above) so the singleton survives across
// multiple webpack chunk copies of this module.
// The tokenProvider is kept as a mutable ref so the fetch wrapper always
// resolves the latest Clerk token without recreating the Supabase client.
// ---------------------------------------------------------------------------

export function createBrowserClientWithClerk(tokenProvider: ClerkTokenProvider): SupabaseClient {
  // Always update the token provider ref so the latest getToken is used —
  // even if this module copy is different from the one that created the client.
  globalThis.__MISRAD_SUPABASE_TOKEN_PROVIDER__ = tokenProvider;

  if (globalThis.__MISRAD_SUPABASE_CLIENT__) {
    return globalThis.__MISRAD_SUPABASE_CLIENT__;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('Supabase URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!anonKey) {
    throw new Error('Supabase anon key not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  globalThis.__MISRAD_SUPABASE_CLIENT__ = createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const resolve = globalThis.__MISRAD_SUPABASE_TOKEN_PROVIDER__ ?? (async () => null);
        const token = await resolve();
        const headers = new Headers(init?.headers);
        if (token && String(token).length > 0) {
          // Skip organization_id assertion for storage operations (presigned URL
          // uploads/downloads) — the signed token already grants access and RLS
          // is not involved for storage endpoints.
          const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
          const isStorageOp = urlStr.includes('/storage/') || urlStr.includes('/object/');
          if (!isStorageOp) {
            assertClerkSupabaseJwtHasOrganizationId(String(token), 'browser_client_with_clerk');
          }
          headers.set('Authorization', `Bearer ${token}`);
        }
        return fetch(input, { ...init, headers });
      },
    },
  });

  return globalThis.__MISRAD_SUPABASE_CLIENT__;
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
  // Delegate to createBrowserClientWithClerk which updates the token ref.
  const client = createBrowserClientWithClerk(tokenProvider);

  if (globalThis.__MISRAD_SUPABASE_STORAGE__) {
    return globalThis.__MISRAD_SUPABASE_STORAGE__;
  }

  globalThis.__MISRAD_SUPABASE_STORAGE__ = wrapBrowserStorageOnlyClient(client, 'createBrowserStorageClientWithClerk');
  return globalThis.__MISRAD_SUPABASE_STORAGE__;
}
