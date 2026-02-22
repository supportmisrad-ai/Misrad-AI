import type { Campaign } from '@/components/system/types';
import type { Campaign as WorkspaceCampaignDTO } from '@/app/actions/campaigns';
import { normalizeCampaignStatus } from '@/lib/campaign-utils';

export function mapCampaignDto(dto: WorkspaceCampaignDTO): Campaign {
  return {
    id: String(dto.id),
    name: String(dto.name || ''),
    platform: String(dto.objective || ''),
    status: normalizeCampaignStatus(String(dto.status || 'active')),
    budget: Number(dto.budget || 0),
    spent: Number(dto.spent || 0),
    leads: 0,
    cpl: 0,
    roas: Number(dto.roas || 0),
    impressions: Number(dto.impressions || 0),
  };
}
