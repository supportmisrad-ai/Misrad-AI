import { Heading, Section, Text, Hr } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface TeamRoleChangedEmailProps {
  memberName?: string | null;
  organizationName: string;
  oldRole: string;
  newRole: string;
  changedByName?: string | null;
  portalUrl: string;
}

export const TeamRoleChangedEmail = ({
  memberName,
  organizationName,
  oldRole,
  newRole,
  changedByName,
  portalUrl,
}: TeamRoleChangedEmailProps) => {
  return (
    <EmailLayout
      previewText={`התפקיד שלך ב-${organizationName} עודכן`}
      headerSubtitle="התפקיד עודכן"
    >
      <Heading style={greeting}>
        {memberName ? `${memberName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        התפקיד שלך ב-
        <strong style={highlight}> "{organizationName}" </strong>
        עודכן
        {changedByName ? ` על ידי ${changedByName}` : ''}.
        {""}
      </Text>

      <Section style={roleCard}>
        <Section style={roleRow}>
          <Text style={roleLabel}>
            תפקיד קודם
            {""}
          </Text>
          <Text style={oldRoleText}>
            {oldRole}
            {""}
          </Text>
        </Section>
        
        <Hr style={divider} />
        
        <Section style={roleRow}>
          <Text style={roleLabel}>
            תפקיד חדש
            {""}
          </Text>
          <Text style={newRoleText}>
            {newRole}
            {""}
          </Text>
        </Section>
      </Section>

      <EmailCTA
        text="כניסה למערכת →"
        url={portalUrl}
        color="#6366f1"
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

const roleCard = {
  margin: '24px 0',
  background: '#f8fafc',
  border: '2px solid #e2e8f0',
  borderRadius: '14px',
  padding: '22px 24px',
  textAlign: 'right' as const,
};

const roleRow = {
  padding: '10px 0',
};

const roleLabel = {
  fontSize: '12px',
  fontWeight: '800',
  color: '#64748b',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
};

const oldRoleText = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#94a3b8',
  margin: '0',
};

const newRoleText = {
  fontSize: '18px',
  fontWeight: '900',
  color: '#6366f1',
  margin: '0',
};

const divider = {
  borderTop: '1px solid #e2e8f0',
  margin: '0',
};
