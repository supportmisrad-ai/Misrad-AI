import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type OrgSummary = { id: string; slug: string | null; name: string };

async function getClerkServerAuth(): Promise<{ userId: string | null; error: string | null }> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    return { userId: userId || null, error: null };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error || '');
    return { userId: null, error: msg || 'Unknown error' };
  }
}

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const cookieStore = await cookies();
    const cookieNames = cookieStore
      .getAll()
      .map((c: { name: string }) => c.name)
      .slice(0, 200);

    const headerStore = await headers();
    const host = headerStore.get('host');
    const forwardedHost = headerStore.get('x-forwarded-host');
    const forwardedProto = headerStore.get('x-forwarded-proto');
    const forwardedFor = headerStore.get('x-forwarded-for');

    const clerkSecretKey = String(process.env.CLERK_SECRET_KEY || '').trim();
    const clerkPublishableKey = String(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '').trim();

    const { userId: clerkUserId, error: serverAuthError } = await getClerkServerAuth();
    
    if (!clerkUserId) {
      return NextResponse.json({
        status: 'not_authenticated',
        clerkUserId: null,
        serverAuthError,
        socialUser: null,
        organizations: [],
        request: {
          host,
          forwardedHost,
          forwardedProto,
          forwardedFor,
          cookieCount: cookieNames.length,
          cookieNames,
          hasSessionCookie:
            cookieNames.includes('__session') || cookieNames.some((n: string) => n.startsWith('__session_')),
          hasClerkDbJwt:
            cookieNames.includes('__clerk_db_jwt') || cookieNames.some((n: string) => n.startsWith('__clerk_db_jwt_')),
          hasClerkActiveContext: cookieNames.includes('clerk_active_context'),
        },
        env: {
          publishableKeyPrefix: clerkPublishableKey ? clerkPublishableKey.slice(0, 8) : null,
          secretKeyPrefix: clerkSecretKey ? clerkSecretKey.slice(0, 8) : null,
          secretKeyLooksValid:
            clerkSecretKey.startsWith('sk_test_') || clerkSecretKey.startsWith('sk_live_'),
        },
      });
    }

    const socialUser = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: clerkUserId },
      select: { 
        id: true, 
        organization_id: true,
        email: true,
        full_name: true,
        created_at: true,
      },
    });

    let organizations: OrgSummary[] = [];
    if (socialUser?.id) {
      const [ownedOrgs, memberOrgs] = await Promise.all([
        prisma.organization.findMany({
          where: { owner_id: socialUser.id },
          select: { id: true, slug: true, name: true },
        }),
        prisma.teamMember.findMany({
          where: { user_id: socialUser.id },
          select: {
            organization_id: true,
          },
        }),
      ]);

      const ids = new Set<string>();
      if (socialUser.organization_id) ids.add(String(socialUser.organization_id));
      for (const o of ownedOrgs || []) {
        if (o?.id) ids.add(String(o.id));
      }
      for (const m of memberOrgs || []) {
        if (m?.organization_id) ids.add(String(m.organization_id));
      }

      const unique = Array.from(ids).filter(Boolean);
      organizations = unique.length
        ? await prisma.organization.findMany({
            where: { id: { in: unique } },
            select: { id: true, slug: true, name: true },
          })
        : [];
    }

    return NextResponse.json({
      status: 'authenticated',
      clerkUserId,
      serverAuthError: null,
      socialUser,
      organizations,
      organizationCount: organizations.length,
      request: {
        host,
        forwardedHost,
        forwardedProto,
        forwardedFor,
        cookieCount: cookieNames.length,
        cookieNames,
        hasSessionCookie:
          cookieNames.includes('__session') || cookieNames.some((n: string) => n.startsWith('__session_')),
        hasClerkDbJwt:
          cookieNames.includes('__clerk_db_jwt') || cookieNames.some((n: string) => n.startsWith('__clerk_db_jwt_')),
        hasClerkActiveContext: cookieNames.includes('clerk_active_context'),
      },
      env: {
        publishableKeyPrefix: clerkPublishableKey ? clerkPublishableKey.slice(0, 8) : null,
        secretKeyPrefix: clerkSecretKey ? clerkSecretKey.slice(0, 8) : null,
        secretKeyLooksValid:
          clerkSecretKey.startsWith('sk_test_') || clerkSecretKey.startsWith('sk_live_'),
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
