/**
 * Server-side data fetching for /me page
 * 
 * This module provides functions to fetch personal area data on the server,
 * eliminating client-side loading delays.
 */

import { cache } from 'react';
import { getAuthenticatedUser } from '@/lib/auth';
import { getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import prisma, { queryRawOrgScoped } from '@/lib/prisma';
import { LeaveRequest, TeamEvent } from '@/types';
import { asObject } from '@/lib/shared/unknown';

// Helper functions (copied from API routes for consistency)
function getString(obj: Record<string, unknown>, key: string, fallback = ''): string {
  const v = obj[key];
  return typeof v === 'string' ? v : v == null ? fallback : String(v);
}

function getNullableString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  if (v == null) return null;
  return typeof v === 'string' ? v : String(v);
}

function toIsoString(value: Date | string | null | undefined): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return String(value);
}

function normalizeMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value == null) return undefined;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  try {
    if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
  return undefined;
}

function isLeaveRequestType(value: string): boolean {
  return ['vacation', 'sick', 'personal', 'unpaid', 'other'].includes(value);
}

function isLeaveRequestStatus(value: string): boolean {
  return ['pending', 'approved', 'rejected', 'cancelled'].includes(value);
}

function isTeamEventType(value: string): boolean {
  return ['training', 'meeting', 'fun_day', 'team_building', 'holiday', 'other'].includes(value);
}

function isTeamEventStatus(value: string): boolean {
  return ['scheduled', 'ongoing', 'completed', 'cancelled'].includes(value);
}

// Cache the data fetching for 60 seconds to avoid redundant DB calls
export const getMePageData = cache(async (orgSlug: string) => {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email) {
      return { leaveRequests: [], events: [] };
    }

    // Get workspace context
    const workspace = await getWorkspaceOrThrow(
      new Request(`http://localhost/w/${orgSlug}/me`, {
        headers: { 'x-org-slug': orgSlug }
      })
    );
    const organizationId = workspace.workspaceId;

    // Fetch user's DB record to get ID
    const dbUser = await queryRawOrgScoped<unknown[]>(prisma, {
      organizationId,
      reason: 'me_page_user_lookup',
      query: `
        SELECT id::text as id
        FROM nexus_users
        WHERE organization_id = $1::uuid
          AND lower(email) = lower($2::text)
        LIMIT 1
      `,
      values: [organizationId, user.email],
    });

    const userId = asObject(dbUser?.[0]) ? getString(asObject(dbUser[0])!, 'id') : null;
    if (!userId) {
      return { leaveRequests: [], events: [] };
    }

    // Fetch leave requests in parallel with events
    const [leaveRequests, events] = await Promise.all([
      fetchLeaveRequests(organizationId, userId),
      fetchUpcomingEvents(organizationId, userId),
    ]);

    return { leaveRequests, events };
  } catch (error) {
    console.error('[MePageData] Error fetching data:', error);
    // Return empty data on error - components handle empty states gracefully
    return { leaveRequests: [], events: [] };
  }
});

async function fetchLeaveRequests(organizationId: string, userId: string): Promise<LeaveRequest[]> {
  try {
    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
      organizationId,
      reason: 'me_page_leave_requests',
      query: `
        SELECT 
          id::text as id,
          organization_id::text as organization_id,
          employee_id::text as employee_id,
          leave_type::text as leave_type,
          start_date,
          end_date,
          days_requested::text as days_requested,
          reason::text as reason,
          status::text as status,
          requested_by::text as requested_by,
          approved_by::text as approved_by,
          approved_at,
          rejection_reason::text as rejection_reason,
          notification_sent,
          employee_notified,
          metadata,
          created_at,
          updated_at
        FROM nexus_leave_requests
        WHERE organization_id = $1::uuid
          AND employee_id = $2::text
        ORDER BY created_at DESC
        LIMIT 20
      `,
      values: [organizationId, userId],
    });

    if (!Array.isArray(rows)) return [];

    return rows.map((row): LeaveRequest => {
      const obj = asObject(row)!;
      const leaveTypeRaw = getString(obj, 'leave_type');
      const statusRaw = getString(obj, 'status');
      const startDateVal = obj['start_date'];
      const endDateVal = obj['end_date'];
      const approvedAtVal = obj['approved_at'];
      const createdAtVal = obj['created_at'];
      const updatedAtVal = obj['updated_at'];
      
      return {
        id: getString(obj, 'id'),
        tenantId: getString(obj, 'organization_id') || undefined,
        employeeId: getString(obj, 'employee_id'),
        leaveType: (isLeaveRequestType(leaveTypeRaw) ? leaveTypeRaw : 'other') as LeaveRequest['leaveType'],
        startDate: toIsoString(startDateVal as Date | string | null | undefined),
        endDate: toIsoString(endDateVal as Date | string | null | undefined),
        daysRequested: parseFloat(getString(obj, 'days_requested')) || 0,
        reason: getNullableString(obj, 'reason') ?? undefined,
        status: (isLeaveRequestStatus(statusRaw) ? statusRaw : 'pending') as LeaveRequest['status'],
        requestedBy: getNullableString(obj, 'requested_by') ?? undefined,
        approvedBy: getNullableString(obj, 'approved_by') ?? undefined,
        approvedAt: approvedAtVal ? toIsoString(approvedAtVal as Date | string) : undefined,
        rejectionReason: getNullableString(obj, 'rejection_reason') ?? undefined,
        notificationSent: Boolean(obj['notification_sent']),
        employeeNotified: Boolean(obj['employee_notified']),
        metadata: normalizeMetadata(obj['metadata']),
        createdAt: toIsoString(createdAtVal as Date | string | null | undefined),
        updatedAt: toIsoString(updatedAtVal as Date | string | null | undefined),
      };
    });
  } catch (error) {
    console.error('[MePageData] Error fetching leave requests:', error);
    return [];
  }
}

