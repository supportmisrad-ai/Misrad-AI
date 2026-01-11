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
import { prisma } from '../prisma';

export interface TelephonyCredentials {
    // Voicenter credentials
    UserCode?: string;
    OrganizationCode?: string;
    
    // Twilio credentials
    account_sid?: string;
    auth_token?: string;
    
    // Generic/legacy fields (for backward compatibility)
    api_key?: string;
    api_secret?: string;
    secret?: string;
    account_id?: string;
    
    [key: string]: any; // Allow additional provider-specific credentials
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
            // 1. Retrieve telephony integration from database
            const integration = await prisma.systemTelephonyIntegration.findFirst({
                where: {
                    tenantId: orgId,
                    isActive: true
                }
            });

            if (!integration) {
                return {
                    success: false,
                    error: 'No active telephony integration found for this organization'
                };
            }

            const { provider, credentials } = integration;

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
        } catch (error: any) {
            console.error('[TelephonyService] Error initiating call:', error);
            return {
                success: false,
                error: error.message || 'Failed to initiate call'
            };
        }
    }

    /**
     * Initiate call via Voicenter Click2Call API
     * 
     * Uses Voicenter's ForwardDialing API v2
     * Documentation: https://api.voicenter.com/ForwardDialing/v2
     */
    private static async initiateVoicenterCall(
        from: string,
        to: string,
        credentials: TelephonyCredentials
    ): Promise<CallInitiationResult> {
        try {
            // Validate required Voicenter credentials
            if (!credentials.UserCode) {
                return {
                    success: false,
                    error: 'Voicenter UserCode not configured'
                };
            }

            if (!credentials.OrganizationCode) {
                return {
                    success: false,
                    error: 'Voicenter OrganizationCode not configured'
                };
            }

            // Voicenter Click2Call API endpoint
            const apiUrl = 'https://api.voicenter.com/ForwardDialing/v2';
            
            // Prepare request payload according to Voicenter Click2Call API specification
            const payload = {
                UserCode: credentials.UserCode,
                OrganizationCode: credentials.OrganizationCode,
                CompositeDestination: to,  // Phone number to call to
                CallerID: from  // Phone number/extension of the agent calling from
            };

            // Make API call to Voicenter
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Voicenter API error: ${response.statusText}`;
                
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorJson.error || errorMessage;
                } catch {
                    // If error response is not JSON, use the text as-is
                    if (errorText) {
                        errorMessage = errorText;
                    }
                }

                console.error('[TelephonyService] Voicenter API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                    payload: payload
                });
                
                return {
                    success: false,
                    error: errorMessage
                };
            }

            const result = await response.json();

            // Extract call ID from Voicenter response
            // Adjust these field names based on actual Voicenter API response structure
            return {
                success: true,
                callId: result.CallID || result.callId || result.id || result.SessionID || result.sessionId,
                sessionId: result.SessionID || result.sessionId || result.CallID || result.callId,
                message: result.message || 'Call initiated successfully via Voicenter'
            };
        } catch (error: any) {
            console.error('[TelephonyService] Error in Voicenter call initiation:', error);
            return {
                success: false,
                error: `Failed to initiate Voicenter call: ${error.message}`
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
                console.error('[TelephonyService] Twilio API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                return {
                    success: false,
                    error: `Twilio API error: ${response.statusText}`
                };
            }

            const result = await response.json();

            // Extract call SID from Twilio response
            return {
                success: true,
                callId: result.sid,
                sessionId: result.sid,
                message: 'Call initiated successfully'
            };
        } catch (error: any) {
            console.error('[TelephonyService] Error in Twilio call initiation:', error);
            return {
                success: false,
                error: `Failed to initiate Twilio call: ${error.message}`
            };
        }
    }

    /**
     * Get active telephony integration for an organization
     * 
     * @param orgId - Organization/Tenant ID
     * @returns Active integration or null
     */
    static async getActiveIntegration(orgId: string) {
        return await prisma.systemTelephonyIntegration.findFirst({
            where: {
                tenantId: orgId,
                isActive: true
            }
        });
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

