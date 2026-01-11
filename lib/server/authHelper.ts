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
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    return userId || null;
  } catch (error) {
    console.error('Error getting current user ID from Clerk:', error);
    return null;
  }
}

