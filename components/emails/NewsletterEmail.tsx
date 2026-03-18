import { Heading, Section, Text, Img, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';

interface NewsletterEmailProps {
  title: string;
  preheader: string;
  bannerImageUrl?: string;
  sections: Array<{
    heading: string;
    body: string;
    imageUrl?: string;
    ctaText?: string;
    ctaUrl?: string;
  }>;
  testimonial?: {
    quote: string;
    authorName: string;
    authorTitle?: string;
    authorPhotoUrl?: string;
  };
}

export const NewsletterEmail = ({
  title,
  preheader,
  bannerImageUrl,
  sections,
  testimonial,
}: NewsletterEmailProps) => {
  return (
    <EmailLayout
      previewText={preheader}
      headerSubtitle={title}
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

      {sections.map((section, i) => (
        <Section key={i} style={sectionCard}>
          {section.imageUrl && (
            <Img src={section.imageUrl} alt={section.heading} width="472" style={sectionImg} />
          )}
          <Text style={sectionHeading}>{section.heading}</Text>
          <Text style={sectionBody}>{section.body}</Text>
          {section.ctaText && section.ctaUrl && (
            <Section style={ctaContainer}>
              <Link href={section.ctaUrl} style={ctaLink}>
                {section.ctaText} →
              </Link>
            </Section>
          )}
        </Section>
      ))}

      {testimonial && (
        <Section style={testimonialCard}>
          <Text style={testimonialQuote}>"{testimonial.quote}"</Text>
          <Text style={testimonialAuthor}>{testimonial.authorName}</Text>
          {testimonial.authorTitle && (
            <Text style={testimonialTitle}>{testimonial.authorTitle}</Text>
          )}
        </Section>
      )}

      <Text style={footerNote}>
        תודה שקראתם 💜<br />
        נתראה בחודש הבא!
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

const sectionCard = {
  margin: '24px 0',
  padding: '24px',
  background: '#f8fafc',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  textAlign: 'right' as const,
};

const sectionImg = {
  display: 'block',
  width: '100%',
  borderRadius: '10px',
  marginBottom: '16px',
  border: '1px solid #e2e8f0',
};

const sectionHeading = {
  fontSize: '18px',
  fontWeight: '900',
  color: '#0f172a',
  margin: '0 0 8px',
};

const sectionBody = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.7',
  margin: '0',
};

const ctaContainer = {
  marginTop: '12px',
};

const ctaLink = {
  color: '#6366f1',
  fontWeight: '700',
  fontSize: '14px',
  textDecoration: 'none',
};

const testimonialCard = {
  margin: '24px 0',
  padding: '24px',
  background: '#f8fafc',
  borderRadius: '8px',
  borderRight: '3px solid #0f172a',
  textAlign: 'right' as const,
};

const testimonialQuote = {
  fontSize: '16px',
  color: '#334155',
  lineHeight: '1.7',
  fontStyle: 'italic',
  margin: '0 0 16px',
};

const testimonialAuthor = {
  fontSize: '13px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0',
};

const testimonialTitle = {
  fontSize: '12px',
  color: '#64748b',
  margin: '0',
};

const footerNote = {
  fontSize: '14px',
  color: '#64748b',
  lineHeight: '1.7',
  textAlign: 'center' as const,
  marginTop: '32px',
};
