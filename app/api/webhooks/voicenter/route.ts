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
 * Resolve org slug OR uuid → actual UUID.
 * orgId from webhook can be a slug like "misrad-ai-hq" or a real UUID.
 * SystemLead.organizationId is @db.Uuid — passing a slug causes a Prisma error.
 */
async function resolveOrgId(orgId: string): Promise<string | null> {
    // Already a UUID format — try direct lookup first
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(orgId)) {
        return orgId;
    }
    // It's a slug — resolve to UUID
    const org = await prisma.organization.findUnique({
        where: { slug: orgId },
        select: { id: true },
    });
    return org?.id ?? null;
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
        
        // Verify webhook signature in production (skip if no secret configured)
        if (IS_PROD && VOICENTER_WEBHOOK_SECRET && !verifyWebhookSignature(bodyText, signature)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // Handle empty body (ping/test requests)
        if (!bodyText || bodyText.trim() === '') {
            return NextResponse.json({ success: true, message: 'Webhook active (empty body received)' });
        }

        // Parse the JSON body
        let body;
        try {
            body = JSON.parse(bodyText);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        // Handle test/ping requests from Voicenter
        if (body.test === true || body.ping === true) {
            return NextResponse.json({ success: true, message: 'Webhook active (test received)' });
        }

        if (!IS_PROD) {
            console.log('[Voicenter Webhook] Received payload:', body);
        }

        // Resolve orgId from query param — may be a slug, must convert to UUID
        const searchParams = request.nextUrl.searchParams;
        const rawOrgId = searchParams.get('orgId') || body.organizationId || body.organization_id;

        if (!rawOrgId) {
            return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
        }

        const orgUUID = await resolveOrgId(rawOrgId);
        if (!orgUUID) {
            console.error('[Voicenter Webhook] Org not found for slug/id:', rawOrgId);
            return NextResponse.json({ error: 'Organization not found', orgId: rawOrgId }, { status: 404 });
        }

        // Map VoiceCenter CDR fields
        const phone = body.CallerNumber || body.caller_number || body.caller || body.CallerID || body.from;
        const targetPhone = body.TargetNumber || body.destination_number || body.target || body.CalledNumber || body.to;
        const duration = body.Duration || body.call_duration || body.duration || 0;
        const recordUrl = body.RecordURL || body.recording_url || body.recording;
        const callId = body.CallID || body.call_id || body.callId;
        const dialStatus = body.DialStatus || body.status;
        const cdrType = body.CdrType || body.cdr_type;
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
                        organizationId: orgUUID,
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
            // IMPORTANT: addScreenPop expects slug (not UUID) to match SSE endpoint
            addScreenPop(rawOrgId, {
                caller: customerPhone || phone || 'Unknown',
                leadId: leadId || undefined,
                leadName: leadId ? leadName : undefined,
            });
            
            if (leadId) {
                return NextResponse.json({
                    success: true,
                    action: 'screen_pop',
                    url: `/w/${rawOrgId}/system/dialer?leadId=${leadId}`
                });
            }
            return NextResponse.json({ success: true, message: 'Ringing event received, screen pop sent' });
        }

        // If it's a CDR (Call ended)
        if (leadId) {
            await prisma.systemLeadActivity.create({
                data: {
                    organizationId: orgUUID,
                    leadId: leadId,
                    type: 'call',
                    direction: isIncoming ? 'inbound' : 'outbound',
                    content: `שיחה ${isIncoming ? 'נכנסת מ-' : 'יוצאת אל'} ${customerPhone}. משך: ${duration} שניות. סטטוס: ${dialStatus || 'הסתיימה'}`,
                    metadata: {
                        duration,
                        recordingUrl: recordUrl,
                        callId,
                        agentPhone,
                        source: 'voicenter_webhook'
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const searchParams = request.nextUrl.searchParams;
    const rawOrgId = searchParams.get('orgId');
    const caller = searchParams.get('caller') || searchParams.get('CallerID') || searchParams.get('CallerNumber');
    
    if (!rawOrgId) {
        return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    // Handle test/ping requests (no caller = just checking the webhook is alive)
    if (!caller) {
        return NextResponse.json({ 
            success: true, 
            message: 'Webhook active (GET)', 
            orgId: rawOrgId,
            hint: 'Add ?caller=PHONE_NUMBER to test screen pop' 
        });
    }

    try {
        // Resolve slug → UUID
        const orgUUID = await resolveOrgId(rawOrgId);
        if (!orgUUID) {
            console.error('[Voicenter Webhook GET] Org not found for:', rawOrgId);
            return NextResponse.json({ error: 'Organization not found', orgId: rawOrgId }, { status: 404 });
        }

        const normalizedPhone = extractPhoneDigits(caller);
        if (!IS_PROD) {
            console.log('[Voicenter Webhook GET] phone:', normalizedPhone, 'org:', rawOrgId, 'uuid:', orgUUID);
        }
        
        if (normalizedPhone && normalizedPhone.length >= 8) {
            const lead = await prisma.systemLead.findFirst({
                where: {
                    organizationId: orgUUID,
                    phone: { contains: normalizedPhone },
                },
                select: { id: true, name: true },
            });
            
            if (!IS_PROD) {
                console.log('[Voicenter Webhook GET] Lead found:', lead);
            }
            
            if (lead) {
                // Send screen pop via SSE
                // IMPORTANT: addScreenPop expects slug (not UUID) to match SSE endpoint
                addScreenPop(rawOrgId, {
                    caller: normalizedPhone,
                    leadId: lead.id,
                    leadName: lead.name,
                });
                return NextResponse.redirect(new URL(`/w/${rawOrgId}/system/dialer?leadId=${lead.id}`, request.url));
            }
        }
        
        // No lead found — redirect to general dialer
        return NextResponse.redirect(new URL(`/w/${rawOrgId}/system/dialer`, request.url));
    } catch (error) {
        console.error('[Voicenter Webhook GET] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Handle CORS preflight requests
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-voicenter-signature, x-webhook-signature',
        },
    });
}

