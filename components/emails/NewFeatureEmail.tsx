import { Heading, Section, Text, Img } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface NewFeatureEmailProps {
  featureName: string;
  description: string;
  screenshotUrl?: string;
  learnMoreUrl: string;
  highlights?: Array<{ title: string; desc?: string }>;
}

export const NewFeatureEmail = ({
  featureName,
  description,
  screenshotUrl,
  learnMoreUrl,
  highlights,
}: NewFeatureEmailProps) => {
  return (
    <EmailLayout
      previewText={`פיצ'ר חדש: ${featureName}`}
      headerSubtitle="פיצ'ר חדש"
    >
      <Section style={banner}>
        <Text style={bannerEmoji}>🚀</Text>
        <Text style={bannerTitle}>{featureName}</Text>
        <Text style={bannerSubtitle}>פיצ'ר חדש ב-MISRAD AI</Text>
      </Section>

      <Heading style={greeting}>
        שלום,
        {""}
      </Heading>

      <Text style={text}>
        שנשארתם איתנו — זה לא מובן מאליו. 💜
        <br />
        השקנו פיצ'ר חדש: <strong style={highlight}>{featureName}</strong>
        {""}
      </Text>

      {screenshotUrl && (
        <Section style={screenshotContainer}>
          <Text style={screenshotTitle}>MISRAD AI — {featureName}</Text>
          <Img src={screenshotUrl} alt={featureName} width="520" style={screenshotImg} />
        </Section>
      )}

      <Text style={descText}>
        {description}
        {""}
      </Text>

      {highlights && highlights.length > 0 && (
        <Section style={highlightsSection}>
          {highlights.map((item, i) => (
            <Section key={i} style={highlightRow}>
              <Section style={dotContainer}>
                <Section style={dot} />
              </Section>
              <Section style={highlightContent}>
                <Text style={itemTitle}>{item.title}</Text>
                {item.desc && <Text style={itemDesc}>{item.desc}</Text>}
              </Section>
            </Section>
          ))}
        </Section>
      )}

      <EmailCTA
        text="לנסות עכשיו →"
        url={learnMoreUrl}
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

const screenshotContainer = {
  margin: '24px 0',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
  background: '#ffffff',
};

const screenshotTitle = {
  background: '#f8fafc',
  padding: '10px 16px',
  fontSize: '11px',
  fontWeight: '600',
  color: '#64748b',
  borderBottom: '1px solid #e2e8f0',
  margin: '0',
  textAlign: 'right' as const,
};

const screenshotImg = {
  display: 'block',
  width: '100%',
  borderRadius: '0 0 8px 8px',
};

const descText = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.7',
  marginBottom: '24px',
  textAlign: 'right' as const,
};

const highlightsSection = {
  margin: '28px 0',
};

const highlightRow = {
  marginBottom: '16px',
  display: 'flex',
  direction: 'rtl' as const,
};

const dotContainer = {
  width: '24px',
  paddingTop: '6px',
};

const dot = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#6366f1',
};

const highlightContent = {
  flex: 1,
  textAlign: 'right' as const,
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
