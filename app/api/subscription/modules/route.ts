/**
 * Get purchased OS modules for the current authenticated user
 * 
 * This endpoint returns the OS modules available to the user based on their tenant's subscription.
 * For super admins, returns all modules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { getUsers, getTenants } from '../../../../lib/db';
import { OSModule } from '../../../../types/os-modules';

export async function GET(request: NextRequest) {
    try {
        // 1. Get authenticated Clerk user
        const clerkUser = await getAuthenticatedUser();

        // 2. Super admins get all modules
        if (clerkUser.isSuperAdmin) {
            return NextResponse.json({
                modules: ['system', 'nexus', 'social', 'finance', 'client'] as OSModule[]
            });
        }

        // 3. Find user in database to get tenantId
        if (!clerkUser.email) {
            // No email - return empty modules
            return NextResponse.json({
                modules: [] as OSModule[]
            });
        }

        const dbUsers = await getUsers({ email: clerkUser.email });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        // 4. Try to find tenant in two ways:
        //    a. By ownerEmail (if user owns the tenant)
        //    b. By tenantId from user record (if user belongs to a tenant)
        let tenant = null;

        // Try ownerEmail first
        const ownedTenants = await getTenants({ ownerEmail: clerkUser.email });
        if (ownedTenants.length > 0) {
            tenant = ownedTenants[0];
        } else if (dbUser?.tenantId) {
            // Try tenantId from user record
            const userTenants = await getTenants({ tenantId: dbUser.tenantId });
            if (userTenants.length > 0) {
                tenant = userTenants[0];
            }
        }

        // 5. Get modules from tenant
        if (!tenant || !tenant.modules || tenant.modules.length === 0) {
            // No tenant or no modules - return empty array
            // In production, you might want to return a default set or error
            return NextResponse.json({
                modules: [] as OSModule[]
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

