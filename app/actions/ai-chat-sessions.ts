'use server';

import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';

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

/**
 * יצירה או עדכון של session שיחה
 */
export async function upsertChatSession(data: ChatSessionData) {
  try {
    const userId = await getCurrentUserId();
    
    const session = await prisma.$executeRawUnsafe(`
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
      data.sessionId,
      data.organizationId || null,
      userId || null,
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
      data.situationType || null
    );

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
    await prisma.$executeRawUnsafe(`
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
    `,
      data.sessionId,
      data.finalOutcome || null,
      data.userRating || null,
      data.userFeedback || null,
      data.helpfulYn ?? null
    );

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
    await prisma.$executeRawUnsafe(`
      INSERT INTO ai_chat_messages (session_id, role, content, quick_actions)
      VALUES ($1, $2, $3, $4)
    `,
      sessionId,
      role,
      content,
      quickActions ? JSON.stringify(quickActions) : null
    );

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
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.organizationId) {
      whereConditions.push(`organization_id = $${paramIndex}`);
      params.push(filters.organizationId);
      paramIndex++;
    }

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

    const stats = await prisma.$queryRawUnsafe<any[]>(`
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
    `, ...params);

    const topObjections = await prisma.$queryRawUnsafe<any[]>(`
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
    `, ...params);

    const topIndustries = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        detected_industry as industry,
        COUNT(*) as count
      FROM ai_chat_sessions
      WHERE ${whereConditions.join(' AND ')}
        AND detected_industry IS NOT NULL
      GROUP BY detected_industry
      ORDER BY count DESC
      LIMIT 10
    `, ...params);

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
