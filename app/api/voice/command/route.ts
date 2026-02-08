import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import prisma from '@/lib/prisma';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';
export const runtime = 'nodejs';

type VoiceAction =
  | 'create_lead'
  | 'create_task'
  | 'create_work_order'
  | 'quick_invoice_draft'
  | 'navigate'
  | 'unknown';

type VoiceCommandPayload = {
  action: VoiceAction;
  data?: unknown;
};

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizePhone(input: unknown): string {
  return String(input || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9+]/g, '');
}

function normalizeAmountIls(input: unknown): number | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return rounded > 0 ? rounded : null;
}

function toIsoDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseIsoToDateOnlyAndTime(iso: string): { dueDate: Date | null; dueTime: Date | null } {
  const dt = new Date(String(iso || '').trim());
  if (Number.isNaN(dt.getTime())) {
    return { dueDate: null, dueTime: null };
  }

  const dueDate = toIsoDateOnly(dt);
  const hasTime =
    dt.getUTCHours() !== 0 ||
    dt.getUTCMinutes() !== 0 ||
    dt.getUTCSeconds() !== 0 ||
    dt.getUTCMilliseconds() !== 0;

  const dueTime = hasTime
    ? new Date(Date.UTC(1970, 0, 1, dt.getUTCHours(), dt.getUTCMinutes(), dt.getUTCSeconds(), 0))
    : null;

  return { dueDate, dueTime };
}

async function transcribeWithOpenAI(params: { apiKey: string; file: File }): Promise<string> {
  const form = new FormData();
  form.append('model', 'whisper-1');
  form.append('language', 'he');
  form.append('file', params.file);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OpenAI transcription error (${res.status}): ${txt}`);
  }

  const json: unknown = await res.json();
  const jsonObj = asObject(json) ?? {};
  const text = typeof jsonObj.text === 'string' ? String(jsonObj.text) : '';
  if (!text.trim()) throw new Error('תמלול ריק');
  return text.trim();
}

async function extractCommandWithOpenAI(params: {
  apiKey: string;
  transcript: string;
  pathname: string;
}): Promise<VoiceCommandPayload> {
  const system =
    "אתה מנתח פקודות קוליות למערכת CRM. החזר אך ורק JSON חוקי (בלי טקסט מסביב). " +
    "השדות: action, data. action יכול להיות: create_lead | create_task | create_work_order | quick_invoice_draft | navigate | unknown. " +
    "אם חסר מידע קריטי לפעולה, עדיין החזר action נכון אבל ציין data.missingFields כמערך מחרוזות. " +
    "שמור על עברית בשדות טקסט (למשל description). " +
    "תאריכים: החזר ISO string מלא (למשל 2026-01-27T10:00:00.000Z) אם אפשר; אחרת אל תמציא. " +
    "לניווט: החזר data.target ו/או data.url. target צריך להיות אחד: finance_invoices | system_sales_leads | system_reports | system_tasks | operations_work_orders.";

  const prompt = JSON.stringify(
    {
      pathname: params.pathname,
      transcript: params.transcript,
      examples: [
        {
          transcript: 'צור ליד ליוסי כהן מרמת גן, הוא צריך הצעת מחיר למזגן, תחזור אליו מחר',
          output: {
            action: 'create_lead',
            data: {
              name: 'יוסי כהן',
              city: 'רמת גן',
              note: 'צריך הצעת מחיר למזגן',
              next_action_date: '2026-01-28T10:00:00.000Z',
            },
          },
        },
        {
          transcript: 'תזכיר לי לקנות מלט מחר בבוקר',
          output: {
            action: 'create_task',
            data: {
              title: 'לקנות מלט',
              description: 'תזכורת קולית',
              due_date: '2026-01-28T07:00:00.000Z',
            },
          },
        },
        {
          transcript: 'פתח קריאה: תקלה בדוד ברחוב הרצל 10 רמת גן אצל יוסי',
          output: {
            action: 'create_work_order',
            data: {
              title: 'תקלה בדוד',
              description: 'תקלה בדוד ברחוב הרצל 10 רמת גן',
              client_name: 'יוסי',
              address: 'רחוב הרצל 10 רמת גן',
              scheduled_start: null,
            },
          },
        },
        {
          transcript: 'תכין חשבונית ליוסי כהן על סך 500 שקל עבור תיקון נזילה',
          output: {
            action: 'quick_invoice_draft',
            data: {
              client_name: 'יוסי כהן',
              amount_ils: 500,
              description: 'תיקון נזילה',
            },
          },
        },
        {
          transcript: 'קח אותי לחשבוניות',
          output: {
            action: 'navigate',
            data: {
              target: 'finance_invoices',
              url: null,
            },
          },
        },
      ],
    },
    null,
    2
  );

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OpenAI error (${res.status}): ${txt}`);
  }

  const json: unknown = await res.json();
  const jsonObj = asObject(json) ?? {};
  const choices = Array.isArray(jsonObj.choices) ? jsonObj.choices : [];
  const firstChoiceObj = asObject(choices[0]) ?? {};
  const messageObj = asObject(firstChoiceObj.message) ?? {};
  const text = typeof messageObj.content === 'string' ? String(messageObj.content) : '';

  const parsed = safeJsonParse(text);
  const parsedObj = asObject(parsed);
  if (!parsedObj) {
    throw new Error('פענוח פקודה נכשל');
  }

  const rawAction = typeof parsedObj.action === 'string' ? parsedObj.action : 'unknown';
  const data = parsedObj.data ?? null;

  const allowed: readonly VoiceAction[] = ['create_lead', 'create_task', 'create_work_order', 'quick_invoice_draft', 'navigate', 'unknown'] as const;
  if (!allowed.includes(rawAction as VoiceAction)) {
    return { action: 'unknown', data: { originalAction: rawAction, data } };
  }

  return { action: rawAction as VoiceAction, data };
}

