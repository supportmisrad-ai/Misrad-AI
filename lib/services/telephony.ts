import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Telephony Service
 * 
 * Generic service for initiating calls via different telephony providers
 * Supports BYOC (Bring Your Own Carrier) model where each organization
 * brings their own provider credentials (Voicenter, Twilio, etc.)
 * 
 * Usage:
 *   import { TelephonyService } from '@/lib/services/telephony';
 *   const result = await TelephonyService.initiateCall('0501234567', '0507654321', 'tenant-uuid');
 */

import { Buffer } from 'buffer';
import prisma, { queryRawTenantScoped } from '@/lib/prisma';

const IS_PROD = process.env.NODE_ENV === 'production';

function getStringField(obj: Record<string, unknown> | null, key: string): string | undefined {
    if (!obj) return undefined;
    const v = obj[key];
    return typeof v === 'string' ? v : v == null ? undefined : String(v);
}

export interface TelephonyCredentials {
    // ── Voicenter credentials ─────────────────────────────────────
    // Click2Call API code (required for making calls)
    code?: string;
    // Legacy alias — older configs stored the Click2Call code here
    UserCode?: string;
    // Legacy — not required by VoiceCenter APIs but kept for compat
    OrganizationCode?: string;
    // Default extension number for outgoing calls (e.g. "1131")
    defaultExtension?: string;
    // Real-Time Events API token (for live call monitoring)
    eventsToken?: string;
    // CPanel user email (for Events SDK / WebRTC widget login)
    email?: string;
    // CPanel user password (for Events SDK / WebRTC widget login)
    password?: string;
    // SIP credentials for WebRTC softphone widget
    sipUsername?: string;  // Extension number from CPanel → Settings → Extensions
    sipPassword?: string;  // SIP password from extension settings (may differ from CPanel password)
    // JWT token for WebRTC softphone (received from Voicenter)
    webrtcToken?: string;

    // ── Twilio credentials ────────────────────────────────────────
    account_sid?: string;
    auth_token?: string;
    
    // ── Generic / legacy fields ───────────────────────────────────
    api_key?: string;
    api_secret?: string;
    secret?: string;
    account_id?: string;
    from_number?: string;
    
    [key: string]: unknown;
}

export interface CallInitiationResult {
    success: boolean;
    callId?: string;
    sessionId?: string;
    message?: string;
    error?: string;
}

export class TelephonyService {
    /**
     * Initiate a call using the organization's configured telephony provider
     * 
     * @param from - Phone number to call from
     * @param to - Phone number to call to
     * @param orgId - Organization/Tenant ID
     * @returns Call initiation result with call ID or error
     */
    static async initiateCall(
        from: string,
        to: string,
        orgId: string
    ): Promise<CallInitiationResult> {
        try {
            const rows = await queryRawTenantScoped<unknown[]>(prisma, {
                tenantId: orgId,
                reason: 'telephony_load_system_settings_flags',
                query: `
                    SELECT system_flags
                    FROM system_settings
                    WHERE tenant_id = $1::uuid
                    LIMIT 1
                `,
                values: [orgId],
            });

            const row = Array.isArray(rows) && rows.length ? rows[0] : null;
            const rowObj = asObject(row);
            const systemFlags = asObject(rowObj?.system_flags);
            const telephonyObj = asObject(systemFlags?.telephony);

            const provider = getStringField(telephonyObj, 'provider')?.trim() || '';
            const isActiveRaw = telephonyObj?.isActive;
            const isActive = typeof isActiveRaw === 'boolean' ? isActiveRaw : Boolean(isActiveRaw ?? true);
            const credentialsObj = asObject(telephonyObj?.credentials);
            const credentials = credentialsObj as TelephonyCredentials | undefined;

            if (!provider || !isActive || !credentials) {
                return {
                    success: false,
                    error: 'No active telephony integration found for this organization'
                };
            }

            // 2. Route to appropriate provider implementation
            switch (provider.toLowerCase()) {
                case 'voicenter':
                    return await this.initiateVoicenterCall(from, to, credentials as TelephonyCredentials);
                case 'twilio':
                    return await this.initiateTwilioCall(from, to, credentials as TelephonyCredentials);
                default:
                    return {
                        success: false,
                        error: `Unsupported telephony provider: ${provider}`
                    };
            }
        } catch (error: unknown) {
            const msg = getErrorMessage(error);
            if (IS_PROD) {
                console.error('[TelephonyService] Error initiating call:', msg);
            } else {
                console.error('[TelephonyService] Error initiating call:', error);
            }
            return {
                success: false,
                error: getErrorMessage(error) || 'Failed to initiate call'
            };
        }
    }

