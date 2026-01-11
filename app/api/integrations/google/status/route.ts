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

export async function GET(request: NextRequest) {
    try {
        const clerkUser = await getAuthenticatedUser();

        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        let workspaceId: string | null = null;
        if (orgIdFromHeader) {
            const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
            workspaceId = workspace.id;
        } else {
            // Strict mode: no unscoped integration status
            return NextResponse.json({
                status: {
                    calendar: { connected: false },
                    drive: { connected: false }
                }
            });
        }
        
        // Convert Clerk ID to Supabase UUID
        const dbUsers = await getUsers({ email: clerkUser.email, tenantId: workspaceId ?? undefined });
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

        let query = supabase
            .from('misrad_integrations')
            .select('*')
            .eq('user_id', dbUser.id) // Use Supabase UUID, not Clerk ID
            .eq('is_active', true);

        query = query.eq('tenant_id', workspaceId);

        if (service === 'calendar') {
            query = query.eq('service_type', 'google_calendar');
        } else if (service === 'drive') {
            query = query.eq('service_type', 'google_drive');
        } else {
            query = query.in('service_type', ['google_calendar', 'google_drive']);
        }

        let integrations: any[] | null = null;
        let error: any = null;
        ({ data: integrations, error } = await query);
        if (error?.code === '42703') {
            // Strict mode: schema mismatch (e.g. tenant_id missing) => treat as disconnected
            return NextResponse.json({
                status: {
                    calendar: { connected: false },
                    drive: { connected: false }
                }
            });
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

