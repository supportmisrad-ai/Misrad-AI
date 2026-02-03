'use server';

import prisma from '@/lib/prisma';

/**
 * Debug function to check Supabase connection
 * Call this from client to see what's happening
 */
export async function debugSupabaseConnection(): Promise<{
  success: boolean;
  details: any;
}> {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      return {
        success: false,
        details: {
          step: 'blocked',
          error: 'debugSupabaseConnection is blocked in production',
        },
      };
    }

    console.log('[debugSupabaseConnection] Starting...');
    
    // Check environment variables
    const envCheck = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    
    console.log('[debugSupabaseConnection] Environment check:', envCheck);
    
    // Prisma-first: use Prisma to test DB connectivity.
    try {
      const row = await prisma.clientClient.findFirst({ select: { id: true } });
      return {
        success: true,
        details: {
          envCheck,
          prismaTest: {
            success: true,
            sampleId: row?.id ?? null,
          },
        },
      };
    } catch (queryError: any) {
      return {
        success: false,
        details: {
          step: 'prisma_test',
          error: queryError.message,
          envCheck,
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

