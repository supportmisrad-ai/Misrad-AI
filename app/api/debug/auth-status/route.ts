import { getCurrentUserId } from '@/lib/server/authHelper';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type OrgSummary = { id: string; slug: string | null; name: string };

export async function GET() {
  try {
    const clerkUserId = await getCurrentUserId();
    
    if (!clerkUserId) {
      return NextResponse.json({
        status: 'not_authenticated',
        clerkUserId: null,
        socialUser: null,
        organizations: [],
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
      socialUser,
      organizations,
      organizationCount: organizations.length,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
