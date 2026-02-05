/**
 * Server-only auth helper functions
 * This file must only be imported in Server Components or Server Actions
 */

'use server';

/**
 * Get the current user's Clerk ID
 * This function can only be used in Server Components or Server Actions
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    console.log('[getCurrentUserId] Starting Clerk auth check');
    const { auth } = await import('@clerk/nextjs/server');
    const authResult = await auth();
    console.log('[getCurrentUserId] Clerk auth result:', {
      hasUserId: !!authResult?.userId,
      userId: authResult?.userId,
    });
    const userId = authResult?.userId || null;
    console.log('[getCurrentUserId] Final result:', userId);
    return userId;
  } catch (error) {
    console.error('[getCurrentUserId] Error getting current user ID from Clerk:', error);
    return null;
  }
}

