import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireSuperAdmin } from '@/lib/auth';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { logAuditEvent } from '@/lib/audit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';
function getErrorStatus(error: unknown, fallback = 403): number {
  const status = asObject(error)?.status;
  return typeof status === 'number' ? status : fallback;
}

function hasFunction(value: unknown, name: string): value is Record<string, (...args: unknown[]) => unknown> {
  const obj = asObject(value);
  const fn = obj?.[name];
  return typeof fn === 'function';
}

type LegacyDelegate = {
  findUnique?: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  findFirst?: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
};

function isLegacyDelegate(value: unknown): value is LegacyDelegate {
  if (!asObject(value)) return false;
  const hasAny = hasFunction(value, 'findUnique') || hasFunction(value, 'findFirst');
  return hasAny;
}

function getLegacyDelegate(name: string): LegacyDelegate {
  const clientObj = asObject(prisma as unknown);
  const delegate = clientObj?.[name];
  if (!isLegacyDelegate(delegate)) {
    throw new Error(`Prisma delegate ${name} is unavailable`);
  }
  return delegate;
}

async function GETHandler(req: NextRequest) {
  try {
    try {
      await requireSuperAdmin();
    } catch (e: unknown) {
      return NextResponse.json({ ok: false, error: getErrorMessage(e) || 'Forbidden - Super Admin required' }, { status: 403 });
    }

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized', clerkUserId: null }, { status: 401 });
    }

    const orgSlug = req.nextUrl.searchParams.get('orgSlug');
    if (!orgSlug) {
      return NextResponse.json({ ok: false, error: 'orgSlug is required' }, { status: 400 });
    }

    try {
      await getWorkspaceByOrgKeyOrThrow(orgSlug);
    } catch (e: unknown) {
      await logAuditEvent('data.read', 'debug.workspace-access', {
        success: false,
        details: { orgSlug, clerkUserId },
        error: getErrorMessage(e) || 'Forbidden',
      });

      return NextResponse.json({ ok: false, error: getErrorMessage(e) || 'Forbidden' }, { status: getErrorStatus(e, 403) });
    }

    let socialUser: Record<string, unknown> | null = null;
    let socialUserError: unknown = null;
    try {
      const delegate = getLegacyDelegate('social_users');
      const findUnique = delegate.findUnique;
      if (!findUnique || !hasFunction(delegate, 'findUnique')) throw new Error('Prisma delegate social_users.findUnique is unavailable');
      socialUser = await findUnique({
        where: { clerk_user_id: String(clerkUserId) },
        select: { id: true, clerk_user_id: true, email: true, full_name: true, organization_id: true, role: true },
      });
    } catch (e: unknown) {
      socialUserError = e;
    }

    let org: Record<string, unknown> | null = null;
    let orgError: unknown = null;
    try {
      const delegate = getLegacyDelegate('social_organizations');
      const findFirst = delegate.findFirst;
      if (!findFirst || !hasFunction(delegate, 'findFirst')) throw new Error('Prisma delegate social_organizations.findFirst is unavailable');
      org = await findFirst({
        where: {
          OR: [{ id: String(orgSlug) }, { slug: String(orgSlug) }],
        },
        select: { id: true, name: true, owner_id: true, has_client: true, has_nexus: true, has_social: true, has_system: true, has_finance: true },
      });
    } catch (e: unknown) {
      orgError = e;
    }

    const isOwner = Boolean(org?.owner_id && socialUser?.id && String(org.owner_id) === String(socialUser.id));
    const isPrimary = Boolean(org?.id && socialUser?.organization_id && String(socialUser.organization_id) === String(org.id));

    await logAuditEvent('data.read', 'debug.workspace-access', {
      details: {
        orgSlug,
        clerkUserId,
        access: {
          isOwner,
          isPrimary,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      orgSlug,
      clerkUserId,
      socialUser,
      socialUserError: socialUserError ? { message: getErrorMessage(socialUserError), code: String(asObject(socialUserError)?.code || '') } : null,
      org,
      orgError: orgError ? { message: getErrorMessage(orgError), code: String(asObject(orgError)?.code || '') } : null,
      access: {
        isOwner,
        isPrimary,
        canAccessWorkspace: isOwner || isPrimary,
        hasClientModule: org?.has_client ?? null,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) || 'Unknown error', stack: asObject(error)?.stack },
      { status: 500 }
    );
  }
}

export const GET = shabbatGuard(GETHandler);
