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
import { getErrorMessage } from '@/lib/server/workspace-access/utils';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

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

        let integrations: Awaited<ReturnType<typeof prisma.scale_integrations.findMany>> = [];
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
        } catch (error: unknown) {
            const msg = getErrorMessage(error);
            if (msg.includes('does not exist') || msg.includes('42P01')) {
                if (!ALLOW_SCHEMA_FALLBACKS) {
                    throw new Error(`[SchemaMismatch] scale_integrations missing table (${msg || 'missing relation'})`);
                }

                reportSchemaFallback({
                    source: 'app/api/integrations/google/status.GETHandler',
                    reason: 'scale_integrations missing table (fallback to connected=false)',
                    error,
                    extras: { workspaceId: String(workspace.id), dbUserId: String(dbUserId || ''), service: service ?? null },
                });
                if (IS_PROD) console.warn('[API] Integrations table not found');
                else console.warn('[API] Integrations table not found. Run supabase-integrations-schema.sql to create it.');
                return apiSuccess({
                    status: {
                        calendar: { connected: false },
                        drive: { connected: false }
                    }
                });
            }

            if ((msg.includes('does not exist') || msg.includes('relation') || msg.includes('column')) && ALLOW_SCHEMA_FALLBACKS) {
                reportSchemaFallback({
                    source: 'app/api/integrations/google/status.GETHandler',
                    reason: 'scale_integrations query schema mismatch (fallback to connected=false)',
                    error,
                    extras: { workspaceId: String(workspace.id), dbUserId: String(dbUserId || ''), service: service ?? null },
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
        const calendarIntegration = integrations.find((i) => i.service_type === 'google_calendar');
        const driveIntegration = integrations.find((i) => i.service_type === 'google_drive');

        const status = {
            calendar: calendarIntegration ? {
                connected: true,
                lastSynced: calendarIntegration.last_synced_at,
                metadata: calendarIntegration.metadata
            } : { connected: false },
            drive: driveIntegration ? {
                connected: true,
                lastSynced: driveIntegration.last_synced_at,
                metadata: driveIntegration.metadata
            } : { connected: false }
        };

        return apiSuccess({ status });

    } catch (error: unknown) {
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
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                      ? 'Unauthorized'
                      : error.status === 404
                        ? 'Not found'
                        : error.status === 500
                          ? 'Internal server error'
                          : 'Forbidden';
            return apiError(error, {
                status: error.status,
                message: IS_PROD ? safeMsg : error.message || safeMsg,
            });
        }
        if (IS_PROD) console.warn('[API] Error getting Google integration status (non-critical)');
        else console.warn('[API] Error getting Google integration status (non-critical):', getErrorMessage(error));
        return apiSuccess({
            status: {
                calendar: { connected: false },
                drive: { connected: false },
            },
        });
    }
}


export const GET = shabbatGuard(GETHandler);
