import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getClientStrategiesAction, getMarketingStrategyAction } from '@/app/actions/marketing-strategy';

/**
 * GET /api/social/clients/[id]/strategies
 * Get all strategies for a client
 * protected:workspace - requireWorkspaceAccessByOrgSlugApi
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Auth check
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'נדרשת התחברות' }, { status: 401 });
    }

    // Get orgSlug from query params
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');

    if (!orgSlug) {
      return NextResponse.json(
        { success: false, error: 'חסר orgSlug ב-query parameters' },
        { status: 400 }
      );
    }

    // Resolve params
    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    // Get strategies list
    const result = await getClientStrategiesAction({
      orgSlug,
      clientId,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error fetching strategies:', error);
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת פנימית' },
      { status: 500 }
    );
  }
}
