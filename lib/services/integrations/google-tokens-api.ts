import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { getOrCreateOrganizationUserByClerkUserId } from '@/lib/services/social-users';
import { saveGoogleTokensForOrganizationUser } from '@/lib/services/integrations/google-tokens';

export async function saveGoogleTokensApi(
  integrationName: 'google_calendar' | 'google_drive' | 'google_sheets',
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
  scope?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const userResult = await getOrCreateOrganizationUserByClerkUserId(userId);
    if (!userResult.success || !userResult.userId) {
      return { success: false, error: userResult.error || 'שגיאה בקבלת משתמש' };
    }

    await saveGoogleTokensForOrganizationUser({
      organizationUserId: String(userResult.userId),
      integrationName,
      accessToken,
      refreshToken,
      expiresAt,
      scope,
    });

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    return { success: false, error: message || 'שגיאה בשמירת טוקנים' };
  }
}
