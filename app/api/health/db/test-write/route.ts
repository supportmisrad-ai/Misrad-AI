import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../../lib/supabase';
import { requireSuperAdmin } from '../../../../../lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function POSTHandler() {
    try {
        await requireSuperAdmin();
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Forbidden - Super Admin required', success: false }, { status: 403 });
    }

    if (!isSupabaseConfigured || !supabase) {
        return NextResponse.json({
            error: 'Supabase not configured',
            success: false
        }, { status: 500 });
    }

    const testResults: Record<string, { success: boolean; error?: string; id?: string }> = {};

    // Test 1: Create a test client
    try {
        const testClient = {
            name: 'Test Health Check',
            company_name: 'Health Check Company',
            contact_person: 'Test User',
            email: 'test@healthcheck.local',
            phone: '050-0000000',
            package: 'Basic',
            status: 'Active',
            avatar: 'https://ui-avatars.com/api/?name=Test&background=6366f1&color=fff',
            joined_at: new Date().toISOString(),
            source: 'health_check'
        };

        const { data: clientData, error: clientError } = await supabase
            .from('nexus_clients')
            .insert(testClient)
            .select()
            .single();

        if (clientError) {
            testResults.clients = { success: false, error: clientError.message };
        } else {
            testResults.clients = { success: true, id: clientData.id };
            
            // Clean up - delete the test record
            await supabase.from('nexus_clients').delete().eq('id', clientData.id);
        }
    } catch (error: any) {
        testResults.clients = { success: false, error: error.message };
    }

    // Test 2: Create a test task
    try {
        const testTask = {
            title: 'Health Check Task',
            description: 'This is a test task for health check',
            status: 'pending',
            priority: 'Low',
            assignee_id: null,
            creator_id: null,
            due_date: null,
            tags: ['health_check'],
            messages: []
        };

        const { data: taskData, error: taskError } = await supabase
            .from('nexus_tasks')
            .insert(testTask)
            .select()
            .single();

        if (taskError) {
            testResults.tasks = { success: false, error: taskError.message };
        } else {
            testResults.tasks = { success: true, id: taskData.id };
            
            // Clean up - delete the test record
            await supabase.from('nexus_tasks').delete().eq('id', taskData.id);
        }
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