async function executeCommand(params: {
  orgSlug: string;
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  command: VoiceCommandPayload;
}): Promise<{ message: string; actionResult?: unknown }> {
  if (params.command.action === 'create_lead') {
    const data = asObject(params.command.data) ?? {};
    const name = String(data.name ?? '').trim();
    const phone = normalizePhone(data.phone);

    if (!name || !phone) {
      const missing: string[] = [];
      if (!name) missing.push('name');
      if (!phone) missing.push('phone');
      return {
        message: `כדי ליצור ליד חסר: ${missing.join(', ')}`,
        actionResult: { ok: false, missingFields: missing },
      };
    }

    const now = new Date();

    const leadRow = await prisma.systemLead.create({
      data: {
        organizationId: params.workspaceId,
        name,
        phone,
        email: '',
        source: 'voice',
        status: 'incoming',
        value: 0,
        lastContact: now,
        isHot: false,
        score: 50,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    const city = String(data.city ?? '').trim();
    const note = String(data.note ?? '').trim();
    const noteParts = [city ? `עיר: ${city}` : '', note].filter(Boolean);
    const noteText = noteParts.join('\n');

    if (noteText) {
      await prisma.systemLeadActivity.create({
        data: {
          organizationId: params.workspaceId,
          leadId: leadRow.id,
          type: 'note',
          content: noteText,
          direction: null,
          metadata: { source: 'voice' },
        },
      });
    }

    const nextActionDate = data.next_action_date ? String(data.next_action_date).trim() : '';
    const nextActionNote = data.next_action_note ? String(data.next_action_note).trim() : note || null;

    if (nextActionDate) {
      const dt = new Date(nextActionDate);
      if (!Number.isNaN(dt.getTime())) {
        await prisma.systemLead.updateMany({
          where: { id: leadRow.id, organizationId: params.workspaceId },
          data: {
            nextActionDate: dt,
            nextActionNote,
          },
        });
      }
    }

    return {
      message: `בוצע. ליד עבור ${leadRow.name} נוצר בהצלחה.`,
      actionResult: { ok: true, lead: leadRow },
    };
  }

  if (params.command.action === 'create_task') {
    const data = asObject(params.command.data) ?? {};
    const title = String(data.title ?? '').trim();
    const description = String(data.description ?? '').trim();
    const dueDateRaw = data.due_date ? String(data.due_date).trim() : '';

    if (!title) {
      return {
        message: 'כדי ליצור משימה חסר: title',
        actionResult: { ok: false, missingFields: ['title'] },
      };
    }

    const parsedDue = dueDateRaw ? parseIsoToDateOnlyAndTime(dueDateRaw) : { dueDate: null, dueTime: null };

    const created = await prisma.nexusTask.create({
      data: {
        organizationId: params.workspaceId,
        title,
        description: description || null,
        status: 'Todo',
        priority: null,
        assigneeIds: [params.actorUserId],
        assigneeId: params.actorUserId,
        creatorId: params.actorUserId,
        tags: ['Voice'],
        dueDate: parsedDue.dueDate,
        dueTime: parsedDue.dueTime,
        department: null,
      },
      select: { id: true, title: true, dueDate: true },
    });

    return {
      message: `בוצע. יצרתי משימה: ${created.title}`,
      actionResult: { ok: true, task: created },
    };
  }

  if (params.command.action === 'create_work_order') {
    const data = asObject(params.command.data) ?? {};
    const title = String(data.title ?? '').trim();
    const description = String(data.description ?? '').trim();
    const clientName = String(data.client_name ?? '').trim();
    const address = String(data.address ?? '').trim();
    const scheduledStartRaw = data.scheduled_start ? String(data.scheduled_start).trim() : '';

    if (!title) {
      return {
        message: 'כדי לפתוח קריאה חסר: title',
        actionResult: { ok: false, missingFields: ['title'] },
      };
    }

    let scheduledStart: Date | null = null;
    if (scheduledStartRaw) {
      const d = new Date(scheduledStartRaw);
      if (!Number.isNaN(d.getTime())) {
        scheduledStart = d;
      }
    }

    let canonicalClientId: string | null = null;
    if (clientName) {
      const foundClient = await prisma.clients.findFirst({
        where: {
          organization_id: params.workspaceId,
          name: { contains: clientName, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (foundClient?.id) {
        canonicalClientId = String(foundClient.id);
      }
    }

    const projectTitleParts = [clientName || null, address || null, title].filter(Boolean);
    const projectTitle = projectTitleParts.join(' - ').slice(0, 180);

    const project = await prisma.operationsProject.create({
      data: {
        organizationId: params.workspaceId,
        canonicalClientId,
        title: projectTitle,
        status: 'ACTIVE',
        installationAddress: address || null,
        addressNormalized: address || null,
        source: 'voice',
        sourceRefId: null,
      },
      select: { id: true },
    });

    const workOrder = await prisma.operationsWorkOrder.create({
      data: {
        organizationId: params.workspaceId,
        projectId: project.id,
        title: title.slice(0, 180),
        description: description || null,
        status: 'NEW',
        createdByType: 'INTERNAL',
        createdByRef: params.actorEmail,
        installationAddress: address || null,
        addressNormalized: address || null,
        scheduledStart,
        assignedTechnicianId: params.actorUserId,
      },
      select: { id: true, title: true },
    });

    return {
      message: `בוצע. פתחתי קריאת שירות: ${workOrder.title}`,
      actionResult: { ok: true, workOrder },
    };
  }

  if (params.command.action === 'quick_invoice_draft') {
    const data = asObject(params.command.data) ?? {};
    const clientName = String(data.client_name ?? '').trim();
    const amountRaw = data.amount_ils;
    const amount = typeof amountRaw === 'number' ? Math.round(Number(amountRaw)) : normalizeAmountIls(amountRaw);
    const description = String(data.description ?? '').trim();

    const missing: string[] = [];
    if (!clientName) missing.push('client_name');
    if (!amount) missing.push('amount_ils');
    if (missing.length > 0) {
      return {
        message: `כדי להכין טיוטת חשבונית חסר: ${missing.join(', ')}`,
        actionResult: { ok: false, missingFields: missing },
      };
    }

    if (amount == null) {
      return {
        message: 'כדי להכין טיוטת חשבונית חסר: amount_ils',
        actionResult: { ok: false, missingFields: ['amount_ils'] },
      };
    }

    const match = await prisma.misradClient.findFirst({
      where: {
        organizationId: params.workspaceId,
        name: { contains: clientName, mode: 'insensitive' },
      },
      select: { id: true, name: true },
    });

    if (!match?.id) {
      return {
        message: `לא מצאתי לקוח בשם "${clientName}". תגיד שם מדויק יותר.`,
        actionResult: { ok: false, reason: 'client_not_found' },
      };
    }

    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const due = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueStr = `${String(due.getFullYear())}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;

    const draftNumber = `DRAFT-${Date.now()}`;

    let invoice: { id: string; number: string; amount: number };

    try {
      invoice = await prisma.misradInvoice.create({
        data: {
          organization_id: params.workspaceId,
          client_id: match.id,
          number: draftNumber,
          amount,
          date: dateStr,
          dueDate: dueStr,
          status: 'DRAFT',
          downloadUrl: '',
          draftDescription: description || null,
        },
        select: { id: true, number: true, amount: true },
      });
    } catch (e) {
      invoice = await prisma.misradInvoice.create({
        data: {
          organization_id: params.workspaceId,
          client_id: match.id,
          number: draftNumber,
          amount,
          date: dateStr,
          dueDate: dueStr,
          status: 'PENDING',
          downloadUrl: '',
        },
        select: { id: true, number: true, amount: true },
      });

      const activityDescription = description
        ? `טיוטת חשבונית (קולית): ${description} | סכום: ${amount} ₪`
        : `טיוטת חשבונית (קולית) | סכום: ${amount} ₪`;

      await prisma.misradActivityLog.create({
        data: {
          organization_id: params.workspaceId,
          client_id: match.id,
          type: 'FINANCIAL',
          description: activityDescription,
          date: dateStr,
          isRisk: false,
        },
        select: { id: true },
      });
    }

    const msgClientName = String(match.name || clientName);
    const msgAmount = Number(invoice.amount || amount).toLocaleString('he-IL');

    return {
      message: `הכנתי טיוטה ל-${msgClientName} על סך ${msgAmount} ש"ח. כנס לאפליקציה כדי לאשר.`,
      actionResult: { ok: true, invoice },
    };
  }

  if (params.command.action === 'navigate') {
    const data = asObject(params.command.data) ?? {};
    const target = String(data.target ?? '').trim();
    const urlRaw = data.url ? String(data.url).trim() : '';

    const base = `/w/${encodeURIComponent(params.orgSlug)}`;
    const map: Record<string, string> = {
      finance_invoices: `${base}/finance/invoices`,
      system_sales_leads: `${base}/system/sales_leads`,
      system_reports: `${base}/system/reports`,
      system_tasks: `${base}/system/tasks`,
      operations_work_orders: `${base}/operations/work-orders`,
    };

    const url = urlRaw && urlRaw.startsWith(base) ? urlRaw : map[target] || '';

    if (!url) {
      return {
        message: 'לא הצלחתי להבין לאן לנווט.',
        actionResult: { ok: false },
      };
    }

    return {
      message: `מנווט ל-${url}`,
      actionResult: { ok: true, url },
    };
  }

  return { message: 'לא הצלחתי לזהות פעולה לביצוע.' };
}

async function POSTHandler(req: Request) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, message: 'חסר OPENAI_API_KEY' }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const orgSlugRaw = form.get('orgSlug');
    const pathnameRaw = form.get('pathname');

    if (!orgSlugRaw) {
      return NextResponse.json({ ok: false, message: 'orgSlug is required' }, { status: 400 });
    }

    const orgSlug = String(orgSlugRaw);
    const pathname = pathnameRaw ? String(pathnameRaw) : '/';

    const { workspace } = await getWorkspaceByOrgKeyOrThrow(orgSlug);

    const ctx = await resolveWorkspaceCurrentUserForApi(orgSlug);
    const ctxObj = asObject(ctx) ?? {};
    const userObj = asObject(ctxObj.user) ?? {};
    const clerkObj = asObject(ctxObj.clerkUser) ?? {};
    const actorUserId = typeof userObj.id === 'string' ? String(userObj.id) : '';
    const actorEmail = typeof clerkObj.email === 'string' ? String(clerkObj.email).trim() : '';
    if (!actorUserId) {
      return NextResponse.json({ ok: false, message: 'User not resolved' }, { status: 401 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, message: 'file is required' }, { status: 400 });
    }

    const transcript = await transcribeWithOpenAI({ apiKey, file });

    const command = await extractCommandWithOpenAI({
      apiKey,
      transcript,
      pathname,
    });

    const exec = await executeCommand({
      orgSlug,
      workspaceId: workspace.id,
      actorUserId,
      actorEmail,
      command,
    });

    return NextResponse.json({
      ok: true,
      transcript,
      action: command.action,
      command,
      message: exec.message,
      actionResult: exec.actionResult ?? null,
      organizationId: workspace.id,
    });
  } catch (e: unknown) {
    const msg = getErrorMessage(e) || 'שגיאה כללית';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export const POST = shabbatGuard(POSTHandler);
