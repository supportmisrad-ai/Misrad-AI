/**
 * Secure AI Analysis API
 * 
 * Server-side AI processing with data filtering
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, hasPermission } from '../../../../lib/auth';
import { prepareAIContext, validateAIResponse } from '../../../../lib/ai-security';
import { logAuditEvent } from '../../../../lib/audit';
import { Type } from "@google/genai";
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    const obj = asObject(error);
    const msg = obj?.message;
    return typeof msg === 'string' ? msg : '';
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
            const socialUser = await (prisma as any).social_users.findUnique({
                where: { clerk_user_id: String(clerkUserId) },
                select: { organization_id: true },
            });
            callerOrganizationId = (socialUser as any)?.organization_id ? String((socialUser as any).organization_id) : null;
        } catch (e: any) {
            console.error('[AI SECURITY] Failed to resolve social_user org:', e);
        }

        if (!callerOrganizationId) {
            return apiError('Forbidden - missing organization context', { status: 403 });
        }

        // Strict tenant enforcement: the caller must have access to their resolved organization
        await getWorkspaceByOrgKeyOrThrow(callerOrganizationId);

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
        const body = await request.json();
        const { query, rawData: initialRawData } = body;
        
        if (!query) {
            return apiError('Query is required', { status: 400 });
        }
        
        // 3. Check permissions
        const isManager = await hasPermission('manage_team') || await hasPermission('view_financials');
        
        // 4. Fetch users from secure API if needed (for manager view)
        let rawData = initialRawData || {};

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
            } catch (e: any) {
                console.error('[AI SECURITY] Failed lead org check:', e);
                return apiError('Forbidden', { status: 403 });
            }
            if (!leadOrgId || String(leadOrgId) !== String(callerOrganizationId)) {
                return apiError('Forbidden - lead organization mismatch', { status: 403 });
            }
        }
        if (isManager && (!rawData?.users || rawData.users.length === 0)) {
            // In production, fetch users from the secure users data source here
            // For now, we'll use empty array - users should be provided in rawData
            rawData = { ...rawData, users: [] };
        }
        
        // 5. Prepare safe context (filters sensitive data)
        const safeContext = await prepareAIContext(
            user.role,
            isManager,
            rawData || {}
        );
        
        // 6. Log AI access
        await logAuditEvent('ai.query', 'intelligence', {
            details: {
                query: query.substring(0, 100), // Truncate for logging
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
                   
                   Query: ${query}`;
        
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
        await logAuditEvent('ai.query', 'intelligence', {
            success: false,
            error: getErrorMessage(error)
        });

        console.error('[AI SECURITY] Error processing AI request:', error);
        return apiError('Internal server error', { status: 500 });
    }
}


export const POST = shabbatGuard(POSTHandler);
