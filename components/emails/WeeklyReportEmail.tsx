import { Heading, Section, Text, Img } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface WeeklyReportEmailProps {
  ownerName?: string | null;
  organizationName: string;
  weekRange: string;
  stats: {
    activeUsers: number;
    newClients: number;
    tasksCompleted: number;
    aiCreditsUsed: number;
    aiCreditsTotal: number;
  };
  portalUrl: string;
  chartImageUrl?: string;
  topAchievement?: string;
}

export const WeeklyReportEmail = ({
  ownerName,
  organizationName,
  weekRange,
  stats,
  portalUrl,
  chartImageUrl,
  topAchievement,
}: WeeklyReportEmailProps) => {
  const aiPercent = stats.aiCreditsTotal > 0
    ? Math.round((stats.aiCreditsUsed / stats.aiCreditsTotal) * 100)
    : 0;

  return (
    <EmailLayout
      previewText={`הסיכום השבועי של ${organizationName}`}
      headerSubtitle="דוח שבועי ☕"
    >
      <Heading style={greeting}>
        {ownerName ? `${ownerName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        הנה הסיכום השבועי של 
        <strong style={highlight}> "{organizationName}"</strong> ☕
        <br />
        <span style={subText}>{weekRange}</span>
        {""}
      </Text>

      {topAchievement && (
        <Section style={achievementCard}>
          <Text style={achievementTitle}>
            🏆 ההישג של השבוע
            {""}
          </Text>
          <Text style={achievementText}>
            {topAchievement}
            {""}
          </Text>
        </Section>
      )}

      <Section style={statsGrid}>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
          <tr>
            <td style={statCell}>
              <Text style={statValue}>{stats.activeUsers}</Text>
              <Text style={statLabel}>משתמשים פעילים</Text>
            </td>
            <td style={{ width: '8px' }}></td>
            <td style={statCell}>
              <Text style={statValue}>{stats.newClients}</Text>
              <Text style={statLabel}>לקוחות חדשים</Text>
            </td>
          </tr>
          <tr><td style={{ height: '8px' }} colSpan={3}></td></tr>
          <tr>
            <td style={statCell}>
              <Text style={statValue}>{stats.tasksCompleted}</Text>
              <Text style={statLabel}>משימות שהושלמו</Text>
            </td>
            <td style={{ width: '8px' }}></td>
            <td style={statCell}>
              <Text style={{ ...statValue, color: aiPercent > 80 ? '#ef4444' : aiPercent > 50 ? '#f59e0b' : '#10b981' }}>{aiPercent}%</Text>
              <Text style={statLabel}>שימוש AI</Text>
            </td>
          </tr>
        </table>
      </Section>

      {chartImageUrl && (
        <Section style={chartContainer}>
          <Text style={chartTitle}>MISRAD AI — סטטיסטיקות</Text>
          <Img src={chartImageUrl} alt="Weekly Chart" width="520" style={chartImg} />
        </Section>
      )}

      <EmailCTA
        text="צפייה בדוח המלא →"
        url={portalUrl}
        color="#6366f1"
      />

      <Text style={footerNote}>
        שבוע טוב! 💪 צוות MISRAD AI
        {""}
      </Text>
    </EmailLayout>
  );
};

const greeting = {
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

const achievementCard = {
  margin: '24px 0',
  padding: '20px',
  background: '#ecfdf5',
  borderRadius: '8px',
  border: '1px solid #a7f3d0',
  textAlign: 'right' as const,
};

const achievementTitle = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#065f46',
  marginBottom: '6px',
};

const achievementText = {
  fontSize: '14px',
  color: '#047857',
  lineHeight: '1.6',
  margin: '0',
};

const statsGrid = {
  margin: '24px 0',
};

const statCell = {
  textAlign: 'center' as const,
  padding: '16px 12px',
  background: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  width: '50%',
};

const statValue = {
  fontSize: '20px',
  fontWeight: '800',
  color: '#0f172a',
  margin: '0',
};

const statLabel = {
  fontSize: '12px',
  fontWeight: '500',
  color: '#64748b',
  marginTop: '4px',
};

const chartContainer = {
  margin: '24px 0',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
  background: '#ffffff',
};

const chartTitle = {
  background: '#f8fafc',
  padding: '10px 16px',
  fontSize: '11px',
  fontWeight: '600',
  color: '#64748b',
  borderBottom: '1px solid #e2e8f0',
  margin: '0',
  textAlign: 'right' as const,
};

const chartImg = {
  display: 'block',
  width: '100%',
  borderRadius: '0 0 8px 8px',
};

const footerNote = {
  fontSize: '13px',
  color: '#64748b',
  textAlign: 'center' as const,
  marginTop: '24px',
};
