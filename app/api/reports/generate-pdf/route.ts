import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function POSTHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'לא מאומת' }, { status: 401 });
    }

    const bodyJson: unknown = await request.json().catch(() => ({}));
    const bodyObj = asObject(bodyJson) ?? {};
    const clientId = bodyObj.clientId == null ? '' : String(bodyObj.clientId);
    const month = bodyObj.month == null ? '' : String(bodyObj.month);
    const year = bodyObj.year == null ? '' : String(bodyObj.year);

    const { workspaceId } = await getWorkspaceOrThrow(request);

    if (clientId && clientId !== 'all') {
      const client = await prisma.clientClient.findUnique({
        where: { id: String(clientId) },
        select: { id: true, organizationId: true },
      });

      if (!client?.id || String(client.organizationId) !== String(workspaceId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const html = generateReportHTML(clientId, month, year);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="report-${month}-${year}.html"`,
      },
    });
  } catch (error: unknown) {
    if (IS_PROD) console.error('[generatePDF] Error');
    else console.error('[generatePDF] Error:', error);
    if (error instanceof APIError) {
      const safeMsg =
        error.status === 400
          ? 'Bad request'
          : error.status === 401
            ? 'Unauthorized'
            : error.status === 404
              ? 'Not found'
              : error.status === 500
                ? 'Internal server error'
                : 'Forbidden';
      return NextResponse.json(
        { error: IS_PROD ? safeMsg : error.message || safeMsg },
        { status: error.status }
      );
    }
    const safeMsg = 'שגיאה ביצירת PDF';
    return NextResponse.json(
      { error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg },
      { status: 500 }
    );
  }
}

function generateReportHTML(clientId: string, month: string, year: string): string {
  const generatedAt = new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const scope = clientId === 'all' ? 'כלל הלקוחות' : `לקוח ${clientId}`;

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>דוח ביצועים - ${month} ${year}</title>
  <style>
    @media print { .no-print { display: none !important; } body { margin: 0; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e293b, #334155); color: white; padding: 32px; }
    .header h1 { font-size: 24px; font-weight: 900; margin-bottom: 8px; }
    .header p { font-size: 14px; opacity: 0.8; }
    .content { padding: 32px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 18px; font-weight: 800; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
    .card .value { font-size: 28px; font-weight: 900; color: #1e293b; }
    .card .label { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: 4px; }
    .footer { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
    .print-btn { position: fixed; top: 16px; left: 16px; background: #1e293b; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 14px; z-index: 100; }
    .print-btn:hover { background: #0f172a; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ הדפס / שמור PDF</button>
  <div class="container">
    <div class="header">
      <h1>דוח ביצועים חודשי</h1>
      <p>${month} ${year} • ${scope}</p>
    </div>
    <div class="content">
      <div class="grid">
        <div class="card"><div class="value">—</div><div class="label">חשיפה מצטברת</div></div>
        <div class="card"><div class="value">—</div><div class="label">עוקבים חדשים</div></div>
        <div class="card"><div class="value">—</div><div class="label">מעורבות ממוצעת</div></div>
      </div>
      <div class="section">
        <h2>סיכום מנהלים</h2>
        <p style="color:#475569;line-height:1.8;">דוח זה נוצר אוטומטית. נתוני ביצועים מפורטים יהיו זמינים כאשר יצטברו מספיק נתונים במערכת.</p>
      </div>
      <div class="section">
        <h2>המלצות</h2>
        <p style="color:#475569;line-height:1.8;">ניתוח AI מותאם אישית יהיה זמין בגרסאות הבאות.</p>
      </div>
    </div>
    <div class="footer">
      <span>נוצר ע"י MISRAD AI</span>
      <span>${generatedAt}</span>
    </div>
  </div>
</body>
</html>`;
}


export const POST = shabbatGuard(POSTHandler);
