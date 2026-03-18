import { Button, Section, Text } from '@react-email/components';
import * as React from 'react';

interface EmailCTAProps {
  text: string;
  url: string;
  color?: string;
}

export const EmailCTA = ({ text, url, color = '#0f172a' }: EmailCTAProps) => {
  return (
    <Section style={container}>
      <Button
        href={url}
        style={{
          ...button,
          backgroundColor: color,
        }}
      >
        {text}
      </Button>
    </Section>
  );
};

const container = {
  margin: '32px 0',
  textAlign: 'center' as const,
};

const button = {
  display: 'inline-block',
  color: '#ffffff',
  textDecoration: 'none',
  padding: '14px 48px',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '16px',
  letterSpacing: '0.2px',
};

interface EmailSecondaryCTAProps {
  text: string;
  url: string;
}

export const EmailSecondaryCTA = ({ text, url }: EmailSecondaryCTAProps) => {
  return (
    <Section style={secondaryContainer}>
      <Button
        href={url}
        style={secondaryButton}
      >
        {text}
      </Button>
    </Section>
  );
};

const secondaryContainer = {
  margin: '16px 0',
  textAlign: 'center' as const,
};

const secondaryButton = {
  display: 'inline-block',
  backgroundColor: 'transparent',
  color: '#0f172a',
  textDecoration: 'none',
  padding: '12px 32px',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '15px',
  border: '1px solid #e2e8f0',
};
