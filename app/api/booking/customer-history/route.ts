import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withBetaLockdown } from '@/lib/booking/beta-guard';

/**
 * GET /api/booking/customer-history?email=xxx&phone=xxx
 * Fetch appointment history for a customer
 */
export async function GET(request: NextRequest) {
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
