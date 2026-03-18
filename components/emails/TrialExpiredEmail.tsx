import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface TrialExpiredEmailProps {
  ownerName?: string | null;
  organizationName: string;
  checkoutUrl: string;
}

export const TrialExpiredEmail = ({
  ownerName,
  organizationName,
  checkoutUrl,
}: TrialExpiredEmailProps) => {
  return (
    <EmailLayout
      previewText={`תקופת הניסיון של ${organizationName} הסתיימה`}
      headerSubtitle="תקופת הניסיון הסתיימה"
    >
      <Heading style={greeting}>
        {ownerName ? `${ownerName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        תקופת הניסיון של 
        <strong style={highlight}> "{organizationName}" </strong>
        הסתיימה.
        <br />
        הגישה למערכת נחסמה, אבל <strong>כל הנתונים שלך נשמרים</strong>.
        {""}
      </Text>

      <EmailCTA
        text="בחירת חבילה והפעלה מחדש →"
        url={checkoutUrl}
        color="#dc2626"
      />

      <Text style={footerNote}>
        שאלות? אנחנו כאן ב-
        <a href="mailto:billing@misrad-ai.com" style={link}>
          billing@misrad-ai.com
        </a>
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

const footerNote = {
  fontSize: '13px',
  color: '#64748b',
  textAlign: 'center' as const,
  marginTop: '28px',
};

const link = {
  color: '#6366f1',
  textDecoration: 'none',
};
