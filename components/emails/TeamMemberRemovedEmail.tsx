import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';

interface TeamMemberRemovedEmailProps {
  memberName?: string | null;
  organizationName: string;
  removedByName?: string | null;
}

export const TeamMemberRemovedEmail = ({
  memberName,
  organizationName,
  removedByName,
}: TeamMemberRemovedEmailProps) => {
  return (
    <EmailLayout
      previewText={`הגישה שלך לארגון ${organizationName} הוסרה`}
      headerSubtitle="הגישה הוסרה"
    >
      <Heading style={greeting}>
        {memberName ? `${memberName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        הגישה שלך לארגון
        <strong style={highlight}> "{organizationName}" </strong>
        הוסרה
        {removedByName ? ` על ידי ${removedByName}` : ''}.
        {""}
      </Text>

      <Text style={subText}>
        אם לדעתך מדובר בטעות, פנה למנהל הארגון.
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

const subText = {
  fontSize: '14px',
  color: '#64748b',
  lineHeight: '1.7',
  textAlign: 'right' as const,
};
