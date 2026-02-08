import prisma from '@/lib/prisma';

export async function saveGoogleTokensForOrganizationUser(params: {
  organizationUserId: string;
  integrationName: 'google_calendar' | 'google_drive' | 'google_sheets';
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope?: string;
}): Promise<void> {
  const organizationUserId = String(params.organizationUserId || '').trim();
  if (!organizationUserId) throw new Error('Missing organizationUserId');

  const integrationName = params.integrationName;
  const accessToken = String(params.accessToken || '');
  const refreshToken = String(params.refreshToken || '');
  const expiresAt = params.expiresAt;
  const scope = typeof params.scope === 'string' ? params.scope : '';

  const tokenRow = await prisma.social_oauth_tokens.findFirst({
    where: { user_id: organizationUserId, integration_name: integrationName },
    select: { id: true },
  });

  if (tokenRow?.id) {
    await prisma.social_oauth_tokens.updateMany({
      where: { id: tokenRow.id },
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope,
        updated_at: new Date(),
      },
    });
  } else {
    await prisma.social_oauth_tokens.create({
      data: {
        user_id: organizationUserId,
        integration_name: integrationName,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  await prisma.social_integration_status.upsert({
    where: { name: integrationName },
    create: { name: integrationName, is_connected: true, last_sync: new Date(), created_at: new Date(), updated_at: new Date() },
    update: { is_connected: true, last_sync: new Date(), updated_at: new Date() },
  });
}
