'use server';

import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import { getBaseUrl } from '@/lib/utils';
import { MisradNotificationType, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';

type ConnectMarketplaceListingDelegate = {
  findUnique: (args: unknown) => Promise<unknown>;
  findFirst: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown[]>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
};

function isConnectMarketplaceListingDelegate(value: unknown): value is ConnectMarketplaceListingDelegate {
  const obj = asObject(value);
  if (!obj) return false;
  return (
    typeof obj.findUnique === 'function' &&
    typeof obj.findFirst === 'function' &&
    typeof obj.findMany === 'function' &&
    typeof obj.create === 'function' &&
    typeof obj.update === 'function'
  );
}

function getString(obj: Record<string, unknown>, key: string, fallback = ''): string {
  const value = obj[key];
  if (value == null) return fallback;
  return String(value);
}

function getNullableString(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key];
  if (value == null) return null;
  const str = String(value);
  return str;
}

function getDateIso(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function getConnectMarketplaceListingDelegate() {
  const prismaObj = asObject(prisma) ?? {};
  const delegate = prismaObj.connectMarketplaceListing;
  if (!delegate) {
    throw new Error(
      'Prisma Client is missing ConnectMarketplaceListing. Run Prisma generate (npm run prisma:generate) and restart the TS server.'
    );
  }

  if (!isConnectMarketplaceListingDelegate(delegate)) {
    throw new Error(
      'Prisma Client ConnectMarketplaceListing delegate is missing required methods. Run Prisma generate and restart the TS server.'
    );
  }

  return delegate;
}

async function generateConnectMarketplaceToken(): Promise<string> {
  const connectMarketplaceListing = getConnectMarketplaceListingDelegate();
  let token = '';
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    token = randomBytes(16).toString('hex').toUpperCase().substring(0, 32);

    const existing = await connectMarketplaceListing.findUnique({
      where: { token },
      select: { token: true },
    });

    if (!existing) {
      isUnique = true;
      break;
    }

    attempts++;
  }

  if (!isUnique || !token) {
    throw new Error('Failed to generate unique token');
  }

  return token;
}

export async function createConnectMarketplaceListing(params: {
  orgSlug: string;
  leadId: string;
  targetGeo?: string | null;
  category?: string | null;
  price?: string | number | null;
  askingPrice?: string | number | null;
  description?: string | null;
}): Promise<
  | { ok: true; token: string; url: string; publicUrl: string; listingId: string }
  | { ok: false; message: string }
> {
  try {
    const connectMarketplaceListing = getConnectMarketplaceListingDelegate();
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);

    const lead = await prisma.systemLead.findFirst({
      where: {
        id: String(params.leadId),
        organizationId: workspace.id,
      },
      select: {
        id: true,
      },
    });

    if (!lead?.id) {
      return { ok: false, message: 'ליד לא נמצא' };
    }

    const token = await generateConnectMarketplaceToken();

    const rawPrice =
      params.askingPrice !== undefined
        ? params.askingPrice
        : params.price !== undefined
          ? params.price
          : null;

    const price =
      rawPrice === null || rawPrice === undefined || String(rawPrice).trim() === '' || Number(rawPrice) === 0
        ? null
        : new Prisma.Decimal(String(rawPrice));

    const publicDescription = params.description == null ? null : String(params.description);

    const listing = await connectMarketplaceListing.create({
      data: {
        sourceOrgId: workspace.id,
        sourceOrgSlug: String(workspace.slug || params.orgSlug),
        sourceUserId: String(currentUser.id),
        leadId: String(params.leadId),
        targetGeo: params.targetGeo == null ? null : String(params.targetGeo),
        category: params.category == null ? null : String(params.category),
        price,
        publicDescription,
        status: 'LISTED',
        token,
      },
      select: {
        id: true,
        token: true,
      },
    });

    const listingObj = asObject(listing);
    const tokenOut = listingObj ? getString(listingObj, 'token') : '';
    const listingId = listingObj ? getString(listingObj, 'id') : '';
    if (!tokenOut || !listingId) {
      return { ok: false, message: 'שגיאה ביצירת לינק שיתוף' };
    }

    const base = getBaseUrl();
    const url = `${base}/connect/offer/${encodeURIComponent(tokenOut)}`;

    return { ok: true, token: tokenOut, url, publicUrl: url, listingId };
  } catch (e: unknown) {
    return { ok: false, message: getErrorMessage(e) || 'שגיאה ביצירת לינק שיתוף' };
  }
}

