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

    // Save to database
    // TODO: Add clientMarketingStrategy table to Prisma schema
    // For now, save to JSON file or skip storage
    /* await prisma.clientMarketingStrategy.create({
      data: {
        client_id: params.clientId,
        organization_id: organizationId,
        strategy_data: strategy as any, // Prisma Json type
        profile_data: params.profile as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
    }); */

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
}): Promise<{ success: boolean; strategy?: MarketingStrategy; profile?: ClientProfile; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: 'נדרשת התחברות' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(params.orgSlug);
    
    // TODO: Implement after testing ClientMarketingStrategy table
    // For now, return placeholder
    return { success: false, error: 'תכונה תעבוד לאחר הרצת Migration והוספת נתונים' }; 
  } catch (error: unknown) {
    logger.error('marketing-strategy', 'Error fetching strategy:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'שגיאה בטעינת אסטרטגיה',
    };
  }
}

/**
 * מייצר תוכנית תוכן שבועית
 */
export async function generateWeeklyPlanAction(params: {
  orgSlug: string;
  clientId: string;
  weekNumber: number;
}): Promise<{ success: boolean; plan?: any[]; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: 'נדרשת התחברות' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(params.orgSlug);
    const organizationId = workspace.id;

    // Get client profile from latest strategy
    /* const strategyRecord = await prisma.clientMarketingStrategy.findFirst({
      where: {
        client_id: params.clientId,
        organization_id: organizationId,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!strategyRecord) {
      return { success: false, error: 'נדרשת אסטרטגיה קיימת' };
    }

    const profile = strategyRecord.profile_data as ClientProfile;
    const plan = await generateWeeklyContentPlan(profile, params.weekNumber);

    return { success: true, plan }; */
    
    // Temporary: Return mock until DB migration
    return { success: false, error: 'תכונה תעבוד לאחר הרצת Migration' };
  } catch (error: unknown) {
    logger.error('marketing-strategy', 'Error generating weekly plan:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'שגיאה ביצירת תוכנית',
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
