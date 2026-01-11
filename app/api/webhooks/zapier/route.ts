import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import crypto from 'crypto';

/**
 * POST /api/webhooks/zapier
 * Receives webhook from Zapier
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const signature = request.headers.get('x-zapier-signature');
    const webhookId = request.headers.get('x-zapier-webhook-id');

    // Zero-trust: require valid signature in production
    const secret = process.env.ZAPIER_WEBHOOK_SECRET;
    if (process.env.NODE_ENV === 'production') {
      if (!secret) {
        console.error('Missing ZAPIER_WEBHOOK_SECRET env var');
        return NextResponse.json({ error: 'Server misconfigured (missing ZAPIER_WEBHOOK_SECRET)' }, { status: 500 });
      }
      if (!signature) {
        return NextResponse.json({ error: 'Missing x-zapier-signature' }, { status: 401 });
      }
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    // Get user from webhook ID or body
    const userId = body.user_id || webhookId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      );
    }

    // Get Supabase user - use Server Action
    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      return NextResponse.json(
        { error: userResult.error || 'User not found' },
        { status: 404 }
      );
    }
    const supabaseUserId = userResult.userId;
    const supabase = createClient();

    // Get webhook config
    const { data: webhookConfig } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('user_id', supabaseUserId)
      .eq('integration_name', 'zapier')
      .eq('is_active', true)
      .single();

    if (!webhookConfig) {
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 404 }
      );
    }

    // Update last triggered
    await supabase
      .from('webhook_configs')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', webhookConfig.id);

    // Process webhook based on event type
    const eventType = body.event_type || 'unknown';
    
    // Log the webhook
    console.log('Zapier webhook received:', {
      eventType,
      body: JSON.stringify(body),
    });

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      event_type: eventType,
    });
  } catch (error: any) {
    console.error('Zapier webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/zapier
 * Webhook verification (Zapier ping)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Zapier webhook endpoint is active',
  });
}

