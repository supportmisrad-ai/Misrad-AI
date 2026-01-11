/**
 * Secure AI Analysis API
 * 
 * Server-side AI processing with data filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, hasPermission } from '../../../../lib/auth';
import { prepareAIContext, validateAIResponse } from '../../../../lib/ai-security';
import { logAuditEvent } from '../../../../lib/audit';
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate
        const user = await getAuthenticatedUser();

        // Resolve the caller organization_id from DB (server-side source of truth)
        const clerkUserId = await getCurrentUserId();
        const supabase = createClient();
        const { data: socialUser, error: socialUserError } = await supabase
            .from('social_users')
            .select('organization_id')
            .eq('clerk_user_id', clerkUserId)
            .maybeSingle();
        if (socialUserError) {
            console.error('[AI SECURITY] Failed to resolve social_user org:', socialUserError);
        }
        const callerOrganizationId = (socialUser as any)?.organization_id ? String((socialUser as any).organization_id) : null;

        if (!callerOrganizationId) {
            return NextResponse.json({ error: 'Forbidden - missing organization context' }, { status: 403 });
        }

        // Strict tenant enforcement: the caller must have access to their resolved organization
        await requireWorkspaceAccessByOrgSlugApi(callerOrganizationId);
        
        // 2. Parse request
        const body = await request.json();
        const { query, rawData: initialRawData } = body;
        
        if (!query) {
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            );
        }
        
        // 3. Check permissions
        const isManager = await hasPermission('manage_team') || await hasPermission('view_financials');
        
        // 4. Fetch users from secure API if needed (for manager view)
        let rawData = initialRawData || {};

        // 4.1 Organization scoping enforcement
        // If the caller has an org, ensure any explicitly provided org context matches.
        const rawOrg = (rawData as any)?.organizationId ?? (rawData as any)?.organization_id ?? null;
        if (callerOrganizationId && rawOrg && String(rawOrg) !== String(callerOrganizationId)) {
            return NextResponse.json({ error: 'Forbidden - organization mismatch' }, { status: 403 });
        }

        // If a leadId is provided, verify it belongs to the caller org (prevents cross-tenant AI analysis).
        const rawLeadId = (rawData as any)?.leadId ?? (rawData as any)?.lead_id ?? null;
        if (callerOrganizationId && rawLeadId) {
            const { data: leadRow, error: leadErr } = await supabase
                .from('system_leads')
                .select('id, organization_id')
                .eq('id', String(rawLeadId))
                .maybeSingle();
            if (leadErr) {
                console.error('[AI SECURITY] Failed lead org check:', leadErr);
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            const leadOrgId = (leadRow as any)?.organization_id ? String((leadRow as any).organization_id) : null;
            if (!leadOrgId || String(leadOrgId) !== String(callerOrganizationId)) {
                return NextResponse.json({ error: 'Forbidden - lead organization mismatch' }, { status: 403 });
            }
        }
        if (isManager && (!rawData?.users || rawData.users.length === 0)) {
            // In production, fetch from /api/users here
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
        
        // 7. Call AI with safe context
        if (!process.env.API_KEY) {
            return NextResponse.json(
                { error: 'AI service not configured' },
                { status: 500 }
            );
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Build schema based on role
        const responseSchema: any = {
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
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        // 8. Validate response doesn't contain sensitive data
        let result;
        try {
            result = JSON.parse(response.text || '{}');
        } catch (e) {
            return NextResponse.json(
                { error: 'Invalid AI response' },
                { status: 500 }
            );
        }
        
        if (!validateAIResponse(result)) {
            console.error('[AI SECURITY] Response validation failed');
            return NextResponse.json(
                { error: 'Security validation failed' },
                { status: 500 }
            );
        }
        
        // 9. Return safe response
        return NextResponse.json({
            success: true,
            result
        });
        
    } catch (error: any) {
        await logAuditEvent('ai.query', 'intelligence', {
            success: false,
            error: error.message
        });
        
        if (error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

