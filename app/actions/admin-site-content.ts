'use server';

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { getContentByKey, getSiteContent, SiteContent, updateSiteContent } from './site-content';
import { requireSuperAdmin } from '@/lib/auth';
import { LEGAL_DEFAULTS } from '@/lib/legal-defaults';

function applyDefaultDate(markdown: string) {
  return String(markdown).replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString('he-IL'));
}

/**
 * Get all site content for admin panel
 */
export async function getAllSiteContent(): Promise<{
  success: boolean;
  data?: {
    landing: SiteContent[];
    pricing: SiteContent[];
    legal: SiteContent[];
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
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

export async function seedDefaultLegalDocuments(): Promise<{
  success: boolean;
  data?: { seededKeys: string[] };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    const seededKeys: string[] = [];
    const entries = Object.entries(LEGAL_DEFAULTS) as Array<[string, string]>;

    for (const [key, markdown] of entries) {
      const existing = await getContentByKey('legal', 'documents', key);
      const existingText = typeof existing.data === 'string' ? existing.data.trim() : '';

      const needsRepair =
        !existingText ||
        (existingText.includes('Misrad ') && existingText.includes('CRM')) ||
        (existingText.includes('@misrad.ai') && existingText.includes('support@')) ||
        (existingText.includes('@misrad.ai') && existingText.includes('privacy@')) ||
        (existingText.includes('@misrad.ai') && existingText.includes('billing@')) ||
        existingText.includes('**הבהרה:**') ||
        existingText.includes('(או כתובת התמיכה המוצגת במערכת)');

      if (!needsRepair) continue;

      const result = await updateSiteContent('legal', 'documents', key, applyDefaultDate(markdown));
      if (!result.success) {
        return result;
      }
      seededKeys.push(key);
    }

    return createSuccessResponse({ seededKeys });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בהזרעת מסמכים משפטיים');
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
    content: unknown;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
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

