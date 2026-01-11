import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { NextResponse } from 'next/server';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await getAuthenticatedUser();

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY לא מוגדר' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const orgIdFromHeader = req.headers.get('x-org-id') || req.headers.get('x-orgid');

    const { messages, clientContext }: { 
      messages: Array<{
        id: string;
        role: 'user' | 'assistant';
        parts: Array<{ type: string; text: string }>;
      }>;
      clientContext?: {
        companyName: string;
        name: string;
        brandVoice: string;
        dna?: {
          brandSummary?: string;
          voice?: {
            formal: number;
            funny: number;
            length: number;
          };
          vocabulary?: {
            loved: string[];
            forbidden: string[];
          };
        };
      };
    } = await req.json();

    const orgIdFromBody = (clientContext as any)?.organizationId;
    const orgId = orgIdFromHeader || orgIdFromBody;
    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    try {
      await requireWorkspaceAccessByOrgSlugApi(orgId);
    } catch (e: any) {
      const status = typeof e?.status === 'number' ? e.status : 403;
      return NextResponse.json({ error: e?.message || 'Forbidden' }, { status });
    }

    // Build concise system message with client context
    const systemMessage = clientContext ? `עוזר AI לניהול סושיאל מדיה עבור ${clientContext.companyName} (${clientContext.name}).
קול המותג: ${clientContext.brandVoice}.
${clientContext.dna?.brandSummary ? `מותג: ${clientContext.dna.brandSummary}. ` : ''}
${clientContext.dna?.voice ? `סגנון: רשמיות ${clientContext.dna.voice.formal}%, הומור ${clientContext.dna.voice.funny}%, אורך ${clientContext.dna.voice.length}%. ` : ''}
ענה בעברית, קצר וברור, בהתאם לסגנון המותג.` : `עוזר AI לניהול סושיאל מדיה. ענה בעברית, קצר וברור.`;

    // Convert messages to SDK message format (skip welcome message)
    const coreMessages = messages
      .filter(m => m.id !== 'welcome')
      .map(msg => ({
        role: msg.role,
        content: msg.parts?.find(p => p.type === 'text')?.text || '',
      }));

    // Use AI SDK with Google provider - this uses your existing Google API key
    // Using gemini-1.5-flash for faster responses
    const result = streamText({
      model: (google as any)('gemini-1.5-flash', {
        apiKey: apiKey,
      }),
      system: systemMessage,
      messages: coreMessages,
      temperature: 0.5, // Lower temperature for faster, more focused responses
    });

    // Return in format expected by useChat hook
    return (result as any).toDataStreamResponse
      ? (result as any).toDataStreamResponse()
      : (result as any).toTextStreamResponse();
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'שגיאה בטעינת הבוט. נסה שוב מאוחר יותר.' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
