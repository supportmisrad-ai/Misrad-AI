/**
 * API Route: Telephony Events (SSE)
 * GET /api/telephony/events - Server-Sent Events for real-time telephony notifications
 * 
 * This endpoint provides real-time screen pop notifications when calls come in.
 * 
 * @security protected:workspace - requires workspace access
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { getWorkspaceOrThrow } from '@/lib/server/api-workspace';

// In-memory store for pending screen pops (in production, use Redis)
const pendingScreenPops = new Map<string, Array<{ caller: string; leadId?: string; leadName?: string; timestamp: number }>>();

// Export function to add screen pop (called from webhook)
export function addScreenPop(orgSlug: string, data: { caller: string; leadId?: string; leadName?: string }) {
  const existing = pendingScreenPops.get(orgSlug) || [];
  existing.push({ ...data, timestamp: Date.now() });
  pendingScreenPops.set(orgSlug, existing);
  
  // Clean up old entries (older than 60 seconds)
  const cutoff = Date.now() - 60000;
  pendingScreenPops.set(orgSlug, existing.filter(e => e.timestamp > cutoff));
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate and verify workspace access
    await getAuthenticatedUser();
    await requirePermission('manage_system');
    const { workspace } = await getWorkspaceOrThrow(request);
    
    // Use workspace from context instead of query param
    const orgSlug = String(workspace.slug || workspace.id);

    // Set up SSE response
    const encoder = new TextEncoder();
    let intervalId: ReturnType<typeof setInterval> | null = null;
    
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));
        
        // Poll for screen pops every second
        intervalId = setInterval(() => {
          const pops = pendingScreenPops.get(orgSlug) || [];
          if (pops.length > 0) {
            // Send all pending screen pops
            for (const pop of pops) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'screen-pop',
                caller: pop.caller,
                leadId: pop.leadId,
                leadName: pop.leadName,
              })}\n\n`));
            }
            // Clear sent pops
            pendingScreenPops.set(orgSlug, []);
          }
          
          // Send heartbeat every 30 seconds
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        }, 1000);
      },
      cancel() {
        if (intervalId) {
          clearInterval(intervalId);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[SSE] Error:', error);
    return new Response('Unauthorized', { status: 401 });
  }
}
