import { Heading, Section, Text, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface SubscriptionCancelledEmailProps {
  ownerName?: string | null;
  organizationName: string;
  accessEndDate: string;
  reactivateUrl: string;
}

export const SubscriptionCancelledEmail = ({
  ownerName,
  organizationName,
  accessEndDate,
  reactivateUrl,
}: SubscriptionCancelledEmailProps) => {
  return (
    <EmailLayout
      previewText={`המנוי של ${organizationName} בוטל`}
      headerSubtitle="המנוי בוטל"
    >
      <Heading style={greeting}>
        {ownerName ? `${ownerName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        המנוי של
        <strong style={highlight}> "{organizationName}" </strong>
        בוטל.
        {""}
      </Text>

      <Section style={calloutBox}>
        <Text style={calloutTitle}>
          📋 מה קורה עכשיו?
          {""}
        </Text>
        <Text style={calloutText}>
          הגישה למערכת תישאר פעילה עד {accessEndDate}. אחרי כן, הנתונים יישמרו אבל הגישה תיחסם.
          {""}
        </Text>
      </Section>

      <EmailCTA
        text="הפעלה מחדש →"
        url={reactivateUrl}
        color="#64748b"
      />

      <Text style={footerNote}>
        מצטערים לראות אותך עוזב. אם יש משהו שיכולנו לעשות טוב יותר — נשמח לשמוע.
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

const calloutBox = {
  margin: '24px 0',
  padding: '20px',
  background: '#eff6ff',
  borderRadius: '8px',
  border: '1px solid #bfdbfe',
  textAlign: 'right' as const,
};

const calloutTitle = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#1e40af',
  marginBottom: '6px',
};

const calloutText = {
  fontSize: '14px',
  color: '#1e3a5f',
  lineHeight: '1.6',
  margin: '0',
};

const footerNote = {
  fontSize: '14px',
  color: '#64748b',
  lineHeight: '1.7',
  textAlign: 'center' as const,
  marginTop: '24px',
};
