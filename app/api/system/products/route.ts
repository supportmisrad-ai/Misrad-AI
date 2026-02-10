import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

import type { ModuleId, Product } from '@/types';
import { DEFAULT_PRODUCTS } from '@/constants';

const PRODUCTS_SETTINGS_KEY = 'products_catalog_v1';

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

async function readProducts(): Promise<Product[]> {
  const row = await prisma.coreSystemSettings.findUnique({
    where: { key: PRODUCTS_SETTINGS_KEY },
    select: { value: true },
  });

  const rawValue: unknown = row?.value ?? null;
  const list = coerceProducts(rawValue);
  return list ?? DEFAULT_PRODUCTS;
}

async function GETHandler() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await readProducts();
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

    await requireSuperAdmin();

    const body: unknown = await request.json().catch(() => null);
    const obj = asObject(body) ?? {};

    const nextList = coerceProducts(obj.products);
    if (!nextList) {
      return NextResponse.json({ error: 'Invalid products' }, { status: 400 });
    }

    try {
      const value = toJsonValue(nextList);

      await withTenantIsolationContext(
        {
          source: 'api_system_products',
          reason: 'PATCH',
          mode: 'global_admin',
          isSuperAdmin: true,
        },
        async () =>
          await prisma.coreSystemSettings.upsert({
            where: { key: PRODUCTS_SETTINGS_KEY },
            create: {
              key: PRODUCTS_SETTINGS_KEY,
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
      return NextResponse.json({ error: getErrorMessage(e) || 'Failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, products: nextList }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) || 'Forbidden' }, { status: 403 });
  }
}

export const GET = shabbatGuard(GETHandler);
export const PATCH = shabbatGuard(PATCHHandler);
