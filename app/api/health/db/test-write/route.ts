import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '../../../../../lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function POSTHandler(request: NextRequest) {

    try {
        await requireSuperAdmin();
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Forbidden - Super Admin required', success: false }, { status: 403 });
    }

    let workspaceId = '';
    try {
        const ws = await getWorkspaceOrThrow(request);
        workspaceId = String(ws.workspaceId || '').trim();
    } catch (e: any) {
        if (e instanceof APIError) {
            return NextResponse.json({ success: false, error: e.message || 'Missing x-org-id header' }, { status: e.status });
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
        };

        const clientData = await prisma.nexusClient.create({ data: testClient as any });
        testResults.clients = { success: true, id: String((clientData as any).id) };

        // Clean up - delete the test record
        await prisma.nexusClient.delete({ where: { id: (clientData as any).id } });
    } catch (error: any) {
        testResults.clients = { success: false, error: error.message };
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
        };

        const taskData = await prisma.nexusTask.create({ data: testTask as any });
        testResults.tasks = { success: true, id: String((taskData as any).id) };

        // Clean up - delete the test record
        await prisma.nexusTask.delete({ where: { id: (taskData as any).id } });
    } catch (error: any) {
        testResults.tasks = { success: false, error: error.message };
    }

    const allSuccess = Object.values(testResults).every(r => r.success);

    return NextResponse.json({
        status: allSuccess ? 'healthy' : 'partial',
        tests: testResults,
        timestamp: new Date().toISOString()
    });
}


export const POST = shabbatGuard(POSTHandler);
