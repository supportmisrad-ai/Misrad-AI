import { Lead } from '@/types';
import type { OSModuleKey } from '@/lib/os/modules/types';
import type { ComponentType } from 'react';

export type CommandPaletteNavItem = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

export type CommandPaletteQuickAsset = {
  id: string;
  label: string;
  value: string;
  type: 'link' | 'text';
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

