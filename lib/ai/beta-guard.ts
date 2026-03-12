import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * רשימת המיילים המורשים לתוכנית הבטא של ה-AI Tower.
 * כרגע פתוח רק למנהל המערכת (איציק).
 */
const BETA_WHITELIST = [
  'itsikdahan1@gmail.com', // איציק דהן
];

/**
 * בודק אם למשתמש הנוכחי יש גישה לתוכנית הבטא.
 */
export async function hasBetaAccess(): Promise<boolean> {
  try {
    const user = await currentUser();
    if (!user) return false;

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) return false;

    return BETA_WHITELIST.includes(email);
  } catch (error) {
    console.error('[BetaGuard] Error checking beta access:', error);
    return false;
  }
}

/**
 * מגן על נתיבים (Routes) בתוכנית הבטא.
 * אם למשתמש אין גישה, הוא יופנה לדף הבית.
 */
export async function enforceBetaAccess() {
  const hasAccess = await hasBetaAccess();
  if (!hasAccess) {
    redirect('/');
  }
}

/**
 * מגן על Server Actions בתוכנית הבטא.
 */
export async function requireBetaAccess() {
  const hasAccess = await hasBetaAccess();
  if (!hasAccess) {
    throw new Error('Access Denied: Beta Program Only');
  }
}
