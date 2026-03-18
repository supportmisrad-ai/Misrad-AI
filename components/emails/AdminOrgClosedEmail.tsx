import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface AdminOrgClosedEmailProps {
  organizationName: string;
  ownerEmail: string;
  ownerName?: string | null;
  adminUrl: string;
}

export const AdminOrgClosedEmail = ({
  organizationName,
  ownerEmail,
  ownerName,
  adminUrl,
}: AdminOrgClosedEmailProps) => {
  return (
    <EmailLayout
      previewText="ארגון נסגר במערכת"
      headerTitle="MISRAD AI — Admin"
      headerSubtitle="ארגון נסגר"
    >
      <Heading style={h1}>ארגון נסגר</Heading>

      <Section style={infoCard}>
        <Section style={infoRow}>
          <Text style={infoLabel}>שם הארגון:</Text>
          <Text style={infoValue}>{organizationName}</Text>
        </Section>
        
        <Section style={infoRow}>
          <Text style={infoLabel}>בעלים:</Text>
          <Text style={infoValue}>{ownerName || 'לא ידוע'} ({ownerEmail})</Text>
        </Section>
      </Section>

      <EmailCTA
        text="פאנל ניהול →"
        url={adminUrl}
        color="#dc2626"
      />
    </EmailLayout>
  );
};

const h1 = {
  fontSize: '22px',
  fontWeight: '900',
  color: '#0f172a',
  marginBottom: '24px',
  textAlign: 'right' as const,
};

const infoCard = {
  margin: '20px 0',
  background: '#fef2f2',
  border: '1px solid #fecaca',
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
  color: '#991b1b',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
};

const infoValue = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0',
};
