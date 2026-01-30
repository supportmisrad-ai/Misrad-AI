/**
 * API Route: Permissions
 * 
 * GET /api/permissions - Get all available permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '../../../lib/auth';
import { createClient } from '@/lib/supabase';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only users with manage_system permission can view permissions
        await requirePermission('manage_system');
        
        const supabase = createClient();

        const { data, error } = await supabase
            .from('misrad_permissions')
            .select('*')
            .order('id');

        if (error) {
            throw error;
        }

        const permissions = (data || []).map((p: any) => ({
            id: p.id,
            label: p.label,
            description: p.description,
            category: p.category || 'access',
        }));
        
        return NextResponse.json({ permissions });
        
    } catch (error: any) {
        console.error('[API] Error fetching permissions:', error);
        
        if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { error: error.message },
                { status: error.message.includes('Forbidden') ? 403 : 401 }
            );
        }
        
        return NextResponse.json(
            { error: 'Failed to fetch permissions' },
            { status: 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);
