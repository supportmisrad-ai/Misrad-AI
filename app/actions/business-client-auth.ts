'use server';

/**
 * Business Client Authentication Actions
 * Handles magic link generation and verification for business clients
 */

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { ActionResult } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import * as Sentry from '@sentry/nextjs';

function captureActionException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'server_action');
    scope.setTag('domain', 'business_client_auth');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

export type BusinessClientAuthData = {
  businessClientId: string;
  businessClientName: string;
  organizationName: string;
};

/**
 * Generate a magic link token for a business client
 * Only accessible by Super Admin
 */
export async function generateBusinessClientMagicLink(
  businessClientId: string
): Promise<ActionResult<{ token: string; expiresAt: Date; magicLink: string }>> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', authCheck.error || 'נדרשת התחברות');
    }

    await requireSuperAdmin();

    // Verify business client exists
    const businessClient = await prisma.businessClient.findUnique({
      where: { id: businessClientId },
      select: {
        id: true,
        company_name: true,
        primary_email: true,
      },
    });

    if (!businessClient) {
      return createErrorResponse(new Error('Business client not found'), 'לקוח עסקי לא נמצא');
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store token in database (TODO: Create migration for BusinessClientToken table)
    // For now, we'll use a simple approach - store in a JSON field or create the table
    // This is a placeholder - needs actual table creation
    throw new Error('BusinessClientToken table not yet created - please run migration first');

    const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/business-client/${token}`;

    return createSuccessResponse({ token, expiresAt, magicLink });
  } catch (error: unknown) {
    captureActionException(error, {
      action: 'generateBusinessClientMagicLink',
      businessClientId: String(businessClientId),
    });
    return createErrorResponse(error, 'שגיאה ביצירת קישור גישה');
  }
}

/**
 * Verify a business client magic link token
 * Public access (no auth required)
 */
export async function verifyBusinessClientToken(
  token: string
): Promise<ActionResult<BusinessClientAuthData>> {
  try {
    if (!token || typeof token !== 'string') {
      return createErrorResponse(new Error('Invalid token'), 'טוקן לא תקין');
    }

    // Find valid token (TODO: Implement after table creation)
    // Placeholder for now - this function is not yet implemented
    throw new Error('BusinessClientToken table not yet created - please run migration first');
  } catch (error: unknown) {
    captureActionException(error, {
      action: 'verifyBusinessClientToken',
      token: String(token).substring(0, 10) + '...',
    });
    return createErrorResponse(error, 'שגיאה באימות קישור');
  }
}
