'use server';

import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import prisma from '@/lib/prisma';

import { asObject } from '@/lib/shared/unknown';
function getStringProp(obj: Record<string, unknown> | null, key: string): string {
  const v = obj?.[key];
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

export type AttendanceGeoLocationInput = {
  lat: number;
  lng: number;
  accuracy?: number | null;
};

function parseGeoLocationRequired(input: unknown): { lat: number; lng: number; accuracy: number | null } {
  const obj = asObject(input) ?? {};
  const lat = Number(getStringProp(obj, 'lat') || (obj as any).lat);
  const lng = Number(getStringProp(obj, 'lng') || (obj as any).lng);
  const accuracyRaw = (obj as any).accuracy;
  const accuracy = accuracyRaw == null || accuracyRaw === '' ? null : Number(accuracyRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('נדרש מיקום פעיל כדי לבצע כניסה/יציאה (lat/lng חסרים או לא תקינים)');
  }

  return {
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
  };
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function getActiveShift(orgSlugOrId: string) {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const dbUser = resolved.user;

  const row = await prisma.nexusTimeEntry.findFirst({
    where: {
      organizationId: String(workspace.id),
      userId: String(dbUser.id),
      endTime: null,
    },
    orderBy: { startTime: 'desc' },
    select: { id: true, startTime: true },
  });

  if (!row?.id) {
    return { activeShift: null as null | { id: string; startTime: string } };
  }

  return {
    activeShift: {
      id: String(row.id),
      startTime: row.startTime instanceof Date ? row.startTime.toISOString() : String(row.startTime),
    },
  };
}

export async function punchIn(orgSlugOrId: string, note: string | undefined, location: AttendanceGeoLocationInput) {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const dbUser = resolved.user;

  const existing = await getActiveShift(String(orgSlugOrId));
  if (existing.activeShift) {
    return { success: true, activeShift: existing.activeShift, alreadyActive: true };
  }

  const now = new Date();

  const dateOnly = toIsoDate(now);
  const geo = parseGeoLocationRequired(location);
  const noteValue = typeof note === 'string' && note.trim().length > 0 ? note.trim() : null;

  const rows = await prisma.$queryRaw<{ id: string; start_time: Date }[]>`
    INSERT INTO nexus_time_entries (
      organization_id,
      user_id,
      start_time,
      end_time,
      start_lat,
      start_lng,
      start_accuracy,
      date,
      duration_minutes,
      void_reason,
      voided_by,
      voided_at
    )
    VALUES (
      ${String(workspace.id)}::uuid,
      ${String(dbUser.id)}::uuid,
      ${now.toISOString()}::timestamptz,
      NULL,
      ${geo.lat}::double precision,
      ${geo.lng}::double precision,
      ${geo.accuracy}::double precision,
      ${dateOnly}::date,
      NULL,
      ${noteValue},
      NULL,
      NULL
    )
    RETURNING id, start_time
  `;

  const created = Array.isArray(rows) ? rows[0] : null;
  if (!created?.id) throw new Error('Failed to punch in');

  const entry = {
    id: String(created.id),
    startTime: created.start_time instanceof Date ? created.start_time.toISOString() : String(created.start_time),
  };

  return {
    success: true,
    activeShift: { id: String(entry.id), startTime: String(entry.startTime) },
    alreadyActive: false,
  };
}

export async function punchOut(orgSlugOrId: string, note: string | undefined, location: AttendanceGeoLocationInput) {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;

  const existing = await getActiveShift(String(orgSlugOrId));
  if (!existing.activeShift) {
    return { success: true, closed: false, noActiveShift: true };
  }

  const geo = parseGeoLocationRequired(location);

  const now = new Date();
  const endTime = now.toISOString();
  const startTimeMs = new Date(existing.activeShift.startTime).getTime();
  const endTimeMs = now.getTime();
  const durationMinutes = endTimeMs > startTimeMs ? Math.round((endTimeMs - startTimeMs) / 60000) : 0;

  const noteValue = typeof note === 'string' && note.trim().length > 0 ? note.trim() : null;
  const updatedCount = await prisma.$executeRaw`
    UPDATE nexus_time_entries
    SET
      end_time = ${endTime}::timestamptz,
      end_lat = ${geo.lat}::double precision,
      end_lng = ${geo.lng}::double precision,
      end_accuracy = ${geo.accuracy}::double precision,
      duration_minutes = ${durationMinutes}::int,
      void_reason = ${noteValue}
    WHERE
      id = ${String(existing.activeShift.id)}::uuid
      AND organization_id = ${String(workspace.id)}::uuid
      AND user_id = ${String(resolved.user.id)}::uuid
  `;

  if (!updatedCount) throw new Error('Failed to punch out');

  return { success: true, closed: true, entryId: existing.activeShift.id, noActiveShift: false };
}
