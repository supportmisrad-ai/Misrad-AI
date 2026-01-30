/**
 * API Shabbat Guard
 * 
 * Wrapper function to protect API routes from being accessed during Shabbat
 */

import { isShabbatNow } from './shabbat';
import { apiError } from '@/lib/server/api-response';

/**
 * Wrapper function that blocks API access during Shabbat
 * 
 * Usage:
 * export const GET = shabbatGuard(async (request: NextRequest) => {
 *   // Your handler code
 * });
 */
export function shabbatGuard<TArgs extends unknown[]>(handler: (...args: TArgs) => Promise<Response>) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      const shabbatCheck = isShabbatNow();
      
      if (shabbatCheck.isShabbat) {
        return apiError('Shabbat Mode', {
          status: 503,
          message: 'המערכת לא פעילה בשבת. המערכת תתחיל לפעול לאחר צאת הכוכבים.',
        });
      }
      
      // Not Shabbat - proceed with the handler
      return handler(...args);
    } catch (error: unknown) {
      console.error('[ShabbatGuard] Error checking Shabbat:', error);
      // Fail closed: do not allow system activity if we cannot determine Shabbat state.
      return apiError(error, {
        status: 503,
        message: 'המערכת לא פעילה בשבת. המערכת תתחיל לפעול לאחר צאת הכוכבים.',
      });
    }
  };
}

/**
 * Calculate time until a specific date
 */
function calculateTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) return '0 דקות';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours} שעות ו-${minutes} דקות`;
  }
  return `${minutes} דקות`;
}
