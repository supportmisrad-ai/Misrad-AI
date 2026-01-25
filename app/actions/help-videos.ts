'use server';

import { currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { OSModuleKey } from '@/lib/os/modules/types';

export type HelpVideo = {
  id: string;
  moduleKey: OSModuleKey;
  title: string;
  videoUrl: string;
  order: number;
};

const moduleKeySchema = z.enum(['nexus', 'system', 'social', 'finance', 'client', 'operations']);

const helpVideoCreateSchema = z.object({
  moduleKey: moduleKeySchema,
  title: z.string().min(1),
  videoUrl: z.string().min(1),
  order: z.number().int().min(0).optional(),
});

const helpVideoUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  videoUrl: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
});

async function requireSuperAdminOrFail() {
  const authCheck = await requireAuth();
  if (!authCheck.success) return authCheck as any;
  const u = await currentUser();
  const isSuperAdmin = Boolean((u as any)?.publicMetadata?.isSuperAdmin);
  if (!isSuperAdmin) {
    return createErrorResponse('Forbidden', 'אין הרשאה');
  }
  return { success: true, userId: authCheck.userId } as const;
}

function mapRow(row: any): HelpVideo {
  return {
    id: String(row?.id || ''),
    moduleKey: String(row?.module_key || 'system') as OSModuleKey,
    title: String(row?.title || ''),
    videoUrl: String(row?.video_url || ''),
    order: Number(row?.order ?? 0),
  };
}

export async function getHelpVideoByRoute(params: {
  pathname: string;
  moduleKey?: OSModuleKey;
}): Promise<{ success: boolean; data?: HelpVideo | null; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return authCheck as any;

    const pathname = String(params?.pathname || '/');
    const mk = params?.moduleKey ? moduleKeySchema.safeParse(params.moduleKey) : null;

    const normalized = (() => {
      const match = pathname.match(/^\/w\/[^/]+(\/.*)?$/);
      if (match) return match[1] || '/';
      return pathname || '/';
    })();

    const supabase = createClient();
    let q = supabase
      .from('help_videos')
      .select('id, module_key, title, video_url, order, route_prefix')
      .order('order', { ascending: true })
      .order('created_at', { ascending: true });

    if (mk && mk.success) {
      q = q.eq('module_key', mk.data);
    }

    const { data, error } = await q;
    if (error) {
      return createErrorResponse(error, 'שגיאה בטעינת סרטון') as any;
    }

    const rows: any[] = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      return createSuccessResponse(null) as any;
    }

    let best: any | null = null;
    let bestLen = -1;
    let moduleDefault: any | null = null;

    for (const row of rows) {
      const rp = String((row as any)?.route_prefix ?? '').trim();
      if (!rp) {
        if (!moduleDefault) moduleDefault = row;
        continue;
      }

      if (normalized === rp || normalized.startsWith(rp.endsWith('/') ? rp : `${rp}/`) || normalized.startsWith(rp)) {
        if (rp.length > bestLen) {
          best = row;
          bestLen = rp.length;
        }
      }
    }

    if (best) {
      return createSuccessResponse(mapRow(best)) as any;
    }

    if (moduleDefault) {
      return createSuccessResponse(mapRow(moduleDefault)) as any;
    }

    return createSuccessResponse(null) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת סרטון') as any;
  }
}

export async function getHelpVideosByModule(moduleKey: OSModuleKey): Promise<{ success: boolean; data?: HelpVideo[]; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return authCheck as any;

    const parsed = moduleKeySchema.safeParse(moduleKey);
    if (!parsed.success) {
      return createErrorResponse('Invalid module key', 'מודול לא תקין') as any;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('help_videos')
      .select('id, module_key, title, video_url, order')
      .eq('module_key', parsed.data)
      .order('order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return createErrorResponse(error, 'שגיאה בטעינת סרטונים') as any;
    }

    return createSuccessResponse((data || []).map(mapRow)) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת סרטונים') as any;
  }
}

export async function adminListHelpVideos(params?: {
  moduleKey?: OSModuleKey;
}): Promise<{ success: boolean; data?: HelpVideo[]; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const moduleKey = params?.moduleKey;
    const mk = moduleKey ? moduleKeySchema.safeParse(moduleKey) : null;

    const supabase = createClient();
    let q = supabase.from('help_videos').select('id, module_key, title, video_url, order');

    if (mk && mk.success) {
      q = q.eq('module_key', mk.data);
    }

    const { data, error } = await q.order('module_key', { ascending: true }).order('order', { ascending: true }).order('created_at', { ascending: true });
    if (error) {
      return createErrorResponse(error, 'שגיאה בטעינת סרטונים') as any;
    }

    return createSuccessResponse((data || []).map(mapRow)) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת סרטונים') as any;
  }
}

export async function adminCreateHelpVideo(input: {
  moduleKey: OSModuleKey;
  title: string;
  videoUrl: string;
  order?: number;
}): Promise<{ success: boolean; data?: HelpVideo; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const parsed = helpVideoCreateSchema.safeParse(input);
    if (!parsed.success) {
      return createErrorResponse(parsed.error, 'שדות לא תקינים') as any;
    }

    const supabase = createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('help_videos')
      .insert({
        module_key: parsed.data.moduleKey,
        title: parsed.data.title,
        video_url: parsed.data.videoUrl,
        order: Number.isFinite(parsed.data.order) ? Number(parsed.data.order) : 0,
        created_at: now,
        updated_at: now,
      } as any)
      .select('id, module_key, title, video_url, order')
      .single();

    if (error) {
      return createErrorResponse(error, 'שגיאה ביצירת סרטון') as any;
    }

    return createSuccessResponse(mapRow(data)) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה ביצירת סרטון') as any;
  }
}

export async function adminUpdateHelpVideo(
  id: string,
  patch: { title?: string; videoUrl?: string; order?: number }
): Promise<{ success: boolean; data?: HelpVideo; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const resolvedId = String(id || '').trim();
    if (!resolvedId) {
      return createErrorResponse('Missing id', 'מזהה לא תקין') as any;
    }

    const parsed = helpVideoUpdateSchema.safeParse({
      title: patch.title,
      videoUrl: patch.videoUrl,
      order: patch.order,
    });

    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return createErrorResponse(parsed.error || 'Empty patch', 'אין מה לעדכן') as any;
    }

    const supabase = createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('help_videos')
      .update(
        {
          ...(parsed.data.title ? { title: parsed.data.title } : {}),
          ...(parsed.data.videoUrl ? { video_url: parsed.data.videoUrl } : {}),
          ...(typeof parsed.data.order === 'number' ? { order: parsed.data.order } : {}),
          updated_at: now,
        } as any
      )
      .eq('id', resolvedId)
      .select('id, module_key, title, video_url, order')
      .single();

    if (error) {
      return createErrorResponse(error, 'שגיאה בעדכון סרטון') as any;
    }

    return createSuccessResponse(mapRow(data)) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון סרטון') as any;
  }
}

export async function adminDeleteHelpVideo(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const resolvedId = String(id || '').trim();
    if (!resolvedId) {
      return createErrorResponse('Missing id', 'מזהה לא תקין') as any;
    }

    const supabase = createClient();
    const { error } = await supabase.from('help_videos').delete().eq('id', resolvedId);

    if (error) {
      return createErrorResponse(error, 'שגיאה במחיקת סרטון') as any;
    }

    return createSuccessResponse(true) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה במחיקת סרטון') as any;
  }
}
