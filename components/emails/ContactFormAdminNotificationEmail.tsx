import { Heading, Section, Text, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';

interface ContactFormAdminNotificationEmailProps {
  name: string;
  email: string;
  message: string;
}

export const ContactFormAdminNotificationEmail = ({
  name,
  email,
  message,
}: ContactFormAdminNotificationEmailProps) => {
  return (
    <EmailLayout
      previewText={`פנייה חדשה מטופס צור קשר: ${name}`}
      headerSubtitle="פנייה חדשה"
    >
      <Heading style={greetingStyle}>
        פנייה חדשה מטופס צור קשר
        {""}
      </Heading>

      <Section style={infoCard}>
        <Section style={infoRow}>
          <Text style={label}>שם</Text>
          <Text style={value}>{name}</Text>
        </Section>
        
        <Section style={infoRowBorder}>
          <Text style={label}>אימייל</Text>
          <Link href={`mailto:${email}`} style={emailLink}>
            {email}
          </Link>
        </Section>

        <Section style={infoRowBorder}>
          <Text style={label}>הודעה</Text>
          <Text style={messageText}>{message}</Text>
        </Section>
      </Section>
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

const infoCard = {
  margin: '24px 0',
  padding: '24px',
  background: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
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

const label = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '4px',
};

const value = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#0f172a',
  margin: '0',
};

const emailLink = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#0f172a',
  textDecoration: 'none',
};

const messageText = {
  fontSize: '14px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0',
};
