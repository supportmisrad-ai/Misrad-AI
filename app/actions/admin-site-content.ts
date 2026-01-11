'use server';

import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { getSiteContent, updateSiteContent } from './site-content';
import { requireSuperAdmin } from '@/lib/auth';

/**
 * Get all site content for admin panel
 */
export async function getAllSiteContent(): Promise<{
  success: boolean;
  data?: {
    landing: any[];
    pricing: any[];
    legal: any[];
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const [landingResult, pricingResult, legalResult] = await Promise.all([
      getSiteContent('landing'),
      getSiteContent('pricing'),
      getSiteContent('legal'),
    ]);

    return createSuccessResponse({
      landing: landingResult.data || [],
      pricing: pricingResult.data || [],
      legal: legalResult.data || [],
    });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת תוכן האתר');
  }
}

/**
 * Bulk update site content
 */
export async function bulkUpdateSiteContent(
  updates: Array<{
    page: 'landing' | 'pricing' | 'legal';
    section: string;
    key: string;
    content: any;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    // Update all items
    const results = await Promise.all(
      updates.map(update => 
        updateSiteContent(update.page, update.section, update.key, update.content)
      )
    );

    const failed = results.find(r => !r.success);
    if (failed) {
      return failed;
    }

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון תוכן');
  }
}

