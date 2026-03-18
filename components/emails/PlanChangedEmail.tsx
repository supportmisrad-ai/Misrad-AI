import { Heading, Section, Text, Hr } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './EmailLayout';
import { EmailCTA } from './EmailCTA';

interface PlanChangedEmailProps {
  ownerName?: string | null;
  organizationName: string;
  oldPlan: string;
  newPlan: string;
  newPrice: number;
  effectiveDate: string;
  portalUrl: string;
}

export const PlanChangedEmail = ({
  ownerName,
  organizationName,
  oldPlan,
  newPlan,
  newPrice,
  effectiveDate,
  portalUrl,
}: PlanChangedEmailProps) => {
  return (
    <EmailLayout
      previewText={`החבילה של ${organizationName} עודכנה בהצלחה`}
      headerSubtitle="החבילה עודכנה"
    >
      <Heading style={greeting}>
        {ownerName ? `${ownerName},` : 'שלום,'}
        {""}
      </Heading>

      <Text style={text}>
        החבילה של
        <strong style={highlight}> "{organizationName}" </strong>
        עודכנה בהצלחה.
        {""}
      </Text>

      <Section style={planCard}>
        <Section style={planRow}>
          <Text style={planLabel}>
            חבילה קודמת
            {""}
          </Text>
          <Text style={oldPlanText}>
            {oldPlan}
            {""}
          </Text>
        </Section>
        
        <Hr style={divider} />
        
        <Section style={planRow}>
          <Text style={planLabel}>
            חבילה חדשה
            {""}
          </Text>
          <Text style={newPlanText}>
            {newPlan} — ₪{newPrice.toLocaleString()}/חודש
            {""}
          </Text>
        </Section>
        
        <Hr style={divider} />
        
        <Section style={planRow}>
          <Text style={planLabel}>
            תאריך תחילה
            {""}
          </Text>
          <Text style={dateText}>
            {effectiveDate}
            {""}
          </Text>
        </Section>
      </Section>

      <EmailCTA
        text="צפייה בפרטי החבילה →"
        url={portalUrl}
        color="#6366f1"
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

const highlight = {
  color: '#6366f1',
};

const planCard = {
  margin: '24px 0',
  background: '#f8fafc',
  border: '2px solid #e2e8f0',
  borderRadius: '14px',
  padding: '22px 24px',
  textAlign: 'right' as const,
};

const planRow = {
  padding: '12px 0',
};

const planLabel = {
  fontSize: '12px',
  fontWeight: '800',
  color: '#64748b',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
};

const oldPlanText = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#94a3b8',
  margin: '0',
  textDecoration: 'line-through',
};

const newPlanText = {
  fontSize: '18px',
  fontWeight: '900',
  color: '#6366f1',
  margin: '0',
};

const dateText = {
  fontSize: '15px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0',
};

const divider = {
  borderTop: '1px solid #e2e8f0',
  margin: '0',
};
