import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getWorkspaceContextOrThrow, APIError } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getAuthenticatedUser } from '@/lib/auth';
import { orgQuery, prisma } from '@/lib/services/operations/db';
import { asObject } from '@/lib/services/operations/shared';

export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

async function POSTHandler(req: Request, { params }: { params: { orgSlug: string } }) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) return apiError('Unauthorized', { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const { orgSlug } = resolvedParams;
    if (!orgSlug) return apiError('Missing params', { status: 400 });

    const { workspace } = await getWorkspaceContextOrThrow(req, { params: resolvedParams });
    const organizationId = workspace.id;

    const abuse = await enforceAiAbuseGuard({
      req,
      namespace: 'ai.operations.routing',
      organizationId,
      userId: clerkUserId,
    });
    if (!abuse.ok) return apiError('Rate limit exceeded', { status: 429, headers: abuse.headers });

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const categoryId = body.categoryId ? String(body.categoryId) : null;
    const buildingId = body.buildingId ? String(body.buildingId) : null;
    const priority = String(body.priority || 'NORMAL');
    const title = String(body.title || '');
    const description = String(body.description || '');

    // Gather data about all technicians
    const [techRows, workloadRows, expertiseRows] = await Promise.all([
      // Get all technicians with profiles
      prisma.profile.findMany({
        where: { organizationId },
        select: { id: true, fullName: true, email: true },
      }),

      // Current open work order count per technician
      orgQuery<unknown[]>(prisma, organizationId, `
        SELECT assigned_technician_id::text AS tech_id, COUNT(*) AS open_count
        FROM operations_work_orders
        WHERE organization_id = $1::uuid
          AND status NOT IN ('DONE')
          AND assigned_technician_id IS NOT NULL
        GROUP BY assigned_technician_id
      `, [organizationId]),

      // Category expertise: count of completed work orders per technician per category
      orgQuery<unknown[]>(prisma, organizationId, `
        SELECT
          assigned_technician_id::text AS tech_id,
          category_id::text AS cat_id,
          COUNT(*) AS done_count
        FROM operations_work_orders
        WHERE organization_id = $1::uuid
          AND status = 'DONE'
          AND assigned_technician_id IS NOT NULL
        GROUP BY assigned_technician_id, category_id
        ORDER BY done_count DESC
      `, [organizationId]),
    ]);

    if (!techRows.length) {
      return apiSuccess({ suggestion: null, reason: 'אין טכנאים רשומים במערכת' }, { headers: abuse.headers });
    }

    // Build technician profiles
    const workloadMap = new Map<string, number>();
    for (const r of (workloadRows || [])) {
      const obj = asObject(r) ?? {};
      if (obj.tech_id) workloadMap.set(String(obj.tech_id), Number(obj.open_count || 0));
    }

    const expertiseMap = new Map<string, Map<string, number>>();
    for (const r of (expertiseRows || [])) {
      const obj = asObject(r) ?? {};
      const techId = obj.tech_id ? String(obj.tech_id) : '';
      const catId = obj.cat_id ? String(obj.cat_id) : '';
      if (!techId) continue;
      if (!expertiseMap.has(techId)) expertiseMap.set(techId, new Map());
      expertiseMap.get(techId)!.set(catId, Number(obj.done_count || 0));
    }

    const techProfiles = techRows.map((t) => {
      const openCount = workloadMap.get(t.id) || 0;
      const expertise = expertiseMap.get(t.id);
      const categoryMatch = categoryId && expertise?.get(categoryId) ? expertise.get(categoryId)! : 0;
      const totalDone = expertise ? Array.from(expertise.values()).reduce((a, b) => a + b, 0) : 0;
      return {
        id: t.id,
        name: String(t.fullName || t.email || t.id),
        openCount,
        categoryMatch,
        totalDone,
      };
    });

    // Build prompt for AI
    const techSummary = techProfiles.map((t, i) =>
      `${i + 1}. ${t.name}: ${t.openCount} קריאות פתוחות, ${t.totalDone} קריאות שהושלמו${categoryId ? `, ${t.categoryMatch} בקטגוריה הזו` : ''}`
    ).join('\n');

    const prompt = [
      'בחר את הטכנאי הכי מתאים לקריאת העבודה הבאה. תן את מספר הטכנאי (רק המספר) ונימוק קצר (משפט אחד).',
      'שקול: עומס עבודה נוכחי (עדיף פחות עמוס), ניסיון בקטגוריה (עדיף מי שטיפל ביותר קריאות דומות), ומספר קריאות שהושלמו (ניסיון כללי).',
      '',
      `קריאה חדשה:`,
      title ? `כותרת: ${title}` : '',
      description ? `תיאור: ${description}` : '',
      `עדיפות: ${priority}`,
      categoryId ? `קטגוריה: ${categoryId}` : 'ללא קטגוריה',
      buildingId ? `מבנה: ${buildingId}` : '',
      '',
      `טכנאים זמינים:`,
      techSummary,
      '',
      'ענה בפורמט JSON: {"technicianNumber": <מספר>, "reason": "<נימוק קצר בעברית>"}',
    ].filter(Boolean).join('\n');

    const result = await withAiLoadIsolation({
      namespace: 'ai.operations.routing',
      organizationId,
      task: async () => {
        const ai = AIService.getInstance();
        return await ai.generateJson({
          featureKey: 'operations.routing',
          organizationId,
          userId: clerkUserId,
          prompt,
          systemInstruction: 'אתה אלגוריתם שיבוץ חכם לטכנאי שטח. בחר את הטכנאי האופטימלי על בסיס עומס עבודה, ניסיון בקטגוריה, וניסיון כללי. ענה אך ורק ב-JSON תקין.',
          meta: { source: 'operations-smart-routing' },
        });
      },
    });

    let suggestion: { technicianId: string; technicianName: string; reason: string } | null = null;

    try {
      const parsed = result.result as Record<string, unknown>;
      const techNum = Number(parsed.technicianNumber || 0);
      const reason = String(parsed.reason || '');

      if (techNum >= 1 && techNum <= techProfiles.length) {
        const chosen = techProfiles[techNum - 1];
        suggestion = {
          technicianId: chosen.id,
          technicianName: chosen.name,
          reason,
        };
      }
    } catch {
      // Fall back to simple heuristic
    }

    // If AI didn't return a valid result, use simple heuristic
    if (!suggestion && techProfiles.length) {
      const sorted = [...techProfiles].sort((a, b) => {
        if (categoryId) {
          const catDiff = b.categoryMatch - a.categoryMatch;
          if (catDiff !== 0) return catDiff;
        }
        return a.openCount - b.openCount;
      });
      const best = sorted[0];
      suggestion = {
        technicianId: best.id,
        technicianName: best.name,
        reason: `הכי פנוי (${best.openCount} קריאות פתוחות)${categoryId && best.categoryMatch ? ` + ניסיון בקטגוריה (${best.categoryMatch} קריאות)` : ''}`,
      };
    }

    return apiSuccess(
      { suggestion, provider: result.provider, model: result.model },
      { headers: abuse.headers }
    );
  } catch (e: unknown) {
    if (e instanceof APIError) {
      const safeMsg = IS_PROD ? 'Internal server error' : (e.message || 'Error');
      return apiError(e, { status: e.status, message: safeMsg });
    }
    return apiError(e, { message: 'Failed to suggest technician' });
  }
}

export const POST = shabbatGuard(POSTHandler);
