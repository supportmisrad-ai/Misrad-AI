import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getWorkspaceContextOrThrow, APIError } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getAuthenticatedUser } from '@/lib/auth';
import { orgQuery, orgExec, prisma } from '@/lib/services/operations/db';
import { asObject, toIsoDate } from '@/lib/services/operations/shared';

export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

async function POSTHandler(req: Request, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) return apiError('Unauthorized', { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const { orgSlug, id: workOrderId } = resolvedParams;
    if (!orgSlug || !workOrderId) return apiError('Missing params', { status: 400 });

    const { workspace } = await getWorkspaceContextOrThrow(req, { params: resolvedParams });
    const organizationId = workspace.id;

    const abuse = await enforceAiAbuseGuard({
      req,
      namespace: 'ai.operations.summary',
      organizationId,
      userId: clerkUserId,
    });
    if (!abuse.ok) return apiError('Rate limit exceeded', { status: 429, headers: abuse.headers });

    // Gather all work order context
    const [woRows, msgRows, materialRows, checkinRows] = await Promise.all([
      orgQuery<unknown[]>(prisma, organizationId, `
        SELECT wo.title, wo.description, wo.status, COALESCE(wo.priority,'NORMAL') AS priority,
               wo.installation_address, wo.floor, wo.unit,
               wo.reporter_name, wo.reporter_phone,
               wo.sla_deadline, wo.completed_at, wo.created_at,
               cat.name AS category_name,
               dept.name AS department_name,
               bld.name AS building_name
        FROM operations_work_orders wo
        LEFT JOIN operations_call_categories cat ON cat.id = wo.category_id
        LEFT JOIN operations_departments dept ON dept.id = wo.department_id
        LEFT JOIN operations_buildings bld ON bld.id = wo.building_id
        WHERE wo.id = $1::uuid AND wo.organization_id = $2::uuid
      `, [workOrderId, organizationId]),

      orgQuery<unknown[]>(prisma, organizationId, `
        SELECT author_name, content, created_at
        FROM operations_call_messages
        WHERE work_order_id = $1::uuid AND organization_id = $2::uuid
        ORDER BY created_at ASC
      `, [workOrderId, organizationId]),

      orgQuery<unknown[]>(prisma, organizationId, `
        SELECT i.name AS item_name, m.quantity, i.unit
        FROM operations_work_order_materials m
        JOIN operations_items i ON i.id = m.item_id
        WHERE m.work_order_id = $1::uuid AND m.organization_id = $2::uuid
      `, [workOrderId, organizationId]),

      orgQuery<unknown[]>(prisma, organizationId, `
        SELECT note, lat, lng, created_at
        FROM operations_work_order_checkins
        WHERE work_order_id = $1::uuid AND organization_id = $2::uuid
        ORDER BY created_at ASC
      `, [workOrderId, organizationId]),
    ]);

    const wo = asObject((woRows || [])[0]);
    if (!wo) return apiError('Work order not found', { status: 404 });

    // Build prompt
    const messages = (msgRows || []).map(r => {
      const o = asObject(r) ?? {};
      return `${String(o.author_name || '?')} (${toIsoDate(o.created_at)?.slice(0, 16) || '?'}): ${String(o.content || '')}`;
    }).join('\n');

    const materials = (materialRows || []).map(r => {
      const o = asObject(r) ?? {};
      return `${String(o.item_name || '?')} × ${String(o.quantity || '?')} ${String(o.unit || '')}`;
    }).join(', ');

    const checkins = (checkinRows || []).map(r => {
      const o = asObject(r) ?? {};
      const note = String(o.note || '').trim();
      const time = toIsoDate(o.created_at)?.slice(0, 16) || '?';
      return `[${time}] ${note || 'צ׳ק-אין ללא הערה'}`;
    }).join('\n');

    const prompt = [
      `סכם את קריאת העבודה הבאה בעברית. התמקד בתוצאה, מה נעשה, ומה השתמשו. תן סיכום קצר (3-5 משפטים).`,
      '',
      `כותרת: ${String(wo.title || '')}`,
      wo.description ? `תיאור: ${String(wo.description)}` : '',
      `סטטוס: ${String(wo.status || '')}`,
      `עדיפות: ${String(wo.priority || 'NORMAL')}`,
      wo.category_name ? `קטגוריה: ${String(wo.category_name)}` : '',
      wo.department_name ? `מחלקה: ${String(wo.department_name)}` : '',
      wo.building_name ? `בניין: ${String(wo.building_name)}` : '',
      wo.floor ? `קומה: ${String(wo.floor)}` : '',
      wo.unit ? `יחידה: ${String(wo.unit)}` : '',
      wo.installation_address ? `כתובת: ${String(wo.installation_address)}` : '',
      wo.reporter_name ? `מדווח: ${String(wo.reporter_name)}` : '',
      wo.created_at ? `נפתח: ${toIsoDate(wo.created_at)?.slice(0, 16) || ''}` : '',
      wo.completed_at ? `הושלם: ${toIsoDate(wo.completed_at)?.slice(0, 16) || ''}` : '',
      wo.sla_deadline ? `SLA: ${toIsoDate(wo.sla_deadline)?.slice(0, 16) || ''}` : '',
      '',
      messages ? `הודעות בשיחה:\n${messages}` : 'אין הודעות.',
      '',
      materials ? `חומרים שנצרכו: ${materials}` : 'לא נצרכו חומרים.',
      '',
      checkins ? `צ׳ק-אינים:\n${checkins}` : 'אין צ׳ק-אינים.',
    ].filter(Boolean).join('\n');

    const result = await withAiLoadIsolation({
      namespace: 'ai.operations.summary',
      organizationId,
      task: async () => {
        const ai = AIService.getInstance();
        return await ai.generateText({
          featureKey: 'operations.summary',
          organizationId,
          userId: clerkUserId,
          prompt,
          systemInstruction: 'אתה עוזר AI לתפעול שטח. סכם קריאות עבודה בעברית קצרה, ברורה ומעשית. ציין את עיקר העבודה שבוצעה, חומרים שנצרכו, ותוצאה סופית.',
          meta: { source: 'operations-ai-summary', workOrderId },
        });
      },
    });

    const summaryText = String(result.text || '').trim();

    // Save summary to work order
    await orgExec(prisma, organizationId, `
      UPDATE operations_work_orders
      SET ai_summary = $1
      WHERE id = $2::uuid AND organization_id = $3::uuid
    `, [summaryText, workOrderId, organizationId]);

    return apiSuccess(
      { summary: summaryText, provider: result.provider, model: result.model, chargedCents: result.chargedCents },
      { headers: abuse.headers }
    );
  } catch (e: unknown) {
    if (e instanceof APIError) {
      const safeMsg = IS_PROD ? 'Internal server error' : (e.message || 'Error');
      return apiError(e, { status: e.status, message: safeMsg });
    }
    return apiError(e, { message: 'Failed to generate summary' });
  }
}

export const POST = shabbatGuard(POSTHandler);
