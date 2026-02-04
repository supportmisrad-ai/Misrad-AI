'use server';

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { MisradNotificationType } from '@prisma/client';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

function isMissingOrganizationIdColumnError(err: any): boolean {
  const message = String(err?.message || '').toLowerCase();
  const code = String((err as any)?.code || '').toLowerCase();
  return code === '42703' || (message.includes('column') && message.includes('organization_id'));
}

async function resolveOrganizationIdForNotification(params: {
  targetType: 'user' | 'client' | 'all';
  targetId: string | null;
}): Promise<string | null> {
  if (params.targetType === 'all') return null;
  const id = params.targetId ? String(params.targetId).trim() : '';
  if (!id) return null;

  if (params.targetType === 'user') {
    const row = await prisma.nexusUser.findFirst({
      where: { id },
      select: { organizationId: true },
    });
    const orgId = row?.organizationId ? String(row.organizationId) : null;
    return orgId && orgId.trim() ? orgId.trim() : null;
  }

  // targetType === 'client'
  // Try portal client table first
  const portal = await prisma.clientClient.findFirst({
    where: { id },
    select: { organizationId: true },
  });
  const portalOrg = portal?.organizationId ? String(portal.organizationId) : '';
  if (portalOrg.trim()) return portalOrg.trim();

  // Fallback to canonical clients
  const canonical = await prisma.clients.findFirst({
    where: { id } as any,
    select: { organization_id: true },
  });
  const canonicalOrg = canonical?.organization_id ? String(canonical.organization_id) : '';
  return canonicalOrg.trim() ? canonicalOrg.trim() : null;
}

async function requireOrganizationIdFromOrgSlug(orgSlug: string): Promise<string> {
  const resolvedOrgSlug = String(orgSlug || '').trim();
  if (!resolvedOrgSlug) throw new Error('Missing orgSlug');
  const workspace = await requireWorkspaceAccessByOrgSlugApi(resolvedOrgSlug);
  const organizationId = String(workspace?.id || '').trim();
  if (!organizationId) throw new Error('Missing organizationId');
  return organizationId;
}

function mapUiNotificationType(type: 'info' | 'warning' | 'error' | 'success'): MisradNotificationType {
  if (type === 'success') return MisradNotificationType.SUCCESS;
  if (type === 'warning') return MisradNotificationType.ALERT;
  if (type === 'error') return MisradNotificationType.ALERT;
  return MisradNotificationType.MESSAGE;
}

/**
 * Send notification to users/clients
 */
export async function sendNotification(
  orgSlug: string,
  targetType: 'user' | 'client' | 'all',
  targetId: string | null,
  title: string,
  message: string,
  type: 'info' | 'warning' | 'error' | 'success' = 'info'
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const now = new Date();
    const nowIso = now.toISOString();

    const organizationIdForTarget = await resolveOrganizationIdForNotification({
      targetType,
      targetId,
    });

    const fallbackOrganizationId = await requireOrganizationIdFromOrgSlug(orgSlug);
    const organizationId = String(organizationIdForTarget || fallbackOrganizationId).trim();
    if (!organizationId) {
      return createErrorResponse(new Error('Missing organization_id'), 'ארגון לא נמצא');
    }

    await prisma.misradNotification.create({
      data: {
        organization_id: organizationId,
        client_id: targetType === 'client' && targetId ? String(targetId) : null,
        recipient_id: targetType === 'user' && targetId ? String(targetId) : null,
        type: mapUiNotificationType(type),
        title: String(title || ''),
        message: String(message || ''),
        timestamp: nowIso,
        isRead: false,
        link: null,
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשליחת התראה');
  }
}

/**
 * Get notification history
 */
export async function getNotificationHistory(params?: {
  orgSlug: string;
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const limit = Math.max(1, Math.min(200, Number(params?.limit ?? 50)));
    const offset = Math.max(0, Number(params?.offset ?? 0));

    const organizationId = await requireOrganizationIdFromOrgSlug(String(params?.orgSlug || ''));

    const notifications = await prisma.misradNotification.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
    });

    return createSuccessResponse(notifications || []);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת היסטוריית התראות');
  }
}

