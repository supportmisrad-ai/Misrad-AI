import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface TeamMemberJoinedEmailProps {
  ownerName?: string | null;
  memberName: string;
  memberEmail: string;
  role: string;
  organizationName: string;
  portalUrl: string;
}

export const TeamMemberJoinedEmail = ({
  ownerName,
  memberName,
  memberEmail,
  role,
  organizationName,
  portalUrl,
}: TeamMemberJoinedEmailProps) => {
  return (
    <EmailLayout
      previewText={`${memberName} הצטרף לצוות של ${organizationName}`}
      headerSubtitle="חבר צוות חדש"
    >
      <Heading style={greeting}>
        {ownerName ? `${ownerName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        <strong style={highlight}>{memberName}</strong> הצטרף לצוות של "{organizationName}".
        {""}
      </Text>

      <Section style={infoCard}>
        <Section style={infoRow}>
          <Text style={infoLabel}>
            שם
            {""}
          </Text>
          <Text style={infoValue}>
            {memberName}
            {""}
          </Text>
        </Section>
        
        <Section style={infoRow}>
          <Text style={infoLabel}>
            תפקיד
            {""}
          </Text>
          <Text style={infoValue}>
            {role}
            {""}
          </Text>
        </Section>
      </Section>

      <EmailCTA
        text="ניהול הצוות →"
        url={portalUrl}
        color="#059669"
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

const infoCard = {
  margin: '24px 0',
  background: '#ecfdf5',
  border: '2px solid #a7f3d0',
  borderRadius: '14px',
  padding: '22px 24px',
  textAlign: 'right' as const,
};

const infoRow = {
  marginBottom: '12px',
};

const infoLabel = {
  fontSize: '12px',
  fontWeight: '800',
  color: '#065f46',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
};

const infoValue = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0',
};
