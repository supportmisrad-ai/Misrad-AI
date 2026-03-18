import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  previewText?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  children: React.ReactNode;
  footerAdditionalInfo?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://misrad-ai.com';

export const EmailLayout = ({
  previewText,
  headerTitle = 'MISRAD AI',
  headerSubtitle = 'מערכת ניהול חכמה',
  children,
  footerAdditionalInfo,
}: EmailLayoutProps) => {
  return (
    <Html dir="rtl" lang="he">
      <Head />
      <Preview>{previewText || ''}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={`${baseUrl}/icons/icon-128.png`}
              width="48"
              height="48"
              alt="MISRAD AI"
              style={logo}
            />
            <Heading style={h1}>
              {headerTitle}
            </Heading>
            <Text style={h2}>
              {headerSubtitle}
            </Text>
          </Section>

          <Section style={content}>
            {children}
          </Section>

          <Section style={footer}>
            {footerAdditionalInfo && (
              <Text style={footerText}>{footerAdditionalInfo}</Text>
            )}
            <Section style={footerLinks}>
              <Link href="mailto:support@misrad-ai.com" style={footerLink}>
                support@misrad-ai.com
              </Link>
              <Text style={footerDivider}>·</Text>
              <Link href="https://wa.me/972512239522" style={footerLink}>
                WhatsApp
              </Link>
            </Section>
            <Link href={`${baseUrl}/api/email/unsubscribe`} style={unsubscribeLink}>
              הסרה / עדכון העדפות
            </Link>
            <Text style={copyright}>
              © {new Date().getFullYear()} MISRAD AI
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
  direction: 'rtl' as const,
};

const container = {
  margin: '40px auto',
  padding: '0',
  width: '600px',
  maxWidth: '100%',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  overflow: 'hidden',
};

const header = {
  padding: '48px 40px 24px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #f1f5f9',
};

const logo = {
  margin: '0 auto 20px',
  borderRadius: '10px',
};

const h1 = {
  color: '#0f172a',
  fontSize: '24px',
  fontWeight: '800',
  letterSpacing: '-0.5px',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#64748b',
  fontSize: '15px',
  fontWeight: '500',
  margin: '0',
  textAlign: 'center' as const,
};

const content = {
  padding: '40px 40px',
};

const footer = {
  backgroundColor: '#f8fafc',
  padding: '32px 40px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e2e8f0',
};

const footerText = {
  color: '#64748b',
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '0 0 20px',
};

const footerLinks = {
  marginBottom: '16px',
};

const footerLink = {
  color: '#334155',
  textDecoration: 'none',
  fontSize: '13px',
  fontWeight: '600',
};

const footerDivider = {
  color: '#cbd5e1',
  margin: '0 8px',
  display: 'inline-block',
};

const unsubscribeLink = {
  color: '#94a3b8',
  textDecoration: 'underline',
  fontSize: '12px',
  display: 'block',
  marginBottom: '16px',
};

const copyright = {
  color: '#94a3b8',
  fontSize: '12px',
  margin: '0',
};
