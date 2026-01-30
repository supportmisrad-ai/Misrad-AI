'use client';

import React from 'react';
import { Lead, Activity as LeadActivity, Task } from '../types';
import { useToast } from '../contexts/ToastContext';
import { QUICK_ASSETS, STAGES } from '../constants';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { CallButton } from '../../../shared/CallButton';
import CommunicationViewBase, {
  CommunicationActivity,
  CommunicationLead,
  CommunicationTask,
} from '../../../communication/CommunicationViewBase';

interface CommunicationViewProps {
  leads: Lead[];
  onAddActivity: (leadId: string, activity: LeadActivity) => void;
  onUpdateLead?: (leadId: string, updates: Partial<Lead>) => void;
  onAddTask?: (task: Task) => void;
  user?: { id: string; phone?: string; [key: string]: any };
}

const CommunicationView: React.FC<CommunicationViewProps> = ({
  leads,
  onAddActivity,
  onUpdateLead,
  onAddTask,
  user,
}) => {
  return (
    <CommunicationViewBase
      leads={leads as unknown as CommunicationLead[]}
      onAddActivity={onAddActivity as unknown as (leadId: string, activity: CommunicationActivity) => void}
      onUpdateLead={onUpdateLead as any}
      onAddTask={onAddTask as unknown as (task: CommunicationTask) => void}
      initialTab="inbox"
      user={user}
      useToast={useToast}
      useOnClickOutside={useOnClickOutside as any}
      CallButton={CallButton as any}
      QUICK_ASSETS={QUICK_ASSETS as any}
      STAGES={STAGES as any}
      aiDraft={async ({ activeLead, selectedSendChannel }) => {
        const lastMessages = activeLead.activities
          .filter((a) => ['whatsapp', 'sms', 'email'].includes(String(a.type)))
          .slice(0, 5)
          .map((a) => `${a.type}: ${a.content}`)
          .join('\n');

        const prompt = `אתה עוזר מכירות מקצועי עבור System.OS.
          שם ליד: ${activeLead.name}
          הקשר: סטטוס ${activeLead.status}, שווי משוער ₪${(activeLead as any).value}.
          היסטוריה אחרונה:
          ${lastMessages}

          כתוב תשובה קצרה, משכנעת וחברית בעברית לערוץ ${selectedSendChannel}.
          התמקד בקידום הליד לשלב הבא.
          החזר אך ורק את טקסט ההודעה. בלי כותרות, בלי מירכאות.`;

        const res = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            query: prompt,
            rawData: { leadId: activeLead.id, channel: selectedSendChannel },
          }),
        });

        const data = (await res.json().catch(() => ({}))) as any;
        const text = data?.result?.summary || '';
        return text ? String(text).trim() : null;
      }}
    />
  );
 };

export default CommunicationView;

