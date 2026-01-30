/**
 * API Route: Get Google Integration Status
 * 
 * GET /api/integrations/google/status
 * 
 * Returns status of Google integrations for current user
 * 
 * Query params:
 *   - service: Optional - 'calendar' | 'drive' to filter
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function selectDbUserId(params: { supabase: any; workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await params.supabase
        .from('nexus_users')
        .select('id')
        .eq('email', email)
        .eq('organization_id', params.workspaceId)
        .limit(1)
        .maybeSingle();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    return byOrg.data?.id ? String(byOrg.data.id) : null;
}
async function GETHandler(request: NextRequest) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);

        const clerkUser = await getAuthenticatedUser();
        if (!clerkUser.email) {
            return apiSuccess({
                status: {
                    calendar: { connected: false },
                    drive: { connected: false },
                },
            });
        }

        let sb: any;
        try {
            sb = createClient();
        } catch {
            return apiSuccess({
                status: {
                    calendar: { connected: false },
                    drive: { connected: false }
                }
            });
        }

        // Convert Clerk email to Supabase user id
        const dbUserId = await selectDbUserId({ supabase: sb, workspaceId: workspace.id, email: clerkUser.email });
        if (!dbUserId) {
            return apiSuccess({
                status: {
                    calendar: { connected: false },
                    drive: { connected: false }
                }
            });
        }
        
        const searchParams = request.nextUrl.searchParams;
        const service = searchParams.get('service');

        const buildBaseQuery = () => {
            let q = sb
                .from('misrad_integrations')
                .select('*')
                .eq('user_id', dbUserId)
                .eq('organization_id', workspace.id)
                .eq('is_active', true);

            if (service === 'calendar') {
                q = q.eq('service_type', 'google_calendar');
            } else if (service === 'drive') {
                q = q.eq('service_type', 'google_drive');
            } else {
                q = q.in('service_type', ['google_calendar', 'google_drive']);
            }

            return q;
        };

        let integrations: any[] | null = null;
        let error: any = null;

        ({ data: integrations, error } = await buildBaseQuery());

        // If table doesn't exist, return empty status
        if (error) {
            // Check if it's a "table doesn't exist" error
            if (error.message?.includes('does not exist') || error.code === '42P01') {
                console.warn('[API] Integrations table not found. Run supabase-integrations-schema.sql to create it.');
                return apiSuccess({
                    status: {
                        calendar: { connected: false },
                        drive: { connected: false }
                    }
                });
            }
            if (error.code === '42703') {
                return apiError('[SchemaMismatch] misrad_integrations is missing organization_id', { status: 500 });
            }
            throw error;
        }

        // Return status without sensitive tokens
        const status = {
            calendar: integrations?.find((i: any) => i.service_type === 'google_calendar') ? {
                connected: true,
                lastSynced: integrations.find((i: any) => i.service_type === 'google_calendar')?.last_synced_at,
                metadata: integrations.find((i: any) => i.service_type === 'google_calendar')?.metadata
            } : { connected: false },
            drive: integrations?.find((i: any) => i.service_type === 'google_drive') ? {
                connected: true,
                lastSynced: integrations.find((i: any) => i.service_type === 'google_drive')?.last_synced_at,
                metadata: integrations.find((i: any) => i.service_type === 'google_drive')?.metadata
            } : { connected: false }
        };

        return apiSuccess({ status });

    } catch (error: any) {
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        console.warn('[API] Error getting Google integration status (non-critical):', error.message);
        return apiSuccess({
            status: {
                calendar: { connected: false },
                drive: { connected: false },
            },
        });
    }
}


export const GET = shabbatGuard(GETHandler);
