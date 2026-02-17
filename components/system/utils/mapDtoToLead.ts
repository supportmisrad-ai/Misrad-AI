'use client';

import { type SystemLeadDTO } from '@/app/actions/system-leads';
import { SquareActivity as LeadActivity, Lead, PipelineStage } from '../types';

const toDateOrNow = (value: unknown) => {
  const d = new Date(String(value || ''));
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const toDateOrNull = (value: unknown) => {
  if (value == null) return null;
  const raw = String(value || '').trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isLeadActivityType = (value: unknown): value is LeadActivity['type'] => {
  return (
    value === 'call' ||
    value === 'whatsapp' ||
    value === 'email' ||
    value === 'meeting' ||
    value === 'note' ||
    value === 'system' ||
    value === 'financial' ||
    value === 'sms' ||
    value === 'feedback' ||
    value === 'support'
  );
};

export const mapDtoToLead = (dto: SystemLeadDTO): Lead => {
  const statusRaw = String(dto.status || '').trim();
  const status: PipelineStage = statusRaw || 'incoming';

  const productInterestRaw = dto.product_interest ?? null;
  const productInterest =
    productInterestRaw === 'premium_1on1' || productInterestRaw === 'mastermind_group' || productInterestRaw === 'digital_course'
      ? productInterestRaw
      : undefined;

  const activities: LeadActivity[] = Array.isArray(dto.activities)
    ? dto.activities.map((a) => {
        const directionRaw = a?.direction ? String(a.direction) : '';
        const direction = directionRaw === 'inbound' || directionRaw === 'outbound' ? directionRaw : undefined;
        const typeRaw = a?.type;
        const type: LeadActivity['type'] = isLeadActivityType(typeRaw) ? typeRaw : 'note';

        return {
          id: String(a?.id || ''),
          type,
          content: String(a?.content || ''),
          timestamp: toDateOrNow(a?.timestamp),
          direction,
          metadata: (a?.metadata as Record<string, unknown> | null) ?? undefined,
        };
      })
    : [];

  return {
    id: String(dto.id),
    name: String(dto.name || ''),
    company: dto.company ? String(dto.company) : undefined,
    phone: String(dto.phone || ''),
    email: dto.email ? String(dto.email) : '',
    source: String(dto.source || ''),
    status,
    value: Number(dto.value ?? 0),
    lastContact: toDateOrNow(dto.last_contact),
    createdAt: toDateOrNow(dto.created_at),
    activities,
    isHot: Boolean(dto.is_hot),
    address: dto.installation_address ? String(dto.installation_address) : undefined,
    assignedAgentId: dto.assigned_agent_id ? String(dto.assigned_agent_id) : undefined,
    subscriptionEndDate: undefined,
    productInterest,
    nextActionDate: toDateOrNull(dto.next_action_date),
    nextActionDateSuggestion: toDateOrNull(dto.next_action_date_suggestion),
    nextActionNote: dto.next_action_note != null ? String(dto.next_action_note) : null,
    nextActionDateRationale: dto.next_action_date_rationale != null ? String(dto.next_action_date_rationale) : null,
    score: Number(dto.score ?? 0),
    aiTags: Array.isArray(dto.ai_tags) ? dto.ai_tags.map((t) => String(t)).filter(Boolean) : [],
  };
};
