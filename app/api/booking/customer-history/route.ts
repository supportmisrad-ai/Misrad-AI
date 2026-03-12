import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { withBetaLockdown } from '@/lib/booking/beta-guard';

/**
 * GET /api/booking/customer-history?email=xxx&phone=xxx
 * Fetch appointment history for a customer
 * Protected: Requires authentication and Beta Lockdown
 */
export async function GET(request: NextRequest) {
  // Authentication guard - must be logged in
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return withBetaLockdown(request, async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const email = searchParams.get('email');
      const phone = searchParams.get('phone');

      if (!email || !phone) {
        return NextResponse.json({ error: 'Email and phone are required' }, { status: 400 });
      }

      const appointments = await prisma.bookingAppointment.findMany({
        where: {
          customerEmail: email.toLowerCase(),
          customerPhone: phone,
        },
        include: {
          service: true,
          provider: true,
        },
        orderBy: {
          startTime: 'desc',
        },
      });

      return NextResponse.json({ appointments });
    } catch (error) {
      console.error('GET /api/booking/customer-history error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customer history' },
        { status: 500 }
      );
    }
  });
}
