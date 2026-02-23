'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import prisma, { executeRawOrgScopedSql, queryRawOrgScopedSql } from '@/lib/prisma';

import { asObject } from '@/lib/shared/unknown';
function getStringProp(obj: Record<string, unknown> | null, key: string): string {
  const v = obj?.[key];
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

export type AttendanceGeoLocationInput = {
  lat: number;
  lng: number;
  accuracy?: number | null;
  city?: string;
};

function parseGeoLocation(input: unknown): { lat: number; lng: number; accuracy: number | null; city: string | null } {
  const obj = asObject(input) ?? {};
  const latRaw = (obj as Record<string, unknown>).lat;
  const lngRaw = (obj as Record<string, unknown>).lng;
  const lat = Number.isFinite(Number(latRaw)) ? Number(latRaw) : 0;
  const lng = Number.isFinite(Number(lngRaw)) ? Number(lngRaw) : 0;
  const accuracyRaw = (obj as Record<string, unknown>).accuracy;
  const accuracy = accuracyRaw == null || accuracyRaw === '' ? null : Number(accuracyRaw);
  const cityRaw = (obj as Record<string, unknown>).city;
  const city = typeof cityRaw === 'string' && cityRaw.trim().length > 0 ? cityRaw.trim() : null;

  return {
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    city,
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
  const geo = parseGeoLocation(location);
  const noteValue = typeof note === 'string' && note.trim().length > 0 ? note.trim() : null;

  const rows = await queryRawOrgScopedSql<{ id: string; start_time: Date }[]>(prisma, {
    organizationId: String(workspace.id),
    reason: 'attendance_punch_in',
    sql: Prisma.sql`
      INSERT INTO nexus_time_entries (
        organization_id,
        user_id,
        start_time,
        end_time,
        start_lat,
        start_lng,
        start_accuracy,
        start_city,
        date,
        duration_minutes,
        note
      )
      VALUES (
        ${String(workspace.id)}::uuid,
        ${String(dbUser.id)}::uuid,
        ${now.toISOString()}::timestamptz,
        NULL,
        ${geo.lat}::double precision,
        ${geo.lng}::double precision,
        ${geo.accuracy}::double precision,
        ${geo.city},
        ${dateOnly}::date,
        NULL,
        ${noteValue}
      )
      RETURNING id, start_time
    `,
  });

  const created = Array.isArray(rows) ? rows[0] : null;
  if (!created?.id) throw new Error('Failed to punch in');

  const entry = {
    id: String(created.id),
    startTime: created.start_time instanceof Date ? created.start_time.toISOString() : String(created.start_time),
  };

  revalidatePath('/', 'layout');
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

  const geo = parseGeoLocation(location);

  const now = new Date();
  const endTime = now.toISOString();
  const startTimeMs = new Date(existing.activeShift.startTime).getTime();
  const endTimeMs = now.getTime();
  const durationMinutes = endTimeMs > startTimeMs ? Math.round((endTimeMs - startTimeMs) / 60000) : 0;

  const noteValue = typeof note === 'string' && note.trim().length > 0 ? note.trim() : null;

  const updatedCount = await executeRawOrgScopedSql(prisma, {
    organizationId: String(workspace.id),
    reason: 'attendance_punch_out',
    sql: Prisma.sql`
      UPDATE nexus_time_entries
      SET
        end_time = ${endTime}::timestamptz,
        end_lat = ${geo.lat}::double precision,
        end_lng = ${geo.lng}::double precision,
        end_accuracy = ${geo.accuracy}::double precision,
        end_city = ${geo.city},
        duration_minutes = ${durationMinutes}::int,
        note = COALESCE(note, ${noteValue})
      WHERE
        id = ${String(existing.activeShift.id)}::uuid
        AND organization_id = ${String(workspace.id)}::uuid
        AND user_id = ${String(resolved.user.id)}::uuid
    `,
  });

  if (!updatedCount) throw new Error('Failed to punch out');

  revalidatePath('/', 'layout');
  return { success: true, closed: true, entryId: existing.activeShift.id, noActiveShift: false };
}

export async function updateEntryLocation(
  orgSlugOrId: string,
  entryId: string,
  side: 'start' | 'end',
  location: AttendanceGeoLocationInput,
) {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const geo = parseGeoLocation(location);

  if (geo.lat === 0 && geo.lng === 0) return { updated: false };

  const latCol = side === 'start' ? 'start_lat' : 'end_lat';
  const lngCol = side === 'start' ? 'start_lng' : 'end_lng';
  const accCol = side === 'start' ? 'start_accuracy' : 'end_accuracy';
  const cityCol = side === 'start' ? 'start_city' : 'end_city';

  await executeRawOrgScopedSql(prisma, {
    organizationId: String(workspace.id),
    reason: 'attendance_update_location',
    sql: Prisma.sql`
      UPDATE nexus_time_entries
      SET
        ${Prisma.raw(latCol)} = ${geo.lat}::double precision,
        ${Prisma.raw(lngCol)} = ${geo.lng}::double precision,
        ${Prisma.raw(accCol)} = ${geo.accuracy}::double precision,
        ${Prisma.raw(cityCol)} = ${geo.city}
      WHERE
        id = ${String(entryId)}::uuid
        AND organization_id = ${String(workspace.id)}::uuid
        AND user_id = ${String(resolved.user.id)}::uuid
    `,
  });

  return { updated: true };
}
