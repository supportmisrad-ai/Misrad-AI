'use server';

import { createClient } from '@/lib/supabase';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getStringProp(obj: Record<string, unknown> | null, key: string): string {
  const v = obj?.[key];
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function getActiveShift(orgSlugOrId: string) {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const dbUser = resolved.user;

  const supabase = createClient();
  const { data } = await supabase
    .from('nexus_time_entries')
    .select('id, start_time')
    .eq('organization_id', workspace.id)
    .eq('user_id', dbUser.id)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.id) {
    return { activeShift: null as null | { id: string; startTime: string } };
  }

  return {
    activeShift: {
      id: String(data.id),
      startTime: getStringProp(asObject(data), 'start_time'),
    },
  };
}

export async function punchIn(orgSlugOrId: string, note?: string) {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const dbUser = resolved.user;

  const existing = await getActiveShift(String(orgSlugOrId));
  if (existing.activeShift) {
    return { success: true, activeShift: existing.activeShift, alreadyActive: true };
  }

  const now = new Date();

  const supabase = createClient();
  const nowIso = now.toISOString();

  const insertPayload: Record<string, unknown> = {
    organization_id: workspace.id,
    user_id: String(dbUser.id),
    start_time: nowIso,
    end_time: null,
    date: toIsoDate(now),
    duration_minutes: null,
    void_reason: typeof note === 'string' && note.trim().length > 0 ? note.trim() : null,
    voided_by: null,
    voided_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data: entryRow, error: createError } = await supabase
    .from('nexus_time_entries')
    .insert(insertPayload)
    .select('id, start_time')
    .single();

  if (createError || !entryRow?.id) {
    throw new Error(createError?.message || 'Failed to punch in');
  }

  const entry = {
    id: String(entryRow.id),
    startTime: getStringProp(asObject(entryRow), 'start_time'),
  };

  return {
    success: true,
    activeShift: { id: String(entry.id), startTime: String(entry.startTime) },
    alreadyActive: false,
  };
}

export async function punchOut(orgSlugOrId: string, note?: string) {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;

  const existing = await getActiveShift(String(orgSlugOrId));
  if (!existing.activeShift) {
    return { success: true, closed: false, noActiveShift: true };
  }

  const now = new Date();
  const endTime = now.toISOString();
  const startTimeMs = new Date(existing.activeShift.startTime).getTime();
  const endTimeMs = now.getTime();
  const durationMinutes = endTimeMs > startTimeMs ? Math.round((endTimeMs - startTimeMs) / 60000) : 0;

  const supabase = createClient();
  const updatePayload: Record<string, unknown> = {
    end_time: endTime,
    duration_minutes: durationMinutes,
    void_reason: typeof note === 'string' && note.trim().length > 0 ? note.trim() : null,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('nexus_time_entries')
    .update(updatePayload)
    .eq('organization_id', workspace.id)
    .eq('id', existing.activeShift.id)
    .eq('user_id', String(resolved.user.id));

  if (updateError) {
    throw new Error(updateError.message || 'Failed to punch out');
  }

  return { success: true, closed: true, entryId: existing.activeShift.id, noActiveShift: false };
}
