'use server';


import { revalidatePath } from 'next/cache';
import { requireAuth, createErrorResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getContentByKey as getContentByKeyService } from '@/lib/services/site-content';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';

type UnknownRecord = Record<string, unknown>;

const ALLOW_SCHEMA_FALLBACKS = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

function getUnknownErrorCode(error: unknown): string {
  const obj = asObject(error);
  const code = obj?.code;
  return typeof code === 'string' ? code : '';
}

function isMissingTableError(error: unknown) {
  const code = String(getUnknownErrorCode(error) || '').toUpperCase();
  return code === '42P01' || code === 'P2021';
}

function isMissingRelationOrColumnError(error: unknown): boolean {
  const code = String(getUnknownErrorCode(error) || '').toUpperCase();
  return code === '42P01' || code === '42703' || code === 'P2021' || code === 'P2022';
}

async function bestEffortResolveUpdatedByUserId(clerkUserId: string): Promise<string | null> {
  const v = String(clerkUserId || '').trim();
  if (!v) return null;
  try {
    const user = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: v },
      select: { id: true },
    });
    return user?.id ? String(user.id) : null;
  } catch (e: unknown) {
    if (isMissingRelationOrColumnError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] organizationUser lookup failed (${getErrorMessage(e) || 'missing relation'})`);
    }

    if (isMissingRelationOrColumnError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'app/actions/site-content.bestEffortResolveUpdatedByUserId',
        reason: 'organizationUser lookup missing table/column (fallback to null)',
        error: e,
        extras: { clerkUserId: v },
      });
    }
    return null;
  }
}

export interface SiteContent {
  id: string;
  page: 'landing' | 'pricing' | 'legal';
  section: string;
  key: string;
  content: unknown; // Can be string, object, array, etc.
  updatedAt: string;
  updatedBy: string;
}

type LandingFeatureContent = {
  title: string;
  desc: string;
  icon: string;
  color: string;
};

type LandingTestimonialContent = {
  name: string;
  role: string;
  quote: string;
  avatar: string;
};

/**
 * Get all content for a page
 */
export async function getSiteContent(
  page: 'landing' | 'pricing' | 'legal'
): Promise<{ success: boolean; data?: SiteContent[]; error?: string }> {
  try {
    const rows = await prisma.socialMediaSiteContent.findMany({
      where: { page: String(page) },
      orderBy: [{ section: 'asc' }, { key: 'asc' }],
    });

    const out: SiteContent[] = (Array.isArray(rows) ? rows : []).map((row) => ({
      id: String(row.id),
      page: String(row.page) as SiteContent['page'],
      section: String(row.section),
      key: String(row.key),
      content: row.content,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date().toISOString(),
      updatedBy: row.updated_by ? String(row.updated_by) : '',
    }));

    return { success: true, data: out };
  } catch (error) {
    if (isMissingTableError(error)) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] social_site_content missing table (${getErrorMessage(error) || 'missing table'})`);
      }

      reportSchemaFallback({
        source: 'app/actions/site-content.getSiteContent',
        reason: 'socialMediaSiteContent missing table (fallback to empty list)',
        error,
        extras: { page },
      });
      return { success: true, data: [] };
    }
    const res = createErrorResponse(error, 'שגיאה בטעינת תוכן האתר');
    return { success: false, error: res.error };
  }
}

/**
 * Update site content
 */
export async function updateSiteContent(
  page: 'landing' | 'pricing' | 'legal',
  section: string,
  key: string,
  content: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    try {
      await requireSuperAdmin();
    } catch {
      return { success: false, error: 'אין הרשאה' };
    }

    const updatedBy = await bestEffortResolveUpdatedByUserId(String(authCheck.userId || ''));
    const pageValue = String(page);
    const sectionValue = String(section);
    const keyValue = String(key);
    const contentValue = typeof content === 'string' ? content : JSON.stringify(content);

    const existing = await prisma.socialMediaSiteContent.findFirst({
      where: { page: pageValue, section: sectionValue, key: keyValue },
      select: { id: true },
    });

    if (existing?.id) {
      await prisma.socialMediaSiteContent.update({
        where: { id: String(existing.id) },
        data: {
          content: contentValue,
          updated_at: new Date(),
          updated_by: updatedBy,
        },
      });
    } else {
      await prisma.socialMediaSiteContent.create({
        data: {
          page: pageValue,
          section: sectionValue,
          key: keyValue,
          content: contentValue,
          updated_at: new Date(),
          updated_by: updatedBy,
          created_at: new Date(),
        },
      });
    }

    if (page === 'landing') {
      revalidatePath('/', 'page');
    } else {
      revalidatePath(`/${page}`, 'page');
    }

    return { success: true };
  } catch (error) {
    const res = createErrorResponse(error, 'שגיאה בשמירת תוכן');
    return { success: false, error: res.error };
  }
}

/**
 * Get content by key (for public pages)
 */
export async function getContentByKey(
  page: 'landing',
  section: 'hero',
  key: 'hero_title' | 'hero_subtitle'
): Promise<{ success: boolean; data?: string | null; error?: string }>;
export async function getContentByKey(
  page: 'landing',
  section: 'features',
  key: 'features'
): Promise<{ success: boolean; data?: LandingFeatureContent[] | null; error?: string }>;
export async function getContentByKey(
  page: 'landing',
  section: 'testimonials',
  key: 'testimonials'
): Promise<{ success: boolean; data?: LandingTestimonialContent[] | null; error?: string }>;
export async function getContentByKey(
  page: 'landing' | 'pricing' | 'legal',
  section: string,
  key: string
): Promise<{ success: boolean; data?: unknown; error?: string }>;
export async function getContentByKey(
  page: 'landing' | 'pricing' | 'legal',
  section: string,
  key: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return (await getContentByKeyService(page, section, key)) as { success: boolean; data?: unknown; error?: string };
}
