'use client';

import React, { useMemo, useState } from 'react';
import { BarChart3, FileText } from 'lucide-react';
import AIAnalyticsView from '@/components/system/AIAnalyticsView';
import ReportsView from '@/components/system/ReportsView';
import type { Campaign, Lead, Task } from '@/components/system/types';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import { mapNexusTaskToUiTask } from '@/components/system/utils/mapTask';
import { mapCampaignDto } from '@/components/system/utils/mapCampaign';
import type { SystemLeadDTO } from '@/app/actions/system-leads';
import type { Campaign as WorkspaceCampaignDTO } from '@/app/actions/campaigns';
import type { Task as NexusTask } from '@/types';

export default function SystemAnalyticsClient({
  initialLeads,
  initialCampaigns,
  initialTasks,
  initialTab,
}: {
  initialLeads: SystemLeadDTO[];
  initialCampaigns: WorkspaceCampaignDTO[];
  initialTasks: NexusTask[];
  initialTab?: 'analytics' | 'reports';
}) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports'>(initialTab || 'analytics');
  const leads: Lead[] = useMemo(() => (initialLeads || []).map(mapDtoToLead), [initialLeads]);
  const campaigns: Campaign[] = useMemo(() => (initialCampaigns || []).map(mapCampaignDto), [initialCampaigns]);
  const tasks: Task[] = useMemo(() => (initialTasks || []).map(mapNexusTaskToUiTask), [initialTasks]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all duration-150 border-b-2 ${
            activeTab === 'analytics'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 size={18} />
          ניתוח AI
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all duration-150 border-b-2 ${
            activeTab === 'reports'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={18} />
          דוחות ונתונים
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <AIAnalyticsView leads={leads} campaigns={campaigns} tasks={tasks} invoices={[]} />
      ) : (
        <ReportsView leads={leads} campaigns={campaigns} tasks={tasks} />
      )}
    </div>
  );
}
