'use server';

import { createClient } from '@/lib/supabase';

/**
 * Debug function to check Supabase connection
 * Call this from client to see what's happening
 */
export async function debugSupabaseConnection(): Promise<{
  success: boolean;
  details: any;
}> {
  try {
    console.log('[debugSupabaseConnection] Starting...');
    
    // Check environment variables
    const envCheck = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'MISSING',
      anonKeyPreview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) || 'MISSING',
    };
    
    console.log('[debugSupabaseConnection] Environment check:', envCheck);
    
    // Try to create client
    let supabase;
    try {
      supabase = createClient();
      console.log('[debugSupabaseConnection] Client created');
    } catch (error: any) {
      return {
        success: false,
        details: {
          step: 'client_creation',
          error: error.message,
          envCheck,
        },
      };
    }
    
    // Check client structure
    const clientCheck = {
      isNull: supabase === null,
      isUndefined: supabase === undefined,
      type: typeof supabase,
      hasFrom: supabase && 'from' in supabase,
      fromType: supabase && typeof (supabase as any).from,
      isFunction: typeof (supabase as any)?.from === 'function',
      constructor: supabase?.constructor?.name,
      keys: supabase && typeof supabase === 'object' ? Object.keys(supabase).slice(0, 15) : [],
    };
    
    console.log('[debugSupabaseConnection] Client check:', clientCheck);
    
    if (!supabase || typeof supabase.from !== 'function') {
      return {
        success: false,
        details: {
          step: 'client_verification',
          clientCheck,
          envCheck,
        },
      };
    }
    
    // Try a simple query
    try {
      const { data, error } = await supabase
        .from('client_clients')
        .select('id')
        .limit(1);
        
      return {
        success: true,
        details: {
          envCheck,
          clientCheck,
          queryTest: {
            success: !error,
            error: error?.message || null,
            dataCount: data?.length || 0,
          },
        },
      };
    } catch (queryError: any) {
      return {
        success: false,
        details: {
          step: 'query_test',
          error: queryError.message,
          envCheck,
          clientCheck,
        },
      };
    }
  } catch (error: any) {
    console.error('[debugSupabaseConnection] Unexpected error:', error);
    return {
      success: false,
      details: {
        step: 'unexpected_error',
        error: error.message,
        stack: error.stack,
      },
    };
  }
}

