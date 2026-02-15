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

function getRequiredStringField(obj: UnknownRecord, key: string): string {
  const v = obj[key];
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

function getNumberField(obj: UnknownRecord, key: string, fallback: number): number {
  const raw = obj[key];
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET() {
  return await withTenantIsolationContext(
    { source: 'api_landing_testimonials', reason: 'read_testimonials', suppressReporting: true },
    async () => {
      try {
        const testimonials = await prisma.landing_testimonials.findMany({
          where: { is_active: true },
          orderBy: { sort_order: 'asc' },
          select: {
            id: true,
            name: true,
            role: true,
            company: true,
            content: true,
            rating: true,
            image_url: true,
            video_url: true,
            cover_image_url: true,
            sort_order: true,
          },
        });

        return NextResponse.json({ 
          testimonials: testimonials.map(t => ({
            id: t.id,
            name: t.name,
            role: t.role,
            company: t.company,
            content: t.content,
            rating: t.rating,
            imageUrl: t.image_url,
            videoUrl: t.video_url,
            coverImageUrl: t.cover_image_url,
            sortOrder: t.sort_order,
          }))
        });
      } catch (error: unknown) {
        if (IS_PROD) console.error('Error fetching testimonials');
        else console.error('Error fetching testimonials:', error);
        return NextResponse.json(
          { error: 'Failed to fetch testimonials' },
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
    const testimonial = asObject(bodyObj.testimonial) ?? {};
    const testimonials = Array.isArray(bodyObj.testimonials) ? bodyObj.testimonials : null;

    return await withTenantIsolationContext(
      { source: 'api_landing_testimonials', reason: 'manage_testimonials', mode: 'global_admin', isSuperAdmin: true },
      async () => {
    if (action === 'create') {
      const name = getRequiredStringField(testimonial, 'name').trim();
      const role = getRequiredStringField(testimonial, 'role').trim();
      const company = getRequiredStringField(testimonial, 'company').trim();
      const content = getRequiredStringField(testimonial, 'content').trim();

      if (!name || !role || !company || !content) {
        return NextResponse.json({ error: 'Invalid testimonial payload' }, { status: 400 });
      }
      const created = await prisma.landing_testimonials.create({
        data: {
          name,
          role,
          company,
          content,
          rating: getNumberField(testimonial, 'rating', 5),
          image_url: getNullableStringField(testimonial, 'imageUrl'),
          video_url: getNullableStringField(testimonial, 'videoUrl'),
          cover_image_url: getNullableStringField(testimonial, 'coverImageUrl'),
          sort_order: getNumberField(testimonial, 'sortOrder', 0),
        },
      });
      return NextResponse.json({ success: true, testimonial: created });
    }

    if (action === 'update') {
      const id = getStringField(testimonial, 'id');
      if (!id.trim()) {
        return NextResponse.json({ error: 'Invalid testimonial payload' }, { status: 400 });
      }

      const name = getRequiredStringField(testimonial, 'name').trim();
      const role = getRequiredStringField(testimonial, 'role').trim();
      const company = getRequiredStringField(testimonial, 'company').trim();
      const content = getRequiredStringField(testimonial, 'content').trim();

      if (!name || !role || !company || !content) {
        return NextResponse.json({ error: 'Invalid testimonial payload' }, { status: 400 });
      }

      const updated = await prisma.landing_testimonials.update({
        where: { id },
        data: {
          name,
          role,
          company,
          content,
          rating: getNumberField(testimonial, 'rating', 5),
          image_url: getNullableStringField(testimonial, 'imageUrl'),
          video_url: getNullableStringField(testimonial, 'videoUrl'),
          cover_image_url: getNullableStringField(testimonial, 'coverImageUrl'),
          sort_order: getNumberField(testimonial, 'sortOrder', 0),
        },
      });
      return NextResponse.json({ success: true, testimonial: updated });
    }

    if (action === 'delete') {
      const id = getStringField(testimonial, 'id');
      if (!id.trim()) {
        return NextResponse.json({ error: 'Invalid testimonial payload' }, { status: 400 });
      }
      await prisma.landing_testimonials.delete({
        where: { id },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'reorder' && testimonials) {
      await Promise.all(
        testimonials.map((t, index: number) => {
          const row = asObject(t) ?? {};
          const id = row.id ? String(row.id) : '';
          if (!id) return Promise.resolve();
          return prisma.landing_testimonials.update({
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
    if (IS_PROD) console.error('Error saving testimonials');
    else console.error('Error saving testimonials:', error);
    const status = getUnknownErrorMessage(error).includes('Forbidden') ? 403 : 500;
    return NextResponse.json(
      { error: 'Failed to save testimonials' },
      { status }
    );
  }
}
