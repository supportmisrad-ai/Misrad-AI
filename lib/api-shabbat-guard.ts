/**
 * API Shabbat Guard
 * 
 * Wrapper function to protect API routes from being accessed during Shabbat
 */

import { NextRequest, NextResponse } from 'next/server';
import { isShabbatNow } from './shabbat';

/**
 * Wrapper function that blocks API access during Shabbat
 * 
 * Usage:
 * export const GET = shabbatGuard(async (request: NextRequest) => {
 *   // Your handler code
 * });
 */
export function shabbatGuard(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const shabbatCheck = isShabbatNow();
      
      if (shabbatCheck.isShabbat) {
        return NextResponse.json(
          {
            error: 'Shabbat Mode',
            message: 'המערכת לא פעילה בשבת. המערכת תתחיל לפעול לאחר צאת הכוכבים.',
            havdalah: shabbatCheck.havdalah.toISOString(),
            timeUntilHavdalah: calculateTimeUntil(shabbatCheck.havdalah)
          },
          { status: 503 } // Service Unavailable
        );
      }
      
      // Not Shabbat - proceed with the handler
      return handler(req);
    } catch (error: any) {
      console.error('[ShabbatGuard] Error checking Shabbat:', error);
      // If there's an error checking Shabbat, allow the request to proceed
      // (fail open - better to allow access than block everything on error)
      return handler(req);
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
