import { Heading, Section, Text, Hr } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';

interface MaintenanceEmailProps {
  startTime: string;
  endTime: string;
  description: string;
  affectedServices: string[];
}

export const MaintenanceEmail = ({
  startTime,
  endTime,
  description,
  affectedServices,
}: MaintenanceEmailProps) => {
  return (
    <EmailLayout
      previewText="עדכון על תחזוקה מתוכננת במערכת"
      headerSubtitle="תחזוקה מתוכננת"
    >
      <Heading style={greeting}>
        שלום,
        {""}
      </Heading>

      <Text style={text}>
        אנחנו מתכננים חלון תחזוקה קצר כדי לשפר את המערכת עבורך.
        {""}
      </Text>

      <Section style={infoCard}>
        <Section style={infoRow}>
          <Text style={infoLabel}>
            זמן התחלה
            {""}
          </Text>
          <Text style={infoValue}>
            {startTime}
            {""}
          </Text>
        </Section>
        
        <Hr style={divider} />
        
        <Section style={infoRow}>
          <Text style={infoLabel}>
            זמן סיום משוער
            {""}
          </Text>
          <Text style={infoValue}>
            {endTime}
            {""}
          </Text>
        </Section>

        {affectedServices.length > 0 && (
          <>
            <Hr style={divider} />
            <Section style={infoRow}>
              <Text style={infoLabel}>
                שירותים מושפעים
                {""}
              </Text>
              <Text style={infoValue}>
                {affectedServices.join(' · ')}
                {""}
              </Text>
            </Section>
          </>
        )}
      </Section>

      <Text style={descriptionText}>
        {description}
        {""}
      </Text>

      <Text style={footerNote}>
        מתנצלים על אי-הנוחות ומודים על הסבלנות.
        {""}
      </Text>
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

const infoCard = {
  margin: '24px 0',
  background: '#f8fafc',
  border: '2px solid #e2e8f0',
  borderRadius: '14px',
  padding: '22px 24px',
  textAlign: 'right' as const,
};

const infoRow = {
  padding: '10px 0',
};

const infoLabel = {
  fontSize: '12px',
  fontWeight: '800',
  color: '#64748b',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
};

const infoValue = {
  fontSize: '15px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0',
};

const descriptionText = {
  fontSize: '14px',
  color: '#334155',
  lineHeight: '1.7',
  textAlign: 'right' as const,
};

const footerNote = {
  fontSize: '13px',
  color: '#64748b',
  textAlign: 'center' as const,
  marginTop: '28px',
};

const divider = {
  borderTop: '1px solid #e2e8f0',
  margin: '0',
};
