import { Heading, Section, Text, Img, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface VersionUpdateEmailProps {
  version: string;
  highlights: Array<{ title: string; desc: string }>;
  changelogUrl: string;
  heroImageUrl?: string;
}

export const VersionUpdateEmail = ({
  version,
  highlights,
  changelogUrl,
  heroImageUrl,
}: VersionUpdateEmailProps) => {
  return (
    <EmailLayout
      previewText={`MISRAD AI ${version} שוחררה!`}
      headerSubtitle="גרסה חדשה!"
    >
      <Section style={banner}>
        <Text style={bannerEmoji}>🎉</Text>
        <Text style={bannerTitle}>MISRAD AI {version}</Text>
        <Text style={bannerSubtitle}>גרסה חדשה!</Text>
      </Section>

      <Heading style={greeting}>
        שלום,
        {""}
      </Heading>

      <Text style={text}>
        גרסה <strong style={highlight}>{version}</strong> שוחררה!
        <br />
        אנחנו עובדים בלי הפסקה כדי לתת לכם את הכלי הטוב ביותר.
        <br />
        <strong>שנשארתם איתנו — זה לא מובן מאליו.</strong> 💜
        {""}
      </Text>

      {heroImageUrl && (
        <Section style={imageContainer}>
          <Img src={heroImageUrl} alt={`MISRAD AI ${version}`} width="520" style={heroImg} />
        </Section>
      )}

      <Section style={highlightsSection}>
        <Text style={highlightsTitle}>מה חדש?</Text>
        {highlights.map((item, i) => (
          <Section key={i} style={highlightItem}>
            <Text style={itemTitle}>{item.title}</Text>
            <Text style={itemDesc}>{item.desc}</Text>
          </Section>
        ))}
      </Section>

      <EmailCTA
        text="לצפייה ביומן השינויים המלא →"
        url={changelogUrl}
        color="#6366f1"
      />
    </EmailLayout>
  );
};

const banner = {
  margin: '24px 0',
  padding: '24px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  textAlign: 'center' as const,
};

const bannerEmoji = {
  fontSize: '32px',
  margin: '0 0 12px',
};

const bannerTitle = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0 0 4px',
};

const bannerSubtitle = {
  fontSize: '14px',
  color: '#64748b',
  fontWeight: '400',
  margin: '0',
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

const imageContainer = {
  margin: '28px 0',
  textAlign: 'center' as const,
};

const heroImg = {
  display: 'block',
  width: '100%',
  maxWidth: '520px',
  margin: '0 auto',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};

const highlightsSection = {
  margin: '32px 0',
  textAlign: 'right' as const,
};

const highlightsTitle = {
  fontSize: '18px',
  fontWeight: '800',
  color: '#0f172a',
  marginBottom: '16px',
};

const highlightItem = {
  marginBottom: '16px',
};

const itemTitle = {
  fontSize: '15px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0 0 4px',
};

const itemDesc = {
  fontSize: '14px',
  color: '#64748b',
  lineHeight: '1.5',
  margin: '0',
};
