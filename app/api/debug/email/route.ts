import { NextRequest, NextResponse } from 'next/server';
import { 
  generateWelcomeEmailHTML,
  generatePaymentSuccessEmailHTML,
  generateInvoiceCreatedEmailHTML,
  generatePaymentFailedEmailHTML,
  generatePlanChangedEmailHTML,
  generateTrialExpiredEmailHTML,
  generateTrialExpiryWarningEmailHTML,
  generateEmployeeInvitationEmailHTML,
  generateSecurityNewDeviceEmailHTML,
  generateWeeklyReportEmailHTML,
  generateAiMonthlyReportReadyEmailHTML,
  generateNewsletterEmailHTML
} from '@/lib/email-generators';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'welcome';

  try {
    let html = '';
    
    switch (type) {
      case 'welcome':
        html = await generateWelcomeEmailHTML({
          ownerName: 'ישראל ישראלי',
          organizationName: 'העסק שלי בע"מ',
          portalUrl: 'https://misrad-ai.com/dashboard',
        });
        break;
      case 'payment_success':
        html = await generatePaymentSuccessEmailHTML({
          ownerName: 'ישראל ישראלי',
          organizationName: 'העסק שלי בע"מ',
          amount: 499,
          invoiceNumber: 'INV-2024-001',
          portalUrl: 'https://misrad-ai.com/billing',
        });
        break;
      case 'invoice_created':
        html = await generateInvoiceCreatedEmailHTML({
          ownerName: 'ישראל ישראלי',
          organizationName: 'העסק שלי בע"מ',
          amount: 499,
          invoiceNumber: 'INV-2024-001',
          portalUrl: 'https://misrad-ai.com/billing',
          paymentUrl: 'https://misrad-ai.com/pay/123',
          dueDate: '2024-04-01',
        });
        break;
      case 'payment_failed':
        html = await generatePaymentFailedEmailHTML({
          ownerName: 'ישראל ישראלי',
          organizationName: 'העסק שלי בע"מ',
          amount: 499,
          reason: 'כרטיס פג תוקף',
          retryUrl: 'https://misrad-ai.com/billing',
        });
        break;
      case 'plan_changed':
        html = await generatePlanChangedEmailHTML({
          ownerName: 'ישראל ישראלי',
          organizationName: 'העסק שלי בע"מ',
          oldPlan: 'Solo',
          newPlan: 'The Empire',
          newPrice: 499,
          effectiveDate: '2024-04-01',
          portalUrl: 'https://misrad-ai.com/billing',
        });
        break;
      case 'trial_expired':
        html = await generateTrialExpiredEmailHTML({
          ownerName: 'ישראל ישראלי',
          organizationName: 'העסק שלי בע"מ',
          checkoutUrl: 'https://misrad-ai.com/checkout',
        });
        break;
      case 'trial_warning':
        html = await generateTrialExpiryWarningEmailHTML({
          ownerName: 'ישראל ישראלי',
          organizationName: 'העסק שלי בע"מ',
          daysRemaining: 3,
          portalUrl: 'https://misrad-ai.com/checkout',
        });
        break;
      case 'team_invite':
        html = await generateEmployeeInvitationEmailHTML({
          employeeName: 'משה כהן',
          employeeEmail: 'moshe@example.com',
          department: 'מכירות',
          role: 'מנהל צוות',
          invitationUrl: 'https://misrad-ai.com/invite/123',
          createdByName: 'ישראל ישראלי',
        });
        break;
      case 'security_alert':
        html = await generateSecurityNewDeviceEmailHTML({
          userName: 'ישראל ישראלי',
          device: 'Chrome on MacOS',
          location: 'Tel Aviv, Israel',
          time: '18/03/2026 19:30',
          ip: '1.2.3.4',
          securityUrl: 'https://misrad-ai.com/me/security',
        });
        break;
      case 'weekly_report':
        html = await generateWeeklyReportEmailHTML({
          ownerName: 'ישראל ישראלי',
          organizationName: 'העסק שלי בע"מ',
          weekRange: '11-17 מרץ, 2026',
          stats: {
            activeUsers: 12,
            newClients: 5,
            tasksCompleted: 45,
            aiCreditsUsed: 850,
            aiCreditsTotal: 1000,
          },
          portalUrl: 'https://misrad-ai.com/nexus/reports',
          topAchievement: 'סגרתם 5 לקוחות חדשים השבוע! שיא חדש לארגון.',
        });
        break;
      case 'ai_report':
        html = await generateAiMonthlyReportReadyEmailHTML({
          adminName: 'ישראל ישראלי',
          organizationName: 'העסק שלי בע"מ',
          periodLabel: 'מרץ 2026',
          score: 85,
          summary: 'החודש ראינו צמיחה משמעותית בפעילות המכירות, עם עליה של 20% ביעילות הצוות.',
          insightCount: 4,
          recommendationCount: 3,
          reportUrl: 'https://misrad-ai.com/nexus/ai-reports',
        });
        break;
      case 'newsletter':
        html = await generateNewsletterEmailHTML({
          title: 'עדכוני מרץ ב-MISRAD AI',
          preheader: 'פיצ\'רים חדשים, טיפים לניהול חכם ועוד',
          sections: [
            {
              heading: 'מערכת המיילים החדשה שלנו',
              body: 'השקנו עיצוב חדש, נקי ומהיר לכל המיילים במערכת.',
              ctaText: 'קרא עוד',
              ctaUrl: 'https://misrad-ai.com/blog/emails',
            },
            {
              heading: 'טיפ החודש: אוטומיזציה',
              body: 'איך לחסוך 5 שעות בשבוע בעזרת ה-AI של MISRAD.',
            }
          ],
        });
        break;
      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Email debug error:', error);
    return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 });
  }
}
