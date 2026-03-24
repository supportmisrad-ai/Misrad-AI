import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

const DEMO_ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

const EVENT_TYPES = ['פגישה', 'שיחה', 'הדגמה', 'followup', 'ישיבה'];
const LOCATIONS = ['זום', 'טלפון', 'משרד הלקוח', 'משרדנו', 'Teams'];
const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9 + (Math.abs(n) % 8), 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function getDayName(d: Date): string {
  return DAY_NAMES[d.getDay() % 5] ?? 'ראשון';
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgUser = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: userId },
    select: { role: true },
  });

  const role = String(orgUser?.role ?? '').toLowerCase();
  if (!['super_admin', 'admin', 'owner'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return await withTenantIsolationContext(
    { organizationId: DEMO_ORG_ID, suppressReporting: true },
    async () => {
      const existing = await prisma.systemCalendarEvent.count({
        where: { organizationId: DEMO_ORG_ID },
      });

      if (existing > 0) {
        return NextResponse.json({ ok: true, message: `Already has ${existing} events`, created: 0 });
      }

      const leads = await prisma.systemLead.findMany({
        where: { organizationId: DEMO_ORG_ID },
        select: { id: true, name: true, company: true },
        take: 15,
      });

      if (leads.length === 0) {
        return NextResponse.json({ ok: false, message: 'No leads found, cannot seed calendar' });
      }

      const offsets = [1, 2, 3, 4, 5, 7, 8, 9, 12, 14, -3, -5];
      const titles = [
        'הדגמת מוצר', 'שיחת היכרות', 'מעקב הצעת מחיר', 'ישיבת אסטרטגיה',
        'בדיקת צרכים', 'פרזנטציה', 'סגירת עסקה', 'אונבורדינג',
        'ביקורת שביעות רצון', 'חידוש חוזה', 'שיחה קודמת', 'פגישה שהתקיימה',
      ];

      let created = 0;
      for (let i = 0; i < Math.min(offsets.length, titles.length); i++) {
        const lead = leads[i % leads.length];
        const occursAt = daysFromNow(offsets[i]);
        await prisma.systemCalendarEvent.create({
          data: {
            organizationId: DEMO_ORG_ID,
            leadId: lead.id,
            title: titles[i],
            leadName: lead.name,
            leadCompany: lead.company ?? '',
            dayName: getDayName(occursAt),
            date: formatDate(occursAt),
            time: formatTime(occursAt),
            occursAt,
            type: EVENT_TYPES[i % EVENT_TYPES.length],
            location: LOCATIONS[i % LOCATIONS.length],
            participants: (i % 3) + 1,
          },
        });
        created++;
      }

      return NextResponse.json({ ok: true, created });
    }
  );
}
