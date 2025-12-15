
import React, { useState, useEffect, useRef } from 'react';
import { Search, User, CheckCircle2, ArrowRight, Video, FileText, Link, Play, Briefcase, LayoutDashboard, Plus, Settings, Users, Calendar, FolderOpen, Phone, DollarSign, File as FileIcon, Zap, Globe, Cpu, Sparkles, Compass, PieChart, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { Status } from '../types';

export const CommandPalette: React.FC = () => {
  const { tasks, users, clients, leads, assets, openCreateTask, simulateIncomingCall, openTask, isCommandPaletteOpen, setCommandPaletteOpen, hasPermission, startTutorial, currentUser } = useData();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // --- HIERARCHY LOGIC ---
  const isGlobalAdmin = currentUser.isSuperAdmin || currentUser.role === 'מנכ״ל' || currentUser.role === 'אדמין';
  const isManager = hasPermission('manage_team');
  const canViewCRM = hasPermission('view_crm');
  const canViewAssets = hasPermission('view_assets');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
        setTimeout(() => inputRef.current?.focus(), 50);
        setQuery('');
        setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  // Adjust selected index scroll into view
  useEffect(() => {
      if (listRef.current) {
          const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
          if (selectedElement) {
              selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
      }
  }, [selectedIndex]);

  if (!isCommandPaletteOpen) return null;

  // --- ACTIONS DEFINITION ---
  const actions = [
      { id: 'act-new-task', label: 'צור משימה חדשה', icon: Plus, action: () => openCreateTask(), type: 'Action' },
      
      // Only show Sales OS if user has permission
      ...(canViewCRM || hasPermission('view_financials') ? [{ 
          id: 'act-sales-os', 
          label: 'עבור ל-Sales OS (מערכת חיצונית)', 
          icon: ExternalLink, 
          action: () => window.open('https://sales.nexus-os.co', '_blank'), 
          type: 'System' 
      }] : []),

      { id: 'act-nav-dash', label: 'עבור ללוח המשימות', icon: LayoutDashboard, action: () => navigate('/'), type: 'Navigation' },
      
      ...(canViewCRM ? [{ 
          id: 'act-nav-clients', label: 'עבור ללקוחות', icon: Briefcase, action: () => navigate('/clients'), type: 'Navigation' 
      }] : []),
      
      ...(isManager ? [{ 
          id: 'act-nav-team', label: 'עבור לצוות', icon: Users, action: () => navigate('/team'), type: 'Navigation' 
      }] : []),

      { id: 'act-nav-reports', label: 'עבור לדוחות ומדדים', icon: PieChart, action: () => navigate('/reports'), type: 'Navigation' },

      { id: 'act-nav-cal', label: 'עבור ליומן', icon: Calendar, action: () => navigate('/calendar'), type: 'Navigation' },
      
      ...(canViewAssets ? [{ 
          id: 'act-nav-assets', label: 'עבור לכספת', icon: FolderOpen, action: () => navigate('/assets'), type: 'Navigation' 
      }] : []),
      
      { id: 'act-test-call', label: 'הדמיית שיחה נכנסת', icon: Phone, action: () => simulateIncomingCall(), type: 'System' },
      { id: 'act-tour', label: 'הפעל הדרכת היכרות', icon: Compass, action: () => startTutorial(), type: 'System' },
  ];

  // Filter Logic - Scoped
  const filteredActions = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));
  
  // Filter Tasks based on Hierarchy
  const scopedTasks = tasks.filter(t => {
      if (isGlobalAdmin) return true;
      if (isManager && t.department === currentUser.department) return true; // Show dept tasks
      return t.assigneeIds?.includes(currentUser.id) || t.assigneeId === currentUser.id; // Self only
  });

  const filteredTasks = scopedTasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase())).slice(0, 3).map(t => ({
      ...t, label: t.title, type: 'Task'
  }));
  
  const filteredClients = canViewCRM ? clients.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase()) || 
      c.companyName.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 2).map(c => ({ ...c, label: c.companyName, type: 'Client' })) : [];

  const filteredLeads = canViewCRM ? leads.filter(l => 
      l.name.toLowerCase().includes(query.toLowerCase()) || 
      (l.company && l.company.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 2).map(l => ({ ...l, label: l.name, type: 'Lead' })) : [];

  const filteredAssets = canViewAssets ? assets.filter(a => 
      a.title.toLowerCase().includes(query.toLowerCase()) || 
      a.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 2).map(a => ({ ...a, label: a.title, type: 'Asset' })) : [];

  // Combine Results
  let allResults: any[] = [...filteredActions, ...filteredTasks, ...filteredClients, ...filteredLeads, ...filteredAssets];

  // Inject AI Option if there is a query
  if (query.trim().length > 1) {
      allResults.push({
          id: 'ask-ai-dynamic',
          label: `שאל את Nexus Brain: "${query}"`,
          icon: Sparkles,
          type: 'AI',
          action: () => navigate('/brain', { state: { initialQuery: query } })
      });
  }

  const handleAction = (item: any) => {
    if (item.type === 'Task') {
        openTask(item.id);
    } else if (item.type === 'Client') {
        navigate('/clients');
    } else if (item.type === 'Lead') {
        // Sales is external now, so we navigate to pipeline if we have it locally or just show detail?
        // Since leads are in Nexus CRM logic, we can keep them or redirect to external sales.
        // Assuming we keep minimal lead view or remove it. Let's redirect to Clients view for now as leads turn to clients.
        navigate('/clients'); 
    } else if (item.type === 'Asset') {
        navigate('/assets');
    } else if (item.action) {
        item.action();
    }
    setCommandPaletteOpen(false);
  };

  // Keyboard Navigation for List
  const handleListKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % allResults.length);
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + allResults.length) % allResults.length);
      } else if (e.key === 'Enter') {
          e.preventDefault();
          if (allResults[selectedIndex]) {
              handleAction(allResults[selectedIndex]);
          }
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[999] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm" onClick={() => setCommandPaletteOpen(false)}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200/50 ring-1 ring-black/5"
      >
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
          <Search size={22} className="text-gray-400" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="חפש פקודות, משימות, לקוחות או שאל את ה-AI..." 
            className="flex-1 text-xl outline-none text-gray-900 placeholder:text-gray-300 bg-transparent font-medium"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleListKeyDown}
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1 custom-scrollbar" ref={listRef}>
          {allResults.map((item: any, idx) => (
              <div 
                key={item.id}
                onClick={() => handleAction(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all ${idx === selectedIndex ? 'bg-blue-50/80 text-blue-900' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                  <div className="flex items-center gap-4 min-w-0">
                      <div className={`p-2 rounded-lg ${idx === selectedIndex ? 'bg-white shadow-sm text-blue-600' : 'bg-gray-50 text-gray-400'} ${item.type === 'AI' ? 'text-indigo-600 bg-indigo-50' : ''}`}>
                        {item.type === 'Task' ? (
                            <CheckCircle2 size={18} />
                        ) : item.type === 'Client' ? (
                            <Briefcase size={18} />
                        ) : item.type === 'Lead' ? (
                            <DollarSign size={18} />
                        ) : item.type === 'Asset' ? (
                            <FileIcon size={18} />
                        ) : (
                            <item.icon size={18} />
                        )}
                      </div>
                      
                      <div className="flex flex-col min-w-0">
                          <span className={`text-sm truncate ${idx === selectedIndex ? 'font-bold' : 'font-medium'}`}>
                              {item.label}
                          </span>
                          {(item.type === 'Task' || item.type === 'Client' || item.type === 'Lead' || item.type === 'Asset' || item.type === 'AI') && (
                              <span className="text-[10px] text-gray-400 opacity-80 uppercase tracking-wide truncate">
                                  {item.type === 'Task' ? `משימה • ${item.status}` : 
                                   item.type === 'Client' ? 'לקוח' : 
                                   item.type === 'Lead' ? 'ליד' : 
                                   item.type === 'Asset' ? 'קובץ כספת' :
                                   'Intelligence'
                                  }
                              </span>
                          )}
                          {item.type === 'Navigation' && (
                              <span className="text-[10px] text-gray-400 opacity-80">נווט אל העמוד</span>
                          )}
                          {item.type === 'Action' && (
                              <span className="text-[10px] text-gray-400 opacity-80">בצע פעולה</span>
                          )}
                          {item.type === 'System' && (
                              <span className="text-[10px] text-gray-400 opacity-80">פעולת מערכת</span>
                          )}
                      </div>
                  </div>

                  {idx === selectedIndex && (
                      <div className="text-xs text-blue-500 font-bold flex items-center gap-1.5 px-2">
                          בחר <ArrowRight size={14} />
                      </div>
                  )}
              </div>
          ))}

          {allResults.length === 0 && (
              <div className="py-16 text-center text-gray-400 text-sm">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search size={24} className="opacity-20" />
                  </div>
                  <p>לא נמצאו תוצאות.</p>
              </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
