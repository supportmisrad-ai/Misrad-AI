import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/server/api-response';
import { requireAuth } from '@/lib/server/auth-guard';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth();
    if (!auth.ok) {
      return apiError(auth.error, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('id');

    if (!partnerId) {
      return apiError('מזהה שותף חסר', { status: 400 });
    }

    // Get partner info
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { id: true, name: true, referralCode: true },
    });

    if (!partner) {
      return apiError('שותף לא נמצא', { status: 404 });
    }

    // Get stats
    const [totalClicks, uniqueVisitorsGroup, conversionAgg, recentActivity] = await Promise.all([
      // Total clicks
      prisma.partnerLinkUsage.count({
        where: { partnerId },
      }),
      
      // Unique visitors
      prisma.partnerLinkUsage.groupBy({
        by: ['visitorIp'],
        where: { partnerId },
      }),
      
      // Conversions and commission
      prisma.partnerLinkUsage.aggregate({
        where: { partnerId, converted: true },
        _count: { id: true },
        _sum: { commission: true },
      }),
      
      // Recent activity
      prisma.partnerLinkUsage.findMany({
        where: { partnerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          converted: true,
          commission: true,
        },
      }),
    ]);

    const uniqueVisitors = uniqueVisitorsGroup.length;
    const conversions = conversionAgg._count?.id || 0;
    const totalCommission = Number(conversionAgg._sum?.commission || 0);
    const pendingCommission = 0; // TODO: calculate pending

    const conversionRate = totalClicks > 0 
      ? ((conversions / totalClicks) * 100).toFixed(1)
      : '0.0';

    return apiSuccess({
      partner: {
        id: partner.id,
        name: partner.name,
        referralCode: partner.referralCode,
      },
      stats: {
        totalClicks,
        uniqueVisitors,
        conversions,
        conversionRate,
        totalCommission,
        pendingCommission,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('[partner-dashboard] Error:', error);
    return apiError('שגיאה בטעינת הנתונים', { status: 500 });
  }
}
