import { Heading, Section, Text, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface InvitationEmailProps {
  tenantName: string;
  ownerName: string | null;
  signupUrl: string;
  subdomain?: string;
}

export const InvitationEmail = ({
  tenantName,
  ownerName,
  signupUrl,
  subdomain,
}: InvitationEmailProps) => {
  const greeting = ownerName ? `${ownerName},` : 'שלום,';

  return (
    <EmailLayout
      previewText={`העסק ${tenantName} מוכן ב-MISRAD AI`}
      headerSubtitle="העסק שלך מוכן"
    >
      <Heading style={greetingStyle}>
        {greeting}
        {""}
      </Heading>

      <Text style={textStyle}>
        העסק <strong>"{tenantName}"</strong> הוקם בהצלחה.
        <br />
        נשאר רק ליצור חשבון ולהתחיל לעבוד.
        {""}
      </Text>

      <EmailCTA
        text="יצירת חשבון"
        url={signupUrl}
        color="#0f172a"
      />

      {subdomain && (
        <Section style={subdomainCard}>
          <Text style={subdomainLabel}>הכתובת הישירה שלך</Text>
          <Link href={`https://${subdomain}.misrad-ai.com`} style={subdomainLink}>
            {subdomain}.misrad-ai.com
          </Link>
        </Section>
      )}

      <Text style={footerNote}>
        הקישור תקף ללא הגבלת זמן. לא יצרת את הבקשה? אפשר להתעלם.
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
  marginBottom: '32px',
  textAlign: 'right' as const,
};

const subdomainCard = {
  margin: '32px 0',
  padding: '24px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  textAlign: 'center' as const,
};

const subdomainLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  marginBottom: '8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const subdomainLink = {
  color: '#0f172a',
  fontSize: '18px',
  fontWeight: '700',
  textDecoration: 'none',
};

const footerNote = {
  marginTop: '32px',
  fontSize: '13px',
  color: '#94a3b8',
  lineHeight: '1.6',
  textAlign: 'center' as const,
};
