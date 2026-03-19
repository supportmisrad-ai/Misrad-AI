import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Secure AI Analysis API
 * 
 * Server-side AI processing with data filtering
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, hasPermission } from '@/lib/auth';
import { prepareAIContext, validateAIResponse } from '@/lib/ai-security';
import { logAuditEvent } from '@/lib/audit';
import { Type } from "@google/genai";
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { checkAiAccess } from '@/lib/server/subscription-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

function asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

async function POSTHandler(request: NextRequest) {
    try {
        // 1. Authenticate
        const user = await getAuthenticatedUser();

        // Resolve the caller organization_id from DB (server-side source of truth)
        const clerkUserId = await getCurrentUserId();
        if (!clerkUserId) {
            return apiError('Unauthorized', { status: 401 });
        }
        let callerOrganizationId: string | null = null;
        try {
            const socialUser = await prisma.organizationUser.findUnique({
                where: { clerk_user_id: String(clerkUserId) },
                select: { organization_id: true },
            });
            callerOrganizationId = socialUser?.organization_id ? String(socialUser.organization_id) : null;
        } catch (e: unknown) {
            if (IS_PROD) console.error('[AI SECURITY] Failed to resolve social_user org');
            else console.error('[AI SECURITY] Failed to resolve social_user org:', e);
        }

        if (!callerOrganizationId) {
            return apiError('Forbidden - missing organization context', { status: 403 });
        }

        // Strict tenant enforcement: the caller must have access to their resolved organization
        const { workspace: callerWorkspace } = await getWorkspaceByOrgKeyOrThrow(callerOrganizationId);

        // Subscription guard — block AI for suspended/past_due/cancelled orgs
        // Super Admins are always allowed (they need to debug and support tenants regardless of billing state).
        const isSuperAdmin = user.isSuperAdmin === true || user.role === 'super_admin';
        const aiAccess = isSuperAdmin ? { allowed: true as const } : checkAiAccess(callerWorkspace.subscriptionStatus);

        // #region agent log
        try {
            await fetch('http://127.0.0.1:7328/ingest/bbae1bc8-c2a1-4945-9a27-fe94f6ee54cf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Debug-Session-Id': '3e79f2',
                },
                body: JSON.stringify({
                    sessionId: '3e79f2',
                    runId: 'pre-fix',
                    hypothesisId: 'H3',
                    location: 'app/api/ai/analyze/route.ts:subscriptionGuard',
                    message: 'AI subscription guard evaluation',
                    data: {
                        callerOrganizationId,
                        subscriptionStatus: callerWorkspace.subscriptionStatus ?? null,
                        isSuperAdmin,
                        aiAllowed: aiAccess.allowed,
                        aiMessage: aiAccess.allowed ? null : aiAccess.message,
                    },
                    timestamp: Date.now(),
                }),
            }).catch(() => {});
        } catch {
            // ignore logging failures
        }
        // #endregion

        if (!aiAccess.allowed) {
            return apiError(aiAccess.message, { status: 403 });
        }

        const abuse = await enforceAiAbuseGuard({
            req: request,
            namespace: 'ai.analyze',
            organizationId: callerOrganizationId,
            userId: clerkUserId,
        });
        if (!abuse.ok) {
            return apiError('Rate limit exceeded', { status: 429, headers: abuse.headers });
        }
        
        // 2. Parse request
        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};
        const queryRaw = bodyObj.query;
        const initialRawData = bodyObj.rawData;
        
        const queryStr = asString(queryRaw).trim();
        if (!queryStr) {
            return apiError('Query is required', { status: 400 });
        }
        
        // 3. Check permissions
        const isManager = await hasPermission('manage_team') || await hasPermission('view_financials');
        
        // 4. Fetch users from secure API if needed (for manager view)
        let rawData: unknown = initialRawData ?? {};

        // 4.1 Organization scoping enforcement
        // If the caller has an org, ensure any explicitly provided org context matches.
        const rawDataObj = asObject(rawData) ?? {};
        const rawOrg = rawDataObj.organizationId ?? rawDataObj.organization_id ?? null;
        if (callerOrganizationId && rawOrg && String(rawOrg) !== String(callerOrganizationId)) {
            return apiError('Forbidden - organization mismatch', { status: 403 });
        }

        // If a leadId is provided, verify it belongs to the caller org (prevents cross-tenant AI analysis).
        const rawLeadId = rawDataObj.leadId ?? rawDataObj.lead_id ?? null;
        if (callerOrganizationId && rawLeadId) {
            let leadOrgId: string | null = null;
            try {
                const lead = await prisma.systemLead.findUnique({
                    where: { id: String(rawLeadId) },
                    select: { id: true, organizationId: true },
                });
                leadOrgId = lead?.organizationId ? String(lead.organizationId) : null;
            } catch (e: unknown) {
                if (IS_PROD) console.error('[AI SECURITY] Failed lead org check');
                else console.error('[AI SECURITY] Failed lead org check:', e);
                return apiError('Forbidden', { status: 403 });
            }
            if (!leadOrgId || String(leadOrgId) !== String(callerOrganizationId)) {
                return apiError('Forbidden - lead organization mismatch', { status: 403 });
            }
        }
        const rawUsers = rawDataObj.users;
        if (isManager && (!Array.isArray(rawUsers) || rawUsers.length === 0)) {
            // In production, fetch users from the secure users data source here
            // For now, we'll use empty array - users should be provided in rawData
            rawData = { ...rawDataObj, users: [] };
        }
        
        // 5. Prepare safe context (filters sensitive data)
        const safeContext = await prepareAIContext(
            user.role,
            isManager,
            asObject(rawData) ?? {}
        );
        
        // 6. Log AI access
        await logAuditEvent('ai.query', 'intelligence', {
            details: {
                query: queryStr.substring(0, 100), // Truncate for logging
                isManager,
                organizationId: callerOrganizationId,
                dataTypes: Object.keys(safeContext)
            }
        });
        
        // 7. Call AI with safe context (via centralized AIService)
        const aiService = AIService.getInstance();
        
        // Build schema based on role
        const responseSchema: { type: unknown; properties: Record<string, unknown>; required: string[] } = {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING, description: "סיכום ישיר ובוטה של המצב, או התשובה הישירה לחיפוש (אם נשאל)." },
                score: { type: Type.NUMBER, description: "ציון בריאות מערכת או יעילות אישית (0-100)" },
                actionableSteps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "רשימת פעולות לביצוע (3-5 נקודות)"
                },
                suggestedLinks: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            label: { type: Type.STRING },
                            path: { type: Type.STRING }
                        }
                    },
                    description: "Optional: Suggest navigation paths based on the answer."
                }
            },
            required: ['summary', 'score', 'actionableSteps']
        };
        
        // Extend schema for managers
        if (isManager) {
            responseSchema.properties.employees = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        efficiency: { type: Type.NUMBER },
                        workload: { type: Type.STRING, enum: ['Low', 'Optimal', 'High', 'Overload'] },
                        suggestion: { type: Type.STRING },
                        outputTrend: { type: Type.STRING, enum: ['up', 'down', 'stable'] }
                    }
                }
            };
            responseSchema.properties.revenueInsight = { type: Type.STRING, description: "תובנה פיננסית בעברית" };
        } else {
            responseSchema.properties.personalTasksAnalysis = {
                type: Type.OBJECT,
                properties: {
                    completedCount: { type: Type.NUMBER },
                    avgCompletionTime: { type: Type.STRING },
                    focusArea: { type: Type.STRING }
                }
            };
        }
        
        const prompt = `You are 'Nexus Brain', an advanced AI for business intelligence AND knowledge retrieval.
                   
                   DATA: You have access to 'knowledgeBase' (assets, clients, tasks) and 'stats'.
                   
                   MODE 1 - SEARCH/RETRIEVAL:
                   If the user asks "Where is...", "Do we have...", "Find...", or "What is the status of...":
                   - Search the 'knowledgeBase'.
                   - Answer directly in the 'summary' field (e.g., "Found the logo in Assets.", "Client X is active.").
                   - Set 'suggestedLinks' to the relevant page (e.g., /assets for files, /clients for clients, /tasks for tasks).
                   - If found, set score to 100.

                   MODE 2 - ANALYSIS:
                   If the user asks about performance, advice, or general status:
                   - Analyze the stats.
                   - Be blunt, direct, and strategic.
                   - Output strictly in HEBREW.
                   
                   CURRENT USER ROLE: ${user.role}.
                   Is Manager: ${isManager}
                   Note: The user cannot access data outside their permissions. The provided data is already filtered. Do not hallucinate data not present.
                   
                   Context: ${JSON.stringify(safeContext)}
                   
                   Query: ${queryStr}`;
        
        const aiOut = await withAiLoadIsolation({
            namespace: 'ai.generate_json',
            organizationId: callerOrganizationId,
            task: async () => {
                return await aiService.generateJson({
                    featureKey: 'ai.analyze',
                    organizationId: callerOrganizationId,
                    userId: clerkUserId,
                    prompt,
                    responseSchema: responseSchema,
                });
            },
        });

        // 8. Validate response doesn't contain sensitive data
        const result = aiOut.result;
        
        if (!validateAIResponse(result)) {
            console.error('[AI SECURITY] Response validation failed');
            return apiError('Security validation failed', { status: 500 });
        }

        // 9. Return safe response
        return apiSuccess({ result }, { headers: abuse.headers });

    } catch (error: unknown) {
        const safeMsg = 'Internal server error';
        await logAuditEvent('ai.query', 'intelligence', {
            success: false,
            error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg
        });

        if (IS_PROD) console.error('[AI SECURITY] Error processing AI request');
        else console.error('[AI SECURITY] Error processing AI request:', error);
        return apiError('Internal server error', { status: 500 });
    }
}


export const POST = shabbatGuard(POSTHandler);
