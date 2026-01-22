'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrainCircuit, CheckSquare, Calendar, Users, Home, Settings, FolderOpen, Trash2, PieChart, Briefcase, Search } from 'lucide-react';
import type { Task as SystemTask } from '@/components/system/types';
import { CalendarEvent } from '../../types';
import { useAuth } from '../system/contexts/AuthContext';
import { useToast } from '../system/contexts/ToastContext';
import { useOnClickOutside } from '../system/hooks/useOnClickOutside';
import { motion, AnimatePresence } from 'framer-motion';

// Import Nexus OS components
import TasksView from './TasksView';
import CalendarView from './CalendarView';
import HeadquartersView from './HeadquartersView';

const NexusBootScreen = ({ onComplete }: { onComplete: () => void }) => {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(onComplete, 500);
                    return 100;
                }
                return prev + 5;
            });
        }, 30);
        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-50">
            <div className="relative z-10 flex flex-col items-center px-6 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[40px] flex items-center justify-center text-white mb-8 shadow-2xl shadow-indigo-500/30 animate-bounce">
                    <BrainCircuit size={48} strokeWidth={1.5} />
                </div>
                <div className="w-64 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">מתניע מוח עסקי...</p>
            </div>
        </div>
    );
};

const NexusOSApp = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  
  const [booted, setBooted] = useState(false);

  const [activeTab, setActiveTab] = useState('tasks'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(profileRef, () => setIsProfileOpen(false));

  const [storedTasks, setStoredTasks] = useState<SystemTask[]>([]);
  const [storedEvents, setStoredEvents] = useState<CalendarEvent[]>([]);

  const tasks = useMemo(() => storedTasks, [storedTasks]);

  const calendarEvents = useMemo(() => {
      return storedEvents;
  }, [storedEvents]);

  const handleUpdateTask = (task: SystemTask) => {
      setStoredTasks(prev => prev.map(t => t.id === task.id ? task : t));
      addToast('משימה עודכנה', 'success');
  };

  const handleAddTask = (task: SystemTask) => {
      setStoredTasks(prev => [task, ...prev]);
      addToast('משימה נוספה', 'success');
  };

  const handleSaveMeeting = (event: CalendarEvent) => {
      setStoredEvents(prev => [event, ...prev]);
      addToast('פגישה נשמרה', 'success');
  };

  const handleBootComplete = () => {
      setBooted(true);
  };

  if (!booted) {
      return <NexusBootScreen onComplete={handleBootComplete} />;
  }

  const NAV_ITEMS = [
      { id: 'tasks', label: 'משימות', icon: CheckSquare },
      { id: 'calendar', label: 'אירועים', icon: Calendar },
      { id: 'headquarters', label: 'מפקדה', icon: Home },
      { id: 'team', label: 'צוות', icon: Users },
      { id: 'reports', label: 'דוחות', icon: PieChart },
      { id: 'assets', label: 'נכסים', icon: FolderOpen },
      { id: 'settings', label: 'הגדרות', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 shrink-0 bg-white border-r border-slate-200">
        <div className="flex flex-col w-full h-full">
          <div className="px-6 py-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                <BrainCircuit size={18} />
              </div>
              <div>
                <div className="text-lg font-black text-slate-900">Nexus</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Misrad OS</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  type="button"
                >
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
              <BrainCircuit size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Nexus</h1>
              <p className="text-xs text-slate-500">ניהול עסק מרכזי</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-slate-100" aria-label="חיפוש">
              <Search size={20} />
            </button>
            {/* Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                  {user?.name?.[0] || 'U'}
                </div>
                <span className="hidden md:block text-sm font-medium text-slate-700">{user?.name || 'משתמש'}</span>
              </button>

              {isProfileOpen && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
                  <button
                    onClick={logout}
                    className="w-full text-right px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    התנתק
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              {activeTab === 'tasks' && (
                <TasksView 
                  tasks={tasks} 
                  onUpdateTask={handleUpdateTask} 
                  onAddTask={handleAddTask} 
                />
              )}
              {activeTab === 'calendar' && (
                <CalendarView 
                  leads={[]} 
                  events={calendarEvents} 
                  onAddEvent={handleSaveMeeting} 
                  onNewMeetingClick={() => addToast('פתיחת מודל פגישה', 'info')} 
                />
              )}
              {activeTab === 'headquarters' && (
                <HeadquartersView 
                  onAddTask={handleAddTask} 
                  leads={[]} 
                />
              )}
              {activeTab === 'team' && (
                <div className="p-8 text-center text-slate-500">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p>ניהול צוות - בקרוב</p>
                </div>
              )}
              {activeTab === 'reports' && (
                <div className="p-8 text-center text-slate-500">
                  <PieChart size={48} className="mx-auto mb-4 opacity-50" />
                  <p>דוחות - בקרוב</p>
                </div>
              )}
              {activeTab === 'assets' && (
                <div className="p-8 text-center text-slate-500">
                  <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
                  <p>נכסים - בקרוב</p>
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="p-8 text-center text-slate-500">
                  <Settings size={48} className="mx-auto mb-4 opacity-50" />
                  <p>הגדרות - בקרוב</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default NexusOSApp;

