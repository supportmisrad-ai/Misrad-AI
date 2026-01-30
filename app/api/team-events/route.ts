/**
 * Team Events API
 * 
 * Handles CRUD operations for team events (training, fun days, group meetings, etc.)
 */

import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '../../../lib/auth';
import { TeamEvent } from '../../../types';
import { createClient } from '@/lib/supabase';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    const obj = asObject(error);
    const msg = obj?.message;
    return typeof msg === 'string' ? msg : '';
}

function getString(obj: Record<string, unknown>, key: string, fallback = ''): string {
    const v = obj[key];
    return typeof v === 'string' ? v : String(v ?? fallback);
}

function getNullableString(obj: Record<string, unknown>, key: string): string | null {
    const v = obj[key];
    if (v == null) return null;
    return typeof v === 'string' ? v : String(v);
}

type DbUser = {
    id: string;
    name: string;
    role: string;
    isSuperAdmin: boolean;
    tenantId?: string | null;
};

function mapNexusUserRow(row: unknown): DbUser {
    const obj = asObject(row) ?? {};
    return {
        id: getString(obj, 'id'),
        name: getString(obj, 'name', getString(obj, 'full_name', getString(obj, 'email'))),
        role: getString(obj, 'role', 'עובד'),
        isSuperAdmin: Boolean(obj['is_super_admin'] ?? obj['isSuperAdmin'] ?? false),
        tenantId: getNullableString(obj, 'organization_id'),
    };
}

