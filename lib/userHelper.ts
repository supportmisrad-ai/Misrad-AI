import { supabase, isSupabaseConfigured } from './supabase';

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
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured');
    return null;
  }

  try {
    // First, try to find existing user
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, avatar_url')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (existingUser && !findError) {
      // Update avatar_url if provided and different
      if (imageUrl && existingUser.avatar_url !== imageUrl) {
        await supabase
          .from('users')
          .update({ avatar_url: imageUrl })
          .eq('id', existingUser.id);
      }
      return existingUser.id;
    }

    // If not found, create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: clerkUserId,
        email: email,
        full_name: fullName,
        avatar_url: imageUrl,
      })
      .select('id')
      .single();

    if (createError || !newUser) {
      console.error('Error creating user:', {
        error: createError,
        code: createError?.code,
        message: createError?.message,
        details: createError?.details,
        hint: createError?.hint,
      });
      return null;
    }

    return newUser.id;
  } catch (error) {
    console.error('Error in getOrCreateSupabaseUser:', error);
    return null;
  }
}

