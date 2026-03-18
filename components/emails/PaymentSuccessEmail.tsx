import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA, EmailSecondaryCTA } from './EmailCTA';

interface PaymentSuccessEmailProps {
  ownerName?: string | null;
  organizationName: string;
  amount: number;
  currency?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  portalUrl: string;
}

export const PaymentSuccessEmail = ({
  ownerName,
  organizationName,
  amount,
  currency = 'ILS',
  invoiceNumber,
  invoiceUrl,
  portalUrl,
}: PaymentSuccessEmailProps) => {
  const symbol = currency === 'ILS' ? '₪' : currency;

  return (
    <EmailLayout
      previewText={`התשלום עבור ${organizationName} התקבל בהצלחה`}
      headerSubtitle="התשלום התקבל"
    >
      <Heading style={greeting}>
        {ownerName ? `${ownerName},` : 'שלום,'}
        {" "}
      </Heading>

      <Text style={text}>
        התשלום עבור
        <strong style={highlight}> "{organizationName}" </strong>
        התקבל בהצלחה.
        {" "}
      </Text>

      <Section style={successCard}>
        <Text style={statsLabel}>
          סכום ששולם
          {" "}
        </Text>
        <Text style={amountText}>
          {symbol}{amount.toLocaleString()}
          {" "}
        </Text>
        {invoiceNumber && (
          <Text style={invoiceText}>
            חשבונית #{invoiceNumber}
            {" "}
          </Text>
        )}
      </Section>

      {invoiceUrl && (
        <EmailSecondaryCTA
          text="צפייה בחשבונית"
          url={invoiceUrl}
        />
      )}

      <EmailCTA
        text="כניסה למערכת →"
        url={portalUrl}
        color="#059669"
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

const successCard = {
  margin: '24px 0',
  background: '#ecfdf5',
  border: '2px solid #a7f3d0',
  borderRadius: '14px',
  padding: '24px',
  textAlign: 'center' as const,
};

const statsLabel = {
  fontSize: '12px',
  fontWeight: '800',
  color: '#065f46',
  letterSpacing: '0.5px',
  marginBottom: '8px',
  textTransform: 'uppercase' as const,
};

const amountText = {
  fontSize: '32px',
  fontWeight: '900',
  color: '#059669',
  margin: '0',
};

const invoiceText = {
  fontSize: '13px',
  color: '#047857',
  marginTop: '8px',
};