export type ConnectListingRequestDTO = {
  id: string;
  token: string;
  interestedName: string;
  interestedPhone: string;
  interestedAt: string;
  approvedAt: string | null;
  status: 'PENDING' | 'APPROVED';
};

export async function getConnectListingRequests(params: {
  orgSlug: string;
  leadId: string;
}): Promise<
  | { ok: true; requests: ConnectListingRequestDTO[] }
  | { ok: false; message: string }
> {
  try {
    const connectMarketplaceListing = getConnectMarketplaceListingDelegate();
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    await resolveWorkspaceCurrentUserForUi(params.orgSlug);

    const leadId = String(params.leadId || '').trim();
    if (!leadId) {
      return { ok: false, message: 'leadId חסר' };
    }

    const rows = await connectMarketplaceListing.findMany({
      where: {
        sourceOrgId: workspace.id,
        leadId,
        interestedAt: { not: null },
      },
      orderBy: [{ interestedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        token: true,
        interestedName: true,
        interestedPhone: true,
        interestedAt: true,
        approvedAt: true,
      },
    });

    const list = Array.isArray(rows) ? rows : [];
    const requests: ConnectListingRequestDTO[] = list
      .map((r) => {
        const obj = asObject(r) ?? {};
        const interestedAtIso = getDateIso(obj.interestedAt);
        if (!interestedAtIso) return null;
        const approvedAtIso = getDateIso(obj.approvedAt);

        return {
          id: getString(obj, 'id'),
          token: getString(obj, 'token'),
          interestedName: getString(obj, 'interestedName'),
          interestedPhone: getString(obj, 'interestedPhone'),
          interestedAt: interestedAtIso,
          approvedAt: approvedAtIso,
          status: approvedAtIso ? 'APPROVED' : 'PENDING',
        };
      })
      .filter((x): x is ConnectListingRequestDTO => Boolean(x && x.id && x.token));

    return { ok: true, requests };
  } catch (e: unknown) {
    return { ok: false, message: getErrorMessage(e) || 'שגיאה בטעינת בקשות' };
  }
}

export type ConnectOfferDTO = {
  token: string;
  status: string;
  targetGeo: string | null;
  category: string | null;
  price: string | null;
  publicDescription: string | null;
  lead: {
    id: string;
    name: string;
    company: string | null;
    installationAddress: string | null;
    phone: string | null;
    email: string | null;
  };
  interestedAt: string | null;
  approvedAt: string | null;
};

function sanitizeAddressToArea(address: string | null | undefined): string | null {
  const raw = String(address || '').trim();
  if (!raw) return null;

  // Prefer last part after comma (common: "street, city")
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const candidate = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
  // Remove digits and common separators to avoid leaking street/number.
  const cleaned = candidate.replace(/[0-9]/g, '').replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

export async function getConnectOfferByToken(params: {
  token: string;
}): Promise<{ ok: true; offer: ConnectOfferDTO } | { ok: false; message: string }> {
  try {
    const token = String(params.token || '').trim();
    if (!token) {
      return { ok: false, message: 'טוקן חסר' };
    }

    const connectMarketplaceListing = getConnectMarketplaceListingDelegate();

    const row = await connectMarketplaceListing.findUnique({
      where: { token },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            company: true,
            installationAddress: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    const rowObj = asObject(row);
    if (!rowObj || !rowObj.id) {
      return { ok: false, message: 'הצעה לא נמצאה' };
    }

    const leadObj = asObject(rowObj.lead) ?? {};
    const canDiscloseCustomerContact = rowObj.approvedAt != null;

    const leadName = canDiscloseCustomerContact ? getString(leadObj, 'name') : 'לקוח פרטי';
    const leadCompany = canDiscloseCustomerContact ? getNullableString(leadObj, 'company') : null;
    const leadArea = sanitizeAddressToArea(getNullableString(leadObj, 'installationAddress'));

    const offer: ConnectOfferDTO = {
      token: getString(rowObj, 'token'),
      status: getString(rowObj, 'status'),
      targetGeo: getNullableString(rowObj, 'targetGeo'),
      category: getNullableString(rowObj, 'category'),
      price: rowObj.price != null ? String(rowObj.price) : null,
      publicDescription: getNullableString(rowObj, 'publicDescription'),
      lead: {
        id: getString(leadObj, 'id'),
        name: leadName,
        company: leadCompany,
        installationAddress: leadArea,
        phone: canDiscloseCustomerContact ? getNullableString(leadObj, 'phone') : null,
        email: canDiscloseCustomerContact ? getNullableString(leadObj, 'email') : null,
      },
      interestedAt: getDateIso(rowObj.interestedAt),
      approvedAt: getDateIso(rowObj.approvedAt),
    };

    return { ok: true, offer };
  } catch (e: unknown) {
    return { ok: false, message: getErrorMessage(e) || 'שגיאה בטעינת הצעה' };
  }
}

async function createMisradNotification(params: {
  organizationId: string;
  recipientId: string;
  type: MisradNotificationType;
  title: string;
  message: string;
  link?: string | null;
}) {
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    await prisma.misradNotification.create({
      data: {
        organization_id: params.organizationId,
        recipient_id: params.recipientId,
        client_id: null,
        type: params.type,
        title: params.title,
        message: params.message,
        timestamp: nowIso,
        isRead: false,
        link: params.link ?? null,
        created_at: now,
        updated_at: now,
      },
    });
    return;
  } catch (e: unknown) {
    throw new Error(getErrorMessage(e) || 'Failed to create notification');
  }
}

export async function markConnectOfferInterested(params: {
  token: string;
  interestedName: string;
  interestedPhone: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const connectMarketplaceListing = getConnectMarketplaceListingDelegate();
    const token = String(params.token || '').trim();
    const interestedName = String(params.interestedName || '').trim();
    const interestedPhone = String(params.interestedPhone || '').trim();

    if (!token) return { ok: false, message: 'טוקן חסר' };
    if (!interestedName) return { ok: false, message: 'שם חסר' };
    if (!interestedPhone) return { ok: false, message: 'טלפון חסר' };

    const listing = await connectMarketplaceListing.findUnique({
      where: { token },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            assignedAgentId: true,
          },
        },
      },
    });

    const listingObj = asObject(listing);
    if (!listingObj || !listingObj.id) {
      return { ok: false, message: 'הצעה לא נמצאה' };
    }

    const leadObj = asObject(listingObj.lead) ?? {};

    await connectMarketplaceListing.update({
      where: { token },
      data: {
        interestedName,
        interestedPhone,
        interestedAt: new Date(),
        status: 'INTERESTED',
      },
    });

    const recipientId =
      getNullableString(listingObj, 'sourceUserId') ??
      getNullableString(leadObj, 'assignedAgentId');

    if (recipientId) {
      const link = `/w/${encodeURIComponent(getString(listingObj, 'sourceOrgSlug'))}/system/sales_leads?leadId=${encodeURIComponent(
        getString(leadObj, 'id')
      )}`;

      await createMisradNotification({
        organizationId: getString(listingObj, 'sourceOrgId'),
        recipientId,
        type: 'SYSTEM',
        title: 'MISRAD Connect: מישהו מעוניין בליד שלך',
        message: `${interestedName} (${interestedPhone}) ביקש לקבל את פרטי הלקוח לליד: ${getString(leadObj, 'name')}`,
        link,
      });
    }

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: getErrorMessage(e) || 'שגיאה בסימון מעוניין' };
  }
}

