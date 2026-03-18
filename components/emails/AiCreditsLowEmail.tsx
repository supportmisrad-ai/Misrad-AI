import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface AiCreditsLowEmailProps {
  ownerName?: string | null;
  organizationName: string;
  usedPercent: number;
  upgradeUrl: string;
}

export const AiCreditsLowEmail = ({
  ownerName,
  organizationName,
  usedPercent,
  upgradeUrl,
}: AiCreditsLowEmailProps) => {
  const isExhausted = usedPercent >= 100;

  return (
    <EmailLayout
      previewText={isExhausted ? `מכסת קרדיטי ה-AI של ${organizationName} נגמרה` : `מכסת קרדיטי ה-AI של ${organizationName} עומדת ב-${usedPercent}%`}
      headerSubtitle={isExhausted ? "קרדיטי AI נגמרו" : "קרדיטי AI נמוכים"}
    >
      <Heading style={greeting}>
        {ownerName ? `${ownerName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        {isExhausted
          ? <>מכסת קרדיטי ה-AI של <strong style={highlightDanger}>"{organizationName}"</strong> נגמרה.</>
          : <>מכסת קרדיטי ה-AI של <strong style={highlightWarning}>"{organizationName}"</strong> עומדת ב-{usedPercent}%.</>
        }
        {""}
      </Text>

      <Section style={progressBarContainer}>
        <Section
          style={{
            ...progressBar,
            width: `${Math.min(usedPercent, 100)}%`,
            backgroundColor: isExhausted ? '#ef4444' : '#f59e0b',
          }}
        />
      </Section>

      <EmailCTA
        text={isExhausted ? "שדרוג חבילה →" : "צפייה בשימוש →"}
        url={upgradeUrl}
        color={isExhausted ? "#dc2626" : "#d97706"}
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

const highlightDanger = {
  color: '#ef4444',
};

const highlightWarning = {
  color: '#f59e0b',
};

const progressBarContainer = {
  margin: '24px 0',
  background: '#f1f5f9',
  borderRadius: '12px',
  overflow: 'hidden',
  height: '24px',
};

const progressBar = {
  height: '100%',
  borderRadius: '12px',
};
