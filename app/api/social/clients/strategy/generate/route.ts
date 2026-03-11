import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { createMarketingStrategyAction } from '@/app/actions/marketing-strategy';
import prisma from '@/lib/prisma';

/**
 * POST /api/social/clients/strategy/generate
 * Generates a new marketing strategy for a client
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'נדרשת התחברות' }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const { orgSlug, clientId, profile } = body;

    if (!orgSlug || !clientId || !profile) {
      return NextResponse.json(
        { success: false, error: 'חסרים שדות חובה' },
        { status: 400 }
      );
    }

    // Call server action
    const result = await createMarketingStrategyAction({
      orgSlug,
      clientId,
      profile,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error generating strategy:', error);
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    );
  }
}
