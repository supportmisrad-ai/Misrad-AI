import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { withWorkspaceTenantContext } from '@/lib/prisma-tenant-guard';
import prisma from '@/lib/prisma';
import type { 
  VoicecenterCallLogRequest, 
  VoicecenterCallLogResponse 
} from '@/types/voicecenter';

/**
 * Call Log API - Pull call history from Voicenter
 * 
 * Endpoint: POST /api/telephony/call-log
 * 
 * This endpoint fetches call history from Voicenter's Call Log API
 * and optionally saves it to the database.
 * 
 * @see https://api.voicenter.com/hub/cdr/
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { 
      fromdate, 
      todate, 
      fields = ['CallerNumber', 'TargetNumber', 'Date', 'Duration', 'CallID', 'RecordURL', 'DialStatus', 'Type'],
      phones,
      extensions,
      saveToDatabase = false
    } = body;

    // 3. Validate required fields
    if (!fromdate || !todate) {
      return NextResponse.json(
        { error: 'fromdate and todate are required (ISO 8601 format)' },
        { status: 400 }
      );
    }

    // 4. Get organization context
    const orgSlug = request.nextUrl.searchParams.get('orgSlug');
    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug query parameter required' }, { status: 400 });
    }

    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        // 5. Get Voicenter credentials from system_settings
        const settings = await prisma.systemSettings.findUnique({
          where: { organizationId },
          select: {
            telephony_provider: true,
            telephony_config: true,
            telephony_enabled: true,
          },
        });

        if (!settings?.telephony_enabled || settings.telephony_provider !== 'voicenter') {
          return NextResponse.json(
            { error: 'Voicenter integration not enabled for this organization' },
            { status: 400 }
          );
        }

        const config = settings.telephony_config as Record<string, unknown> | null;
        const code = config?.UserCode as string | undefined;

        if (!code) {
          return NextResponse.json(
            { error: 'Voicenter UserCode not configured. Please configure in System Settings.' },
            { status: 400 }
          );
        }

        // 6. Build Call Log API request
        const callLogRequest: VoicecenterCallLogRequest = {
          code,
          fromdate,
          todate,
          fields,
        };

        // Add optional search filters
        if (phones || extensions) {
          callLogRequest.search = {};
          if (phones) callLogRequest.search.phones = phones;
          if (extensions) callLogRequest.search.extensions = extensions;
        }

        // 7. Call Voicenter Call Log API
        const apiUrl = 'https://api.voicenter.com/hub/cdr/';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(callLogRequest),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[CallLog] Voicenter API error:', {
            status: response.status,
            body: errorText,
          });
          return NextResponse.json(
            { error: `Voicenter API error: ${response.statusText}` },
            { status: response.status }
          );
        }

        const result = (await response.json()) as VoicecenterCallLogResponse;

        // 8. Check for API errors
        if (result.ERROR_NUMBER !== 0) {
          return NextResponse.json(
            { error: result.ERROR_DESCRIPTION },
            { status: result.STATUS_CODE || 400 }
          );
        }

        // 9. Optionally save to database
        if (saveToDatabase && result.CDR_LIST && result.CDR_LIST.length > 0) {
          let savedCount = 0;
          
          for (const call of result.CDR_LIST) {
            if (!call.CallID) continue;

            // Check if call already exists
            const existing = await prisma.systemLeadActivity.findFirst({
              where: {
                organizationId,
                metadata: {
                  path: ['callId'],
                  equals: call.CallID,
                },
              },
            });

            if (existing) continue; // Skip duplicates

            // Try to find matching lead by phone number
            const phoneDigits = call.CallerNumber?.replace(/\D/g, '') || '';
            let leadId: string | null = null;

            if (phoneDigits.length >= 9) {
              const lead = await prisma.systemLead.findFirst({
                where: {
                  organizationId,
                  phone: {
                    contains: phoneDigits.slice(-9),
                  },
                },
                select: { id: true },
              });
              leadId = lead?.id || null;
            }

            // Create activity record
            if (leadId) {
              await prisma.systemLeadActivity.create({
                data: {
                  organizationId,
                  leadId,
                  type: 'call',
                  content: `Call ${call.Type || 'Unknown'} - ${call.DialStatus || 'Unknown'}`,
                  direction: call.Type?.includes('Incoming') ? 'inbound' : 'outbound',
                  timestamp: call.Date ? new Date(call.Date) : new Date(),
                  metadata: {
                    callId: call.CallID,
                    duration: call.Duration,
                    recordingUrl: call.RecordURL,
                    dialStatus: call.DialStatus,
                    callType: call.Type,
                    callerNumber: call.CallerNumber,
                    targetNumber: call.TargetNumber,
                    source: 'voicenter_call_log_api',
                  },
                },
              });
              savedCount++;
            }
          }

          return NextResponse.json({
            success: true,
            totalHits: result.TOTAL_HITS,
            returnedHits: result.RETURN_HITS,
            savedToDatabase: savedCount,
            calls: result.CDR_LIST,
          });
        }

        // 10. Return call log data
        return NextResponse.json({
          success: true,
          totalHits: result.TOTAL_HITS,
          returnedHits: result.RETURN_HITS,
          calls: result.CDR_LIST,
        });
      },
      { source: 'api_telephony_call_log', reason: 'fetch_call_history' }
    );
  } catch (error: unknown) {
    console.error('[CallLog] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for simple queries
 * Example: GET /api/telephony/call-log?orgSlug=my-org&fromdate=2024-01-01T00:00:00&todate=2024-01-31T23:59:59
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fromdate = searchParams.get('fromdate');
  const todate = searchParams.get('todate');
  const orgSlug = searchParams.get('orgSlug');

  if (!fromdate || !todate || !orgSlug) {
    return NextResponse.json(
      { error: 'fromdate, todate, and orgSlug query parameters are required' },
      { status: 400 }
    );
  }

  // Convert to POST request internally
  const url = new URL(request.url);
  url.pathname = '/api/telephony/call-log';
  url.searchParams.set('orgSlug', orgSlug);

  const postRequest = new NextRequest(url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ fromdate, todate }),
  });

  return POST(postRequest);
}
