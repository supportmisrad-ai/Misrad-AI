export type AdminTab = 
  | 'pulse' 
  | 'overview' 
  | 'users' 
  | 'recycle' 
  | 'intelligence' 
  | 'flags' 
  | 'clients' 
  | 'organizations'
  | 'payments' 
  | 'system' 
  | 'notifications' 
  | 'maintenance' 
  | 'cms' 
  | 'navigation';

export interface AdminPanelProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}