export async function approveConnectOfferDisclosure(params: {
  orgSlug: string;
  token: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const connectMarketplaceListing = getConnectMarketplaceListingDelegate();
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    await resolveWorkspaceCurrentUserForUi(params.orgSlug);

    const token = String(params.token || '').trim();
    if (!token) return { ok: false, message: 'טוקן חסר' };

    const listing = await connectMarketplaceListing.findUnique({
      where: { token },
      select: {
        id: true,
        sourceOrgId: true,
        interestedAt: true,
        approvedAt: true,
      },
    });

    const listingObj = asObject(listing);
    if (!listingObj || !listingObj.id) {
      return { ok: false, message: 'הצעה לא נמצאה' };
    }

    if (String(listingObj.sourceOrgId) !== String(workspace.id)) {
      return { ok: false, message: 'אין הרשאה' };
    }

    if (!listingObj.interestedAt) {
      return { ok: false, message: 'עדיין אין בקשת עניין להצעה הזו' };
    }

    if (listingObj.approvedAt) {
      return { ok: true };
    }

    await connectMarketplaceListing.update({
      where: { token },
      data: {
        approvedAt: new Date(),
        status: 'APPROVED',
      },
    });

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: getErrorMessage(e) || 'שגיאה באישור חשיפה' };
  }
}
