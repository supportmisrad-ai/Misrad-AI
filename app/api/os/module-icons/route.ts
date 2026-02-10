import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

import { asObject } from '@/lib/shared/unknown';
async function GETHandler() {
  try {
    const row = await prisma.coreSystemSettings.findUnique({
      where: { key: 'module_icons' },
      select: { value: true },
    });

    const rawValue: unknown = row?.value;
    let parsedValue: unknown = null;
    if (rawValue && typeof rawValue === 'string') {
      try {
        parsedValue = JSON.parse(rawValue) as unknown;
      } catch {
        parsedValue = null;
      }
    } else if (asObject(rawValue)) {
      parsedValue = rawValue;
    }

    const moduleIcons = asObject(parsedValue) ?? {};

    return NextResponse.json(
      { moduleIcons },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      },
    );
  } catch {
    return NextResponse.json(
      { moduleIcons: {} },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      },
    );
  }
}

export const GET = shabbatGuard(GETHandler);