async function resolveOrCreateDbUser(params: {
    supabase: SupabaseClient;
    organizationId: string;
    email: string;
    authUser: unknown;
}): Promise<DbUser | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const authObj = asObject(params.authUser) ?? {};

    const existing = await params.supabase
        .from('nexus_users')
        .select('*')
        .eq('organization_id', params.organizationId)
        .eq('email', email)
        .limit(1)
        .maybeSingle();

    if (existing.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    if (!existing.error && existing.data?.id) {
        return mapNexusUserRow(existing.data);
    }

    const nowIso = new Date().toISOString();
    const name =
        getNullableString(authObj, 'firstName') && getNullableString(authObj, 'lastName')
            ? `${String(getNullableString(authObj, 'firstName') || '')} ${String(getNullableString(authObj, 'lastName') || '')}`.trim()
            : getNullableString(authObj, 'firstName') || getNullableString(authObj, 'lastName') || email;

    const role = getNullableString(authObj, 'role') ?? 'עובד';
    const avatarUrl = getNullableString(authObj, 'imageUrl');
    const isSuperAdmin = Boolean(authObj['isSuperAdmin']);

    const created = await params.supabase
        .from('nexus_users')
        .insert({
            organization_id: params.organizationId,
            name,
            email,
            role,
            avatar: avatarUrl || null,
            online: true,
            capacity: 0,
            is_super_admin: isSuperAdmin,
            created_at: nowIso,
            updated_at: nowIso,
        })
        .select('*')
        .single();

    if (created.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    if (created.error || !created.data?.id) {
        return null;
    }

    return mapNexusUserRow(created.data);
}

async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const supabase = createClient();

        const { workspace } = await getWorkspaceOrThrow(request);

        const bypassTenantIsolationE2e =
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === '1' ||
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === 'true';

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
        const allowUnscoped = bypassTenantIsolationE2e;
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        // Get user from database by email
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await resolveOrCreateDbUser({ supabase, organizationId: workspace.id, email: user.email, authUser: user });

        if (!dbUser || !dbUser.tenantId) {
            // Return empty array instead of error - user might not be synced yet
            return apiSuccess({ events: [] }, { status: 200 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const eventType = searchParams.get('event_type');
        const status = searchParams.get('status');

        // Build query
        let query = supabase.from('nexus_team_events').select('*').order('start_date', { ascending: true });
        query = query.eq('organization_id', workspace.id);

        if (startDate) {
            query = query.gte('start_date', startDate);
        }
        if (endDate) {
            query = query.lte('end_date', endDate);
        }
        if (eventType) {
            query = query.eq('event_type', eventType);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data: events, error } = await query;

        if (error) {
            console.error('[API] Error fetching team events:', error);
            if (error.code === '42703') {
                return apiError('[SchemaMismatch] nexus_team_events is missing organization_id', { status: 500 });
            }
            return apiError('שגיאה בטעינת אירועים', { status: 500 });
        }

        return apiSuccess({ events: events || [] }, { status: 200 });

    } catch (error: unknown) {
        const msg = getErrorMessage(error);
        console.error('[API] Error in /api/team-events GET:', { message: msg });
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: msg || error.message || 'Forbidden' });
        }
        if (msg.includes('Tenant Isolation') || msg.includes('No tenant scoping column')) {
            return apiSuccess({ events: [] }, { status: 200 });
        }
        return apiError(msg || 'שגיאה בטעינת אירועים', { status: msg.includes('Unauthorized') ? 401 : 500 });
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const supabase = createClient();

        const { workspace } = await getWorkspaceOrThrow(request);

        const bypassTenantIsolationE2e =
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === '1' ||
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === 'true';

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
        const allowUnscoped = bypassTenantIsolationE2e;
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        // Get user from database by email
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await resolveOrCreateDbUser({ supabase, organizationId: workspace.id, email: user.email, authUser: user });
        if (!dbUser) {
            return apiError('User not found in database. Please sync your account first.', { status: 404 });
        }

        const body: unknown = await request.json().catch(() => ({}));
        const bodyObj = asObject(body) ?? {};

        const title = getString(bodyObj, 'title');
        const description = getNullableString(bodyObj, 'description') ?? null;
        const eventType = getString(bodyObj, 'eventType');
        const startDate = getString(bodyObj, 'startDate');
        const endDate = getString(bodyObj, 'endDate');
        const allDay = Boolean(bodyObj['allDay'] ?? false);
        const location = getNullableString(bodyObj, 'location') ?? null;
        const status = getString(bodyObj, 'status', 'scheduled');
        const requiresApproval = Boolean(bodyObj['requiresApproval'] ?? false);
        const reminderDaysBeforeRaw = bodyObj['reminderDaysBefore'];
        const reminderDaysBefore = Number.isFinite(Number(reminderDaysBeforeRaw)) ? Number(reminderDaysBeforeRaw) : 1;

        const requiredAttendees = Array.isArray(bodyObj['requiredAttendees'])
            ? (bodyObj['requiredAttendees'] as unknown[]).map((x) => String(x)).filter(Boolean)
            : [];
        const optionalAttendees = Array.isArray(bodyObj['optionalAttendees'])
            ? (bodyObj['optionalAttendees'] as unknown[]).map((x) => String(x)).filter(Boolean)
            : [];

        const metadataRaw = bodyObj['metadata'];
        const metadata = asObject(metadataRaw) ?? {};

        // Validation
        if (!title || !eventType || !startDate || !endDate) {
            return apiError('כותרת, סוג אירוע, תאריך התחלה ותאריך סיום נדרשים', { status: 400 });
        }

        // Create event
        const insertRes = await supabase
            .from('nexus_team_events')
            .insert({
                organization_id: workspace.id,
                title,
                description,
                event_type: eventType,
                start_date: startDate,
                end_date: endDate,
                all_day: allDay,
                location,
                organizer_id: dbUser.id,
                required_attendees: requiredAttendees,
                optional_attendees: optionalAttendees,
                status,
                requires_approval: requiresApproval,
                reminder_days_before: reminderDaysBefore,
                metadata,
                created_by: dbUser.id
            })
            .select('*')
            .single();

        if (insertRes.error) {
            console.error('[API] Error creating team event:', insertRes.error);
            if (insertRes.error.code === '42703') {
                return apiError('[SchemaMismatch] nexus_team_events is missing organization_id', { status: 500 });
            }
            return apiError('שגיאה ביצירת אירוע', { status: 500 });
        }

        const event = insertRes.data;

        if (!event) {
            console.error('[API] Error creating team event: empty response');
            return apiError('שגיאה ביצירת אירוע', { status: 500 });
        }

        // Create attendance records for required and optional attendees
        if (event && (requiredAttendees.length > 0 || optionalAttendees.length > 0)) {
            const allAttendees = [...requiredAttendees, ...optionalAttendees];
            const attendanceRecords = allAttendees.map(attendeeId => ({
                organization_id: workspace.id,
                event_id: event.id,
                user_id: attendeeId,
                status: 'invited' as const
            }));

            const { error: attendanceError } = await supabase
                .from('nexus_event_attendance')
                .insert(attendanceRecords);

            if (attendanceError) {
                console.error('[API] Error creating attendance records:', attendanceError);
                // Don't fail the request, just log the error
            }
        }

        // Send notifications to required attendees
        if (event && requiredAttendees.length > 0) {
            try {
                const organizerName = dbUser?.name || 'מערכת';
                
                const notifications = requiredAttendees.filter((attendeeId: string) => attendeeId !== user.id).map((attendeeId: string) => ({
                    organization_id: workspace.id,
                    recipient_id: attendeeId,
                    type: 'team_event',
                    text: `הוזמנת לאירוע: ${title}`,
                    actor_id: dbUser.id,
                    actor_name: organizerName,
                    related_id: event.id,
                    is_read: false,
                    metadata: {
                        eventId: event.id,
                        eventTitle: title,
                        eventType: eventType,
                        startDate: startDate,
                        endDate: endDate,
                        location: location
                    },
                    created_at: new Date().toISOString()
                }));
                
                const { error: notifError } = await supabase
                    .from('misrad_notifications')
                    .insert(notifications);
                
                if (notifError) {
                    if (notifError.code !== '42P01' && !String(notifError.message || '').includes('does not exist')) {
                        throw new Error(`[SchemaMismatch] misrad_notifications insert failed: ${notifError.message}`);
                    }
                    console.warn('[API] Could not create event notifications:', notifError);
                }
            } catch (notifError: unknown) {
                const msg = getErrorMessage(notifError);
                if (String(msg || '').includes('[SchemaMismatch]')) {
                    throw notifError instanceof Error ? notifError : new Error(msg);
                }
                console.warn('[API] Error sending event notifications:', notifError);
                // Don't fail the request if notification fails
            }
        }

        return apiSuccess({ event, message: 'אירוע נוצר בהצלחה' }, { status: 201 });

    } catch (error: unknown) {
        const msg = getErrorMessage(error);
        console.error('[API] Error in /api/team-events POST:', { message: msg });
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: msg || error.message || 'Forbidden' });
        }
        return apiError(msg || 'שגיאה ביצירת אירוע', {
            status: msg.includes('Unauthorized') ? 401 : 500,
            message: msg || 'שגיאה ביצירת אירוע',
        });
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
