import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface OrgClosedEmailProps {
  ownerName?: string | null;
  organizationName: string;
  dataRetentionDays: number;
  reactivateUrl: string;
}

export const OrgClosedEmail = ({
  ownerName,
  organizationName,
  dataRetentionDays,
  reactivateUrl,
}: OrgClosedEmailProps) => {
  return (
    <EmailLayout
      previewText={`הארגון ${organizationName} נסגר בהצלחה`}
      headerSubtitle="הארגון נסגר"
    >
      <Heading style={greeting}>
        {ownerName ? `${ownerName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        הארגון
        <strong style={highlight}> "{organizationName}" </strong>
        נסגר בהצלחה.
        {""}
      </Text>

      <Section style={calloutBox}>
        <Text style={calloutTitle}>
          💾 שמירת נתונים
          {""}
        </Text>
        <Text style={calloutText}>
          הנתונים שלך נשמרים במערכת למשך {dataRetentionDays} יום. ניתן להפעיל מחדש בכל עת.
          {""}
        </Text>
      </Section>

      <EmailCTA
        text="הפעלה מחדש →"
        url={reactivateUrl}
        color="#64748b"
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
