'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getBaseUrl } from '@/lib/utils';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import { requireSuperAdmin } from '@/lib/auth';


import { asObject, getErrorMessage } from '@/lib/shared/unknown';
function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type WorkListingDelegate = {
  findUnique: (args: unknown) => Promise<unknown>;
  findFirst: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown[]>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
};

function getWorkListingDelegate() {
  const prismaObj = asObject(prisma);
  const delegate = prismaObj?.workListing;
  if (!delegate || typeof delegate !== 'object') {
    throw new Error('Prisma Client is missing WorkListing. Run Prisma generate (npm run prisma:generate) and restart the TS server.');
  }
  return delegate as WorkListingDelegate;
}

function sanitizeAddressToArea(address: string | null | undefined): string | null {
  const raw = String(address || '').trim();
  if (!raw) return null;

  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const candidate = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
  const cleaned = candidate.replace(/[0-9]/g, '').replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

export type WorkListingDTO = {
  id: string;
  status: string;
  channel: string;
  title: string;
  targetGeo: string | null;
  price: string | null;
  interestedAt: string | null;
  interestedName: string | null;
  interestedPhone: string | null;
  createdAt: string;
  sourceOrgSlug: string;
};

export type PublicWorkListingDTO = {
  id: string;
  status: string;
  title: string;
  targetGeo: string | null;
  price: string | null;
  createdAt: string;
};

export async function createWorkListing(params: {
  orgSlug: string;
  leadId: string;
  mode: 'link' | 'marketplace';
  title?: string | null;
  targetGeo?: string | null;
  price?: string | number | null;
}): Promise<{ ok: true; id: string; publicUrl: string } | { ok: false; message: string }> {
  try {
    const workListing = getWorkListingDelegate();
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);

    const lead = await prisma.systemLead.findFirst({
      where: {
        id: String(params.leadId),
        organizationId: workspace.id,
      },
      select: {
        id: true,
        name: true,
        company: true,
        installationAddress: true,
      },
    });

    if (!lead?.id) {
      return { ok: false, message: 'ליד לא נמצא' };
    }

    const defaultTitle = String(lead.company || '').trim() || String(lead.name || '').trim() || 'עבודה חדשה';
    const title = String(params.title ?? defaultTitle).trim() || defaultTitle;

    const targetGeo = params.targetGeo != null ? String(params.targetGeo).trim() : sanitizeAddressToArea(lead.installationAddress);

    const rawPrice = params.price;
    const price =
      rawPrice === null || rawPrice === undefined || String(rawPrice).trim() === '' || Number(rawPrice) === 0
        ? null
        : new Prisma.Decimal(String(rawPrice));

    const channel = params.mode === 'marketplace' ? 'MARKETPLACE' : 'LINK';
    const status = params.mode === 'marketplace' ? 'PENDING' : 'ACTIVE';

    const row = await workListing.create({
      data: {
        sourceOrgId: workspace.id,
        sourceOrgSlug: String(workspace.slug || params.orgSlug),
        sourceUserId: String(currentUser.id),
        leadId: String(params.leadId),
        channel,
        status,
        title,
        targetGeo: targetGeo || null,
        price,
      },
      select: { id: true },
    });

    const id = String(asObject(row)?.id ?? '').trim();
    if (!id) {
      return { ok: false, message: 'שגיאה ביצירת Listing' };
    }

    const base = getBaseUrl();
    const publicUrl = `${base}/marketplace/offer/${encodeURIComponent(id)}`;

    return { ok: true, id, publicUrl };
  } catch (e: unknown) {
    return { ok: false, message: getErrorMessage(e) || 'שגיאה ביצירת Listing' };
  }
}

export async function getPublicWorkListingById(params: {
  id: string;
}): Promise<{ ok: true; listing: PublicWorkListingDTO } | { ok: false; message: string }> {
  try {
    const workListing = getWorkListingDelegate();
    const id = String(params.id || '').trim();
    if (!id) return { ok: false, message: 'id חסר' };

    const row = await workListing.findFirst({
      where: {
        id,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
      select: {
        id: true,
        status: true,
        title: true,
        targetGeo: true,
        price: true,
        createdAt: true,
      },
    });

    const obj = asObject(row);
    const rowId = String(obj?.id ?? '').trim();
    if (!rowId) return { ok: false, message: 'לא נמצא' };

    return {
      ok: true,
      listing: {
        id: rowId,
        status: String(obj?.status || ''),
        title: String(obj?.title || ''),
        targetGeo: obj?.targetGeo == null ? null : String(obj.targetGeo),
        price: obj?.price == null ? null : String(obj.price),
        createdAt: toIsoDate(obj?.createdAt) ?? new Date().toISOString(),
      },
    };
  } catch (e: unknown) {
    return { ok: false, message: getErrorMessage(e) || 'שגיאה בטעינת Listing' };
  }
}

export async function markWorkListingInterested(params: {
  id: string;
  interestedName: string;
  interestedPhone: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const workListing = getWorkListingDelegate();

    const id = String(params.id || '').trim();
    if (!id) return { ok: false, message: 'id חסר' };

    const interestedName = String(params.interestedName || '').trim();
    const interestedPhone = String(params.interestedPhone || '').trim();

    if (!interestedName) return { ok: false, message: 'שם חסר' };
    if (!interestedPhone) return { ok: false, message: 'טלפון חסר' };

    const updated = await workListing.update({
      where: { id },
      data: {
        interestedName,
        interestedPhone,
        interestedAt: new Date(),
        status: 'INTERESTED',
      },
      select: { id: true },
    });

    const updatedId = String(asObject(updated)?.id ?? '').trim();
    if (!updatedId) return { ok: false, message: 'לא עודכן' };

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: getErrorMessage(e) || 'שגיאה בשליחת הבקשה' };
  }
}

export async function getAdminWorkListings(params?: {
  limit?: number;
  status?: string;
}): Promise<{ ok: true; listings: WorkListingDTO[] } | { ok: false; message: string }> {
  try {
    await requireSuperAdmin();

    const workListing = getWorkListingDelegate();
    const limit = Math.max(1, Math.min(200, Number(params?.limit ?? 200)));
    const status = params?.status ? String(params.status).trim() : '';

    const rows = await workListing.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        status: true,
        channel: true,
        title: true,
        targetGeo: true,
        price: true,
        interestedAt: true,
        interestedName: true,
        interestedPhone: true,
        createdAt: true,
        sourceOrgSlug: true,
      },
    });

    const rowsList: unknown[] = Array.isArray(rows) ? rows : [];
    const listings: WorkListingDTO[] = rowsList.map((r) => {
      const obj = asObject(r) ?? {};
      return {
        id: String(obj.id ?? ''),
        status: String(obj.status || ''),
        channel: String(obj.channel || ''),
        title: String(obj.title || ''),
        targetGeo: obj.targetGeo == null ? null : String(obj.targetGeo),
        price: obj.price == null ? null : String(obj.price),
        interestedAt: obj.interestedAt ? toIsoDate(obj.interestedAt) : null,
        interestedName: obj.interestedName == null ? null : String(obj.interestedName),
        interestedPhone: obj.interestedPhone == null ? null : String(obj.interestedPhone),
        createdAt: toIsoDate(obj.createdAt) ?? new Date().toISOString(),
        sourceOrgSlug: String(obj.sourceOrgSlug || ''),
      };
    });

    return { ok: true, listings };
  } catch (e: unknown) {
    return { ok: false, message: getErrorMessage(e) || 'שגיאה בטעינת Listings' };
  }
}
