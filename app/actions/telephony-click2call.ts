'use server';

import { auth } from '@clerk/nextjs/server';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import prisma from '@/lib/prisma';
import type { 
  VoicecenterClick2CallRequest, 
  VoicecenterClick2CallResponse 
} from '@/types/voicecenter';

/**
 * Click2Call Server Action
 * 
 * Initiates a call using Voicenter's Click2Call API
 * This is the recommended way to make calls (better than the old ForwardDialing/v2)
 * 
 * @param params - Call parameters
 * @returns Result with success status and call details
 */
export async function initiateClick2Call(params: {
  orgSlug: string;
  phone: string;      // Extension/number calling FROM
  target: string;     // Number calling TO
  leadId?: string;    // Optional: associate with a lead
  record?: boolean;   // Optional: record the call
}) {
  try {
    // 1. Authentication
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const { orgSlug, phone, target, leadId, record = true } = params;

    // 2. Validate inputs
    if (!phone || !target) {
      return {
        success: false,
        error: 'Phone and target are required',
      };
    }

    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        // 3. Get Voicenter credentials from system_flags
        const settings = await prisma.system_settings.findFirst({
          where: { tenant_id: organizationId },
          select: {
            system_flags: true,
          },
        });

        const systemFlags = settings?.system_flags as Record<string, unknown> | null;
        const telephony = systemFlags?.telephony as Record<string, unknown> | undefined;
        const provider = telephony?.provider as string | undefined;
        const isActive = telephony?.isActive as boolean | undefined;
        const credentials = telephony?.credentials as Record<string, unknown> | undefined;

        if (!isActive || provider !== 'voicenter') {
          return {
            success: false,
            error: 'Voicenter integration not enabled',
          };
        }

        const code = credentials?.UserCode as string | undefined;

        if (!code) {
          return {
            success: false,
            error: 'Voicenter UserCode not configured. Please configure in System Settings.',
          };
        }

        // 4. Build Click2Call request
        const click2CallRequest: VoicecenterClick2CallRequest = {
          code,
          phone,
          target,
          action: 'call',
          phoneautoanswer: true,           // Auto-answer for agent (recommended)
          checkphonedevicestate: true,     // Check if extension is online (recommended)
          record,
          format: 'JSON',
        };

        // Add custom data if leadId is provided
        if (leadId) {
          click2CallRequest['var_leadId'] = leadId;
          click2CallRequest['var_source'] = 'misrad_ai_system';
        }

        // 5. Call Voicenter Click2Call API
        const apiUrl = 'https://api.voicenter.com/ForwardDialer/click2call.aspx';
        
        // Build query string for GET-style parameters
        const queryParams = new URLSearchParams();
        Object.entries(click2CallRequest).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });

        const fullUrl = `${apiUrl}?${queryParams.toString()}`;

        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Click2Call] Voicenter API error:', {
            status: response.status,
            body: errorText,
          });
          return {
            success: false,
            error: `Voicenter API error: ${response.statusText}`,
          };
        }

        const result = (await response.json()) as VoicecenterClick2CallResponse;

        // 6. Check for API errors
        if (result.ERRORCODE !== 0) {
          return {
            success: false,
            error: result.ERRORMESSAGE,
            errorCode: result.ERRORCODE,
          };
        }

        // 7. Create activity record if leadId provided
        if (leadId && result.CALLID) {
          try {
            await prisma.systemLeadActivity.create({
              data: {
                organizationId,
                leadId,
                type: 'call',
                content: `Outgoing call initiated to ${target}`,
                direction: 'outbound',
                timestamp: new Date(),
                metadata: {
                  callId: result.CALLID,
                  phone,
                  target,
                  source: 'click2call_api',
                  initiatedBy: userId,
                },
              },
            });
          } catch (dbError) {
            console.error('[Click2Call] Failed to create activity record:', dbError);
            // Don't fail the whole operation if DB write fails
          }
        }

        // 8. Return success
        return {
          success: true,
          callId: result.CALLID,
          message: result.ERRORMESSAGE || 'Call initiated successfully',
        };
      },
      { source: 'server_actions_telephony', reason: 'click2call' }
    );
  } catch (error: unknown) {
    console.error('[Click2Call] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
  }
}

/**
 * Terminate an active call
 * 
 * @param params - Termination parameters
 * @returns Result with success status
 */
export async function terminateCall(params: {
  orgSlug: string;
  phone: string;      // Extension to terminate
}) {
  try {
    // 1. Authentication
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const { orgSlug, phone } = params;

    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        // 2. Get Voicenter credentials from system_flags
        const settings = await prisma.system_settings.findFirst({
          where: { tenant_id: organizationId },
          select: {
            system_flags: true,
          },
        });

        const systemFlags = settings?.system_flags as Record<string, unknown> | null;
        const telephony = systemFlags?.telephony as Record<string, unknown> | undefined;
        const provider = telephony?.provider as string | undefined;
        const isActive = telephony?.isActive as boolean | undefined;
        const credentials = telephony?.credentials as Record<string, unknown> | undefined;

        if (!isActive || provider !== 'voicenter') {
          return {
            success: false,
            error: 'Voicenter integration not enabled',
          };
        }

        const code = credentials?.UserCode as string | undefined;

        if (!code) {
          return {
            success: false,
            error: 'Voicenter UserCode not configured',
          };
        }

        // 3. Build termination request
        const queryParams = new URLSearchParams({
          code,
          phone,
          action: 'terminate',
        });

        const apiUrl = `https://api.voicenter.com/ForwardDialer/click2call.aspx?${queryParams.toString()}`;

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          return {
            success: false,
            error: `Voicenter API error: ${response.statusText}`,
          };
        }

        const result = (await response.json()) as VoicecenterClick2CallResponse;

        if (result.ERRORCODE !== 0) {
          return {
            success: false,
            error: result.ERRORMESSAGE,
          };
        }

        return {
          success: true,
          message: 'Call terminated successfully',
        };
      },
      { source: 'server_actions_telephony', reason: 'terminate_call' }
    );
  } catch (error: unknown) {
    console.error('[TerminateCall] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
  }
}
