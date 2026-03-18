'use server';


import { currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { OSModuleKey } from '@/lib/os/modules/types';

import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
export type HelpVideo = {
  id: string;
  moduleKey: OSModuleKey;
  title: string;
  videoUrl: string;
  order: number;
  duration?: string | null;
};

const moduleKeySchema = z.enum(['nexus', 'system', 'social', 'finance', 'client', 'operations']);

const helpVideoCreateSchema = z.object({
  moduleKey: moduleKeySchema,
  title: z.string().min(1),
  videoUrl: z.string().min(1),
  order: z.number().int().min(0).optional(),
  duration: z.string().optional(),
});

const helpVideoUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  videoUrl: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
  duration: z.string().optional(),
});


type AdminCheckResult =
  | { success: true; userId: string }
  | { success: false; error?: string };

type HelpVideoRow = {
  id: unknown;
  module_key: unknown;
  title: unknown;
  video_url: unknown;
  order: unknown;
  route_prefix?: unknown;
  duration?: unknown;
  created_at?: unknown;
};

async function requireSuperAdminOrFail(): Promise<AdminCheckResult> {
  const authCheck = await requireAuth();
  if (!authCheck.success) {
    return { success: false, error: authCheck.error || 'נדרשת התחברות' };
  }
  const u = await currentUser();
  const md = asObject(u?.publicMetadata);
  const isSuperAdmin = Boolean(md?.isSuperAdmin);
  if (!isSuperAdmin) {
    return { success: false, error: 'אין הרשאה' };
  }
  if (!authCheck.userId) {
    return { success: false, error: 'נדרשת התחברות' };
  }
  return { success: true, userId: authCheck.userId };
}

function mapRow(row: unknown): HelpVideo {
  const obj = asObject(row) ?? {};
  const mk = moduleKeySchema.safeParse(obj.module_key);
  const moduleKey: OSModuleKey = mk.success ? mk.data : 'system';
  return {
    id: String(obj.id ?? ''),
    moduleKey,
    title: String(obj.title ?? ''),
    videoUrl: String(obj.video_url ?? ''),
    order: Number(obj.order ?? 0),
    duration: obj.duration == null ? null : String(obj.duration),
  };
}

export async function getHelpVideoByRoute(params: {
  pathname: string;
  moduleKey?: OSModuleKey;
}): Promise<{ success: boolean; data?: HelpVideo | null; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };

    const pathname = String(params?.pathname || '/');
    const mk = params?.moduleKey ? moduleKeySchema.safeParse(params.moduleKey) : null;

    const normalized = (() => {
      const match = pathname.match(/^\/w\/[^/]+(\/.*)?$/);
      if (match) return match[1] || '/';
      return pathname || '/';
    })();

    const rows = await prisma.help_videos.findMany({
      where: mk && mk.success ? { module_key: mk.data } : undefined,
      select: {
        id: true,
        module_key: true,
        title: true,
        video_url: true,
        order: true,
        route_prefix: true,
        duration: true,
        created_at: true,
      },
      orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
    });

    if (rows.length === 0) {
        return createSuccessResponse(null);
    }

    let best: HelpVideoRow | null = null;
    let bestLen = -1;
    let moduleDefault: HelpVideoRow | null = null;

    for (const row of rows) {
      const rp = String((row as HelpVideoRow)?.route_prefix ?? '').trim();
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
      return createSuccessResponse(mapRow(best));
    }

    if (moduleDefault) {
      return createSuccessResponse(mapRow(moduleDefault));
    }


    return createSuccessResponse(null);
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בטעינת סרטון');
  }
}

export async function getHelpVideosByModule(moduleKey: OSModuleKey): Promise<{ success: boolean; data?: HelpVideo[]; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };

    const parsed = moduleKeySchema.safeParse(moduleKey);
    if (!parsed.success) {
      return createErrorResponse('Invalid module key', 'מודול לא תקין');
    }

    const data = await prisma.help_videos.findMany({
      where: { module_key: parsed.data },
      select: { id: true, module_key: true, title: true, video_url: true, order: true, duration: true, created_at: true },
      orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
    });

    return createSuccessResponse((data || []).map(mapRow));
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בטעינת סרטונים');
  }
}

