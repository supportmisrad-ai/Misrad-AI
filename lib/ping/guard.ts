/**
 * Ping Beta Guard — הגנה על מודול Ping (בטא)
 * 
 * מודול Ping נמצא בבדיקות פנימיות — גישה רק ל-Super Admin (itsikdahan1@gmail.com)
 */

import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * רשימת המיילים המורשים לבטא של Ping
 */
const PING_BETA_WHITELIST = [
  'itsikdahan1@gmail.com',
];

/**
 * בודק אם למשתמש יש גישה לבטא של Ping
 */
export async function hasPingBetaAccess(): Promise<boolean> {
  try {
    const user = await currentUser();
    if (!user) return false;

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) return false;

    return PING_BETA_WHITELIST.includes(email);
  } catch (error) {
    console.error('[PingGuard] שגיאה בבדיקת גישה:', error);
    return false;
  }
}

/**
 * מגן על נתיבים — אם אין גישה, מפנה לדשבורד
 */
export async function enforcePingBetaAccess() {
  const hasAccess = await hasPingBetaAccess();
  if (!hasAccess) {
    redirect('/app/admin');
  }
}

/**
 * מגן על Server Actions — זורק שגיאה אם אין גישה
 */
export async function requirePingBetaAccess() {
  const hasAccess = await hasPingBetaAccess();
  if (!hasAccess) {
    throw new Error('המודול בבדיקות — עדיין לא זמין');
  }
}
