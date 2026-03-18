import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface TrialExpiredEmailExtendedProps {
  organizationName: string;
  ownerName?: string | null;
  portalUrl: string;
}

export const TrialExpiredEmailExtended = ({
  organizationName,
  ownerName,
  portalUrl,
}: TrialExpiredEmailExtendedProps) => {
  const greeting = ownerName ? `${ownerName},` : 'שלום,';

  return (
    <EmailLayout
      previewText={`תקופת הניסיון של ${organizationName} מסתיימת`}
      headerSubtitle="הגישה הושהתה זמנית"
    >
      <Heading style={greetingStyle}>
        {greeting}
        {""}
      </Heading>

      <Text style={textStyle}>
        תקופת הניסיון של <strong>"{organizationName}"</strong> הסתיימה. הגישה למערכת הושהתה זמנית עד להשלמת התשלום.
        {""}
      </Text>

      <Section style={calloutBox}>
        <Text style={calloutTitle}>
          💾 הנתונים שלך בטוחים
        </Text>
        <Text style={calloutText}>
          כל המידע שלך נשמר ומאובטח. ברגע שתחדש את המנוי — הכל יחזור מיידית, בדיוק כפי שהשארת.
        </Text>
      </Section>

      <EmailCTA
        text="חידוש הגישה"
        url={portalUrl}
        color="#0f172a"
      />

      <Section style={founderNote}>
        <Text style={founderText}>
          אם יש שאלות או צריך עזרה עם ההחלטה — תשיב למייל הזה ונחזור אליך.
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
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  textAlign: 'right' as const,
};

const calloutTitle = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#0f172a',
  marginBottom: '8px',
};

const calloutText = {
  fontSize: '14px',
  color: '#475569',
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
