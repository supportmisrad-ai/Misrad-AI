/**
 * Create Passkey API Route
 * 
 * Server-side endpoint for creating passkeys via Clerk
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function POSTHandler(request: NextRequest) {
    try {
        // 1. Authenticate user
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const user = await currentUser();
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // 2. Parse request body
        const bodyJson: unknown = await request.json().catch(() => ({}));
        const bodyObj = asObject(bodyJson) ?? {};
        const name = bodyObj.name == null ? undefined : String(bodyObj.name);

        // 3. Create passkey using Clerk's backend API
        // Note: This requires Clerk's backend SDK
        // You'll need to install @clerk/backend and use it here
        
        // For now, we'll use a workaround with Clerk's REST API
        const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
        if (!CLERK_SECRET_KEY) {
            return NextResponse.json(
                { error: 'Clerk secret key not configured' },
                { status: 500 }
            );
        }

        // Call Clerk's REST API to create passkey
        // This is a simplified version - you may need to adjust based on Clerk's actual API
        const clerkApiUrl = `https://api.clerk.com/v1/users/${userId}/passkeys`;
        
        const response = await fetch(clerkApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name || 'Scale CRM - זיהוי ביומטרי',
            }),
        });

        if (!response.ok) {
            const errorJson: unknown = await response.json().catch(() => null);
            const errorObj = asObject(errorJson) ?? {};
            const errorMessage = typeof errorObj.error === 'string' ? errorObj.error : getErrorMessage(errorJson);
            if (IS_PROD) console.error('Clerk API error');
            else console.error('Clerk API error:', errorJson);
            return NextResponse.json(
                { error: errorMessage || 'Failed to create passkey' },
                { status: response.status }
            );
        }

        const data: unknown = await response.json().catch(() => null);
        
        return NextResponse.json({
            success: true,
            passkey: data,
        });

    } catch (error: unknown) {
        if (IS_PROD) console.error('Passkey creation error');
        else console.error('Passkey creation error:', error);
        return NextResponse.json(
            { error: getErrorMessage(error) || 'Internal server error' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
