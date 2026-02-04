/**
 * Campaign utilities - shared functions for campaign normalization
 */

export type CampaignStatus = 'active' | 'paused' | 'draft';

export function normalizeCampaignStatus(value: string): CampaignStatus {
  const v = String(value || '').toLowerCase();
  if (v === 'active' || v === 'paused' || v === 'draft') return v;
  if (v === 'completed') return 'paused';
  return 'active';
}
