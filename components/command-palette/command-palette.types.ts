import { Lead } from '@/types';
import type { OSModuleKey } from '@/lib/os/modules/types';

export type CommandPaletteNavItem = {
  id: string;
  label: string;
  icon: any;
};

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
  onSelectLead: (lead: Lead) => void;
  leads: Lead[];

  moduleKey?: OSModuleKey;

  navItems?: CommandPaletteNavItem[];
  hideLeads?: boolean;
  hideAssets?: boolean;
}

export type CommandPaletteMode = 'search' | 'chat';

