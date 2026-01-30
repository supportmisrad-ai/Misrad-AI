
import React from 'react';
import { Lead, Task } from '../types';
import { useToast } from '../contexts/ToastContext';
import { QUICK_ASSETS } from '../constants';
import { STAGES } from './system/constants';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { CallButton } from './shared/CallButton';
import CommunicationViewBase, {
  CommunicationActivity,
  CommunicationLead,
  CommunicationTask,
} from './communication/CommunicationViewBase';

interface CommunicationViewProps {
  leads: Lead[];
  onAddActivity: (leadId: string, activity: CommunicationActivity) => void;
  onUpdateLead?: (leadId: string, updates: Partial<Lead>) => void;
  onAddTask?: (task: Task) => void;
  initialTab?: 'phone' | 'inbox';
  user?: { id: string; phone?: string; [key: string]: any };
}

const CommunicationView: React.FC<CommunicationViewProps> = ({
  leads,
  onAddActivity,
  onUpdateLead,
  onAddTask,
  initialTab = 'inbox',
  user,
}) => {
  return (
    <CommunicationViewBase
      leads={leads as unknown as CommunicationLead[]}
      onAddActivity={onAddActivity}
      onUpdateLead={onUpdateLead as any}
      onAddTask={onAddTask as unknown as ((task: CommunicationTask) => void)}
      initialTab={initialTab}
      user={user}
      useToast={useToast}
      useOnClickOutside={useOnClickOutside as any}
      CallButton={CallButton as any}
      QUICK_ASSETS={QUICK_ASSETS as any}
      STAGES={STAGES as any}
      aiDraft={async ({ activeLead, selectedSendChannel }) => {
        const lastMessages = (activeLead.activities || [])
          .filter((a) => ['whatsapp', 'sms', 'email'].includes(String(a.type)))
          .slice(0, 5)
          .map((a) => `${a.type}: ${a.content}`)
          .join('\n');

        const prompt = `You are a professional sales assistant for Sistem.OS. 
          Lead Name: ${activeLead.name}
          Context: ${activeLead.status}, value ₪${(activeLead as any).value}.
          Recent History:
          ${lastMessages}

          Draft a short, compelling, and friendly reply in Hebrew for ${selectedSendChannel}. 
          Focus on moving the lead to the next step. 
          Output ONLY the message text. No prefixes or quotes.`;

        const res = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: prompt, rawData: { leadId: activeLead.id, channel: selectedSendChannel } }),
        });

        const data = (await res.json().catch(() => ({}))) as any;
        const text = data?.result?.summary || '';
        return text ? String(text).trim() : null;
      }}
    />
  );
};

export default CommunicationView;
