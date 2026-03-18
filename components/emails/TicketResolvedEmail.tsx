import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface TicketResolvedEmailProps {
  name?: string | null;
  ticketNumber: string;
  subject: string;
  orgSlug: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://misrad-ai.com';

export const TicketResolvedEmail = ({
  name,
  ticketNumber,
  subject,
  orgSlug,
}: TicketResolvedEmailProps) => {
  const greeting = name ? `${name},` : 'היי,';
  const portalUrl = `${baseUrl}/w/${encodeURIComponent(orgSlug)}/support#my-tickets`;

  return (
    <EmailLayout
      previewText={`קריאה #${ticketNumber} נסגרה`}
      headerSubtitle={`קריאה #${ticketNumber} נסגרה`}
    >
      <Heading style={greetingStyle}>
        {greeting}
        {""}
      </Heading>

      <Text style={text}>
        קריאה <strong style={highlight}>#{ticketNumber}</strong> — {subject} — טופלה ונסגרה.
        {""}
      </Text>

      <EmailCTA
        text="צפייה בקריאה"
        url={portalUrl}
        color="#059669"
      />

      <Text style={footerHelp}>
        עדיין צריך עזרה? פשוט תשיב למייל זה.
        {""}
      </Text>
    </EmailLayout>
  );
};

const greetingStyle = {
  fontSize: '22px',
  fontWeight: '900',
  color: '#0f172a',
  marginBottom: '24px',
  textAlign: 'right' as const,
};

const text = {
  fontSize: '16px',
  lineHeight: '1.8',
  color: '#334155',
  marginBottom: '24px',
  textAlign: 'right' as const,
};

const highlight = {
  color: '#6366f1',
};

const footerHelp = {
  marginTop: '24px',
  fontSize: '14px',
  color: '#64748b',
  lineHeight: '1.7',
  textAlign: 'right' as const,
};
