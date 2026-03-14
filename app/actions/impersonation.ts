'use server';

/**
 * Server Actions למנגנון התחזות מאובטח עם OTP
 * 
 * תהליך:
 * 1. אדמין לוחץ "התחזות" → נפתח מודל אישור
 * 2. אדמין מאשר → נשלח מייל עם קוד OTP ללקוח
 * 3. הלקוח מעביר את הקוד לאדמין (טלפונית/בכתב)
 * 4. אדמין מזין את הקוד → נוצר session ומועבר למרחב העבודה
 * 
 * כל פעולה מתועדת ב-ImpersonationAuditLog
 */

import { randomUUID, randomInt } from 'crypto';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { requireAuth, createSuccessResponse, createErrorResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import { sendImpersonationOtpEmail } from '@/lib/emails/impersonation-otp';
import { logger } from '@/lib/server/logger';
import { asObject } from '@/lib/shared/unknown';

const OTP_LENGTH = 6;
const OTP_EXPIRES_MINUTES = 10;
const SESSION_EXPIRES_HOURS = 1;

// ─── Audit Log Helper ─────────────────────────────────────────

async function logImpersonationAction(params: {
  sessionId: string;
  adminUserId: string;
  clientId: string;
  organizationId?: string;
  action: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null;
    const userAgent = headersList.get('user-agent') || null;

    await prisma.impersonationAuditLog.create({
      data: {
        session_id: params.sessionId,
        admin_user_id: params.adminUserId,
        client_id: params.clientId,
        organization_id: params.organizationId || null,
        action: params.action,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      },
    });
  } catch (error) {
    logger.warn('logImpersonationAction', 'Failed to log action:', error);
  }
}

// ─── Generate OTP Code ────────────────────────────────────────

function generateOtpCode(): string {
  // Generate 6-digit code
  let code = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += randomInt(0, 10).toString();
  }
  return code;
}

// ─── Step 1: Initiate Impersonation (Send OTP) ─────────────────

export type InitiateImpersonationResult = {
  success: boolean;
  sessionId?: string;
  clientEmail?: string;
  clientName?: string;
  error?: string;
};

export async function initiateImpersonation(clientId: string): Promise<InitiateImpersonationResult> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    // Get client info
    const client = await prisma.clientClient.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        email: true,
        metadata: true,
        organization: {
          select: { name: true, slug: true },
        },
      },
    });

    if (!client?.id) {
      return { success: false, error: 'לקוח לא נמצא' };
    }

    const organizationId = client.organizationId ? String(client.organizationId) : '';
    if (!organizationId) {
      return { success: false, error: 'לקוח ללא ארגון - לא ניתן להתחזות אליו' };
    }

    // Get client email from metadata or direct field
    const md = asObject(client.metadata) ?? {};
    const clientEmail = String(md.email || client.email || '');
    if (!clientEmail || !clientEmail.includes('@')) {
      return { success: false, error: 'ללקוח אין כתובת מייל תקינה לשליחת קוד אימות' };
    }

    const clientName = String(md.companyName || md.name || client.fullName || 'לקוח');

    // Generate OTP
    const otpCode = generateOtpCode();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    // Create pending session
    const sessionId = randomUUID();
    const token = randomUUID();

    await prisma.impersonationSession.create({
      data: {
        id: sessionId,
        admin_user_id: String(authCheck.userId),
        client_id: clientId,
        token,
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt,
        expires_at: new Date(Date.now() + SESSION_EXPIRES_HOURS * 60 * 60 * 1000),
        status: 'PENDING_OTP',
      },
    });

    // Get admin name for email - find by clerkUserId
    const adminProfile = await prisma.profile.findFirst({
      where: { clerkUserId: String(authCheck.userId) },
      select: { fullName: true },
    });
    const adminName = adminProfile?.fullName || 'נציג תמיכה';

    // Send OTP email to client
    const emailResult = await sendImpersonationOtpEmail({
      toEmail: clientEmail,
      clientName,
      otpCode,
      organizationName: client.organization?.name || 'הארגון',
      adminName,
    });

    if (!emailResult.success) {
      // Delete the session if email failed
      await prisma.impersonationSession.delete({ where: { id: sessionId } });
      return { success: false, error: 'שגיאה בשליחת מייל האימות: ' + (emailResult.error || 'שגיאה לא ידועה') };
    }

    // Update status to OTP_SENT
    await prisma.impersonationSession.update({
      where: { id: sessionId },
      data: { status: 'OTP_SENT' },
    });

    // Log the action
    await logImpersonationAction({
      sessionId,
      adminUserId: String(authCheck.userId),
      clientId,
      organizationId,
      action: 'OTP_SENT',
      metadata: { clientEmail: clientEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') },
    });

    return {
      success: true,
      sessionId,
      clientEmail: clientEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Masked for UI
      clientName,
    };
  } catch (error) {
    logger.error('initiateImpersonation', 'Error:', error);
    return createErrorResponse(error, 'שגיאה ביצירת בקשת התחזות');
  }
}

// ─── Step 2: Verify OTP and Complete Impersonation ─────────────

export type VerifyOtpResult = {
  success: boolean;
  token?: string;
  orgSlug?: string;
  error?: string;
  remainingAttempts?: number;
};

