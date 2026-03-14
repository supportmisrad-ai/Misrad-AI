/**
 * Cron Job: Partner Monthly Commission Reports
 * POST /api/cron/partner-reports
 * 
 * שולח דו״ח חודשי לכל השותפים עם עדכון עמלות
 * רץ ב-1 לכל חודש ב-09:00 שעון ישראל
 * 
 * Security: Protected by cronGuard (CRON_SECRET)
 * Schedule: 0 7 1 * * (1st of month, 07:00 UTC = 09:00 Israel)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cronGuard } from '@/lib/api-cron-guard';
import prisma from '@/lib/prisma';
import { sendPartnerMonthlyReportEmail } from '@/lib/emails/partner-reports';
import { getBaseUrl } from '@/lib/utils';

async function POSTHandler(_request: NextRequest) {
  const startTime = Date.now();
  const now = new Date();
  const currentMonth = now.toLocaleDateString('he-IL', { month: 'long' });
  const currentYear = now.getFullYear();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthName = previousMonth.toLocaleDateString('he-IL', { month: 'long' });
  const previousMonthYear = previousMonth.getFullYear();

  console.log(`[partner-reports-cron] Starting monthly partner reports for ${previousMonthName} ${previousMonthYear}`);

  try {
    // Get all partners with email
    const partners = await prisma.partner.findMany({
      where: {
        email: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
        organizations: {
          where: {
            subscription_status: { in: ['active', 'trial'] },
          },
          select: {
            id: true,
            mrr: true,
            created_at: true,
          },
        },
      },
    });

    console.log(`[partner-reports-cron] Found ${partners.length} partners with email`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const partner of partners) {
      if (!partner.email) continue;

      try {
        // Calculate stats
        const totalReferrals = partner.organizations.length;
        
        // New referrals this month
        const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const newReferralsThisMonth = partner.organizations.filter(
          org => org.created_at && org.created_at >= monthStart && org.created_at <= monthEnd
        ).length;

        // Active subscribers
        const activeSubscribers = partner.organizations.length;

        // Total revenue (sum of MRR)
        const totalRevenue = partner.organizations.reduce(
          (sum, org) => sum + Number(org.mrr || 0),
          0
        );

        // Commission (10%)
        const commissionEarned = Math.round(totalRevenue * 0.1);

        // Get unpaid commission from SystemPartner
        const systemPartner = await prisma.systemPartner.findUnique({
          where: { id: partner.id },
          select: { unpaidCommission: true },
        });
        const unpaidCommission = Number(systemPartner?.unpaidCommission || 0);

        // Send email
        const result = await sendPartnerMonthlyReportEmail({
          toEmail: partner.email,
          partnerName: partner.name,
          month: previousMonthName,
          year: previousMonthYear,
          totalReferrals,
          newReferralsThisMonth,
          activeSubscribers,
          totalRevenue,
          commissionEarned,
          unpaidCommission,
          referralCode: partner.referralCode,
          dashboardUrl: `${getBaseUrl()}/app/admin/partners`,
        });

        if (result.success) {
          emailsSent++;
          console.log(`[partner-reports-cron] Email sent to ${partner.name} (${partner.email})`);
        } else {
          emailsFailed++;
          console.error(`[partner-reports-cron] Failed to send to ${partner.name}: ${result.error}`);
        }
      } catch (partnerErr) {
        emailsFailed++;
        console.error(`[partner-reports-cron] Error processing partner ${partner.name}:`, partnerErr);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[partner-reports-cron] Completed in ${duration}ms. Sent: ${emailsSent}, Failed: ${emailsFailed}`);

    return NextResponse.json({
      success: true,
      month: previousMonthName,
      year: previousMonthYear,
      partnersFound: partners.length,
      emailsSent,
      emailsFailed,
      duration,
    });
  } catch (error) {
    console.error('[partner-reports-cron] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const POST = cronGuard(POSTHandler);

export const dynamic = 'force-dynamic';
export const revalidate = 0;
