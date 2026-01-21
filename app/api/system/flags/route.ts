import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../../lib/auth';
import { getTenants } from '../../../../lib/db';
import { initDatabase } from '../../../../lib/db';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
/**
 * GET /api/system/flags
 * Get system flags for current tenant
 */
async function GETHandler(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try to get authenticated user, but don't fail if it doesn't work
        // This allows the API to work even if user is not fully synced
        let user;
        try {
            user = await getAuthenticatedUser();
        } catch (authError: any) {
            // In development, allow access without full user sync
            if (process.env.NODE_ENV === 'development') {
                console.warn('[API] Could not get authenticated user, using defaults:', authError.message);
                user = {
                    id: userId,
                    email: null,
                    firstName: null,
                    lastName: null,
                    imageUrl: null,
                    role: 'עובד',
                    isSuperAdmin: false
                };
            } else {
                // In production, return 401 if auth fails
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }
        
        // Note: All authenticated users can READ system flags (needed for ScreenGuard)
        // But only admins can UPDATE them (in PATCH method below)

        // Get tenant from multiple sources
        const searchParams = request.nextUrl.searchParams;
        const providedTenantId = searchParams.get('tenantId');
        
        let tenantId: string | null = providedTenantId || null;

        // Method 1: If tenantId was provided in query params (for super admin)
        if (!tenantId) {
            // Method 2: Try to get from subdomain
            const hostname = request.headers.get('host') || '';
            const subdomainMatch = hostname.match(/^([^.]+)\.nexus-os\.co$/);
            const subdomain = subdomainMatch ? subdomainMatch[1] : null;

            if (subdomain) {
                const tenants = await getTenants({ subdomain });
                if (tenants.length > 0) {
                    tenantId = tenants[0].id;
                }
            }

            // Method 3: If still no tenant, try to find by user's email (owner_email)
            if (!tenantId && user.email) {
                const tenants = await getTenants({ ownerEmail: user.email });
                if (tenants.length > 0) {
                    tenantId = tenants[0].id;
                }
            }
        }

        // Default flags if no tenant or no settings found
        const defaultFlags: Record<string, 'active' | 'maintenance' | 'hidden'> = {
            dashboard: 'active',
            tasks: 'active',
            calendar: 'active',
            clients: 'active',
            operations: 'active',
            team: 'active',
            reports: 'active',
            assets: 'active',
            trash: 'active',
            brain: 'active'
        };

        // If no tenant, return defaults (for super admin global view)
        if (!tenantId) {
            return NextResponse.json({ systemFlags: defaultFlags });
        }

        // Try to load from database
        const { supabase } = await import('../../../../lib/supabase');
        await initDatabase();
        
        if (supabase) {
            const { data, error } = await supabase
                .from('system_settings')
                .select('system_flags')
                .eq('tenant_id', tenantId)
                .limit(1)
                .maybeSingle();

            if (!error && data && data.system_flags) {
                // Merge defaults with saved flags
                const savedFlags = data.system_flags as Record<string, 'active' | 'maintenance' | 'hidden'>;
                return NextResponse.json({ 
                    systemFlags: { ...defaultFlags, ...savedFlags }
                });
            }
        }

        // Return defaults if no settings found
        return NextResponse.json({ systemFlags: defaultFlags });
    } catch (error: any) {
        console.error('[API] Error fetching system flags:', error);
        return NextResponse.json(
            { error: 'שגיאה בטעינת הגדרות מערכת' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/system/flags
 * Update system flag for a screen
 */
async function PATCHHandler(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            await requireSuperAdmin();
        } catch (e: any) {
            return NextResponse.json({ error: e?.message || 'Forbidden - Super Admin required' }, { status: 403 });
        }

        const user = await getAuthenticatedUser();

        const body = await request.json();
        const { screenId, status, tenantId: providedTenantId } = body;

        if (!screenId || !status) {
            return NextResponse.json(
                { error: 'Missing required fields: screenId, status' },
                { status: 400 }
            );
        }

        if (!['active', 'maintenance', 'hidden'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be: active, maintenance, or hidden' },
                { status: 400 }
            );
        }

        // Get tenant - try multiple methods
        let tenantId: string | null = providedTenantId || null;

        // Method 1: If tenantId was provided in request body (for super admin)
        if (!tenantId) {
            // Method 2: Try to get from subdomain
            const hostname = request.headers.get('host') || '';
            const subdomainMatch = hostname.match(/^([^.]+)\.nexus-os\.co$/);
            const subdomain = subdomainMatch ? subdomainMatch[1] : null;

            if (subdomain) {
                const tenants = await getTenants({ subdomain });
                if (tenants.length > 0) {
                    tenantId = tenants[0].id;
                }
            }

            // Method 3: If still no tenant, try to find by user's email (owner_email)
            if (!tenantId && user.email) {
                const tenants = await getTenants({ ownerEmail: user.email });
                if (tenants.length > 0) {
                    tenantId = tenants[0].id;
                }
            }
        }

        // If no tenant found and user is super admin, they can provide tenantId
        // Otherwise, return error
        if (!tenantId) {
            if (user.isSuperAdmin) {
                return NextResponse.json(
                    { error: 'Tenant not found. Please provide tenantId in request body when working without subdomain.' },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { error: 'Tenant not found. Cannot update system flags without tenant context.' },
                { status: 400 }
            );
        }

        // Load or create system settings
        const { supabase } = await import('../../../../lib/supabase');
        await initDatabase();
        
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database connection failed' },
                { status: 500 }
            );
        }

        // Get current settings
        const { data: existingSettings } = await supabase
            .from('system_settings')
            .select('system_flags')
            .eq('tenant_id', tenantId)
            .limit(1)
            .maybeSingle();

        const currentFlags = (existingSettings?.system_flags || {}) as Record<string, 'active' | 'maintenance' | 'hidden'>;
        const updatedFlags = { ...currentFlags, [screenId]: status };

        // Upsert settings
        const { error: upsertError } = await supabase
            .from('system_settings')
            .upsert({
                tenant_id: tenantId,
                system_flags: updatedFlags,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'tenant_id'
            });

        if (upsertError) {
            console.error('[API] Error saving system flags:', upsertError);
            return NextResponse.json(
                { error: 'שגיאה בשמירת הגדרות מערכת' },
                { status: 500 }
            );
        }

        // Log the change
        console.log(`[System Flag] ${screenId} → ${status} by ${user.email} for tenant ${tenantId}`);

        return NextResponse.json({
            success: true,
            message: `מסך ${screenId} עודכן ל-${status === 'maintenance' ? 'תחזוקה' : status === 'hidden' ? 'מוסתר' : 'פעיל'}`,
            screenId,
            status,
            systemFlags: updatedFlags
        });
    } catch (error: any) {
        console.error('[API] Error updating system flag:', error);
        return NextResponse.json(
            { error: 'שגיאה בעדכון הגדרות מערכת' },
            { status: 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);

export const PATCH = shabbatGuard(PATCHHandler);