export async function verifyImpersonationOtp(
  sessionId: string,
  otpCode: string
): Promise<VerifyOtpResult> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    // Find the session and get client/org info separately
    const session = await prisma.impersonationSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        admin_user_id: true,
        client_id: true,
        token: true,
        otp_code: true,
        otp_expires_at: true,
        otp_verified_at: true,
        status: true,
      },
    });

    if (!session) {
      return { success: false, error: 'בקשת התחזות לא נמצאה' };
    }

    // Get client and organization info
    const client = await prisma.clientClient.findUnique({
      where: { id: session.client_id },
      select: {
        organizationId: true,
        organization: { select: { slug: true } },
      },
    });

    // Verify admin is the same who initiated
    if (session.admin_user_id !== authCheck.userId) {
      return { success: false, error: 'אינך מורשה לאמת בקשה זו' };
    }

    // Check if already verified
    if (session.otp_verified_at || session.status === 'ACTIVE') {
      return { success: false, error: 'קוד זה כבר אומת בעבר' };
    }

    // Check if expired
    if (session.status === 'EXPIRED' || (session.otp_expires_at && new Date() > session.otp_expires_at)) {
      await prisma.impersonationSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      return { success: false, error: 'פג תוקף הקוד. יש לבקש קוד חדש.' };
    }

    // Verify OTP code
    if (session.otp_code !== otpCode) {
      // Log failed attempt
      await logImpersonationAction({
        sessionId,
        adminUserId: String(authCheck.userId),
        clientId: session.client_id,
        organizationId: client?.organizationId || undefined,
        action: 'OTP_VERIFY_FAILED',
        metadata: { reason: 'invalid_code' },
      });

      return { success: false, error: 'קוד אימות שגוי. נסה שוב.' };
    }

    // OTP is valid - activate session
    await prisma.impersonationSession.update({
      where: { id: sessionId },
      data: {
        otp_verified_at: new Date(),
        status: 'ACTIVE',
      },
    });

    const orgSlug = client?.organization?.slug;

    // Log successful verification
    await logImpersonationAction({
      sessionId,
      adminUserId: String(authCheck.userId),
      clientId: session.client_id,
      organizationId: client?.organizationId || undefined,
      action: 'OTP_VERIFIED',
    });

    // Log session start
    await logImpersonationAction({
      sessionId,
      adminUserId: String(authCheck.userId),
      clientId: session.client_id,
      organizationId: client?.organizationId || undefined,
      action: 'SESSION_STARTED',
    });

    return {
      success: true,
      token: session.token,
      orgSlug: orgSlug || undefined,
    };
  } catch (error) {
    logger.error('verifyImpersonationOtp', 'Error:', error);
    return createErrorResponse(error, 'שגיאה באימות הקוד');
  }
}

// ─── Cancel Impersonation ─────────────────────────────────────

export async function cancelImpersonation(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    const session = await prisma.impersonationSession.findUnique({
      where: { id: sessionId },
      select: { id: true, admin_user_id: true, client_id: true, status: true },
    });

    if (!session) {
      return { success: false, error: 'בקשה לא נמצאה' };
    }

    // Get client organization
    const client = await prisma.clientClient.findUnique({
      where: { id: session.client_id },
      select: { organizationId: true },
    });

    if (session.admin_user_id !== authCheck.userId) {
      return { success: false, error: 'אינך מורשה לבטל בקשה זו' };
    }

    await prisma.impersonationSession.update({
      where: { id: sessionId },
      data: { status: 'REVOKED' },
    });

    await logImpersonationAction({
      sessionId,
      adminUserId: String(authCheck.userId),
      clientId: session.client_id,
      organizationId: client?.organizationId || undefined,
      action: 'SESSION_CANCELLED',
    });

    return { success: true };
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בביטול הבקשה');
  }
}

// ─── Get Impersonation History (for admin audit) ──────────────

export type ImpersonationAuditEntry = {
  id: string;
  action: string;
  adminUserId: string;
  clientId: string;
  clientName?: string;
  organizationName?: string;
  ipAddress?: string | null;
  createdAt: Date;
};

export async function getImpersonationAuditLog(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; data?: ImpersonationAuditEntry[]; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    const limit = Math.max(1, Math.min(200, Number(params?.limit ?? 50)));
    const offset = Math.max(0, Number(params?.offset ?? 0));

    const logs = await prisma.impersonationAuditLog.findMany({
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
      select: {
        id: true,
        action: true,
        admin_user_id: true,
        client_id: true,
        ip_address: true,
        created_at: true,
        session_id: true,
      },
    });

    // Get client names separately
    const clientIds = [...new Set(logs.map(l => l.client_id))];
    const clients = await prisma.clientClient.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, fullName: true, organization: { select: { name: true } } },
    });
    const clientMap = new Map(clients.map(c => [c.id, c]));

    const data: ImpersonationAuditEntry[] = logs.map((log) => {
      const client = clientMap.get(log.client_id);
      return {
        id: String(log.id),
        action: log.action,
        adminUserId: String(log.admin_user_id),
        clientId: String(log.client_id),
        clientName: client?.fullName || undefined,
        organizationName: client?.organization?.name || undefined,
        ipAddress: log.ip_address,
        createdAt: log.created_at,
      };
    });

    return createSuccessResponse(data);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת לוג התחזות');
  }
}
