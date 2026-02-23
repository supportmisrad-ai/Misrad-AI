/**
 * WAAM-It Blaster Webhook Handler
 * POST /api/webhooks/blaster
 *
 * Receives webhook events from the WhatsApp bot (WAAM-It Blaster).
 * Stores lead data and conversation history in BotLead / BotConversation.
 *
 * Query params:
 *   type = lead | signup | demo | support
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getErrorMessage } from '@/lib/shared/unknown';

const BLASTER_SECRET = process.env.BLASTER_WEBHOOK_SECRET;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: NextRequest) {
  try {
    // Optional secret validation
    if (BLASTER_SECRET) {
      const authHeader = req.headers.get('x-webhook-secret') ?? '';
      if (authHeader !== BLASTER_SECRET) {
        return json({ error: 'Unauthorized' }, 401);
      }
    }

    const body: Record<string, unknown> = await req.json().catch(() => ({}));
    const type = req.nextUrl.searchParams.get('type') ?? 'lead';

    const phone = String(body.phone ?? body.Phone ?? body.from ?? '').replace(/\D/g, '');
    if (!phone) {
      return json({ error: 'Missing phone' }, 400);
    }

    const name = String(body.name ?? body.USER_NAME ?? body.Name ?? '').trim() || null;
    const businessName = String(body.business ?? body.BUSINESS_NAME ?? body.Business ?? '').trim() || null;
    const email = String(body.email ?? body.USER_EMAIL ?? body.Email ?? '').trim() || null;
    const industry = String(body.industry ?? body.INDUSTRY ?? '').trim() || null;
    const orgSize = String(body.org_size ?? body.ORG_SIZE ?? '').trim() || null;
    const painPoint = String(body.pain_point ?? body.PAIN_POINT ?? '').trim() || null;
    const selectedPlan = String(body.selected_plan ?? body.SELECTED_PLAN ?? '').trim() || null;
    const message = String(body.message ?? body.Message ?? body.response ?? '').trim() || null;
    const ruleId = String(body.rule_id ?? body.RuleId ?? '').trim() || null;
    const source = String(body.source ?? body.Source ?? 'whatsapp').trim();

    // Upsert lead — idempotent, no interactive transaction (PgBouncer safe)
    const lead = await prisma.botLead.upsert({
      where: { phone },
      create: {
        phone,
        name,
        business_name: businessName,
        email,
        industry,
        org_size: orgSize,
        pain_point: painPoint,
        selected_plan: selectedPlan,
        source,
        status: type === 'signup' ? 'trial' : type === 'demo' ? 'demo_booked' : 'new',
        last_interaction: new Date(),
      },
      update: {
        ...(name ? { name } : {}),
        ...(businessName ? { business_name: businessName } : {}),
        ...(email ? { email } : {}),
        ...(industry ? { industry } : {}),
        ...(orgSize ? { org_size: orgSize } : {}),
        ...(painPoint ? { pain_point: painPoint } : {}),
        ...(selectedPlan ? { selected_plan: selectedPlan } : {}),
        last_interaction: new Date(),
        ...(type === 'signup' ? { status: 'trial' as const } : {}),
        ...(type === 'demo' ? { status: 'demo_booked' as const } : {}),
      },
    });

    // Log conversation entry
    if (message) {
      await prisma.botConversation.create({
        data: {
          lead_id: lead.id,
          direction: 'in',
          message,
          rule_id: ruleId,
          variables: body as object,
        },
      });
    }

    // Score bumps
    let scoreDelta = 1;
    if (type === 'signup') scoreDelta = 50;
    else if (type === 'demo') scoreDelta = 30;
    else if (type === 'support') scoreDelta = 5;

    if (scoreDelta > 1) {
      await prisma.botLead.update({
        where: { id: lead.id },
        data: { score: { increment: scoreDelta } },
      });
    }

    return json({ ok: true, leadId: lead.id, type });
  } catch (err: unknown) {
    console.error('[blaster-webhook]', getErrorMessage(err));
    return json({ error: 'Internal error' }, 500);
  }
}

export async function GET() {
  return json({ status: 'ok', service: 'blaster-webhook' });
}
