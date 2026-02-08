/**
 * Get purchased OS modules for the current authenticated user
 * 
 * This endpoint returns the OS modules available to the user based on their tenant's subscription.
 * For super admins, returns all modules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { OSModule } from '../../../../types/os-modules';
import { DEFAULT_OS_MODULE_PRIORITY } from '@/lib/os/modules/registry';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(request: NextRequest) {
    try {
        // 1. Get authenticated Clerk user
        const clerkUser = await getAuthenticatedUser();

        if (clerkUser.isSuperAdmin) {
            return NextResponse.json({
                modules: DEFAULT_OS_MODULE_PRIORITY as OSModule[]
            });
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        const entitlements = asObject(workspace?.entitlements) ?? {};
        const enabled = (DEFAULT_OS_MODULE_PRIORITY as OSModule[]).filter((m) => Boolean(entitlements[m]));

        return NextResponse.json({
            modules: enabled as OSModule[]
        });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/subscription/modules');
        else console.error('[API] Error in /api/subscription/modules:', error);
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        const message = getErrorMessage(error);
        const safeMsg = 'Internal server error';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : message || safeMsg },
            { status: 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);
