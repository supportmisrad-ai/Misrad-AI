/**
 * Get purchased OS modules for the current authenticated user
 * 
 * This endpoint returns the OS modules available to the user based on their tenant's subscription.
 * For super admins, returns all modules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { getTenants } from '../../../../lib/db';
import { OSModule } from '../../../../types/os-modules';
import { createServiceRoleClient } from '../../../../lib/supabase';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        const orgHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgHeader) {
            return NextResponse.json({ error: 'Missing organization context (x-org-id)' }, { status: 400 });
        }
        const workspace = await requireWorkspaceAccessByOrgSlugApi(orgHeader);

        // 1. Get authenticated Clerk user
        const clerkUser = await getAuthenticatedUser();

        // 2. Find user in database to get tenantId
        if (!clerkUser.email) {
            // No email - return empty modules
            return NextResponse.json({
                modules: [] as OSModule[]
            });
        }

        const getOrgModulesFallback = async (): Promise<OSModule[] | null> => {
            const orgId = workspace?.id ? String(workspace.id) : null;
            if (!orgId) return null;

            let db = null as any;
            try {
                db = createServiceRoleClient();
            } catch {
                return null;
            }

            try {
                const { data: org, error } = await db
                    .from('organizations')
                    .select('has_nexus, has_system, has_social, has_finance, has_client, has_operations')
                    .eq('id', orgId)
                    .maybeSingle();

                if (error && (error as any).code === '42703') {
                    const fallback = await db
                        .from('organizations')
                        .select('has_nexus, has_system, has_social, has_finance, has_client')
                        .eq('id', orgId)
                        .maybeSingle();
                    if (fallback.error) return null;

                    const o = fallback.data as any;
                    const modules: OSModule[] = ['nexus'];
                    if (o?.has_system) modules.push('system');
                    if (o?.has_social) modules.push('social');
                    if (o?.has_finance) modules.push('finance');
                    if (o?.has_client) modules.push('client');
                    return modules;
                }

                if (error || !org) return null;

                const modules: OSModule[] = ['nexus'];
                if ((org as any)?.has_system) modules.push('system');
                if ((org as any)?.has_social) modules.push('social');
                if ((org as any)?.has_finance) modules.push('finance');
                if ((org as any)?.has_client) modules.push('client');
                if ((org as any)?.has_operations) modules.push('operations');
                return modules;
            } catch {
                return null;
            }
        };

        // 4. Try to find tenant in two ways:
        //    a. By ownerEmail (if user owns the tenant)
        //    b. By tenantId from user record (if user belongs to a tenant)
        let tenant = null;

        // Try ownerEmail first
        const userTenants = await getTenants({ tenantId: workspace.id });
        if (userTenants.length > 0) {
            tenant = userTenants[0];
        }

        // 5. Get modules from tenant
        if (!tenant || !tenant.modules || tenant.modules.length === 0) {
            const fallbackModules = await getOrgModulesFallback();
            return NextResponse.json({
                modules: (fallbackModules || []) as OSModule[]
            });
        }

        // 6. Convert ModuleId[] to OSModule[] 
        // Tenant.modules is ModuleId[] (from old system: 'crm', 'finance', 'content', 'ai', 'team')
        // We need OSModule[] (new system: 'system', 'nexus', 'social', 'finance', 'client')
        const tenantModules = tenant.modules;
        
        // Map ModuleId to OSModule
        // This mapping defines which OS modules are included based on tenant's ModuleId subscriptions
        const moduleIdToOSModuleMap: Record<string, OSModule[]> = {
            'crm': ['system'],           // CRM maps to System OS
            'finance': ['finance'],      // Finance maps to Finance OS
            'content': ['social'],       // Content maps to Social OS
            'ai': ['nexus'],             // AI maps to Nexus OS
            'team': ['nexus'],           // Team management is in Nexus OS
            // Direct OSModule mappings (if tenant.modules already contains OSModule values)
            'system': ['system'],
            'nexus': ['nexus'],
            'social': ['social'],
            'client': ['client'],
            'operations': ['operations'],
        };

        // Convert ModuleId[] to OSModule[] by mapping each module
        const osModulesSet = new Set<OSModule>();
        for (const module of tenantModules) {
            const mappedModules = moduleIdToOSModuleMap[module] || [];
            mappedModules.forEach(osModule => osModulesSet.add(osModule));
        }

        // Always include 'nexus' as it's the main OS (unless explicitly disabled)
        // You can remove this if you want strict module control
        if (tenantModules.length > 0) {
            osModulesSet.add('nexus');
        }

        const osModules = Array.from(osModulesSet);

        return NextResponse.json({
            modules: osModules as OSModule[]
        });

    } catch (error: any) {
        console.error('[API] Error in /api/subscription/modules:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);
