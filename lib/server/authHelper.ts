/**
 * Server-only auth helper functions
 * This file can be imported in Server Components, Server Actions, and API Routes
 */

import { auth } from '@clerk/nextjs/server';

/**
 * Get the current user's Clerk ID
 * Works in Server Components, Server Actions, and API Routes
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId || null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error getting current user ID from Clerk:', error);
    } else {
      const msg = error instanceof Error ? error.message : '';
      console.error('Error getting current user ID from Clerk:', msg || 'Unknown error');
    }
    return null;
  }
}

/**
 * Get the current user's Clerk ID specifically for API routes
 * Alternative approach for API routes if the main one doesn't work
 */
export async function getCurrentUserIdFromRequest(request?: Request): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId || null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error getting current user ID from request:', error);
    }
    return null;
  }
}

