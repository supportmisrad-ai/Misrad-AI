import prisma from '@/lib/prisma';
import { isSupabaseConfigured } from './supabase';

/**
 * Get or create user in Supabase users table from Clerk user ID
 * Returns the UUID of the user in Supabase
 */
export async function getOrCreateSupabaseUser(
  clerkUserId: string, 
  email?: string, 
  fullName?: string,
  imageUrl?: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured');
    return null;
  }

  try {
    const now = new Date();

    const existingUser = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: clerkUserId },
      select: { id: true, avatar_url: true },
    });

    if (existingUser?.id) {
      if (imageUrl && existingUser.avatar_url !== imageUrl) {
        await prisma.organizationUser.update({
          where: { clerk_user_id: clerkUserId },
          data: {
            ...(email ? { email: String(email).trim().toLowerCase() } : {}),
            ...(fullName ? { full_name: String(fullName) } : {}),
            avatar_url: String(imageUrl),
            updated_at: now,
          },
        });
      }
      return String(existingUser.id);
    }

    const newUser = await prisma.organizationUser.create({
      data: {
        clerk_user_id: clerkUserId,
        email: email ? String(email).trim().toLowerCase() : null,
        full_name: fullName ? String(fullName) : null,
        avatar_url: imageUrl ? String(imageUrl) : null,
        organization_id: null,
        role: 'owner',
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });

    return newUser?.id ? String(newUser.id) : null;
  } catch (error) {
    console.error('Error in getOrCreateSupabaseUser:', error);
    return null;
  }
}
