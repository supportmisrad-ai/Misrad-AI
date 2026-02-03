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
import prisma from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function selectDbUserId(params: { workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const row = await prisma.nexusUser.findFirst({
        where: {
            email,
            organizationId: String(params.workspaceId),
        },
        select: { id: true },
    });

    return row?.id ? String(row.id) : null;
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

        // Convert Clerk email to Nexus user id
        const dbUserId = await selectDbUserId({ workspaceId: workspace.id, email: clerkUser.email });
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

        let integrations: any[] = [];
        try {
            integrations = await prisma.scale_integrations.findMany({
                where: {
                    user_id: String(dbUserId),
                    tenant_id: String(workspace.id),
                    is_active: true,
                    service_type:
                        service === 'calendar'
                            ? 'google_calendar'
                            : service === 'drive'
                                ? 'google_drive'
                                : { in: ['google_calendar', 'google_drive'] },
                },
            });
        } catch (error: any) {
            const msg = String(error?.message || '');
            if (msg.includes('does not exist') || msg.includes('42P01')) {
                console.warn('[API] Integrations table not found. Run supabase-integrations-schema.sql to create it.');
                return apiSuccess({
                    status: {
                        calendar: { connected: false },
                        drive: { connected: false }
                    }
                });
            }
            return apiSuccess({
                status: {
                    calendar: { connected: false },
                    drive: { connected: false },
                },
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

        return apiSuccess({ status });

    } catch (error: any) {
        if (error instanceof APIError) {
            // Status endpoints are optional; on screens like /login we may not have workspace context.
            if (error.status === 400) {
                return apiSuccess({
                    status: {
                        calendar: { connected: false },
                        drive: { connected: false },
                    },
                });
            }
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
