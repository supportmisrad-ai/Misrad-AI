'use client';

import React from 'react';
import { Lead, SquareActivity as LeadActivity, Task } from '../types';
import { useToast } from '../contexts/ToastContext';
import { QUICK_ASSETS, STAGES } from '../constants';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { CallButton } from '../../../shared/CallButton';
import CommunicationViewBase, {
  type CommunicationActivity,
  type CommunicationLead,
  type CommunicationTask,
  type UseOnClickOutsideHook,
  type CallButtonComponent,
  type QuickAsset,
  type Stage,
} from '../../../communication/CommunicationViewBase';

interface CommunicationViewProps {
  leads: Lead[];
  onAddActivity: (leadId: string, SquareActivity: LeadActivity) => void;
  onUpdateLead?: (leadId: string, updates: Partial<Lead>) => void;
  onAddTask?: (task: Task) => void;
  user?: { id: string; phone?: string; [key: string]: unknown };
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
      onAddActivity={onAddActivity as unknown as (leadId: string, SquareActivity: CommunicationActivity) => void}
      onUpdateLead={onUpdateLead as unknown as ((leadId: string, updates: Partial<CommunicationLead>) => void) | undefined}
      onAddTask={onAddTask as unknown as (task: CommunicationTask) => void}
      initialTab="inbox"
      user={user}
      useToast={useToast}
      useOnClickOutside={useOnClickOutside as unknown as UseOnClickOutsideHook}
      CallButton={CallButton as unknown as CallButtonComponent}
      QUICK_ASSETS={QUICK_ASSETS as unknown as QuickAsset[]}
      STAGES={STAGES as unknown as Stage[]}
      aiDraft={async ({ activeLead, selectedSendChannel }) => {
        const lastMessages = activeLead.activities
          .filter((a) => ['whatsapp', 'sms', 'email'].includes(String(a.type)))
          .slice(0, 5)
          .map((a) => `${a.type}: ${a.content}`)
          .join('\n');

        const prompt = `אתה עוזר מכירות מקצועי עבור MISRAD AI.
          שם ליד: ${activeLead.name}
          הקשר: סטטוס ${activeLead.status}, שווי משוער ₪${(activeLead as Record<string, unknown>).value}.
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

        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const result = (data?.result && typeof data.result === 'object' ? data.result : null) as Record<string, unknown> | null;
        const text = result?.summary || '';
        return text ? String(text).trim() : null;
      }}
    />
  );
 };

export default CommunicationView;