    /**
     * Initiate call via Voicenter Click2Call API
     * 
     * Uses Voicenter's Click2Call endpoint (GET request with query params)
     * API: https://api.voicenter.com/ForwardDialer/click2call.aspx
     */
    private static async initiateVoicenterCall(
        from: string,
        to: string,
        credentials: TelephonyCredentials
    ): Promise<CallInitiationResult> {
        try {
            // Resolve Click2Call code (new field 'code' or legacy 'UserCode')
            const code = credentials.code || credentials.UserCode;
            if (!code) {
                return {
                    success: false,
                    error: 'Voicenter Click2Call code not configured'
                };
            }

            // Build Click2Call query params
            const params = new URLSearchParams({
                code,
                phone: from,
                target: to,
                action: 'call',
                phoneautoanswer: 'true',
                checkphonedevicestate: 'true',
                format: 'JSON',
            });

            const apiUrl = `https://api.voicenter.com/ForwardDialer/click2call.aspx?${params.toString()}`;

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Voicenter API error: ${response.statusText}`;
                try {
                    const parsed = JSON.parse(errorText) as unknown;
                    const errorObj = asObject(parsed);
                    errorMessage = String(errorObj?.ERRORMESSAGE || errorObj?.message || errorObj?.error || errorMessage);
                } catch {
                    if (errorText) errorMessage = errorText;
                }

                console.error('[TelephonyService] Voicenter API error:', {
                    status: response.status,
                    statusText: response.statusText,
                });
                return { success: false, error: errorMessage };
            }

            const result = (await response.json()) as unknown;
            const resultObj = asObject(result);

            // VoiceCenter Click2Call returns { ERRORCODE, ERRORMESSAGE, CALLID }
            const errorCode = resultObj?.ERRORCODE;
            if (typeof errorCode === 'number' && errorCode !== 0) {
                return {
                    success: false,
                    error: getStringField(resultObj, 'ERRORMESSAGE') || `Voicenter error code: ${errorCode}`,
                };
            }

            const callId = getStringField(resultObj, 'CALLID') ?? getStringField(resultObj, 'CallID');

            return {
                success: true,
                callId: callId || undefined,
                sessionId: callId || undefined,
                message: 'Call initiated successfully via Voicenter',
            };
        } catch (error: unknown) {
            const msg = getErrorMessage(error);
            if (IS_PROD) {
                console.error('[TelephonyService] Error in Voicenter call initiation:', msg);
            } else {
                console.error('[TelephonyService] Error in Voicenter call initiation:', error);
            }
            return {
                success: false,
                error: `Failed to initiate Voicenter call: ${getErrorMessage(error)}`
            };
        }
    }

    /**
     * Initiate call via Twilio API
     */
    private static async initiateTwilioCall(
        from: string,
        to: string,
        credentials: TelephonyCredentials
    ): Promise<CallInitiationResult> {
        try {
            // Validate required Twilio credentials
            if (!credentials.account_sid || !credentials.auth_token) {
                return {
                    success: false,
                    error: 'Twilio account_sid and auth_token are required'
                };
            }

            const fromValue = String(credentials.from_number ?? from ?? '').trim();
            const toValue = String(to ?? '').trim();

            if (!fromValue || !toValue) {
                return {
                    success: false,
                    error: 'Twilio From/To phone numbers are required'
                };
            }

            // Twilio API endpoint
            const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${credentials.account_sid}/Calls.json`;

            // Prepare request payload
            const payload = new URLSearchParams();
            payload.set('From', fromValue);
            payload.set('To', toValue);

            // Create Basic Auth header (Twilio uses account_sid:auth_token)
            const auth = Buffer.from(`${credentials.account_sid}:${credentials.auth_token}`).toString('base64');

            // Make API call to Twilio
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`
                },
                body: payload.toString()
            });

            if (!response.ok) {
                const errorText = await response.text();
                if (!IS_PROD) {
                    void errorText;
                }
                console.error('[TelephonyService] Twilio API error:', {
                    status: response.status,
                    statusText: response.statusText,
                });
                return {
                    success: false,
                    error: `Twilio API error: ${response.statusText}`
                };
            }

            const result = (await response.json()) as unknown;
            const resultObj = asObject(result);

            return {
                success: true,
                callId: getStringField(resultObj, 'sid') || undefined,
                sessionId: getStringField(resultObj, 'sid') || undefined,
                message: 'Call initiated successfully'
            };
        } catch (error: unknown) {
            const msg = getErrorMessage(error);
            if (IS_PROD) {
                console.error('[TelephonyService] Error in Twilio call initiation:', msg);
            } else {
                console.error('[TelephonyService] Error in Twilio call initiation:', error);
            }
            return {
                success: false,
                error: `Failed to initiate Twilio call: ${getErrorMessage(error)}`
            };
        }
    }

    /**
     * Get active telephony integration for an organization
     * 
     * @param orgId - Organization/Tenant ID
     * @returns Active integration or null
     */
    static async getActiveIntegration(orgId: string): Promise<Record<string, unknown> | null> {
        const rows = await queryRawTenantScoped<unknown[]>(prisma, {
            tenantId: orgId,
            reason: 'telephony_get_active_integration',
            query: `
                SELECT system_flags
                FROM system_settings
                WHERE tenant_id = $1::uuid
                LIMIT 1
            `,
            values: [orgId],
        });

        const row = Array.isArray(rows) && rows.length ? rows[0] : null;
        const rowObj = asObject(row);
        const systemFlags = asObject(rowObj?.system_flags);
        const telephony = asObject(systemFlags?.telephony);

        if (!telephony) return null;
        const provider = getStringField(telephony, 'provider');
        const isActiveRaw = telephony.isActive;
        const isActive = typeof isActiveRaw === 'boolean' ? isActiveRaw : isActiveRaw == null ? true : Boolean(isActiveRaw);
        if (!provider || isActive === false) return null;
        return telephony;
    }

    /**
     * Check if organization has an active telephony integration
     * 
     * @param orgId - Organization/Tenant ID
     * @returns true if active integration exists
     */
    static async hasActiveIntegration(orgId: string): Promise<boolean> {
        const integration = await this.getActiveIntegration(orgId);
        return integration !== null;
    }
}

// Export singleton instance for convenience (optional)
export default TelephonyService;

