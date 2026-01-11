import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { getUsers } from '@/lib/db';

function getOrgSlugFromRequest(request: NextRequest): string | null {
  const headerOrgId = request.headers.get('x-org-id');
  const queryOrgId = request.nextUrl.searchParams.get('orgId');
  return headerOrgId || queryOrgId;
}

function isUUID(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function templateTasks(templateKey: string): Array<{ title: string; priority: string; tags: string[] }> {
  if (templateKey === 'deliverables_package') {
    return [
      { title: 'איפיון חבילת דליברבלס חודשית', priority: 'High', tags: ['Onboarding', 'Deliverables'] },
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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgSlug = getOrgSlugFromRequest(request);
    if (!orgSlug) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);

    const body = await request.json();
    const templateKey = String(body?.templateKey || '').trim();

    if (templateKey !== 'retainer_fixed' && templateKey !== 'deliverables_package') {
      return NextResponse.json({ error: 'Invalid templateKey' }, { status: 400 });
    }

    const user = await getAuthenticatedUser();

    let dbUserId: string | null = null;
    if (user?.email) {
      const dbUsers = await getUsers({ email: user.email });
      if (dbUsers.length > 0 && isUUID(String(dbUsers[0].id))) {
        dbUserId = String(dbUsers[0].id);
      }
    }

    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found in database. Please sync your account first.' }, { status: 400 });
    }

    const supabase = createClient();

    const now = new Date().toISOString();
    const rows = templateTasks(templateKey).map((t) => ({
      id: randomUUID(),
      organization_id: workspace.id,
      title: t.title,
      description: null,
      status: 'Todo',
      priority: t.priority,
      assignee_ids: [dbUserId],
      assignee_id: dbUserId,
      creator_id: dbUserId,
      tags: ['Auto', 'NexusOnboarding', ...t.tags],
      created_at: now,
      updated_at: now,
      due_date: null,
      due_time: null,
      time_spent: 0,
      estimated_time: null,
      approval_status: null,
      is_timer_running: false,
      messages: [],
      client_id: null,
      is_private: false,
      audio_url: null,
      snooze_count: 0,
      is_focus: false,
      completion_details: null,
      department: user?.role || null,
    }));

    const { data, error } = await supabase.from('nexus_tasks').insert(rows).select('id');

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to create onboarding tasks' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, createdTaskIds: (data || []).map((r: any) => r.id) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
