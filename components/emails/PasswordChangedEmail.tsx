import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface PasswordChangedEmailProps {
  userName?: string | null;
  time: string;
  securityUrl: string;
}

export const PasswordChangedEmail = ({
  userName,
  time,
  securityUrl,
}: PasswordChangedEmailProps) => {
  return (
    <EmailLayout
      previewText="הסיסמה שלך שונתה בהצלחה"
      headerSubtitle="הסיסמה שונתה"
    >
      <Heading style={greeting}>
        {userName ? `${userName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        הסיסמה של החשבון שלך שונתה בהצלחה ב-{time}.
        {""}
      </Text>

      <Section style={alertBox}>
        <Text style={alertTitle}>
          🔒 לא שינית סיסמה?
          {""}
        </Text>
        <Text style={alertText}>
          אם לא ביצעת את השינוי, פנה מיד לתמיכה.
          {""}
        </Text>
      </Section>

      <EmailCTA
        text="הגדרות אבטחה"
        url={securityUrl}
        color="#0f172a"
      />
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

const alertBox = {
  margin: '24px 0',
  padding: '20px',
  background: '#fff7ed',
  borderRadius: '8px',
  border: '1px solid #fed7aa',
  textAlign: 'right' as const,
};

const alertTitle = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#9a3412',
  marginBottom: '6px',
};

const alertText = {
  fontSize: '14px',
  color: '#9a3412',
  lineHeight: '1.6',
  margin: '0',
};
