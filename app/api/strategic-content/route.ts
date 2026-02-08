import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const dynamic = 'force-dynamic';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(req: Request) {
  const url = new URL(req.url);
  const moduleId = url.searchParams.get('module_id');
  const category = url.searchParams.get('category');

  if (!moduleId) {
    return NextResponse.json({ error: 'Missing module_id' }, { status: 400 });
  }

  try {
    const items = await prisma.strategic_content.findMany({
      where: {
        module_id: String(moduleId),
        ...(category ? { category: String(category) } : {}),
      },
      select: { id: true, category: true, title: true, content: true, module_id: true },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });

    return NextResponse.json({ items: items || [] });
  } catch (e: unknown) {
    const safeMsg = 'Failed';
    return NextResponse.json(
      { error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
      { status: 500 }
    );
  }
}

export const GET = shabbatGuard(GETHandler);
