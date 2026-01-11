/**
 * Get current authenticated user from database by Clerk email
 * 
 * This endpoint matches the Clerk user's email with a user in the users table
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, isTenantAdmin, getOwnedTenant } from '../../../../lib/auth';
import { getUsers } from '../../../../lib/db';

export async function GET(request: NextRequest) {
    try {
        // 1. Get authenticated Clerk user
        const clerkUser = await getAuthenticatedUser();

        if (!clerkUser.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        // 2. Find user in database by email
        const dbUsers = await getUsers({ email: clerkUser.email });
        const dbUser = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!dbUser) {
            // User not found in database - return Clerk user info with instructions
            // Log to console instead of returning warning in response (to avoid repeated toasts)
            console.warn(`[API] User with email ${clerkUser.email} not found in database.`);
            console.warn(`[API] To fix: Call POST /api/users/sync to automatically create the user, or add manually to Supabase.`);
            
            // Get tenant admin status even if user not in DB (for Clerk-only users)
            const tenant = await getOwnedTenant();
            const tenantAdminStatus = await isTenantAdmin(tenant?.id);

            return NextResponse.json({
                user: null,
                clerkUser: {
                    id: clerkUser.id,
                    email: clerkUser.email,
                    firstName: clerkUser.firstName,
                    lastName: clerkUser.lastName,
                    role: clerkUser.role,
                    isSuperAdmin: clerkUser.isSuperAdmin || false
                },
                tenant: tenant ? {
                    id: tenant.id,
                    name: tenant.name,
                    ownerEmail: tenant.ownerEmail
                } : null,
                isTenantAdmin: tenantAdminStatus,
                warning: `User with email ${clerkUser.email} not found in database`,
                matched: false,
                syncEndpoint: '/api/users/sync',
                instructions: 'Call POST /api/users/sync to automatically create this user in the database'
            }, { status: 200 });
        }

        // 3. Get tenant admin status and tenant info
        const tenant = await getOwnedTenant();
        const tenantAdminStatus = await isTenantAdmin(tenant?.id);

        // 4. Return matched user with tenant info
        return NextResponse.json({
            user: dbUser,
            clerkUser: {
                id: clerkUser.id,
                email: clerkUser.email,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                isSuperAdmin: clerkUser.isSuperAdmin || false,
                role: clerkUser.role || dbUser.role || 'עובד'
            },
            tenant: tenant ? {
                id: tenant.id,
                name: tenant.name,
                ownerEmail: tenant.ownerEmail
            } : null,
            isTenantAdmin: tenantAdminStatus,
            matched: true
        });

    } catch (error: any) {
        console.error('[API] Error in /api/users/me:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

