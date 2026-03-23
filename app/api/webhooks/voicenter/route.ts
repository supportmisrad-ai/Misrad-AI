import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createHmac } from 'crypto';
import { addScreenPop } from '@/app/api/telephony/events/route';

// Helper to normalize phones
function extractPhoneDigits(phone: string): string {
    return phone.replace(/\D/g, '');
}

const IS_PROD = process.env.NODE_ENV === 'production';
const VOICENTER_WEBHOOK_SECRET = process.env.VOICENTER_WEBHOOK_SECRET;

/**
 * Verify Voicenter webhook signature
 */
function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!VOICENTER_WEBHOOK_SECRET || !signature) return false;
  const hmac = createHmac('sha256', VOICENTER_WEBHOOK_SECRET);
  hmac.update(body);
  return hmac.digest('hex') === signature;
}

/**
 * Webhook Endpoint for Voicenter Integration
 * POST /api/webhooks/voicenter
 * 
 * Handles events from Voicenter:
 * 1. CDR (Call Detail Record) - End of call event
 * 2. Screen Pop - Incoming call event
 */
export async function POST(request: NextRequest) {
    try {
        const bodyText = await request.text();
        const signature = request.headers.get('x-voicenter-signature') || 
                         request.headers.get('x-webhook-signature');
        
        // Verify webhook signature in production
        if (IS_PROD && !verifyWebhookSignature(bodyText, signature)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // Parse the JSON body
        let body;
        try {
            body = JSON.parse(bodyText);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        // VoiceCenter External CDR sends fields like:
        // CallerNumber, TargetNumber, Duration, CallID, RecordURL, DialStatus, CdrType, Date, etc.
        // We also support generic field names for flexibility.
        if (!IS_PROD) {
            console.log('[Voicenter Webhook] Received payload:', body);
        }

        // Resolve orgId from query param (set when configuring webhook URL in CPanel)
        const searchParams = request.nextUrl.searchParams;
        const orgId = searchParams.get('orgId') || body.organizationId || body.organization_id;

        if (!orgId) {
            return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
        }

        // Map VoiceCenter CDR fields (official names) with generic fallbacks
        const phone = body.CallerNumber || body.caller_number || body.caller || body.CallerID || body.from;
        const targetPhone = body.TargetNumber || body.destination_number || body.target || body.CalledNumber || body.to;
        const duration = body.Duration || body.call_duration || body.duration || 0;
        const recordUrl = body.RecordURL || body.recording_url || body.recording;
        const callId = body.CallID || body.call_id || body.callId;
        const dialStatus = body.DialStatus || body.status;
        const cdrType = body.CdrType || body.cdr_type;
        // CdrType: 1=Incoming, 4=Extension Outgoing, 9/10=Click2Call legs
        const isIncoming = cdrType === 1 || body.direction === 'inbound' || body.Direction === 'inbound';
        const event_type = body.event_type;
        
        const customerPhone = isIncoming ? phone : targetPhone;
        const agentPhone = isIncoming ? targetPhone : phone;

        // Try to find the lead
        let leadId: string | null = null;
        let leadName = 'Unknown Lead';

        if (customerPhone) {
            const normalizedPhone = extractPhoneDigits(customerPhone);
            if (normalizedPhone && normalizedPhone.length >= 8) {
                const lead = await prisma.systemLead.findFirst({
                    where: {
                        organizationId: orgId,
                        phone: { contains: normalizedPhone },
                    },
                    select: { id: true, name: true },
                });
                
                if (lead) {
                    leadId = lead.id;
                    leadName = lead.name;
                }
            }
        }

        // If it's a Screen Pop event (e.g. ringing)
        if (event_type === 'ringing' || body.status === 'ringing') {
            // Send real-time screen pop notification via SSE
            addScreenPop(orgId, {
                caller: customerPhone || phone || 'Unknown',
                leadId: leadId || undefined,
                leadName: leadId ? leadName : undefined,
            });
            
            if (leadId) {
                return NextResponse.json({
                    success: true,
                    action: 'screen_pop',
                    url: `/w/${orgId}/system/dialer?leadId=${leadId}`
                });
            }
            return NextResponse.json({ success: true, message: 'Ringing event received, screen pop sent' });
        }

        // If it's a CDR (Call ended)
        if (leadId) {
            // Save call activity
            await prisma.systemLeadActivity.create({
                data: {
                    organizationId: orgId,
                    leadId: leadId,
                    type: 'call',
                    direction: isIncoming ? 'inbound' : 'outbound',
                    content: `שיחה ${isIncoming ? 'נכנסת מ-' : 'יוצאת אל'} ${customerPhone}. משך: ${duration} שניות. סטטוס: ${status || 'הסתיימה'}`,
                    metadata: {
                        duration,
                        recordingUrl: recordUrl,
                        callId,
                        agentPhone,
                        source: 'voicenter_webhook'
                    } as unknown as any
                }
            });
            
            return NextResponse.json({ success: true, message: 'Call activity saved' });
        }

        return NextResponse.json({ success: true, message: 'Event received, no matching lead' });
    } catch (error) {
        console.error('[Voicenter Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    // Some providers use GET for screen pop to instantly redirect the agent's browser
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const caller = searchParams.get('caller') || searchParams.get('CallerID');
    
    if (!orgId || !caller) {
        return NextResponse.json({ error: 'Missing orgId or caller' }, { status: 400 });
    }

    try {
        const normalizedPhone = extractPhoneDigits(caller);
        if (normalizedPhone && normalizedPhone.length >= 8) {
            const lead = await prisma.systemLead.findFirst({
                where: {
                    organizationId: orgId,
                    phone: { contains: normalizedPhone },
                },
                select: { id: true },
            });
            
            if (lead) {
                // Return a redirect to the lead page
                return NextResponse.redirect(new URL(`/w/${orgId}/system/dialer?leadId=${lead.id}`, request.url));
            }
        }
        
        // Redirect to general dialer if not found
        return NextResponse.redirect(new URL(`/w/${orgId}/system/dialer`, request.url));
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
