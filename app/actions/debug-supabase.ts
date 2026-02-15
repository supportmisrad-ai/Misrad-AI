'use server';


import { logger } from '@/lib/server/logger';
import prisma from '@/lib/prisma';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { requireAuth } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';

/**
 * Debug function to check Supabase connection
 * Call this from client to see what's happening
 */
export async function debugSupabaseConnection(): Promise<{
  success: boolean;
  details: Record<string, unknown>;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return {
        success: false,
        details: {
          step: 'auth',
          error: authCheck.error || 'נדרשת התחברות',
        },
      };
    }

    try {
      await requireSuperAdmin();
    } catch {
      return {
        success: false,
        details: {
          step: 'auth',
          error: 'אין הרשאה',
        },
      };
    }

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

    logger.debug('debugSupabaseConnection', 'Starting...');
    
    // Check environment variables
    const envCheck = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    
    logger.debug('debugSupabaseConnection', 'Environment check:', envCheck);
    
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
    } catch (queryError: unknown) {
      const qObj = asObject(queryError);
      const stack = queryError instanceof Error ? queryError.stack : typeof qObj?.stack === 'string' ? qObj.stack : null;
      return {
        success: false,
        details: {
          step: 'prisma_test',
          error: getErrorMessage(queryError),
          stack,
          envCheck,
        },
      };
    }
  } catch (error: unknown) {
    const eObj = asObject(error);
    const stack = error instanceof Error ? error.stack : typeof eObj?.stack === 'string' ? eObj.stack : null;
    logger.error('debugSupabaseConnection', 'Unexpected error:', error);
    return {
      success: false,
      details: {
        step: 'unexpected_error',
        error: getErrorMessage(error),
        stack,
      },
    };
  }
}

