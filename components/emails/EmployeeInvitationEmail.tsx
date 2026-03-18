import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface EmployeeInvitationEmailProps {
  employeeName: string | null;
  employeeEmail: string;
  department: string;
  role: string;
  invitationUrl: string;
  createdByName?: string | null;
}

export const EmployeeInvitationEmail = ({
  employeeName,
  employeeEmail,
  department,
  role,
  invitationUrl,
  createdByName,
}: EmployeeInvitationEmailProps) => {
  const greeting = employeeName ? `${employeeName},` : 'שלום,';
  const inviter = createdByName ? `${createdByName} ` : '';

  return (
    <EmailLayout
      previewText="הזמנה להצטרף לצוות ב-MISRAD AI"
      headerSubtitle="הזמנה להצטרף לצוות"
    >
      <Heading style={greetingStyle}>
        {greeting}
        {""}
      </Heading>

      <Text style={textStyle}>
        {inviter ? `${inviter}הזמין אותך להצטרף לצוות` : 'הוזמנת להצטרף לצוות'} ב-MISRAD AI.
        {""}
      </Text>

      <Section style={infoCard}>
        <Section style={infoRow}>
          <Text style={infoLabel}>מחלקה</Text>
          <Text style={infoValue}>{department}</Text>
        </Section>
        
        <Section style={infoRowBorder}>
          <Text style={infoLabel}>תפקיד</Text>
          <Text style={infoValue}>{role}</Text>
        </Section>
      </Section>

      <EmailCTA
        text="השלמת הרשמה"
        url={invitationUrl}
        color="#0f172a"
      />

      <Section style={calloutBox}>
        <Text style={calloutTitle}>⏰ הקישור תקף ל-30 יום</Text>
        <Text style={calloutText}>
          לאחר מכן תצטרך הזמנה חדשה.
        </Text>
      </Section>

      <Text style={footerNote}>
        לא ביקשת הזמנה זו? אפשר להתעלם מהמייל.
        {""}
      </Text>
    </EmailLayout>
  );
};

const greetingStyle = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#0f172a',
  marginBottom: '24px',
  textAlign: 'right' as const,
};

const textStyle = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#334155',
  marginBottom: '24px',
  textAlign: 'right' as const,
};

const infoCard = {
  margin: '24px 0',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '24px',
  textAlign: 'right' as const,
};

const infoRow = {
  padding: '0',
};

const infoRowBorder = {
  padding: '16px 0 0',
  borderTop: '1px solid #e2e8f0',
  marginTop: '16px',
};

const infoLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  letterSpacing: '0.5px',
  marginBottom: '4px',
};

const infoValue = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#0f172a',
  margin: '0',
};

const calloutBox = {
  margin: '24px 0',
  padding: '20px',
  background: '#fff7ed',
  borderRadius: '8px',
  border: '1px solid #fde68a',
  textAlign: 'right' as const,
};

const calloutTitle = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#92400e',
  marginBottom: '6px',
};

const calloutText = {
  fontSize: '14px',
  color: '#92400e',
  lineHeight: '1.6',
  margin: '0',
};

const footerNote = {
  marginTop: '28px',
  fontSize: '13px',
  color: '#94a3b8',
  lineHeight: '1.6',
  textAlign: 'center' as const,
};
