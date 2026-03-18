import { Heading, Section, Text, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';

interface SatisfactionSurveyEmailProps {
  name?: string | null;
  ticketNumber: string;
  surveyUrl: string;
}

export const SatisfactionSurveyEmail = ({
  name,
  ticketNumber,
  surveyUrl,
}: SatisfactionSurveyEmailProps) => {
  const greeting = name ? `${name},` : 'היי,';

  return (
    <EmailLayout
      previewText="איך היה השירות?"
      headerSubtitle="איך היה השירות?"
    >
      <Heading style={greetingStyle}>
        {greeting}
        {""}
      </Heading>

      <Text style={text}>
        סגרנו את קריאה <strong style={highlight}>#{ticketNumber}</strong>.
        <br />נשמח לשמוע — איך היה השירות?
        {""}
      </Text>

      <Section style={ratingSection}>
        <Text style={ratingLabel}>דרג את השירות (1-5)</Text>
        <table role="presentation" cellPadding="0" cellSpacing="0" style={ratingTable}>
          <tr>
            {[1, 2, 3, 4, 5].map((n) => (
              <td key={n} style={ratingCell}>
                <Link
                  href={`${surveyUrl}?rating=${n}`}
                  style={{
                    ...ratingLink,
                    background: n <= 2 ? '#fef2f2' : n <= 3 ? '#fffbeb' : '#ecfdf5',
                    color: n <= 2 ? '#ef4444' : n <= 3 ? '#f59e0b' : '#10b981',
                  }}
                >
                  {n}
                </Link>
              </td>
            ))}
          </tr>
        </table>
      </Section>

      <Text style={footerNote}>
        לוקח 5 שניות — עוזר לנו להשתפר.
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

const ratingSection = {
  margin: '28px 0',
  textAlign: 'center' as const,
};

const ratingLabel = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#64748b',
  marginBottom: '12px',
};

const ratingTable = {
  margin: '0 auto',
};

const ratingCell = {
  padding: '0 4px',
};

const ratingLink = {
  display: 'inline-block',
  width: '48px',
  height: '48px',
  lineHeight: '48px',
  borderRadius: '12px',
  fontSize: '20px',
  fontWeight: '900',
  textDecoration: 'none',
  textAlign: 'center' as const,
};

const footerNote = {
  marginTop: '28px',
  fontSize: '12px',
  color: '#94a3b8',
  textAlign: 'center' as const,
};
