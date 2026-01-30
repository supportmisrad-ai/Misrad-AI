'use server';

import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { SupabaseClient } from '@supabase/supabase-js';

type UnknownRecord = Record<string, unknown>;

function asObject(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function getUnknownErrorCode(error: unknown): string {
  const obj = asObject(error);
  const code = obj?.code;
  return typeof code === 'string' ? code : '';
}

function isMissingTableError(error: unknown) {
  return String(getUnknownErrorCode(error) || '').toUpperCase() === '42P01';
}

async function selectFromSiteContentTable(
  supabase: SupabaseClient,
  query: (tableName: string) => PromiseLike<{ data: unknown; error?: unknown }>
) {
  const candidates = ['site_content', 'social_site_content'] as const;
  let lastError: unknown = null;

  for (const tableName of candidates) {
    const result = await query(tableName);
    if (!result?.error) return { ...result, tableName };
    lastError = result.error;
    if (!isMissingTableError(result.error)) return { ...result, tableName };
  }

  return { data: null, error: lastError, tableName: candidates[0] };
}

async function bestEffortLogActivity(supabase: SupabaseClient, payload: UnknownRecord) {
  try {
    const { error } = await supabase.from('activity_logs').insert(payload);
    if (!error) return;
  } catch {
    // ignore
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
    const supabase = createClient();

    const { data, error } = await selectFromSiteContentTable(supabase, (tableName) =>
      supabase
        .from(tableName)
        .select('*')
        .eq('page', page)
        .order('section', { ascending: true })
    );

    if (error) {
      // If table doesn't exist, return empty array
      if (isMissingTableError(error)) {
        return { success: true, data: [] };
      }

      const res = createErrorResponse(error, 'שגיאה בטעינת תוכן האתר');
      return { success: false, error: res.error };
    }

    return { success: true, data: Array.isArray(data) ? (data as SiteContent[]) : [] };
  } catch (error) {
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

    const supabase = createClient();

    // Upsert content
    const { error } = await selectFromSiteContentTable(supabase, (tableName) =>
      supabase
        .from(tableName)
        .upsert(
          {
            page,
            section,
            key,
            content: typeof content === 'string' ? content : JSON.stringify(content),
            updated_at: new Date().toISOString(),
            updated_by: authCheck.userId,
          },
          {
            onConflict: 'page,section,key',
          }
        )
    );

    if (error) {
      const res = createErrorResponse(error, 'שגיאה בשמירת תוכן');
      return { success: false, error: res.error };
    }

    await bestEffortLogActivity(supabase, {
      user_id: authCheck.userId,
      action: `עדכון תוכן: ${page}/${section}/${key}`,
      created_at: new Date().toISOString(),
    });

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
  try {
    const supabase = createClient();

    const { data, error } = await selectFromSiteContentTable(supabase, (tableName) =>
      supabase
        .from(tableName)
        .select('content')
        .eq('page', page)
        .eq('section', section)
        .eq('key', key)
        .single()
    );

    if (error || !data) {
      return { success: true, data: null }; // Return null if not found
    }

    // Try to parse JSON, if fails return as string
    try {
      const obj = asObject(data);
      const raw = obj?.content;
      return { success: true, data: JSON.parse(String(raw ?? '')) };
    } catch {
      const obj = asObject(data);
      const raw = obj?.content;
      return { success: true, data: raw };
    }
  } catch (error) {
    const res = createErrorResponse(error, 'שגיאה בטעינת תוכן');
    return { success: false, error: res.error };
  }
}

