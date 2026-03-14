/**
 * WAAM-It Blaster Webhook Handler
 * POST /api/webhooks/blaster
 *
 * Receives webhook events from the WhatsApp bot (WAAM-It Blaster).
 * Stores lead data and conversation history in BotLead / BotConversation.
 *
 * Query params:
 *   type = lead | signup | demo | support
 *
 * @guard WEBHOOK
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withWebhookGlobalAdminContext } from '@/lib/api-webhook-guard';
import { getErrorMessage } from '@/lib/shared/unknown';
import { timingSafeCompare } from '@/lib/server/timing-safe';

const BLASTER_SECRET = process.env.BLASTER_WEBHOOK_SECRET;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: NextRequest) {
  // Require secret validation — mandatory in production
  if (!BLASTER_SECRET && process.env.NODE_ENV === 'production') {
    return json({ error: 'Webhook secret not configured' }, 500);
  }
  if (BLASTER_SECRET) {
    const authHeader = req.headers.get('x-webhook-secret') ?? '';
    if (!timingSafeCompare(authHeader, BLASTER_SECRET)) {
      return json({ error: 'Unauthorized' }, 401);
    }
  }

  return withWebhookGlobalAdminContext({ source: 'blaster-webhook' }, async () => {
  const body: Record<string, unknown> = await req.json().catch(() => ({}));
  
  try {
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

    // Handle referral tracking
    const referredBy = String(body.referred_by ?? body.referredBy ?? body.referrer ?? '').trim().toUpperCase();
    if (referredBy && type === 'signup') {
      try {
        // Find partner by referral code
        const partner = await prisma.partner.findFirst({
          where: { referralCode: referredBy },
          select: { id: true },
        });
        
        if (partner?.id) {
          // Create/update referral record
          await prisma.botReferral.upsert({
            where: { referral_code: `ref_${lead.id}_${partner.id}` },
            create: {
              referral_code: `ref_${lead.id}_${partner.id}`,
              referrer_id: partner.id,
              referred_id: lead.id,
              commission_rate: 10, // 10% default
              total_earned: 0,
            },
            update: {},
          });
          
          // Update SystemPartner stats
          await prisma.systemPartner.update({
            where: { id: partner.id },
            data: { 
              referrals: { increment: 1 },
              lastActive: new Date().toISOString(),
            },
          }).catch(() => {}); // Ignore if not found
          
          console.log(`[blaster-webhook] Referral tracked: ${referredBy} -> lead ${lead.id}`);
        }
      } catch (refErr) {
        console.error('[blaster-webhook] Referral tracking failed (ignored):', refErr);
      }
    }

    // Handle partner signup
    if (type === 'partner_signup') {
      const partnerName = name || 'Unknown Partner';
      const partnerEmail = email || null;
      const partnerPhone = phone;
      
      try {
        // Generate referral code from name
        const slug = partnerName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
        const referralCode = `${slug || 'REF'}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        
        // Create partner
        const newPartner = await prisma.partner.create({
          data: {
            name: partnerName,
            email: partnerEmail,
            phone: partnerPhone,
            referralCode,
          },
          select: { id: true, referralCode: true },
        });
        
        // Create SystemPartner for tracking
        await prisma.systemPartner.create({
          data: {
            id: newPartner.id,
            name: partnerName,
            type: 'affiliate',
            referrals: 0,
            revenue: 0,
            commissionRate: 10,
            unpaidCommission: 0,
            lastActive: new Date().toISOString(),
            avatar: '',
            status: 'active',
          },
        }).catch(() => {}); // Ignore duplicate
        
        console.log(`[blaster-webhook] Partner created: ${partnerName} (${newPartner.referralCode})`);
        
        return json({ ok: true, partnerId: newPartner.id, referralCode: newPartner.referralCode, type });
      } catch (partnerErr) {
        console.error('[blaster-webhook] Partner creation failed:', partnerErr);
      }
    }

    return json({ ok: true, leadId: lead.id, type });
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(err);
    const errorStack = err instanceof Error ? err.stack : '';
    console.error('[blaster-webhook] ERROR:', errorMessage);
    console.error('[blaster-webhook] STACK:', errorStack);
    console.error('[blaster-webhook] BODY:', JSON.stringify(body));
    return json({ error: 'Internal error', details: errorMessage }, 500);
  }
  });
}

export async function GET() {
  return json({ error: 'Method not allowed' }, 405);
}
