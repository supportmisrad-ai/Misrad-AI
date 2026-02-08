import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import { getAuthenticatedUser } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import prisma from '@/lib/prisma';
import { isCeoRole } from '@/lib/constants/roles';
import { Prisma } from '@prisma/client';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

function isUUID(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function templateTasks(templateKey: string): Array<{ title: string; priority: string; tags: string[] }> {
  if (templateKey === 'deliverables_package') {
    return [
      { title: 'איפיון חבילת תוצרים חודשית', priority: 'High', tags: ['Onboarding', 'Deliverables'] },
      { title: 'הגדרת תהליך אישורים מול הלקוח', priority: 'High', tags: ['Onboarding', 'Deliverables'] },
      { title: 'בניית לוח תוכן/משימות לחודש', priority: 'Medium', tags: ['Onboarding', 'Deliverables'] },
      { title: 'הקמת תיקיית נכסים ותיוגים', priority: 'Low', tags: ['Onboarding', 'Deliverables'] },
    ];
  }

  return [
    { title: 'איפיון ריטיינר חודשי (מה כלול)', priority: 'High', tags: ['Onboarding', 'Retainer'] },
    { title: 'הגדרת יעד/תוצרי חודש ראשונים', priority: 'High', tags: ['Onboarding', 'Retainer'] },
    { title: 'הגדרת נקודת קשר ותהליך תקשורת', priority: 'Medium', tags: ['Onboarding', 'Retainer'] },
    { title: 'הקמת תיקיית נכסים ותיוגים', priority: 'Low', tags: ['Onboarding', 'Retainer'] },
  ];
}

async function POSTHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getAuthenticatedUser();
    if (!isCeoRole(user.role) && !user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { workspace } = await getWorkspaceOrThrow(request);

    const bodyJson: unknown = await request.json().catch(() => ({}));
    const bodyObj = asObject(bodyJson) ?? {};
    const templateKey = String(bodyObj.templateKey || '').trim();

    if (templateKey !== 'retainer_fixed' && templateKey !== 'deliverables_package') {
      return NextResponse.json({ error: 'Invalid templateKey' }, { status: 400 });
    }

    let dbUserId: string | null = null;
    if (user?.email) {
      const email = String(user.email).trim().toLowerCase();

      const byOrg = await prisma.nexusUser.findFirst({
        where: {
          organizationId: workspace.id,
          email: { equals: email, mode: 'insensitive' },
        },
        select: { id: true },
      });

      const idCandidate = byOrg?.id ? String(byOrg.id) : null;
      if (idCandidate && isUUID(idCandidate)) dbUserId = idCandidate;
    }

    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found in database. Please sync your account first.' }, { status: 400 });
    }

    const rows: Prisma.NexusTaskCreateManyInput[] = templateTasks(templateKey).map((t) => ({
      id: randomUUID(),
      organizationId: workspace.id,
      title: t.title,
      description: null,
      status: 'Todo',
      priority: t.priority,
      assigneeIds: [dbUserId],
      assigneeId: dbUserId,
      creatorId: dbUserId,
      tags: ['Auto', 'NexusOnboarding', ...t.tags],
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: null,
      dueTime: null,
      timeSpent: 0,
      estimatedTime: null,
      approvalStatus: null,
      isTimerRunning: false,
      messages: [] as Prisma.InputJsonValue,
      clientId: null,
      isPrivate: false,
      audioUrl: null,
      snoozeCount: 0,
      isFocus: false,
      completionDetails: Prisma.DbNull,
      department: user?.role || null,
    }));

    await prisma.nexusTask.createMany({ data: rows });

    return NextResponse.json({ ok: true, createdTaskIds: rows.map((r) => r.id) });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      const safeMsg =
        error.status === 400
          ? 'Bad request'
          : error.status === 401
            ? 'Unauthorized'
            : error.status === 404
              ? 'Not found'
              : 'Forbidden';
      return NextResponse.json(
        { error: IS_PROD ? safeMsg : error.message || safeMsg },
        { status: error.status }
      );
    }
    const safeMsg = 'Internal server error';
    return NextResponse.json(
      { error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg },
      { status: 500 }
    );
  }
}

export const POST = shabbatGuard(POSTHandler);
