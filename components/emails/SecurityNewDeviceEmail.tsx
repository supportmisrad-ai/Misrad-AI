import { Heading, Section, Text, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface SecurityNewDeviceEmailProps {
  userName?: string | null;
  device: string;
  location: string;
  time: string;
  ip: string;
  securityUrl: string;
}

export const SecurityNewDeviceEmail = ({
  userName,
  device,
  location,
  time,
  ip,
  securityUrl,
}: SecurityNewDeviceEmailProps) => {
  return (
    <EmailLayout
      previewText="זוהתה כניסה ממכשיר חדש לחשבון שלך"
      headerSubtitle="התראת אבטחה"
    >
      <Heading style={greeting}>
        {userName ? `${userName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        זוהתה כניסה לחשבון שלך מהתקן חדש.
        {""}
      </Text>

      <Section style={infoCard}>
        <Text style={infoRow}>
          <span style={label}>מכשיר:</span> {device}
          {""}
        </Text>
        <Text style={infoRow}>
          <span style={label}>מיקום:</span> {location}
          {""}
        </Text>
        <Text style={infoRow}>
          <span style={label}>זמן:</span> {time}
          {""}
        </Text>
        <Text style={infoRow}>
          <span style={label}>IP:</span> {ip}
          {""}
        </Text>
      </Section>

      <Section style={alertBox}>
        <Text style={alertTitle}>
          🔒 לא את/ה?
          {""}
        </Text>
        <Text style={alertText}>
          אם לא ביצעת את הכניסה הזו, שנה סיסמה מיד.
          {""}
        </Text>
      </Section>

      <EmailCTA
        text="בדיקת אבטחה →"
        url={securityUrl}
        color="#dc2626"
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

const infoCard = {
  margin: '24px 0',
  background: '#fef2f2',
  border: '2px solid #fecaca',
  borderRadius: '14px',
  padding: '22px 24px',
  textAlign: 'right' as const,
};

const infoRow = {
  fontSize: '14px',
  color: '#0f172a',
  margin: '0 0 8px',
};

const label = {
  fontSize: '12px',
  fontWeight: '800',
  color: '#991b1b',
  marginLeft: '8px',
};

const alertBox = {
  margin: '24px 0',
  padding: '20px',
  background: '#fef2f2',
  borderRadius: '8px',
  border: '1px solid #fecaca',
  textAlign: 'right' as const,
};

const alertTitle = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#991b1b',
  marginBottom: '6px',
};

const alertText = {
  fontSize: '14px',
  color: '#991b1b',
  lineHeight: '1.6',
  margin: '0',
};
