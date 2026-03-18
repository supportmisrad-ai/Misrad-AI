import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Map,
  BarChart3,
  CreditCard,
  CircleHelp,
  MessageSquareWarning,
} from 'lucide-react';
import { getOSModule } from '@/types/os-modules';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';
import { Client } from '../../types';

interface PortalSidebarProps {
  activeScreen: string;
  setActiveScreen: (screen: unknown) => void;
  onShowFriction: () => void;
  client?: Client;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({
  activeScreen,
  setActiveScreen,
  onShowFriction,
  client,
}) => {
  const clientModule = getOSModule('client');

  const menuItems = [
    { id: 'dashboard', label: 'מה קורה עכשיו?', icon: LayoutDashboard },
    { id: 'vault', label: 'משימות וקבצים', icon: FileText },
    { id: 'journey', label: 'איפה אנחנו עומדים?', icon: Map },
    { id: 'metrics', label: 'ביצועים ומדדים', icon: BarChart3 },
    { id: 'finance', label: 'פיננסים והסכמים', icon: CreditCard },
    { id: 'concierge', label: 'מי מטפל בי?', icon: CircleHelp },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col border-l border-slate-200 bg-white z-50 shadow-sm h-full">
        <div className="p-8 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 mb-12">
            <OSModuleSquircleIcon moduleKey="client" boxSize={40} iconSize={18} className="shadow-none" />
            <div>
              <h1 className="font-display font-bold text-lg text-slate-900 leading-none">{clientModule?.name || 'Client'}</h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{clientModule?.nameHebrew ? `${clientModule.nameHebrew}` : 'Client'}</span>
            </div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all group relative ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-bold shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon
                    size={20}
                    className={isActive ? 'text-nexus-accent' : 'text-slate-400 group-hover:text-slate-600'}
                  />
                  <span className="text-sm">{item.label}</span>
                  {isActive && <div className="absolute left-3 w-1.5 h-6 rounded-full bg-nexus-accent"></div>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6 space-y-4 border-t border-slate-100">
          <button
            onClick={onShowFriction}
            className="w-full flex items-center gap-3 px-5 py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all border border-red-100"
          >
            <MessageSquareWarning size={18} /> משהו לא זורם?
          </button>

          {client ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-900 font-bold shadow-sm">
                  {String(client?.mainContact || client?.name || 'ל').charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{client?.mainContact || ''}</div>
                  <div className="text-[10px] text-slate-400 truncate">{client?.name || ''}</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-pb">
        <div className="flex items-center px-2 py-2 overflow-x-auto no-scrollbar gap-1">
          {menuItems.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[72px] flex-shrink-0 ${
                  isActive ? 'text-nexus-accent bg-slate-50' : 'text-slate-400'
                }`}
              >
                <item.icon size={20} />
                <span className="text-[10px] font-medium leading-tight text-center whitespace-nowrap">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 safe-area-pt">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <OSModuleSquircleIcon moduleKey="client" boxSize={32} iconSize={14} className="shadow-none" />
            <span className="font-bold text-sm">{clientModule?.nameHebrew || 'פורטל לקוח'}</span>
          </div>
          <button
            onClick={onShowFriction}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="משהו לא זורם?"
          >
            <MessageSquareWarning size={20} />
          </button>
        </div>
      </header>
    </>
  );
};
