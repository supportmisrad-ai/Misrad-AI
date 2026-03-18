import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';

interface ContactFormReceivedEmailProps {
  name: string;
  message: string;
}

export const ContactFormReceivedEmail = ({
  name,
  message,
}: ContactFormReceivedEmailProps) => {
  const greeting = name ? `${name},` : 'היי,';

  return (
    <EmailLayout
      previewText="קיבלנו את פנייתך ב-MISRAD AI"
      headerSubtitle="פנייתך התקבלה"
    >
      <Heading style={greetingStyle}>
        {greeting}
        {""}
      </Heading>

      <Text style={textStyle}>
        קיבלנו את הפנייה שלך ונחזור אליך בהקדם.
        {""}
      </Text>

      <Section style={messageBox}>
        <Text style={label}>ההודעה שלך</Text>
        <Text style={messageContent}>{message}</Text>
      </Section>

      <Section style={calloutBox}>
        <Text style={calloutTitle}>⏱️ זמן מענה משוער: עד 24 שעות</Text>
        <Text style={calloutText}>
          נחזור אליך בהקדם האפשרי. אם יש עניין דחוף — אפשר להשיב ישירות למייל הזה.
        </Text>
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

const textStyle = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#334155',
  marginBottom: '8px',
  textAlign: 'right' as const,
};

const messageBox = {
  margin: '24px 0',
  padding: '24px',
  background: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  textAlign: 'right' as const,
};

const label = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '8px',
};

const messageContent = {
  fontSize: '14px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0',
};

const calloutBox = {
  margin: '24px 0',
  padding: '20px',
  background: '#f0f9ff',
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
