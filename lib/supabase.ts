import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const DEBUG_SUPABASE = process.env.DEBUG_SUPABASE === 'true';

function supabaseDebugLog(...args: any[]) {
  if (DEBUG_SUPABASE) console.log(...args);
}

function supabaseDebugWarn(...args: any[]) {
  if (DEBUG_SUPABASE) console.warn(...args);
}

// Type guard to verify Supabase client
function isValidSupabaseClient(client: any): client is SupabaseClient {
  return (
    client !== null &&
    client !== undefined &&
    typeof client === 'object' &&
    typeof client.from === 'function'
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Service Role key for server-side operations (bypasses RLS)
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client only if environment variables are set (client-side)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createSupabaseClient(supabaseUrl, supabaseAnonKey)
  : null;

type ClerkTokenProvider = () => Promise<string | null | undefined>;

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
          headers.set('Authorization', `Bearer ${token}`);
        }
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    const error = new Error('Supabase URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL');
    console.error('[Supabase]', error.message);
    throw error;
  }

  if (!serviceKey) {
    const error = new Error('Supabase SERVICE_ROLE key not configured. Please set SUPABASE_SERVICE_ROLE_KEY');
    console.error('[Supabase]', error.message);
    throw error;
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Helper function to create a new Supabase client (for server-side use)
// Uses Service Role key to bypass RLS when available, falls back to anon key
export function createClient(): SupabaseClient {
  // Read environment variables fresh each time (important for Server Actions)
  // This ensures we always get the latest values, even if .env.local was updated
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url) {
    const error = new Error('Supabase URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL');
    console.error('[Supabase]', error.message);
    throw error;
  }
  
  // Use Service Role key if available (bypasses RLS - recommended for server-side)
  // Otherwise fall back to anon key (subject to RLS)
  const key = serviceKey || anonKey;
  const usingServiceRole = !!serviceKey;
  
  if (!key) {
    const error = new Error('Supabase keys not configured. Please set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('[Supabase]', error.message);
    console.error('[Supabase] Available env vars:', {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
      hasAnonKey: !!anonKey,
    });
    throw error;
  }
  
  // Log which key is being used (for debugging)
  if (usingServiceRole) {
    supabaseDebugLog('[Supabase] Using SERVICE_ROLE key (bypasses RLS)');
  } else {
    supabaseDebugWarn('[Supabase] Using ANON key (subject to RLS) - Server Actions should use SERVICE_ROLE key!');
  }
  
  // Validate key format
  if (key.length < 20) {
    const error = new Error(`Supabase key is too short (${key.length} chars). Expected at least 20 characters.`);
    console.error('[Supabase]', error.message);
    throw error;
  }
  
  try {
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error(`Invalid Supabase URL format: ${url.substring(0, 50)}`);
    }
    
    // Create the client with minimal options first
    let client: any;
    try {
      // Try creating client with minimal config
      supabaseDebugLog('[Supabase] Attempting to create client with URL and key...');
      supabaseDebugLog('[Supabase] URL length:', url.length);
      supabaseDebugLog('[Supabase] Key length:', key.length);
      supabaseDebugLog('[Supabase] Key starts with:', key.substring(0, 10));
      
      client = createSupabaseClient(url, key);
      
      // Immediately verify the client structure
      if (!client) {
        throw new Error('createSupabaseClient returned null or undefined. Check your Supabase URL and key.');
      }
      
      supabaseDebugLog('[Supabase] Client created, type:', typeof client, 'has from:', typeof client?.from);
      
      // If that works, verify it has .from method
      if (!client || typeof client.from !== 'function') {
        supabaseDebugWarn('[Supabase] Client missing .from(), trying with auth options...');
        // Try with options
        client = createSupabaseClient(url, key, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        supabaseDebugLog('[Supabase] Client recreated with options, has from:', typeof client?.from);
        
        // Verify again after recreation
        if (!client || typeof client.from !== 'function') {
          throw new Error('Supabase client creation succeeded but result is invalid. This usually means the API key is incorrect or the server needs to be restarted after changing environment variables.');
        }
      }
    } catch (createError: any) {
      console.error('[Supabase] createSupabaseClient threw error:', createError);
      console.error('[Supabase] Error stack:', createError.stack);
      
      // Check if this might be an environment variable issue
      if (createError.message?.includes('invalid') || createError.message?.includes('key')) {
        throw new Error(`Failed to create Supabase client: ${createError.message}. Please verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file, then restart the dev server.`);
      }
      
      throw new Error(`Failed to create Supabase client: ${createError.message}`);
    }
    
    // Verify the client is valid using type guard
    const isValid = isValidSupabaseClient(client);
    supabaseDebugLog('[Supabase] Type guard validation result:', isValid);
    supabaseDebugLog('[Supabase] Client validation details:', {
      isNull: client === null,
      isUndefined: client === undefined,
      type: typeof client,
      isObject: typeof client === 'object',
      hasFrom: client && 'from' in client,
      fromType: client && typeof (client as any).from,
      isFunction: client && typeof (client as any).from === 'function',
      constructor: client?.constructor?.name,
    });
    
    if (!isValid) {
      // Log the client structure for debugging
      console.error('[Supabase] Invalid client structure:', {
        isNull: client === null,
        isUndefined: client === undefined,
        type: typeof client,
        isObject: typeof client === 'object',
        hasFrom: client && 'from' in client,
        fromType: client && typeof (client as any).from,
        fromValue: client && (client as any).from,
        keys: client && typeof client === 'object' ? Object.keys(client).slice(0, 20) : 'N/A',
        constructor: client?.constructor?.name,
        clientPreview: client ? JSON.stringify(Object.keys(client).slice(0, 10)) : 'N/A',
      });
      
      // Provide helpful error message
      const errorMsg = 'Invalid Supabase client: missing .from() method. This usually means:\n' +
        '1. The NEXT_PUBLIC_SUPABASE_ANON_KEY is incorrect or incomplete\n' +
        '2. The dev server needs to be restarted after changing .env.local\n' +
        '3. The Supabase package version might be incompatible\n' +
        '\nPlease check your environment variables and restart the dev server.';
      
      throw new Error(errorMsg);
    }
    
    supabaseDebugLog('[Supabase] Client validated successfully, has .from() method');
    
    return client as SupabaseClient;
  } catch (error: any) {
    console.error('[Supabase] Error creating client:', {
      message: error?.message,
      name: error?.name,
    });
    console.error('[Supabase] URL:', url ? `${url.substring(0, 30)}...` : 'MISSING');
    console.error('[Supabase] Key type:', serviceKey ? 'Service Role' : (anonKey ? 'Anon' : 'NONE'));
    throw new Error(`Failed to create Supabase client: ${error.message}`);
  }
}

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && (!!supabaseServiceRoleKey || !!supabaseAnonKey);
}

// Helper to test Supabase connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = createClient();
    // Simple query to test connection
    const { error } = await client.from('_prisma_migrations').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('[Supabase] Connection test failed:', {
      message: (error as any)?.message,
      name: (error as any)?.name,
    });
    return false;
  }
}

// Note: getCurrentUserId() was moved to @/lib/server/authHelper.ts
// to avoid 'server-only' import issues in client components

