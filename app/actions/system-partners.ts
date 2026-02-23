'use server';

import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type SystemPartnerRow = {
  id: string;
  name: string;
  type: string;
  referrals: number;
  revenue: number;
  commissionRate: number;
  unpaidCommission: number;
  lastActive: string | null;
  status: string;
  createdAt: string | null;
};

function toRow(row: Record<string, unknown>): SystemPartnerRow {
  const dec = (v: unknown): number => {
    if (v == null) return 0;
    if (v instanceof Prisma.Decimal) return v.toNumber();
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    type: String(row.type ?? 'affiliate'),
    referrals: Number(row.referrals ?? 0),
    revenue: dec(row.revenue),
    commissionRate: dec(row.commissionRate),
    unpaidCommission: dec(row.unpaidCommission),
    lastActive: row.lastActive ? String(row.lastActive) : null,
    status: String(row.status ?? 'active'),
    createdAt: row.createdAt ? new Date(row.createdAt as string).toISOString() : null,
  };
}

export async function getSystemPartners(): Promise<{
  success: boolean;
  data?: SystemPartnerRow[];
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };

    const rows = await prisma.systemPartner.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return createSuccessResponse(
      (rows || []).map((r) => toRow(r as unknown as Record<string, unknown>))
    );
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת שותפים');
  }
}

export async function createSystemPartner(input: {
  name: string;
  type?: string;
  commissionRate?: number;
}): Promise<{ success: boolean; data?: SystemPartnerRow; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    await requireSuperAdmin();

    const name = String(input.name || '').trim();
    if (!name) return createErrorResponse(null, 'שם חובה');

    const initials = name
      .split(/\s+/)
      .map((w) => w.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || '??';

    const row = await prisma.systemPartner.create({
      data: {
        name,
        type: String(input.type || 'affiliate'),
        commissionRate: new Prisma.Decimal(Number(input.commissionRate ?? 10)),
        status: 'active',
        referrals: 0,
        revenue: new Prisma.Decimal(0),
        unpaidCommission: new Prisma.Decimal(0),
        lastActive: new Date().toISOString(),
        avatar: initials,
      },
    });

    return createSuccessResponse(toRow(row as unknown as Record<string, unknown>));
  } catch (error) {
    return createErrorResponse(error, 'שגיאה ביצירת שותף');
  }
}

export async function updateSystemPartner(
  id: string,
  updates: {
    name?: string;
    type?: string;
    commissionRate?: number;
    status?: string;
    unpaidCommission?: number;
  }
): Promise<{ success: boolean; data?: SystemPartnerRow; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    await requireSuperAdmin();

    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = String(updates.name).trim();
    if (updates.type !== undefined) data.type = String(updates.type);
    if (updates.commissionRate !== undefined) data.commissionRate = new Prisma.Decimal(updates.commissionRate);
    if (updates.status !== undefined) data.status = String(updates.status);
    if (updates.unpaidCommission !== undefined) data.unpaidCommission = new Prisma.Decimal(updates.unpaidCommission);

    const row = await prisma.systemPartner.update({
      where: { id: String(id) },
      data: data as Prisma.SystemPartnerUpdateInput,
    });

    return createSuccessResponse(toRow(row as unknown as Record<string, unknown>));
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון שותף');
  }
}

export async function deleteSystemPartner(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    await requireSuperAdmin();

    await prisma.systemPartner.delete({ where: { id: String(id) } });
    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה במחיקת שותף');
  }
}

export async function markPartnerPaid(id: string): Promise<{ success: boolean; data?: SystemPartnerRow; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    await requireSuperAdmin();

    const row = await prisma.systemPartner.update({
      where: { id: String(id) },
      data: { unpaidCommission: new Prisma.Decimal(0) },
    });

    return createSuccessResponse(toRow(row as unknown as Record<string, unknown>));
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בסימון תשלום');
  }
}
