import { Heading, Section, Text, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface PaymentFailedEmailProps {
  ownerName?: string | null;
  organizationName: string;
  amount: number;
  reason?: string;
  retryUrl: string;
}

export const PaymentFailedEmail = ({
  ownerName,
  organizationName,
  amount,
  reason,
  retryUrl,
}: PaymentFailedEmailProps) => {
  return (
    <EmailLayout
      previewText={`התשלום עבור ${organizationName} נכשל`}
      headerSubtitle="בעיה בתשלום"
    >
      <Heading style={greeting}>
        {ownerName ? `${ownerName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        התשלום עבור
        <strong style={highlight}> "{organizationName}" </strong>
        נכשל.
        {reason && (
          <>
            <br />
            <span style={reasonText}>סיבה: {reason}</span>
          </>
        )}
        {""}
      </Text>

      <Section style={calloutBox}>
        <Text style={calloutTitle}>
          ⚠️ מה עכשיו?
          {""}
        </Text>
        <Text style={calloutText}>
          יש לעדכן את אמצעי התשלום. אם לא יתעדכן תוך 7 ימים — הגישה למערכת תיחסם.
          {""}
        </Text>
      </Section>

      <EmailCTA
        text="עדכון אמצעי תשלום →"
        url={retryUrl}
        color="#dc2626"
      />

      <Text style={footerHelp}>
        שאלות? השב למייל זה או פנה ל-
        <Link href="mailto:billing@misrad-ai.com" style={link}>
          billing@misrad-ai.com
        </Link>
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

const reasonText = {
  color: '#94a3b8',
  fontSize: '14px',
};

const calloutBox = {
  margin: '24px 0',
  padding: '20px',
  background: '#fef2f2',
  borderRadius: '8px',
  border: '1px solid #fecaca',
  textAlign: 'right' as const,
};

const calloutTitle = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#991b1b',
  marginBottom: '6px',
};

const calloutText = {
  fontSize: '14px',
  color: '#991b1b',
  lineHeight: '1.6',
  margin: '0',
};

const footerHelp = {
  marginTop: '28px',
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '1.7',
  textAlign: 'center' as const,
};

const link = {
  color: '#6366f1',
  textDecoration: 'none',
};
