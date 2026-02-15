import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getErrorMessage } from '@/lib/shared/unknown';

const IS_PROD = process.env.NODE_ENV === 'production';

type NexusClientCreateData = Parameters<typeof prisma.nexusClient.create>[0]['data'];
type NexusTaskCreateData = Parameters<typeof prisma.nexusTask.create>[0]['data'];

async function POSTHandler(request: NextRequest) {

    try {
        await requireSuperAdmin();
    } catch (e: unknown) {
        const safeMsg = 'Forbidden - Super Admin required';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg, success: false },
            { status: 403 }
        );
    }

    let workspaceId = '';
    try {
        const ws = await getWorkspaceOrThrow(request);
        workspaceId = String(ws.workspaceId || '').trim();
    } catch (e: unknown) {
        if (e instanceof APIError) {
            const safeMsg =
                e.status === 400
                    ? 'Bad request'
                    : e.status === 401
                        ? 'Unauthorized'
                        : e.status === 404
                            ? 'Not found'
                            : e.status === 500
                                ? 'Internal server error'
                                : 'Forbidden';
            return NextResponse.json(
                { success: false, error: IS_PROD ? safeMsg : e.message || safeMsg },
                { status: e.status }
            );
        }
        return NextResponse.json({ success: false, error: 'Missing x-org-id header' }, { status: 400 });
    }

    const testResults: Record<string, { success: boolean; error?: string; id?: string }> = {};

    // Test 1: Create a test client
    try {
        const testClient = {
            organizationId: workspaceId,
            name: 'Test Health Check',
            companyName: 'Health Check Company',
            contactPerson: 'Test User',
            email: 'test@healthcheck.local',
            phone: '050-0000000',
            package: 'Basic',
            status: 'Active',
            avatar: 'https://ui-avatars.com/api/?name=Test&background=6366f1&color=fff',
            joinedAt: new Date(),
            source: 'health_check'
        } satisfies NexusClientCreateData;

        const clientData = await prisma.nexusClient.create({ data: testClient });
        testResults.clients = { success: true, id: String(clientData.id) };

        // Clean up - delete the test record
        await prisma.nexusClient.deleteMany({ where: { id: clientData.id, organizationId: workspaceId } });
    } catch (error: unknown) {
        const safeMsg = 'Internal server error';
        testResults.clients = { success: false, error: IS_PROD ? safeMsg : getErrorMessage(error) };
    }

    // Test 2: Create a test task
    try {
        const testTask = {
            organizationId: workspaceId,
            title: 'Health Check Task',
            description: 'This is a test task for health check',
            status: 'pending',
            priority: 'Low',
            assigneeId: null,
            creatorId: null,
            dueDate: null,
            tags: ['health_check'],
            messages: []
        } satisfies NexusTaskCreateData;

        const taskData = await prisma.nexusTask.create({ data: testTask });
        testResults.tasks = { success: true, id: String(taskData.id) };

        // Clean up - delete the test record
        await prisma.nexusTask.deleteMany({ where: { id: taskData.id, organizationId: workspaceId } });
    } catch (error: unknown) {
        const safeMsg = 'Internal server error';
        testResults.tasks = { success: false, error: IS_PROD ? safeMsg : getErrorMessage(error) };
    }

    const allSuccess = Object.values(testResults).every(r => r.success);

    return NextResponse.json({
        status: allSuccess ? 'healthy' : 'partial',
        tests: testResults,
        timestamp: new Date().toISOString()
    });
}


export const POST = shabbatGuard(POSTHandler);
