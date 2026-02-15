import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
type UnknownRecord = Record<string, unknown>;

const IS_PROD = process.env.NODE_ENV === 'production';

function getStringField(obj: UnknownRecord, key: string): string {
  const v = obj[key];
  return typeof v === 'string' ? v : '';
}

function getNullableStringField(obj: UnknownRecord, key: string): string | null {
  const v = obj[key];
  if (v == null) return null;
  if (typeof v === 'string') return v;
  return String(v);
}

function getNumberField(obj: UnknownRecord, key: string, fallback: number): number {
  const raw = obj[key];
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET() {
  return await withTenantIsolationContext(
    { source: 'api_landing_faq', reason: 'read_faq', suppressReporting: true },
    async () => {
      try {
        const faqs = await prisma.landing_faq.findMany({
          where: { is_active: true },
          orderBy: { sort_order: 'asc' },
          select: {
            id: true,
            question: true,
            answer: true,
            video_url: true,
            cover_image_url: true,
            sort_order: true,
          },
        });

        return NextResponse.json({ 
          faqs: faqs.map(f => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
            videoUrl: f.video_url,
            coverImageUrl: f.cover_image_url,
            sortOrder: f.sort_order,
          }))
        });
      } catch (error: unknown) {
        if (IS_PROD) console.error('Error fetching FAQ');
        else console.error('Error fetching FAQ:', error);
        return NextResponse.json(
          { error: 'Failed to fetch FAQ' },
          { status: 500 }
        );
      }
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body: unknown = await request.json();
    const bodyObj = asObject(body) ?? {};
    const action = typeof bodyObj.action === 'string' ? bodyObj.action : '';
    const faq = asObject(bodyObj.faq) ?? {};
    const faqs = Array.isArray(bodyObj.faqs) ? bodyObj.faqs : null;

    return await withTenantIsolationContext(
      { source: 'api_landing_faq', reason: 'manage_faq', mode: 'global_admin', isSuperAdmin: true },
      async () => {
    if (action === 'create') {
      const question = getStringField(faq, 'question');
      const answer = getStringField(faq, 'answer');
      if (!question.trim() || !answer.trim()) {
        return NextResponse.json({ error: 'Invalid FAQ payload' }, { status: 400 });
      }
      const created = await prisma.landing_faq.create({
        data: {
          question,
          answer,
          video_url: getNullableStringField(faq, 'videoUrl'),
          cover_image_url: getNullableStringField(faq, 'coverImageUrl'),
          sort_order: getNumberField(faq, 'sortOrder', 0),
        },
      });
      return NextResponse.json({ success: true, faq: created });
    }

    if (action === 'update') {
      const id = getStringField(faq, 'id');
      const question = getStringField(faq, 'question');
      const answer = getStringField(faq, 'answer');
      if (!id.trim() || !question.trim() || !answer.trim()) {
        return NextResponse.json({ error: 'Invalid FAQ payload' }, { status: 400 });
      }
      const updated = await prisma.landing_faq.update({
        where: { id },
        data: {
          question,
          answer,
          video_url: getNullableStringField(faq, 'videoUrl'),
          cover_image_url: getNullableStringField(faq, 'coverImageUrl'),
          sort_order: getNumberField(faq, 'sortOrder', 0),
        },
      });
      return NextResponse.json({ success: true, faq: updated });
    }

    if (action === 'delete') {
      const id = getStringField(faq, 'id');
      if (!id.trim()) {
        return NextResponse.json({ error: 'Invalid FAQ payload' }, { status: 400 });
      }
      await prisma.landing_faq.delete({
        where: { id },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'reorder' && faqs) {
      await Promise.all(
        faqs.map((f, index: number) => {
          const row = asObject(f) ?? {};
          const id = row.id ? String(row.id) : '';
          if (!id) return Promise.resolve();
          return prisma.landing_faq.update({
            where: { id },
            data: { sort_order: index },
          });
        })
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
      }
    );
  } catch (error: unknown) {
    if (IS_PROD) console.error('Error saving FAQ');
    else console.error('Error saving FAQ:', error);
    const status = getUnknownErrorMessage(error).includes('Forbidden') ? 403 : 500;
    return NextResponse.json(
      { error: 'Failed to save FAQ' },
      { status }
    );
  }
}
