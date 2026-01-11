import { Lead } from '@/types';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
  onSelectLead: (lead: Lead) => void;
  leads: Lead[];
}

export type CommandPaletteMode = 'search' | 'chat';

