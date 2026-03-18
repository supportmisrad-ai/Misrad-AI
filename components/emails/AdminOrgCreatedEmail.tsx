import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface AdminOrgCreatedEmailProps {
  organizationName: string;
  ownerEmail: string;
  ownerName?: string | null;
  plan: string;
  adminUrl: string;
}

export const AdminOrgCreatedEmail = ({
  organizationName,
  ownerEmail,
  ownerName,
  plan,
  adminUrl,
}: AdminOrgCreatedEmailProps) => {
  return (
    <EmailLayout
      previewText="ארגון חדש נוצר במערכת"
      headerTitle="MISRAD AI — Admin"
      headerSubtitle="ארגון חדש"
    >
      <Heading style={h1}>ארגון חדש נוצר</Heading>

      <Section style={infoCard}>
        <Section style={infoRow}>
          <Text style={infoLabel}>שם הארגון:</Text>
          <Text style={infoValue}>{organizationName}</Text>
        </Section>
        
        <Section style={infoRow}>
          <Text style={infoLabel}>בעלים:</Text>
          <Text style={infoValue}>{ownerName || 'לא ידוע'} ({ownerEmail})</Text>
        </Section>

        <Section style={infoRow}>
          <Text style={infoLabel}>חבילה:</Text>
          <Text style={infoValue}>{plan}</Text>
        </Section>
      </Section>

      <EmailCTA
        text="פאנל ניהול →"
        url={adminUrl}
        color="#059669"
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
  background: '#ecfdf5',
  border: '1px solid #a7f3d0',
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
