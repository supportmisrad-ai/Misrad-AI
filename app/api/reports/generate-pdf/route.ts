import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function POSTHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, month, year } = body;

    const { workspaceId } = await getWorkspaceOrThrow(request);

    if (clientId && clientId !== 'all') {
      const supabase = createClient();
      const { data: client } = await supabase
        .from('client_clients')
        .select('id, organization_id')
        .eq('id', clientId)
        .single();

      if (!client?.id || client.organization_id !== workspaceId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Generate PDF content (simplified - in production use a library like pdfkit or puppeteer)
    const pdfContent = generatePDFContent(clientId, month, year);

    // Return PDF as base64 or blob
    return NextResponse.json({
      success: true,
      pdfUrl: `data:application/pdf;base64,${pdfContent}`,
      filename: `דוח-ביצועים-${month}-${year}.pdf`,
    });
  } catch (error: any) {
    console.error('[generatePDF] Error:', error);
    if (error instanceof APIError) {
      return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
    }
    return NextResponse.json(
      { error: error.message || 'שגיאה ביצירת PDF' },
      { status: 500 }
    );
  }
}

function generatePDFContent(clientId: string, month: string, year: string): string {
  // Simplified PDF generation
  // In production, use a proper PDF library like:
  // - pdfkit
  // - puppeteer (to render HTML to PDF)
  // - jsPDF
  
  // For now, return a placeholder
  // This would be replaced with actual PDF generation
  const pdfData = {
    clientId,
    month,
    year,
    generatedAt: new Date().toISOString(),
  };

  // Return base64 encoded placeholder
  return Buffer.from(JSON.stringify(pdfData)).toString('base64');
}


export const POST = shabbatGuard(POSTHandler);
