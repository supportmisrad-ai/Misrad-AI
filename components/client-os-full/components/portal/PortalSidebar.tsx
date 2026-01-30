
import React from 'react';
import { 
  LayoutDashboard, FileText, Map, BarChart3, CreditCard, 
  HelpCircle, MessageSquareWarning, LogOut 
} from 'lucide-react';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';

interface PortalSidebarProps {
  activeScreen: string;
  setActiveScreen: (screen: any) => void;
  onShowFriction: () => void;
  onBack: () => void;
  client: any;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({ 
  activeScreen, 
  setActiveScreen, 
  onShowFriction, 
  onBack, 
  client 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'מה קורה עכשיו?', icon: LayoutDashboard },
    { id: 'vault', label: 'משימות וקבצים', icon: FileText },
    { id: 'journey', label: 'איפה אנחנו עומדים?', icon: Map },
    { id: 'metrics', label: 'ביצועים ומדדים', icon: BarChart3 },
    { id: 'finance', label: 'פיננסים והסכמים', icon: CreditCard },
    { id: 'concierge', label: 'מי מטפל בי?', icon: HelpCircle },
  ];

  return (
    <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col border-l border-slate-200 bg-white z-50 shadow-sm">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-12">
          <OSModuleSquircleIcon moduleKey="client" boxSize={40} iconSize={18} className="shadow-none" />
          <div>
            <h1 className="font-display font-bold text-lg text-slate-900 leading-none">Nexus</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">מערכת לקוחות</span>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl transition-all group relative ${
                  isActive 
                    ? 'bg-slate-100 text-slate-900 font-bold shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-nexus-accent' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-sm">{item.label}</span>
                {isActive && <div className="absolute left-3 w-1.5 h-6 rounded-full bg-nexus-accent"></div>}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        <button 
          onClick={onShowFriction}
          className="w-full flex items-center gap-3 px-5 py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all border border-red-100"
        >
          <MessageSquareWarning size={18}/> משהו לא זורם?
        </button>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-900 font-bold shadow-sm">
              {client.mainContact.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{client.mainContact}</div>
              <div className="text-[10px] text-slate-400 truncate">{client.name}</div>
            </div>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all text-xs font-bold"
        >
          <LogOut size={14} /> יציאה לבקרת מנהל
        </button>
      </div>
    </aside>
  );
};
