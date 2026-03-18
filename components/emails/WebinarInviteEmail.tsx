import { Heading, Section, Text, Img } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface WebinarInviteEmailProps {
  title: string;
  date: string;
  time: string;
  speaker: string;
  speakerPhotoUrl?: string;
  description: string;
  bannerImageUrl?: string;
  registerUrl: string;
}

export const WebinarInviteEmail = ({
  title,
  date,
  time,
  speaker,
  speakerPhotoUrl,
  description,
  bannerImageUrl,
  registerUrl,
}: WebinarInviteEmailProps) => {
  return (
    <EmailLayout
      previewText={`הזמנה לוובינר: ${title}`}
      headerSubtitle="הזמנה לוובינר 🎤"
    >
      {bannerImageUrl && (
        <Section style={bannerContainer}>
          <Img src={bannerImageUrl} alt={title} width="520" style={bannerImg} />
        </Section>
      )}

      <Heading style={greeting}>
        שלום,
        {""}
      </Heading>

      <Text style={text}>
        מוזמנים לוובינר בנושא <strong style={highlight}>"{title}"</strong>.
        {""}
      </Text>

      <Section style={infoCard}>
        {speakerPhotoUrl && (
          <Section style={speakerContainer}>
            <Img src={speakerPhotoUrl} alt={speaker} width="64" height="64" style={speakerImg} />
          </Section>
        )}
        <Section style={infoRow}>
          <Text style={infoLabel}>תאריך</Text>
          <Text style={infoValue}>{date}</Text>
        </Section>
        <Section style={infoRowBorder}>
          <Text style={infoLabel}>שעה</Text>
          <Text style={infoValue}>{time}</Text>
        </Section>
        <Section style={infoRowBorder}>
          <Text style={infoLabel}>מרצה</Text>
          <Text style={infoValue}>{speaker}</Text>
        </Section>
      </Section>

      <Text style={descText}>
        {description}
        {""}
      </Text>

      <EmailCTA
        text="הרשמה לוובינר →"
        url={registerUrl}
        color="#6366f1"
      />

      <Text style={footerNote}>
        מקומות מוגבלים — כדאי לתפוס מקום 🎯
        {""}
      </Text>
    </EmailLayout>
  );
};

const bannerContainer = {
  margin: '0 0 24px',
};

const bannerImg = {
  display: 'block',
  width: '100%',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
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

const infoCard = {
  margin: '24px 0',
  background: '#f8fafc',
  border: '2px solid #e2e8f0',
  borderRadius: '14px',
  padding: '22px 24px',
  textAlign: 'right' as const,
};

const speakerContainer = {
  textAlign: 'center' as const,
  marginBottom: '16px',
};

const speakerImg = {
  borderRadius: '50%',
  border: '2px solid #e2e8f0',
  margin: '0 auto',
};

const infoRow = {
  padding: '0',
};

const infoRowBorder = {
  padding: '10px 0 0',
  borderTop: '1px solid #e2e8f0',
  marginTop: '10px',
};

const infoLabel = {
  fontSize: '12px',
  fontWeight: '800',
  color: '#64748b',
  margin: '0 0 2px',
  textTransform: 'uppercase' as const,
};

const infoValue = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0',
};

const descText = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.7',
  marginBottom: '24px',
  textAlign: 'right' as const,
};

const footerNote = {
  fontSize: '13px',
  color: '#94a3b8',
  textAlign: 'center' as const,
  marginTop: '24px',
};
