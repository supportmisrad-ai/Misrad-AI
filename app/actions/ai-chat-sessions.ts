'use server';

import prisma, { executeRawOrgScoped, queryRawOrgScoped } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireAuth } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import { headers } from 'next/headers';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

type ChatSessionData = {
  sessionId: string;
  organizationId?: string;
  pathname: string;
  isSalesMode: boolean;
  detectedInfo?: {
    name?: string;
    company?: string;
    industry?: string;
    painPoints?: string[];
    objections?: string[];
    budget?: string;
    timeline?: string;
  };
  messagesCount?: number;
  situationType?: string;
};

type EndSessionData = {
  sessionId: string;
  finalOutcome?: 'converted' | 'lost' | 'pending';
  userRating?: number;
  userFeedback?: string;
  helpfulYn?: boolean;
};

async function resolveOrganizationIdForWrite(params: {
  organizationId?: string;
  clerkUserId: string;
}): Promise<string | null> {
  const member = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: String(params.clerkUserId) },
    select: { organization_id: true },
  });
  const memberOrgId = member?.organization_id ? String(member.organization_id) : '';

  const inputOrgId = String(params.organizationId || '').trim();
  if (inputOrgId && memberOrgId && inputOrgId === memberOrgId) {
    return inputOrgId;
  }

  try {
    const h = await headers();
    const orgSlug = String(h.get('x-org-id') || '').trim();
    if (orgSlug) {
      const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
      const workspaceId = String(workspace?.id || '').trim();
      if (workspaceId) return workspaceId;
    }
  } catch {
  }

  return memberOrgId || null;
}

/**
 * יצירה או עדכון של session שיחה
 */
