'use server';

import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';

export interface SiteContent {
  id: string;
  page: 'landing' | 'pricing' | 'legal';
  section: string;
  key: string;
  content: any; // Can be string, object, array, etc.
  updatedAt: string;
  updatedBy: string;
}

/**
 * Get all content for a page
 */
export async function getSiteContent(
  page: 'landing' | 'pricing' | 'legal'
): Promise<{ success: boolean; data?: SiteContent[]; error?: string }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('page', page)
      .order('section', { ascending: true });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return createSuccessResponse([]);
      }
      return createErrorResponse(error, 'שגיאה בטעינת תוכן האתר');
    }

    return createSuccessResponse(data || []);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת תוכן האתר');
  }
}

/**
 * Update site content
 */
export async function updateSiteContent(
  page: 'landing' | 'pricing' | 'legal',
  section: string,
  key: string,
  content: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    const supabase = createClient();

    // Upsert content
    const { error } = await supabase
      .from('site_content')
      .upsert({
        page,
        section,
        key,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        updated_at: new Date().toISOString(),
        updated_by: authCheck.userId,
      }, {
        onConflict: 'page,section,key',
      });

    if (error) {
      return createErrorResponse(error, 'שגיאה בשמירת תוכן');
    }

    // Log the action
    await supabase.from('activity_logs').insert({
      user_id: authCheck.userId,
      action: `עדכון תוכן: ${page}/${section}/${key}`,
      created_at: new Date().toISOString(),
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשמירת תוכן');
  }
}

/**
 * Get content by key (for public pages)
 */
export async function getContentByKey(
  page: 'landing' | 'pricing' | 'legal',
  section: string,
  key: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('site_content')
      .select('content')
      .eq('page', page)
      .eq('section', section)
      .eq('key', key)
      .single();

    if (error || !data) {
      return createSuccessResponse(null); // Return null if not found
    }

    // Try to parse JSON, if fails return as string
    try {
      return createSuccessResponse(JSON.parse(data.content));
    } catch {
      return createSuccessResponse(data.content);
    }
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת תוכן');
  }
}

