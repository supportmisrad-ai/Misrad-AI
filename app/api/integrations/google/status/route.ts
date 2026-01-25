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

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getUsers } from '@/lib/db';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgIdFromHeader) {
            return NextResponse.json({ error: 'Missing organization context (x-org-id)' }, { status: 400 });
        }

        const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);

        const clerkUser = await getAuthenticatedUser();
        if (!clerkUser.email) {
            return NextResponse.json({
                status: {
                    calendar: { connected: false },
                    drive: { connected: false },
                },
            });
        }

        const bypassTenantIsolationE2e =
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === '1' ||
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === 'true';

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
        const allowUnscoped = bypassTenantIsolationE2e;
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return new NextResponse('Unscoped access forbidden in production', { status: 403 });
        }
        
        // Convert Clerk ID to Supabase UUID
        let dbUsers: any[] = [];
        try {
            dbUsers = await getUsers({
                email: clerkUser.email,
                tenantId: workspace.id,
                allowUnscoped: Boolean((clerkUser as any)?.isSuperAdmin) || bypassTenantIsolationE2e,
            });
        } catch {
            dbUsers = [];
        }
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;
        
        if (!dbUser) {
            return NextResponse.json({
                status: {
                    calendar: { connected: false },
                    drive: { connected: false }
                }
            });
        }
        
        const searchParams = request.nextUrl.searchParams;
        const service = searchParams.get('service');

        // If Supabase not configured, return empty status (integrations not available)
        if (!supabase) {
            return NextResponse.json({
                status: {
                    calendar: { connected: false },
                    drive: { connected: false }
                }
            });
        }

        const sb = supabase;

        const buildBaseQuery = () => {
            let q = sb
                .from('misrad_integrations')
                .select('*')
                .eq('user_id', dbUser.id)
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

        ({ data: integrations, error } = await buildBaseQuery().eq('tenant_id', workspace.id));

        if (error?.code === '42703') {
            ({ data: integrations, error } = await buildBaseQuery().eq('organization_id', workspace.id));
            if (error?.code === '42703') {
                return NextResponse.json({
                    status: {
                        calendar: { connected: false },
                        drive: { connected: false },
                    },
                });
            }
        }

        // If table doesn't exist or error, return empty status (not an error - just not configured yet)
        if (error) {
            // Check if it's a "table doesn't exist" error
            if (error.message?.includes('does not exist') || error.code === '42P01') {
                console.warn('[API] Integrations table not found. Run supabase-integrations-schema.sql to create it.');
                return NextResponse.json({
                    status: {
                        calendar: { connected: false },
                        drive: { connected: false }
                    }
                });
            }
            // For other errors, log but still return empty status
            console.warn('[API] Error fetching integrations (non-critical):', error.message);
            return NextResponse.json({
                status: {
                    calendar: { connected: false },
                    drive: { connected: false }
                }
            });
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

        return NextResponse.json({ status });

    } catch (error: any) {
        // Always return valid response, even on error
        console.warn('[API] Error getting integration status (non-critical):', error.message);
        return NextResponse.json({
            status: {
                calendar: { connected: false },
                drive: { connected: false }
            }
        });
    }
}


export const GET = shabbatGuard(GETHandler);
