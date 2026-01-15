/**
 * Sync Clerk user with database user
 * 
 * This endpoint creates or updates a user in the database based on Clerk authentication
 * Call this after signing up in Clerk to ensure the user exists in the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, isTenantAdmin, getOwnedTenant } from '../../../../lib/auth';
import { getUsers, createRecord } from '../../../../lib/db';
import { User } from '../../../../types';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function POSTHandler(request: NextRequest) {
    try {
        // 1. Get authenticated Clerk user
        let clerkUser;
        try {
            clerkUser = await getAuthenticatedUser();
        } catch (authError: any) {
            // Development fallback - BUT DON'T CREATE DEV USER IN DATABASE
            if (process.env.NODE_ENV === 'development') {
                // Return error instead of creating dev user in database
                console.warn('[API] Development mode: Authentication failed. Cannot sync dev user to database.');
                return NextResponse.json(
                    { 
                        error: 'Unauthorized',
                        message: 'Development mode: Please authenticate with Clerk to sync user to database'
                    },
                    { status: 401 }
                );
            } else {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                );
            }
        }

        if (!clerkUser.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        const normalizedEmail = String(clerkUser.email).trim().toLowerCase();

        // Prevent creating dev@local.dev user in database
        if (normalizedEmail === 'dev@local.dev' || clerkUser.id === 'dev-user') {
            console.warn('[API] Preventing creation of dev user in database');
            return NextResponse.json(
                { 
                    error: 'Invalid user',
                    message: 'Cannot sync development fallback user to database'
                },
                { status: 400 }
            );
        }

        // 2. Check if user already exists in database
        const existingUsers = await getUsers({ email: normalizedEmail });
        const existingUser = existingUsers.length > 0 ? existingUsers[0] : null;

        if (existingUser) {
            // User already exists - return it with tenant info
            const tenant = await getOwnedTenant();
            const tenantAdminStatus = await isTenantAdmin(tenant?.id);
            return NextResponse.json({
                success: true,
                action: 'found',
                user: existingUser,
                tenant: tenant ? {
                    id: tenant.id,
                    name: tenant.name,
                    ownerEmail: tenant.ownerEmail
                } : null,
                isTenantAdmin: tenantAdminStatus,
                message: `User ${clerkUser.email} already exists in database`
            });
        }

        // 3. Get role from Clerk metadata or use default
        const role = clerkUser.role || 'עובד';
        const isSuperAdmin = clerkUser.isSuperAdmin || false;

        // 4. Create new user in database
        const newUserData: Omit<User, 'id'> = {
            name: clerkUser.firstName && clerkUser.lastName 
                ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
                : clerkUser.firstName || clerkUser.lastName || 'User',
            role: role,
            department: undefined, // Can be set later
            avatar: clerkUser.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(normalizedEmail)}&background=6366f1&color=fff`,
            online: true,
            capacity: 0,
            email: normalizedEmail,
            phone: undefined,
            location: undefined,
            bio: undefined,
            paymentType: undefined,
            hourlyRate: undefined,
            monthlySalary: undefined,
            commissionPct: undefined,
            bonusPerTask: undefined,
            accumulatedBonus: 0,
            streakDays: 0,
            weeklyScore: undefined,
            pendingReward: undefined,
            targets: undefined,
            notificationPreferences: {
                emailNewTask: true,
                browserPush: true,
                morningBrief: true,
                soundEffects: false,
                marketing: true
            },
            twoFactorEnabled: false,
            isSuperAdmin: isSuperAdmin,
            billingInfo: undefined
        };

        const newUser = await createRecord('users', newUserData) as User;

        // Get tenant info after creating user
        const tenant = await getOwnedTenant();
        const tenantAdminStatus = await isTenantAdmin(tenant?.id);

        return NextResponse.json({
            success: true,
            action: 'created',
            user: newUser,
            tenant: tenant ? {
                id: tenant.id,
                name: tenant.name,
                ownerEmail: tenant.ownerEmail
            } : null,
            isTenantAdmin: tenantAdminStatus,
            message: `User ${clerkUser.email} created successfully in database`
        });

    } catch (error: any) {
        console.error('[API] Error in /api/users/sync:', error);
        return NextResponse.json(
            { 
                error: error.message || 'Internal server error',
                details: error.stack
            },
            { status: 500 }
        );
    }
}

/**
 * GET endpoint to check sync status
 */
async function GETHandler(request: NextRequest) {
    try {
        // 1. Get authenticated Clerk user
        let clerkUser;
        try {
            clerkUser = await getAuthenticatedUser();
        } catch (authError: any) {
            // Don't create dev user in database
            if (process.env.NODE_ENV === 'development') {
                console.warn('[API] Development mode: Authentication failed. Cannot check sync status for dev user.');
                return NextResponse.json(
                    { 
                        error: 'Unauthorized',
                        message: 'Development mode: Please authenticate with Clerk'
                    },
                    { status: 401 }
                );
            } else {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                );
            }
        }

        if (!clerkUser.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        // Prevent checking dev@local.dev user
        const normalizedEmail = String(clerkUser.email).trim().toLowerCase();
        if (normalizedEmail === 'dev@local.dev' || clerkUser.id === 'dev-user') {
            return NextResponse.json(
                { 
                    error: 'Invalid user',
                    message: 'Cannot check sync status for development fallback user'
                },
                { status: 400 }
            );
        }

        // 2. Check if user exists in database
        const existingUsers = await getUsers({ email: normalizedEmail });
        const existingUser = existingUsers.length > 0 ? existingUsers[0] : null;

        return NextResponse.json({
            clerkUser: {
                id: clerkUser.id,
                email: clerkUser.email,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                role: clerkUser.role,
                isSuperAdmin: clerkUser.isSuperAdmin
            },
            databaseUser: existingUser,
            isSynced: !!existingUser,
            message: existingUser 
                ? `User ${normalizedEmail} is synced with database`
                : `User ${normalizedEmail} is NOT in database. Call POST /api/users/sync to create it.`
        });

    } catch (error: any) {
        console.error('[API] Error in /api/users/sync GET:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
