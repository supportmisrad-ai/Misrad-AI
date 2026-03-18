import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA, EmailSecondaryCTA } from './EmailCTA';

interface InvoiceCreatedEmailProps {
  ownerName?: string | null;
  organizationName: string;
  amount: number;
  currency?: string;
  invoiceNumber: string;
  pdfUrl?: string;
  invoiceUrl?: string;
  paymentUrl?: string;
  portalUrl: string;
  description?: string;
  dueDate?: string;
}

export const InvoiceCreatedEmail = ({
  ownerName,
  organizationName,
  amount,
  currency = 'ILS',
  invoiceNumber,
  pdfUrl,
  invoiceUrl,
  paymentUrl,
  portalUrl,
  description,
  dueDate,
}: InvoiceCreatedEmailProps) => {
  const symbol = currency === 'ILS' ? '₪' : currency;

  return (
    <EmailLayout
      previewText={`חשבונית חדשה הונפקה עבור ${organizationName}`}
      headerSubtitle="חשבונית חדשה"
    >
      <Heading style={greeting}>
        {ownerName ? `${ownerName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        חשבונית חדשה הונפקה עבור
        <strong style={highlight}> "{organizationName}"</strong>.
        {description && (
          <>
            <br />
            <span style={descriptionText}>{description}</span>
          </>
        )}
        {""}
      </Text>

      <Section style={invoiceCard}>
        <Text style={statsLabel}>
          סכום לתשלום
          {""}
        </Text>
        <Text style={amountText}>
          {symbol}{amount.toLocaleString()}
          {""}
        </Text>
        <Text style={invoiceSubText}>
          חשבונית #{invoiceNumber}
          {""}
        </Text>
        {dueDate && (
          <Text style={dueDateText}>
            לתשלום עד: {dueDate}
            {""}
          </Text>
        )}
      </Section>

      {paymentUrl && (
        <EmailCTA
          text="תשלום מאובטח עכשיו →"
          url={paymentUrl}
          color="#3b82f6"
        />
      )}

      {pdfUrl ? (
        <EmailSecondaryCTA
          text="הורדת חשבונית PDF"
          url={pdfUrl}
        />
      ) : invoiceUrl ? (
        <EmailSecondaryCTA
          text="צפייה בחשבונית"
          url={invoiceUrl}
        />
      ) : null}

      <Section style={helpBox}>
        <Text style={helpText}>
          שאלות לגבי החשבונית? השב למייל זה או פנה ל-
          <Link href="mailto:billing@misrad-ai.com" style={link}>
            billing@misrad-ai.com
          </Link>
          {""}
        </Text>
      </Section>
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

const descriptionText = {
  color: '#64748b',
  fontSize: '14px',
};

const invoiceCard = {
  margin: '24px 0',
  background: '#eff6ff',
  border: '2px solid #bfdbfe',
  borderRadius: '14px',
  padding: '24px',
  textAlign: 'center' as const,
};

const statsLabel = {
  fontSize: '12px',
  fontWeight: '800',
  color: '#1e40af',
  letterSpacing: '0.5px',
  marginBottom: '8px',
  textTransform: 'uppercase' as const,
};

const amountText = {
  fontSize: '36px',
  fontWeight: '900',
  color: '#1d4ed8',
  margin: '0',
};

const invoiceSubText = {
  fontSize: '13px',
  color: '#3b82f6',
  marginTop: '8px',
};

const dueDateText = {
  fontSize: '12px',
  color: '#64748b',
  marginTop: '4px',
};

const helpBox = {
  marginTop: '28px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '16px 20px',
  textAlign: 'right' as const,
};

const helpText = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '1.7',
  margin: '0',
};

const link = {
  color: '#6366f1',
  textDecoration: 'none',
};

import { Link } from '@react-email/components';
