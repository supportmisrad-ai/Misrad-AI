import { asObject } from '@/lib/shared/unknown';
/**
 * Centralized error handling
 * Provides consistent error handling across the application
 */

import { translateError } from './errorTranslations';
import { isSupabaseConfigured } from '@/lib/supabase';


export type ActionResult<T = unknown> =
  | { success: true; data: T; error?: undefined; errors?: undefined }
  | { success: false; error: string; data?: undefined; errors?: unknown };

/**
 * Standard error response format
 */
export function createErrorResponse<T = unknown>(error: unknown, defaultMessage: string = 'שגיאה לא צפויה'): ActionResult<T> {
  let errorMessage = defaultMessage;
  
  if (error instanceof Error) {
    errorMessage = translateError(error.message) || error.message || defaultMessage;
  } else if (typeof error === 'string') {
    errorMessage = translateError(error) || error || defaultMessage;
  } else if (error && typeof error === 'object' && 'message' in error) {
    const obj = asObject(error);
    const msg = String(obj?.message || '').trim();
    errorMessage = translateError(msg) || msg || defaultMessage;
  }

  return {
    success: false,
    error: errorMessage,
  };
}

/**
 * Standard success response format
 */
export function createSuccessResponse<T>(data: T): ActionResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Wrapper for async Server Actions with error handling
 */
export async function handleServerAction<T>(
  action: () => Promise<T>,
  errorMessage: string = 'שגיאה בביצוע הפעולה'
): Promise<ActionResult<T>> {
  try {
    const data = await action();
    return createSuccessResponse(data);
  } catch (error) {
    const { logger } = await import('@/lib/server/logger');
    logger.error('handleServerAction', errorMessage, error);
    return createErrorResponse<T>(error, errorMessage);
  }
}

/**
 * Check if user is authenticated
 * Returns ActionResult with userId in data field, or userId directly for convenience
 */
export async function requireAuth(): Promise<ActionResult<{ userId: string }> & { userId?: string }> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: 'נדרשת התחברות',
      };
    }

    return {
      success: true,
      data: { userId },
      userId, // For backward compatibility
    };
  } catch (error) {
    return createErrorResponse<{ userId: string }>(error, 'שגיאה בבדיקת אימות');
  }
}

/**
 * Check if Supabase is configured
 */
export function requireSupabase(): { success: false; error: string } | { success: true } {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase לא מוגדר',
    };
  }

  return { success: true };
}