export async function adminListHelpVideos(params?: {
  moduleKey?: OSModuleKey;
}): Promise<{ success: boolean; data?: HelpVideo[]; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return { success: false, error: adminCheck.error || 'אין הרשאה' };

    const moduleKey = params?.moduleKey;
    const mk = moduleKey ? moduleKeySchema.safeParse(moduleKey) : null;

    const data = await prisma.help_videos.findMany({
      where: mk && mk.success ? { module_key: mk.data } : undefined,
      select: { id: true, module_key: true, title: true, video_url: true, order: true, duration: true, created_at: true },
      orderBy: [{ module_key: 'asc' }, { order: 'asc' }, { created_at: 'asc' }],
    });

    return createSuccessResponse((data || []).map(mapRow));
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בטעינת סרטונים');
  }
}

export async function adminCreateHelpVideo(input: {
  moduleKey: OSModuleKey;
  title: string;
  videoUrl: string;
  order?: number;
  duration?: string;
}): Promise<{ success: boolean; data?: HelpVideo; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return { success: false, error: adminCheck.error || 'אין הרשאה' };

    const parsed = helpVideoCreateSchema.safeParse(input);
    if (!parsed.success) {
      return createErrorResponse(parsed.error, 'שדות לא תקינים');
    }

    const now = new Date();
    const normalizedDuration = typeof parsed.data.duration === 'string' ? parsed.data.duration.trim() : '';

    const data = await prisma.help_videos.create({
      data: {
        module_key: parsed.data.moduleKey,
        title: parsed.data.title,
        video_url: parsed.data.videoUrl,
        order: Number.isFinite(parsed.data.order) ? Number(parsed.data.order) : 0,
        duration: normalizedDuration ? normalizedDuration : null,
        created_at: now,
        updated_at: now,
      },
      select: { id: true, module_key: true, title: true, video_url: true, order: true, duration: true },
    });

    return createSuccessResponse(mapRow(data));
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה ביצירת סרטון');
  }
}

export async function adminUpdateHelpVideo(
  id: string,
  patch: { title?: string; videoUrl?: string; order?: number; duration?: string }
): Promise<{ success: boolean; data?: HelpVideo; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return { success: false, error: adminCheck.error || 'אין הרשאה' };

    const resolvedId = String(id || '').trim();
    if (!resolvedId) {
      return createErrorResponse('Missing id', 'מזהה לא תקין');
    }

    const parsed = helpVideoUpdateSchema.safeParse({
      title: patch.title,
      videoUrl: patch.videoUrl,
      order: patch.order,
      duration: patch.duration,
    });

    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return createErrorResponse(parsed.error || 'Empty patch', 'אין מה לעדכן');
    }

    const now = new Date();
    const normalizedDuration = typeof parsed.data.duration === 'string' ? parsed.data.duration.trim() : null;

    const data = await prisma.help_videos.update({
      where: { id: resolvedId },
      data: {
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        ...(parsed.data.videoUrl ? { video_url: parsed.data.videoUrl } : {}),
        ...(typeof parsed.data.order === 'number' ? { order: parsed.data.order } : {}),
        ...(typeof parsed.data.duration === 'string' ? { duration: normalizedDuration ? normalizedDuration : null } : {}),
        updated_at: now,
      },
      select: { id: true, module_key: true, title: true, video_url: true, order: true, duration: true },
    });

    return createSuccessResponse(mapRow(data));
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בעדכון סרטון');
  }
}

export async function adminDeleteHelpVideo(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return { success: false, error: adminCheck.error || 'אין הרשאה' };

    const resolvedId = String(id || '').trim();
    if (!resolvedId) {
      return createErrorResponse('Missing id', 'מזהה לא תקין');
    }

    await prisma.help_videos.delete({ where: { id: resolvedId } });
    return createSuccessResponse(true);
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה במחיקת סרטון');
  }
}
