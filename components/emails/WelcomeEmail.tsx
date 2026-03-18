import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface WelcomeEmailProps {
  ownerName: string;
  organizationName: string;
  portalUrl: string;
}

export const WelcomeEmail = ({
  ownerName,
  organizationName,
  portalUrl,
}: WelcomeEmailProps) => {
  return (
    <EmailLayout
      previewText={`ברוכים הבאים ל-MISRAD AI, ${ownerName}!`}
      headerSubtitle="ברוכים הבאים"
    >
      <Heading style={greeting}>
        {ownerName ? `${ownerName},` : 'שלום,'}
        {" "}
      </Heading>

      <Text style={text}>
        אנחנו שמחים שהצטרפת ל-MISRAD AI. הארגון שלך
        <strong style={highlight}> "{organizationName}" </strong>
        הוקם בהצלחה ומוכן לעבודה.
        {" "}
      </Text>

      <Section style={statsContainer}>
        <Text style={statsLabel}>
          מה עכשיו?
          {" "}
        </Text>
        <Text style={statsText}>
          המערכת עוצבה כדי לתת לך שקט נפשי וניהול חכם של כל הארגון במקום אחד.
          {" "}
        </Text>
      </Section>

      <EmailCTA
        text="כניסה למערכת →"
        url={portalUrl}
        color="#6366f1"
      />

      <Text style={footerNote}>
        צוות MISRAD AI כאן לכל שאלה.
        {" "}
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

const statsContainer = {
  margin: '24px 0',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
  padding: '24px',
  textAlign: 'right' as const,
};

const statsLabel = {
  fontSize: '12px',
  fontWeight: '800',
  color: '#64748b',
  letterSpacing: '0.5px',
  marginBottom: '8px',
  textTransform: 'uppercase' as const,
};

const statsText = {
  fontSize: '15px',
  color: '#334155',
  margin: '0',
};

const footerNote = {
  fontSize: '14px',
  color: '#64748b',
  textAlign: 'center' as const,
  marginTop: '24px',
};
