import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, isTenantAdmin } from '@/lib/auth';
import { getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import prisma from '@/lib/prisma';

async function requireTelephonyAccess(): Promise<void> {
    const user = await getAuthenticatedUser();
    if (user.isSuperAdmin) return;
    const isAdmin = await isTenantAdmin();
    if (isAdmin) return;
    throw new Error('Forbidden - Missing permission: manage telephony settings');
}

/**
 * Monthly Telephony Reports API
 * GET /api/telephony/reports/monthly
 * 
 * Returns call statistics for the current month:
 * - Total calls (inbound/outbound)
 * - Average call duration
 * - Calls by agent
 * - Calls by day
 */
export async function GET(request: NextRequest) {
    try {
        await requireTelephonyAccess();

        const { workspace } = await getWorkspaceOrThrow(request);
        const orgId = String(workspace.id);

        // Get date range for current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Fetch all call activities for the month
        const calls = await prisma.systemLeadActivity.findMany({
            where: {
                organizationId: orgId,
                type: 'call',
                timestamp: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            select: {
                id: true,
                direction: true,
                timestamp: true,
                metadata: true,
                lead: {
                    select: {
                        assignedAgentId: true
                    }
                }
            }
        });

        // Calculate statistics
        const totalCalls = calls.length;
        const inboundCalls = calls.filter(c => c.direction === 'inbound').length;
        const outboundCalls = calls.filter(c => c.direction === 'outbound').length;

        const durations = calls
            .map(c => {
                const meta = c.metadata as any;
                return meta?.duration || 0;
            })
            .filter(d => d > 0);

        const totalDuration = durations.reduce((sum, d) => sum + d, 0);
        const avgDuration = durations.length > 0 ? Math.round(totalDuration / durations.length) : 0;

        // Calls by agent
        const callsByAgent: Record<string, number> = {};
        calls.forEach(call => {
            const agentId = call.lead?.assignedAgentId || 'unassigned';
            callsByAgent[agentId] = (callsByAgent[agentId] || 0) + 1;
        });

        // Calls by day
        const callsByDay: Record<string, number> = {};
        calls.forEach(call => {
            if (call.timestamp) {
                const day = call.timestamp.toISOString().split('T')[0];
                callsByDay[day] = (callsByDay[day] || 0) + 1;
            }
        });

        return NextResponse.json({
            success: true,
            period: {
                start: startOfMonth.toISOString(),
                end: endOfMonth.toISOString()
            },
            summary: {
                totalCalls,
                inboundCalls,
                outboundCalls,
                totalDurationSeconds: totalDuration,
                averageDurationSeconds: avgDuration
            },
            callsByAgent,
            callsByDay
        });

    } catch (error) {
        console.error('[Telephony Reports] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
