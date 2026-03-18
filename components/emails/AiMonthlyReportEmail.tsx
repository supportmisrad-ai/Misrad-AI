import { Heading, Section, Text, Hr } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface AiMonthlyReportEmailProps {
  adminName?: string | null;
  organizationName: string;
  periodLabel: string;
  score: number;
  summary: string;
  insightCount: number;
  recommendationCount: number;
  reportUrl: string;
}

export const AiMonthlyReportEmail = ({
  adminName,
  organizationName,
  periodLabel,
  score,
  summary,
  insightCount,
  recommendationCount,
  reportUrl,
}: AiMonthlyReportEmailProps) => {
  const greeting = adminName ? `${adminName},` : 'שלום,';
  const scoreColor = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626';
  const scoreBg = score >= 70 ? '#ecfdf5' : score >= 40 ? '#fffbeb' : '#fef2f2';
  const scoreBorder = score >= 70 ? '#a7f3d0' : score >= 40 ? '#fde68a' : '#fecaca';

  return (
    <EmailLayout
      previewText={`הדוח החודשי של ${organizationName} מוכן`}
      headerSubtitle="דוח AI חודשי מוכן"
    >
      <Heading style={greetingStyle}>
        {greeting}
        {""}
      </Heading>

      <Text style={text}>
        הדוח החודשי של <strong style={highlight}>"{organizationName}"</strong> מוכן.
        <br />
        <span style={subText}>תקופה: {periodLabel}</span>
        {""}
      </Text>

      <Section style={{ ...scoreCard, background: scoreBg, border: `2px solid ${scoreBorder}` }}>
        <Text style={{ ...scoreLabel, color: scoreColor }}>ציון בריאות ארגוני</Text>
        <Text style={{ ...scoreValue, color: scoreColor }}>{score}</Text>
        <Text style={scoreSubText}>מתוך 100</Text>
      </Section>

      <Section style={summaryBox}>
        <Text style={summaryText}>{summary}</Text>
      </Section>

      <Section style={metricsContainer}>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
          <tr>
            <td style={metricCellBlue}>
              <Text style={metricValueBlue}>{insightCount}</Text>
              <Text style={metricLabelBlue}>תובנות</Text>
            </td>
            <td style={{ width: '12px' }}></td>
            <td style={metricCellGreen}>
              <Text style={metricValueGreen}>{recommendationCount}</Text>
              <Text style={metricLabelGreen}>המלצות</Text>
            </td>
          </tr>
        </table>
      </Section>

      <EmailCTA
        text="צפייה בדוח המלא →"
        url={reportUrl}
        color="#6366f1"
      />

      <Text style={footerNote}>
        הדוח נוצר אוטומטית על בסיס נתוני המערכת בלבד.
        {""}
      </Text>
    </EmailLayout>
  );
};

const greetingStyle = {
  fontSize: '24px',
  fontWeight: '900',
  color: '#0f172a',
  marginBottom: '24px',
  textAlign: 'right' as const,
};

const text = {
  fontSize: '17px',
  lineHeight: '1.8',
  color: '#334155',
  marginBottom: '24px',
  textAlign: 'right' as const,
};

const highlight = {
  color: '#6366f1',
};

const subText = {
  color: '#94a3b8',
  fontSize: '14px',
};

const scoreCard = {
  margin: '24px 0',
  borderRadius: '14px',
  padding: '24px',
  textAlign: 'center' as const,
};

const scoreLabel = {
  fontSize: '12px',
  fontWeight: '800',
  letterSpacing: '0.5px',
  marginBottom: '8px',
  textTransform: 'uppercase' as const,
};

const scoreValue = {
  fontSize: '48px',
  fontWeight: '900',
  margin: '0',
};

const scoreSubText = {
  fontSize: '12px',
  color: '#64748b',
  marginTop: '4px',
};

const summaryBox = {
  margin: '20px 0',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '18px 22px',
  textAlign: 'right' as const,
};

const summaryText = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.8',
  margin: '0',
};

const metricsContainer = {
  margin: '20px 0',
};

const metricCellBlue = {
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '12px',
  padding: '16px',
  textAlign: 'center' as const,
  width: '50%',
};

const metricValueBlue = {
  fontSize: '24px',
  fontWeight: '900',
  color: '#1d4ed8',
  margin: '0',
};

const metricLabelBlue = {
  fontSize: '12px',
  fontWeight: '700',
  color: '#3b82f6',
  margin: '4px 0 0',
};

const metricCellGreen = {
  background: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '12px',
  padding: '16px',
  textAlign: 'center' as const,
  width: '50%',
};

const metricValueGreen = {
  fontSize: '24px',
  fontWeight: '900',
  color: '#16a34a',
  margin: '0',
};

const metricLabelGreen = {
  fontSize: '12px',
  fontWeight: '700',
  color: '#22c55e',
  margin: '4px 0 0',
};

const footerNote = {
  fontSize: '13px',
  color: '#64748b',
  textAlign: 'center' as const,
  marginTop: '24px',
};