export async function upsertChatSession(data: ChatSessionData) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: true };
    }

    const organizationId = await resolveOrganizationIdForWrite({
      organizationId: data.organizationId,
      clerkUserId: userId,
    });

    if (!organizationId) {
      return { success: true };
    }
    
    await executeRawOrgScoped(prisma, {
      organizationId,
      reason: 'ai_chat_sessions_upsert',
      query: `
      INSERT INTO ai_chat_sessions (
        session_id,
        organization_id,
        user_id,
        pathname,
        is_sales_mode,
        detected_name,
        detected_company,
        detected_industry,
        detected_pain_points,
        detected_objections,
        detected_budget,
        detected_timeline,
        messages_count,
        situation_type,
        started_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      )
      ON CONFLICT (session_id) 
      DO UPDATE SET
        detected_name = COALESCE($6, ai_chat_sessions.detected_name),
        detected_company = COALESCE($7, ai_chat_sessions.detected_company),
        detected_industry = COALESCE($8, ai_chat_sessions.detected_industry),
        detected_pain_points = COALESCE($9, ai_chat_sessions.detected_pain_points),
        detected_objections = COALESCE($10, ai_chat_sessions.detected_objections),
        detected_budget = COALESCE($11, ai_chat_sessions.detected_budget),
        detected_timeline = COALESCE($12, ai_chat_sessions.detected_timeline),
        messages_count = COALESCE($13, ai_chat_sessions.messages_count),
        situation_type = COALESCE($14, ai_chat_sessions.situation_type),
        updated_at = NOW()
    `,
      values: [
        data.sessionId,
        organizationId,
        userId,
        data.pathname,
        data.isSalesMode,
        data.detectedInfo?.name || null,
        data.detectedInfo?.company || null,
        data.detectedInfo?.industry || null,
        data.detectedInfo?.painPoints ? JSON.stringify(data.detectedInfo.painPoints) : null,
        data.detectedInfo?.objections ? JSON.stringify(data.detectedInfo.objections) : null,
        data.detectedInfo?.budget || null,
        data.detectedInfo?.timeline || null,
        data.messagesCount || 0,
        data.situationType || null,
      ],
    });

    return { success: true };
  } catch (error) {
    console.error('Error upserting chat session:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * סיום session עם feedback
 */
export async function endChatSession(data: EndSessionData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: true };
    }

    const organizationId = await resolveOrganizationIdForWrite({ clerkUserId: userId });
    if (!organizationId) {
      return { success: true };
    }

    await executeRawOrgScoped(prisma, {
      organizationId,
      reason: 'ai_chat_sessions_end',
      query: `
      UPDATE ai_chat_sessions
      SET
        ended_at = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
        final_outcome = $2,
        user_rating = $3,
        user_feedback = $4,
        helpful_yn = $5,
        updated_at = NOW()
      WHERE session_id = $1
        AND organization_id = $6
    `,
      values: [
        data.sessionId,
        data.finalOutcome || null,
        data.userRating || null,
        data.userFeedback || null,
        data.helpfulYn ?? null,
        organizationId,
      ],
    });

    return { success: true };
  } catch (error) {
    console.error('Error ending chat session:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * שמירת הודעה בודדת (אופציונלי)
 */
export async function saveChatMessage(sessionId: string, role: 'user' | 'assistant', content: string, quickActions?: string[]) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: true };
    }

    const organizationId = await resolveOrganizationIdForWrite({ clerkUserId: userId });
    if (!organizationId) {
      return { success: true };
    }

    await executeRawOrgScoped(prisma, {
      organizationId,
      reason: 'ai_chat_messages_insert',
      query: `
      INSERT INTO ai_chat_messages (session_id, role, content, quick_actions)
      VALUES ($1, $2, $3, $4)
      SELECT $1, $2, $3, $4
      WHERE EXISTS (
        SELECT 1 FROM ai_chat_sessions s
        WHERE s.session_id = $1
          AND s.organization_id = $5
      )
    `,
      values: [
        sessionId,
        role,
        content,
        quickActions ? JSON.stringify(quickActions) : null,
        organizationId,
      ],
    });

    return { success: true };
  } catch (error) {
    console.error('Error saving chat message:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * קבלת insights לאדמין
 */
export async function getAIInsights(filters?: {
  organizationId?: string;
  isSalesMode?: boolean;
  fromDate?: Date;
  toDate?: Date;
}) {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    const organizationId = String(filters?.organizationId || '').trim();
    if (!organizationId) {
      return { success: false, error: 'organizationId חסר' };
    }

    const whereConditions: string[] = ['1=1'];
    const params: Array<string | number | boolean | Date | null> = [];
    let paramIndex = 1;

    whereConditions.push(`organization_id = $${paramIndex}`);
    params.push(organizationId);
    paramIndex++;

    if (filters?.isSalesMode !== undefined) {
      whereConditions.push(`is_sales_mode = $${paramIndex}`);
      params.push(filters.isSalesMode);
      paramIndex++;
    }

    if (filters?.fromDate) {
      whereConditions.push(`started_at >= $${paramIndex}`);
      params.push(filters.fromDate);
      paramIndex++;
    }

    if (filters?.toDate) {
      whereConditions.push(`started_at <= $${paramIndex}`);
      params.push(filters.toDate);
      paramIndex++;
    }

    const stats = await queryRawOrgScoped<Record<string, unknown>[]>(prisma, {
      organizationId,
      reason: 'ai_chat_sessions_insights_stats',
      query: `
      SELECT
        COUNT(*) as total_sessions,
        AVG(messages_count) as avg_messages,
        AVG(duration_seconds) as avg_duration_seconds,
        AVG(user_rating) as avg_rating,
        COUNT(CASE WHEN helpful_yn = true THEN 1 END) as helpful_count,
        COUNT(CASE WHEN helpful_yn = false THEN 1 END) as not_helpful_count,
        situation_type,
        COUNT(*) OVER (PARTITION BY situation_type) as situation_count
      FROM ai_chat_sessions
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY situation_type
    `,
      values: params,
    });

    const topObjections = await queryRawOrgScoped<Record<string, unknown>[]>(prisma, {
      organizationId,
      reason: 'ai_chat_sessions_insights_objections',
      query: `
      SELECT 
        jsonb_array_elements_text(detected_objections) as objection,
        COUNT(*) as count
      FROM ai_chat_sessions
      WHERE ${whereConditions.join(' AND ')}
        AND detected_objections IS NOT NULL
        AND jsonb_array_length(detected_objections) > 0
      GROUP BY objection
      ORDER BY count DESC
      LIMIT 10
    `,
      values: params,
    });

    const topIndustries = await queryRawOrgScoped<Record<string, unknown>[]>(prisma, {
      organizationId,
      reason: 'ai_chat_sessions_insights_industries',
      query: `
      SELECT 
        detected_industry as industry,
        COUNT(*) as count
      FROM ai_chat_sessions
      WHERE ${whereConditions.join(' AND ')}
        AND detected_industry IS NOT NULL
      GROUP BY detected_industry
      ORDER BY count DESC
      LIMIT 10
    `,
      values: params,
    });

    return {
      success: true,
      data: {
        stats: stats[0] || {},
        topObjections,
        topIndustries,
      },
    };
  } catch (error) {
    console.error('Error getting AI insights:', error);
    return { success: false, error: String(error) };
  }
}