async function fetchUpcomingEvents(organizationId: string, userId: string): Promise<TeamEvent[]> {
  try {
    const now = new Date().toISOString();
    
    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
      organizationId,
      reason: 'me_page_upcoming_events',
      query: `
        SELECT 
          e.id::text as id,
          e.organization_id::text as organization_id,
          e.title::text as title,
          e.description::text as description,
          e.event_type::text as event_type,
          e.start_date,
          e.end_date,
          e.location::text as location,
          e.status::text as status,
          e.required_attendees,
          e.optional_attendees,
          e.created_by::text as created_by,
          e.metadata,
          e.created_at,
          e.updated_at,
          ea.status::text as attendance_status
        FROM nexus_team_events e
        LEFT JOIN nexus_event_attendance ea ON ea.event_id = e.id AND ea.user_id = $2::text
        WHERE e.organization_id = $1::uuid
          AND e.status = 'scheduled'
          AND e.start_date >= $3::timestamptz
          AND (
            e.required_attendees @> jsonb_build_array($2::text)
            OR e.optional_attendees @> jsonb_build_array($2::text)
            OR e.created_by = $2::text
          )
        ORDER BY e.start_date ASC
        LIMIT 10
      `,
      values: [organizationId, userId, now],
    });

    if (!Array.isArray(rows)) return [];

    return rows.map((row): TeamEvent => {
      const obj = asObject(row)!;
      const eventTypeRaw = getString(obj, 'event_type');
      const statusRaw = getString(obj, 'status');
      const startDateVal = obj['start_date'];
      const endDateVal = obj['end_date'];
      const createdAtVal = obj['created_at'];
      const updatedAtVal = obj['updated_at'];
      
      return {
        id: getString(obj, 'id'),
        tenantId: getString(obj, 'organization_id') || undefined,
        title: getString(obj, 'title'),
        description: getNullableString(obj, 'description') ?? undefined,
        eventType: (isTeamEventType(eventTypeRaw) ? eventTypeRaw : 'other') as TeamEvent['eventType'],
        startDate: toIsoString(startDateVal as Date | string | null | undefined),
        endDate: toIsoString(endDateVal as Date | string | null | undefined),
        location: getNullableString(obj, 'location') ?? undefined,
        status: (isTeamEventStatus(statusRaw) ? statusRaw : 'scheduled') as TeamEvent['status'],
        requiredAttendees: Array.isArray(obj['required_attendees']) 
          ? obj['required_attendees'].map(String) 
          : [],
        optionalAttendees: Array.isArray(obj['optional_attendees']) 
          ? obj['optional_attendees'].map(String) 
          : [],
        createdBy: getString(obj, 'created_by'),
        metadata: normalizeMetadata(obj['metadata']),
        createdAt: toIsoString(createdAtVal as Date | string | null | undefined),
        updatedAt: toIsoString(updatedAtVal as Date | string | null | undefined),
        // Include attendance status if available
        ...(obj['attendance_status'] ? { 
          attendanceStatus: getString(obj, 'attendance_status') as 'attending' | 'not_attending' | 'maybe' | 'pending'
        } : {}),
      };
    });
  } catch (error) {
    console.error('[MePageData] Error fetching events:', error);
    return [];
  }
}
