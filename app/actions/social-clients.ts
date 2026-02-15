'use server';


import { logger } from '@/lib/server/logger';
import { Client } from '@/types';

import { requireAuth } from '@/lib/errorHandler';

export async function createSocialClient(
  clientData: Partial<Client>,
  clerkUserId: string,
): Promise<{ success: boolean; data?: Client; error?: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.success) {
    return { success: false, error: authCheck.error || 'נדרשת התחברות' };
  }

  logger.error('DEPRECATED', '[createSocialClient] Attempted to write to legacy social_clients. Use createClientForWorkspace (canonical clients) instead.', {
      clerkUserId,
      email: clientData?.email,
    });

  return {
    success: false,
    error: 'createSocialClient is deprecated. Use canonical clients actions (createClientForWorkspace).',
  };
}
