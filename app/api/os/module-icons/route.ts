import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function GETHandler() {
  try {
    const row = await prisma.social_system_settings.findUnique({
      where: { key: 'module_icons' },
      select: { value: true },
    });

    const rawValue = (row as any)?.value;
    let parsedValue: any = null;
    if (rawValue && typeof rawValue === 'string') {
      try {
        parsedValue = JSON.parse(rawValue);
      } catch {
        parsedValue = null;
      }
    } else if (rawValue && typeof rawValue === 'object') {
      parsedValue = rawValue;
    }

    const moduleIcons = parsedValue && typeof parsedValue === 'object' ? parsedValue : {};

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
