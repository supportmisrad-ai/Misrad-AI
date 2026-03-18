import { Heading, Section, Text, Img } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface ReengagementEmailProps {
  userName?: string | null;
  daysSinceLastLogin: number;
  portalUrl: string;
  newFeatures?: string[];
  reengagementHeroUrl?: string;
  welcomeDashboardScreenshotUrl?: string;
}

export const ReengagementEmail = ({
  userName,
  daysSinceLastLogin,
  portalUrl,
  newFeatures,
  reengagementHeroUrl,
  welcomeDashboardScreenshotUrl,
}: ReengagementEmailProps) => {
  const greeting = userName ? `${userName},` : 'היי,';

  return (
    <EmailLayout
      previewText="חיכינו לך 💙"
      headerSubtitle="חיכינו לך 💙"
    >
      {reengagementHeroUrl && (
        <Section style={imageContainer}>
          <Img src={reengagementHeroUrl} alt="חיכינו לך" width="520" style={heroImg} />
        </Section>
      )}

      <Heading style={greetingStyle}>
        {greeting}
        {""}
      </Heading>

      <Text style={text}>
        לא ראינו אותך {daysSinceLastLogin} ימים.
        <br />
        הכל בסדר? אנחנו שמים לב כשחסר לנו מישהו. 💙
        {""}
      </Text>

      {newFeatures && newFeatures.length > 0 && (
        <Section style={featuresCard}>
          <Text style={featuresTitle}>🎁 מה חדש מאז שעזבת:</Text>
          {newFeatures.map((feature, i) => (
            <Text key={i} style={featureItem}>✅ {feature}</Text>
          ))}
        </Section>
      )}

      {welcomeDashboardScreenshotUrl && (
        <Section style={screenshotContainer}>
          <Text style={screenshotTitle}>כך נראית המערכת עכשיו</Text>
          <Img src={welcomeDashboardScreenshotUrl} alt="MISRAD AI Dashboard" width="520" style={screenshotImg} />
        </Section>
      )}

      <EmailCTA
        text="חזרה ל-MISRAD →"
        url={portalUrl}
        color="#6366f1"
      />

      <Section style={founderNote}>
        <Text style={founderText}>
          אני יודע שהחיים עסוקים. אם יש משהו שאנחנו יכולים לעשות טוב יותר — אני פה. תשיב למייל הזה, אני קורא הכל.
        </Text>
        <Text style={founderName}>איציק דהן, מייסד MISRAD AI</Text>
      </Section>
    </EmailLayout>
  );
};

const greetingStyle = {
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

const imageContainer = {
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const heroImg = {
  display: 'block',
  width: '100%',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};

const featuresCard = {
  margin: '24px 0',
  padding: '20px 24px',
  background: '#ecfdf5',
  border: '2px solid #a7f3d0',
  borderRadius: '14px',
  textAlign: 'right' as const,
};

const featuresTitle = {
  fontSize: '13px',
  fontWeight: '800',
  color: '#065f46',
  marginBottom: '8px',
};

const featureItem = {
  fontSize: '14px',
  color: '#0f172a',
  margin: '4px 0',
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

const founderNote = {
  marginTop: '32px',
  padding: '24px',
  background: '#f8fafc',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  textAlign: 'right' as const,
};

const founderText = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.7',
  margin: '0 0 12px',
};

const founderName = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0',
};
