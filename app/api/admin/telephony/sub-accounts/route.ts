/**
 * Admin Telephony Sub-Accounts API
 * 
 * GET  - List all telephony sub-accounts with statistics
 * POST - Create new sub-account for an organization
 * PATCH - Update sub-account settings
 */

import { apiError, apiErrorCompat, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireSuperAdmin, getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getErrorMessage } from '@/lib/shared/unknown';
import { generateOrgSlug } from '@/lib/shared/orgSlug';
import type { 
  CreateSubAccountInput, 
  UpdateSubAccountInput,
  TelephonySubAccountSummary 
} from '@/types/voicenter-reseller';

const IS_PROD = process.env.NODE_ENV === 'production';
const VOICENTER_RESELLER_ID = process.env.VOICENTER_RESELLER_ID || '';

// ============================================================================
// GET - List all sub-accounts with statistics
// ============================================================================
async function GETHandler(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user.isSuperAdmin) {
      return apiError('נדרשות הרשאות סופר אדמין', { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || '';

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { account_name: { contains: search, mode: 'insensitive' } },
        { account_number: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Fetch sub-accounts with relations
    const subAccounts = await prisma.telephonySubAccount.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            extensions: true,
            usage_records: {
              where: {
                started_at: {
                  gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Get current month usage for each account
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const accountIds = subAccounts.map(sa => sa.id);
    
    const usageAgg = await prisma.telephonyUsageRecord.groupBy({
      by: ['sub_account_id'],
      where: {
        sub_account_id: { in: accountIds },
        started_at: { gte: currentMonthStart },
      },
      _count: { _all: true },
      _sum: { duration_seconds: true, billed_amount: true },
    });

    const usageMap = new Map<string, { calls: number; duration: number; billed: number }>(usageAgg.map(u => [
      String(u.sub_account_id),
      {
        calls: u._count._all,
        duration: Number(u._sum?.duration_seconds || 0),
        billed: Number(u._sum?.billed_amount || 0),
      }
    ]));

    // Transform to summary format
    const summaries: TelephonySubAccountSummary[] = subAccounts.map((sa: typeof subAccounts[0]) => {
      const usage = usageMap.get(sa.id) || { calls: 0, duration: 0, billed: 0 };
      
      return {
        id: sa.id,
        accountName: sa.account_name,
        organizationSlug: sa.organization?.slug || '',
        organizationName: sa.organization?.name || '',
        status: sa.status as import('@/types/voicenter-reseller').TelephonyAccountStatus,
        extensionCount: sa._count.extensions,
        activeExtensions: 0, // TODO: Calculate from extensions with active status
        callsThisMonth: usage.calls,
        durationThisMonth: usage.duration,
        monthlyPlanFee: Number(sa.monthly_plan_fee),
        currentUsageCharges: Number(usage.billed),
        totalMonthlyCost: Number(sa.monthly_plan_fee) + Number(usage.billed),
        trialEndsAt: sa.trial_ends_at,
        createdAt: sa.created_at,
      };
    });

    return apiSuccess({
      subAccounts: summaries,
      total: summaries.length,
      active: summaries.filter(s => s.status === 'active').length,
      trial: summaries.filter(s => s.status === 'trial').length,
      suspended: summaries.filter(s => s.status === 'suspended').length,
    });
  } catch (error) {
    console.error('[API][admin/telephony/sub-accounts] GET error:', error);
    return apiErrorCompat('שגיאה בטעינת חשבונות טלפוניה', {
      status: 500,
      extra: IS_PROD ? undefined : { debug: getErrorMessage(error) },
    });
  }
}

// ============================================================================
// POST - Create new sub-account
// ============================================================================
async function POSTHandler(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user.isSuperAdmin) {
      return apiError('נדרשות הרשאות סופר אדמין', { status: 403 });
    }

    const body = await req.json() as CreateSubAccountInput;

    // Validation
    if (!body.organizationId || !body.accountName) {
      return apiError('נדרשים organizationId ו-accountName', { status: 400 });
    }

    // Check if organization already has a telephony account
    const existing = await prisma.telephonySubAccount.findFirst({
      where: { organization_id: body.organizationId },
    });

    if (existing) {
      return apiError('לארגון זה כבר יש חשבון טלפוניה', { status: 409 });
    }

    // Get organization details
    const org = await prisma.organization.findUnique({
      where: { id: body.organizationId },
      select: { id: true, name: true, slug: true },
    });

    if (!org) {
      return apiError('הארגון לא נמצא', { status: 404 });
    }

    // Generate unique account number
    const accountNumber = await generateUniqueAccountNumber();
    
    // Calculate trial end date
    const trialDays = body.trialDays || 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Create sub-account
    const subAccount = await prisma.telephonySubAccount.create({
      data: {
        voicenter_account_id: `vc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        organization_id: body.organizationId,
        organization_slug: org.slug || '',
        account_name: body.accountName,
        account_number: accountNumber,
        reseller_id: VOICENTER_RESELLER_ID || 'MISRAD_AI_RESELLER',
        status: 'trial',
        trial_ends_at: trialEndsAt,
        billing_cycle: body.billingCycle || 'monthly',
        monthly_plan_fee: body.monthlyPlanFee || 99.00,
        markup_percentage: body.markupPercentage || 20.00,
        max_extensions: body.maxExtensions || 10,
        current_extensions: 0,
        screen_pop_enabled: true,
        metadata: {
          created_by: user.id,
          created_by_email: user.email,
        },
      },
    });

    // Create provisioning request to Voicenter
    await prisma.voicenterProvisioningRequest.create({
      data: {
        sub_account_id: subAccount.id,
        request_type: 'create_account',
        payload: {
          CompanyName: body.accountName,
          Email: org.slug + '@telephony.misrad-ai.com',
          Phone: '0000000000',
          MaxChannels: body.maxExtensions || 10,
        },
        status: 'pending',
        max_attempts: 3,
      },
    });

    return apiSuccess({
      subAccount: {
        id: subAccount.id,
        accountName: subAccount.account_name,
        accountNumber: subAccount.account_number,
        status: subAccount.status,
        trialEndsAt: subAccount.trial_ends_at,
      },
      message: 'חשבון טלפוניה נוצר בהצלחה ונשלח לפרוביזינג ב-Voicenter',
    }, { status: 201 });
  } catch (error) {
    console.error('[API][admin/telephony/sub-accounts] POST error:', error);
    return apiErrorCompat('שגיאה ביצירת חשבון טלפוניה', {
      status: 500,
      extra: IS_PROD ? undefined : { debug: getErrorMessage(error) },
    });
  }
}

// ============================================================================
// PATCH - Update sub-account
// ============================================================================
async function PATCHHandler(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user.isSuperAdmin) {
      return apiError('נדרשות הרשאות סופר אדמין', { status: 403 });
    }

    const body = await req.json() as UpdateSubAccountInput & { id: string };
    const { id, ...updateData } = body;

    if (!id) {
      return apiError('נדרש מזהה חשבון', { status: 400 });
    }

    // Check if sub-account exists
    const existing = await prisma.telephonySubAccount.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError('חשבון טלפוניה לא נמצא', { status: 404 });
    }

    // Build update data
    const data: Record<string, unknown> = {};
    
    if (updateData.accountName) data.account_name = updateData.accountName;
    if (updateData.status) data.status = updateData.status;
    if (updateData.billingCycle) data.billing_cycle = updateData.billingCycle;
    if (updateData.monthlyPlanFee !== undefined) data.monthly_plan_fee = updateData.monthlyPlanFee;
    if (updateData.markupPercentage !== undefined) data.markup_percentage = updateData.markupPercentage;
    if (updateData.maxExtensions) data.max_extensions = updateData.maxExtensions;
    if (updateData.notes) data.notes = updateData.notes;

    // Handle status change provisioning
    if (updateData.status && updateData.status !== existing.status) {
      const provisioningType = updateData.status === 'suspended' 
        ? 'suspend_account' 
        : updateData.status === 'active' && existing.status === 'suspended'
          ? 'resume_account'
          : null;

      if (provisioningType) {
        await prisma.voicenterProvisioningRequest.create({
          data: {
            sub_account_id: id,
            request_type: provisioningType,
            payload: { accountId: existing.voicenter_account_id },
            status: 'pending',
            max_attempts: 3,
          },
        });
      }
    }

    // Update sub-account
    const updated = await prisma.telephonySubAccount.update({
      where: { id },
      data,
    });

    return apiSuccess({
      subAccount: {
        id: updated.id,
        accountName: updated.account_name,
        status: updated.status,
        updatedAt: updated.updated_at,
      },
      message: 'חשבון טלפוניה עודכן בהצלחה',
    });
  } catch (error) {
    console.error('[API][admin/telephony/sub-accounts] PATCH error:', error);
    return apiErrorCompat('שגיאה בעדכון חשבון טלפוניה', {
      status: 500,
      extra: IS_PROD ? undefined : { debug: getErrorMessage(error) },
    });
  }
}

// ============================================================================
// Helpers
// ============================================================================
async function generateUniqueAccountNumber(): Promise<string> {
  const prefix = 'MISRAD';
  const random = Math.floor(10000 + Math.random() * 90000);
  const accountNumber = `${prefix}-${random}`;

  // Check uniqueness
  const existing = await prisma.telephonySubAccount.findUnique({
    where: { account_number: accountNumber },
  });

  if (existing) {
    return generateUniqueAccountNumber();
  }

  return accountNumber;
}

// ============================================================================
// Export handlers
// ============================================================================
export const GET = GETHandler;
export const POST = POSTHandler;
export const PATCH = PATCHHandler;
