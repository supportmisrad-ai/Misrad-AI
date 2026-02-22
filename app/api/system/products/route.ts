import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

import prisma, { accelerateCache } from '@/lib/prisma';
import { requireSuperAdmin, isTenantAdmin, getAuthenticatedUser } from '@/lib/auth';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';

import type { ModuleId, Product } from '@/types';
import { DEFAULT_PRODUCTS } from '@/constants';

const IS_PROD = process.env.NODE_ENV === 'production';

const PRODUCTS_GLOBAL_KEY = 'products_catalog_v1';

function orgProductsKey(orgId: string): string {
  return `products_catalog_v1:${orgId}`;
}

function isModuleId(value: unknown): value is ModuleId {
  return (
    value === 'crm' ||
    value === 'finance' ||
    value === 'ai' ||
    value === 'team' ||
    value === 'content' ||
    value === 'assets' ||
    value === 'operations'
  );
}

function coerceProducts(value: unknown): Product[] | null {
  if (!Array.isArray(value)) return null;

  const products: Product[] = [];
  for (const raw of value) {
    const obj = asObject(raw);
    if (!obj) continue;

    const id = typeof obj.id === 'string' ? obj.id : String(obj.id ?? '');
    const name = typeof obj.name === 'string' ? obj.name : String(obj.name ?? '');
    const price = Number(obj.price ?? 0);
    const color = typeof obj.color === 'string' ? obj.color : String(obj.color ?? '');

    const modulesRaw = obj.modules;
    const modules = Array.isArray(modulesRaw)
      ? (modulesRaw as unknown[]).map((x) => String(x)).filter(isModuleId)
      : [];

    if (!id || !name || !Number.isFinite(price) || !color || modules.length === 0) continue;

    products.push({
      id,
      name,
      price,
      color,
      modules,
    });
  }

  return products.length > 0 ? products : null;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

async function readOrgProducts(orgId: string): Promise<Product[] | null> {
  const row = await prisma.coreSystemSettings.findUnique({
    where: { key: orgProductsKey(orgId) },
    select: { value: true },
    ...accelerateCache({ ttl: 60, swr: 120 }),
  });
  return row ? coerceProducts(row.value) : null;
}

async function readGlobalProducts(): Promise<Product[]> {
  const row = await prisma.coreSystemSettings.findUnique({
    where: { key: PRODUCTS_GLOBAL_KEY },
    select: { value: true },
    ...accelerateCache({ ttl: 60, swr: 120 }),
  });
  const list = coerceProducts(row?.value ?? null);
  return list ?? DEFAULT_PRODUCTS;
}

async function readProducts(orgId?: string): Promise<Product[]> {
  if (orgId) {
    const orgProducts = await readOrgProducts(orgId);
    if (orgProducts) return orgProducts;
  }
  return readGlobalProducts();
}

async function GETHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgKey = request.headers.get('x-org-id') || request.headers.get('x-orgid');
    let orgId: string | undefined;

    if (orgKey) {
      try {
        const { workspaceId } = await getWorkspaceByOrgKeyOrThrow(String(orgKey));
        orgId = workspaceId;
      } catch {
        // fall through to global products
      }
    }

    const products = await readProducts(orgId);
    return NextResponse.json({ products }, { status: 200 });
  } catch {
    return NextResponse.json({ products: DEFAULT_PRODUCTS }, { status: 200 });
  }
}

async function PATCHHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getAuthenticatedUser();
    const orgKey = request.headers.get('x-org-id') || request.headers.get('x-orgid');

    const body: unknown = await request.json().catch(() => null);
    const obj = asObject(body) ?? {};

    const nextList = coerceProducts(obj.products);
    if (!nextList) {
      return NextResponse.json({ error: 'Invalid products' }, { status: 400 });
    }

    // Determine target: org-specific or global
    let targetKey: string;
    let tenantContextOrgId: string | null = null;

    if (orgKey) {
      const { workspaceId } = await getWorkspaceByOrgKeyOrThrow(String(orgKey));
      tenantContextOrgId = workspaceId;
      targetKey = orgProductsKey(workspaceId);

      // Org-level: allow super admin OR org admin/CEO
      if (!user.isSuperAdmin) {
        const isOrgAdmin = await isTenantAdmin();
        if (!isOrgAdmin) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    } else {
      // Global catalog: super admin only
      await requireSuperAdmin();
      targetKey = PRODUCTS_GLOBAL_KEY;
    }

    try {
      const value = toJsonValue(nextList);

      const isolationCtx = tenantContextOrgId
        ? {
            source: 'api_system_products' as const,
            reason: 'PATCH org products' as const,
            organizationId: tenantContextOrgId,
          }
        : {
            source: 'api_system_products' as const,
            reason: 'PATCH global products' as const,
            mode: 'global_admin' as const,
            isSuperAdmin: true,
          };

      await withTenantIsolationContext(
        isolationCtx,
        async () =>
          await prisma.coreSystemSettings.upsert({
            where: { key: targetKey },
            create: {
              key: targetKey,
              value,
              updated_at: new Date(),
              created_at: new Date(),
            },
            update: {
              value,
              updated_at: new Date(),
            },
          })
      );
    } catch (e: unknown) {
      const safeMsg = 'Internal server error';
      return NextResponse.json(
        { error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, products: nextList }, { status: 200 });
  } catch (e: unknown) {
    const safeMsg = 'Forbidden';
    return NextResponse.json(
      { error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
      { status: 403 }
    );
  }
}

export const GET = shabbatGuard(GETHandler);
export const PATCH = shabbatGuard(PATCHHandler);
