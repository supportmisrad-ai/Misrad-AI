import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface TrialExpiryWarningEmailProps {
  organizationName: string;
  ownerName?: string | null;
  daysRemaining: number;
  portalUrl: string;
}

export const TrialExpiryWarningEmail = ({
  organizationName,
  ownerName,
  daysRemaining,
  portalUrl,
}: TrialExpiryWarningEmailProps) => {
  const greeting = ownerName ? `${ownerName},` : 'שלום,';
  const urgencyText = daysRemaining === 1 ? 'מחר' : `בעוד ${daysRemaining} ימים`;
  const dayLabel = daysRemaining === 1 ? 'יום' : daysRemaining === 2 ? 'יומיים' : `${daysRemaining} ימים`;

  const isLastDay = daysRemaining <= 1;
  const isUrgent = daysRemaining <= 3;

  return (
    <EmailLayout
      previewText={`תקופת הניסיון של ${organizationName} מסתיימת ${urgencyText}`}
      headerSubtitle={`תקופת הניסיון מסתיימת ${urgencyText}`}
    >
      <Heading style={greetingStyle}>
        {greeting}
        {""}
      </Heading>

      <Text style={textStyle}>
        רציתי לתת לך תזכורת — תקופת הניסיון של <strong>"{organizationName}"</strong> מסתיימת {urgencyText}.
        {""}
      </Text>

      <Section style={{
        ...calloutBox,
        background: isLastDay ? '#f8fafc' : isUrgent ? '#fffbeb' : '#f8fafc',
        border: `1px solid ${isLastDay ? '#e2e8f0' : isUrgent ? '#fde68a' : '#e2e8f0'}`,
      }}>
        <Text style={{
          ...calloutTitle,
          color: isLastDay ? '#0f172a' : isUrgent ? '#92400e' : '#0f172a',
        }}>
          {isLastDay ? '📌' : isUrgent ? '⏳' : '📋'} נותרו {dayLabel} לבדוק הכל
        </Text>
        <Text style={{
          ...calloutText,
          color: isLastDay ? '#475569' : isUrgent ? '#92400e' : '#475569',
        }}>
          אחרי זה המערכת תמשיך לשמור את כל הנתונים שלך, אבל הגישה תושהה עד שתחליט לחזור. בלי לחץ — הדלת פתוחה תמיד.
        </Text>
      </Section>

      <EmailCTA
        text="בחירת תוכנית"
        url={portalUrl}
        color="#0f172a"
      />

      <Section style={founderNote}>
        <Text style={founderText}>
          אם יש שאלות על התוכניות או שמשהו לא ברור — פשוט תשיב למייל הזה. לא נעלים כאן, אני קורא ומגיב.
        </Text>
        <Text style={founderName}>איציק דהן, מייסד MISRAD AI</Text>
      </Section>
    </EmailLayout>
  );
};

const greetingStyle = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#0f172a',
  marginBottom: '24px',
  textAlign: 'right' as const,
};

const textStyle = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#334155',
  marginBottom: '24px',
  textAlign: 'right' as const,
};

const calloutBox = {
  margin: '24px 0',
  padding: '20px',
  borderRadius: '8px',
  textAlign: 'right' as const,
};

const calloutTitle = {
  fontSize: '16px',
  fontWeight: '700',
  marginBottom: '8px',
  margin: '0 0 8px',
};

const calloutText = {
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
};

const founderNote = {
  marginTop: '32px',
  padding: '24px',
  background: '#f8fafc',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  textAlign: 'right' as const,
};

const founderText = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.7',
  margin: '0 0 12px',
};

const founderName = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0',
};
