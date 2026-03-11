'use server';

/**
 * Server Actions for Marketing Strategy Generation
 */

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/server/logger';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/errorHandler';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import {
  generateMarketingStrategy,
  generateWeeklyContentPlan,
  analyzeTargetAudience,
  type ClientProfile,
  type MarketingStrategy,
} from '@/lib/ai/marketing-strategy-generator';

/**
 * יוצר אסטרטגיית שיווק ללקוח
 */
export async function createMarketingStrategyAction(params: {
  orgSlug: string;
  clientId: string;
  profile: ClientProfile;
}): Promise<{ success: boolean; strategy?: MarketingStrategy; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: 'נדרשת התחברות' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(params.orgSlug);
    const organizationId = workspace.id;

    // Verify client belongs to organization
    const client = await prisma.clients.findFirst({
      where: {
        id: params.clientId,
        organization_id: organizationId,
      },
      select: { id: true },
    });

    if (!client) {
      return { success: false, error: 'הלקוח לא נמצא' };
    }

    // Generate strategy
    logger.info('marketing-strategy', 'Generating strategy for client:', params.clientId);
    const strategy = await generateMarketingStrategy(params.profile);

    // Deactivate previous strategies
    await prisma.$executeRaw`
      UPDATE client_marketing_strategy 
      SET is_active = false 
      WHERE client_id = ${params.clientId}::uuid 
      AND organization_id = ${organizationId}::uuid
    `;

    // Save to database
    await prisma.$executeRaw`
      INSERT INTO client_marketing_strategy (
        id, client_id, organization_id, strategy_data, profile_data, 
        version, is_active, generated_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${params.clientId}::uuid, ${organizationId}::uuid,
        ${JSON.stringify(strategy)}::jsonb, ${JSON.stringify(params.profile)}::jsonb,
        1, true, 'gpt-4-turbo', now(), now()
      )
    `;

    revalidatePath(`/w/${params.orgSlug}/social`);

    return { success: true, strategy };
  } catch (error: unknown) {
    logger.error('marketing-strategy', 'Error creating strategy:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'שגיאה ביצירת אסטרטגיה',
    };
  }
}

/**
 * שולף אסטרטגיה קיימת
 */
export async function getMarketingStrategyAction(params: {
  orgSlug: string;
  clientId: string;
  strategyId?: string;
}): Promise<{ success: boolean; strategy?: MarketingStrategy; profile?: ClientProfile; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: 'נדרשת התחברות' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(params.orgSlug);
    const organizationId = workspace.id;

    // Fetch strategy from database
    let strategyRecord;
    if (params.strategyId) {
      strategyRecord = await prisma.$queryRaw`
        SELECT * FROM client_marketing_strategy 
        WHERE id = ${params.strategyId}::uuid 
        AND client_id = ${params.clientId}::uuid
        AND organization_id = ${organizationId}::uuid
        LIMIT 1
      `;
    } else {
      // Get the latest active strategy
      strategyRecord = await prisma.$queryRaw`
        SELECT * FROM client_marketing_strategy 
        WHERE client_id = ${params.clientId}::uuid
        AND organization_id = ${organizationId}::uuid
        AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `;
    }

    const record = Array.isArray(strategyRecord) && strategyRecord.length > 0 ? strategyRecord[0] : null;
    
    if (!record) {
      return { success: false, error: 'לא נמצאה אסטרטגיה' };
    }

    return { 
      success: true, 
      strategy: record.strategy_data as MarketingStrategy,
      profile: record.profile_data as ClientProfile
    };
  } catch (error: unknown) {
    logger.error('marketing-strategy', 'Error fetching strategy:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'שגיאה בטעינת אסטרטגיה',
    };
  }
}

/**
 * שולף את כל האסטרטגיות של לקוח
 */
export async function getClientStrategiesAction(params: {
  orgSlug: string;
  clientId: string;
}): Promise<{ success: boolean; strategies?: any[]; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: 'נדרשת התחברות' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(params.orgSlug);
    const organizationId = workspace.id;

    const strategies = await prisma.$queryRaw`
      SELECT id, version, is_active, generated_by, created_at, updated_at
      FROM client_marketing_strategy 
      WHERE client_id = ${params.clientId}::uuid
      AND organization_id = ${organizationId}::uuid
      ORDER BY created_at DESC
    `;

    return { success: true, strategies: Array.isArray(strategies) ? strategies : [] };
  } catch (error: unknown) {
    logger.error('marketing-strategy', 'Error fetching strategies:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'שגיאה בטעינת אסטרטגיות',
    };
  }
}

/**
 * מנתח קהל יעד
 */
export async function analyzeAudienceAction(params: {
  industry: string;
  targetAudience: string;
}): Promise<{ success: boolean; analysis?: any; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: 'נדרשת התחברות' };
    }

    const analysis = await analyzeTargetAudience(params.industry, params.targetAudience);

    return { success: true, analysis };
  } catch (error: unknown) {
    logger.error('marketing-strategy', 'Error analyzing audience:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'שגיאה בניתוח קהל',
    };
  }
}
