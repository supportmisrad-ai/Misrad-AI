'use client';

import React, { useMemo } from 'react';
import AIAnalyticsView from '@/components/system/AIAnalyticsView';
import type { Campaign, Lead, Task, TaskPriority, TaskStatus } from '@/components/system/types';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import type { SystemLeadDTO } from '@/app/actions/system-leads';
import type { Campaign as WorkspaceCampaignDTO } from '@/app/actions/campaigns';
import type { Task as NexusTask } from '@/types';

import { normalizeTaskStatus, normalizeTaskPriority } from '@/lib/task-utils';
import { normalizeCampaignStatus } from '@/lib/campaign-utils';

function mapCampaignDto(dto: WorkspaceCampaignDTO): Campaign {
  return {
    id: String(dto.id),
    name: String(dto.name || ''),
    platform: String((dto as any).objective || ''),
    status: normalizeCampaignStatus(String((dto as any).status || 'active')),
    budget: Number(dto.budget || 0),
    spent: Number(dto.spent || 0),
    leads: 0,
    cpl: 0,
    roas: Number(dto.roas || 0),
    impressions: Number((dto as any).impressions || 0),
  };
}

function mapTaskDto(dto: NexusTask): Task {
  const due = dto.dueDate ? new Date(String(dto.dueDate)) : new Date();
  const dueDate = Number.isNaN(due.getTime()) ? new Date() : due;

  return {
    id: String(dto.id),
    title: String(dto.title || ''),
    description: dto.description == null ? undefined : String(dto.description),
    assigneeId: String(dto.assigneeId || (Array.isArray(dto.assigneeIds) ? dto.assigneeIds[0] : '') || ''),
    dueDate,
    priority: normalizeTaskPriority(String(dto.priority || 'medium')),
    status: normalizeTaskStatus(String(dto.status || 'todo')),
    tags: Array.isArray(dto.tags) ? dto.tags.map((t) => String(t)).filter(Boolean) : [],
  };
}

export default function SystemAnalyticsClient({
  initialLeads,
  initialCampaigns,
  initialTasks,
}: {
  initialLeads: SystemLeadDTO[];
  initialCampaigns: WorkspaceCampaignDTO[];
  initialTasks: NexusTask[];
}) {
  const leads: Lead[] = useMemo(() => (initialLeads || []).map(mapDtoToLead), [initialLeads]);
  const campaigns: Campaign[] = useMemo(() => (initialCampaigns || []).map(mapCampaignDto), [initialCampaigns]);
  const tasks: Task[] = useMemo(() => (initialTasks || []).map(mapTaskDto), [initialTasks]);

  return <AIAnalyticsView leads={leads} campaigns={campaigns} tasks={tasks} invoices={[]} />;
}
