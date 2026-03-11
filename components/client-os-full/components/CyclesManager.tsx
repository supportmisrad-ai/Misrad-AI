'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Layers, Plus, Search, MessageCircle, Slack, Calendar, Users, 
  CircleCheckBig, ChevronRight, ArrowLeft, Zap, Sparkles, 
  FileText, Upload, Ban, ExternalLink, Trash2
} from 'lucide-react';
import { 
  getCycles, deleteCycle, deleteTask, deleteAsset, 
  removeClientFromCycle
} from '@/app/actions/cycles';
import { useNexus } from '../context/ClientContext';
import CreateCycleModal from '../modals/CreateCycleModal';
import AddTaskModal from '../modals/AddTaskModal';
import UploadAssetModal from '../modals/UploadAssetModal';
import AddClientToCycleModal from '../modals/AddClientToCycleModal';
import { GlowButton } from './ui/GlowButton';

// Types
interface Cycle {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  startDate?: Date | null;
  endDate?: Date | null;
  whatsappGroupLink?: string | null;
  slackChannelLink?: string | null;
  clients: CycleClient[];
  tasks: CycleTask[];
  assets: CycleAsset[];
  createdAt: Date;
  updatedAt: Date;
}

interface CycleClient {
  id: string;
  client: {
    id: string;
    name: string;
    company_name?: string;
    avatar?: string;
    email?: string;
    phone?: string;
  };
}

interface CycleTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: Date | null;
  completions: TaskCompletion[];
}

interface TaskCompletion {
  id: string;
  clientId: string;
  client?: {
    id: string;
    name: string;
  };
}

interface CycleAsset {
  id: string;
  name: string;
  category: string;
  fileUrl: string;
  fileType: string;
  sizeBytes?: number | null;
  uploadedAt: Date;
}

const CyclesManager: React.FC = () => {
  const { clients: availableClients } = useNexus();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL'>('LIST');
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isUploadAssetModalOpen, setIsUploadAssetModalOpen] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);
  const cycleClients = selectedCycle?.clients || [];

  // Load cycles
  const loadCycles = useCallback(async () => {
    setIsLoading(true);
    const result = await getCycles();
    if (result.success && result.data) {
      setCycles(result.data as Cycle[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  const handleRemoveClient = async (clientId: string) => {
    if (!selectedCycleId) return;
    await removeClientFromCycle(selectedCycleId, clientId);
    loadCycles();
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    loadCycles();
  };

  const handleDeleteAsset = async (assetId: string) => {
    await deleteAsset(assetId);
    loadCycles();
  };

  const handleDeleteCycle = async (cycleId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק מחזור זה?')) return;
    await deleteCycle(cycleId);
    await loadCycles();
    if (selectedCycleId === cycleId) {
      setSelectedCycleId(null);
      setViewMode('LIST');
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'ACTIVE': return 'bg-green-50 text-green-600 border-green-100';
      case 'RECRUITING': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'COMPLETED': return 'bg-gray-50 text-gray-500 border-gray-100';
      default: return 'bg-red-50 text-red-500 border-red-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'ACTIVE': return 'בביצוע';
      case 'RECRUITING': return 'גיוס לקוחות';
      case 'COMPLETED': return 'הסתיים';
      default: return 'בוטל';
    }
  };

  if (viewMode === 'LIST') {
    return (
      <div className="space-y-8 animate-fade-in pb-12 pt-safe">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-900">ניהול מחזורים</h1>
            <p className="text-gray-500 mt-1">קבץ לקוחות, נהל משימות משותפות ועקוב אחרי התקדמות</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-nexus-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-nexus-accent transition-all shadow-lg shadow-nexus-primary/20"
            type="button"
          >
            <Plus size={18} /> צור מחזור חדש
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="חפש מחזור..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl py-3 pr-12 pl-4 text-sm focus:border-nexus-primary outline-none transition-all shadow-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nexus-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cycles.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Layers size={28} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">אין מחזורים עדיין</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm">צרו מחזור חדש כדי לקבץ לקוחות, לנהל משימות משותפות ולעקוב אחרי התקדמות.</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-3 bg-nexus-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-nexus-accent transition-all shadow-lg shadow-nexus-primary/20"
                  type="button"
                >
                  <Plus size={18} /> צור מחזור ראשון
                </button>
              </div>
            ) : (
              cycles.filter(c => c.name.includes(searchTerm)).map(cycle => (
                <motion.div 
                  key={cycle.id}
                  layoutId={cycle.id}
                  onClick={() => { setSelectedCycleId(cycle.id); setViewMode('DETAIL'); }}
                  className="glass-card p-6 rounded-[32px] cursor-pointer hover:scale-[1.02] transition-all group flex flex-col border border-transparent hover:border-nexus-accent/30"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(cycle.status)}`}>
                      {getStatusLabel(cycle.status)}
                    </div>
                    <div className="p-2 bg-gray-50 rounded-xl text-gray-400 group-hover:text-nexus-accent transition-colors">
                      <Layers size={20} />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">{cycle.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1">{cycle.description}</p>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex -space-x-3 rtl:space-x-reverse">
                      {cycle.clients?.slice(0, 4).map((cc) => (
                        <div key={cc.client.id} className="w-10 h-10 rounded-full border-4 border-white bg-nexus-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {cc.client.name.charAt(0)}
                        </div>
                      ))}
                      {(cycle.clients?.length || 0) > 4 && (
                        <div className="w-10 h-10 rounded-full border-4 border-white bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs shadow-sm">
                          +{(cycle.clients?.length || 0) - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-400">{cycle.clients?.length || 0} לקוחות</span>
                  </div>

                  <div className="pt-6 border-t border-gray-100 flex justify-between items-center text-xs font-bold text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14}/> 
                      {cycle.startDate ? new Date(cycle.startDate).toLocaleDateString('he-IL') : 'לא נקבע'}
                    </span>
                    <div className="flex items-center gap-2 text-nexus-accent group-hover:underline">
                      ניהול קבוצה <ChevronRight size={14} className="rotate-180" />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        <CreateCycleModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={loadCycles}
        />
      </div>
    );
  }

  if (!selectedCycle) return null;

  return (
    <div className="h-full flex flex-col gap-8 animate-slide-up pb-20 pt-safe">
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode('LIST')}
            className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-2 ${getStatusStyle(selectedCycle.status)}`}>
              {getStatusLabel(selectedCycle.status)}
            </div>
            <h2 className="text-3xl font-display font-bold text-gray-900">{selectedCycle.name}</h2>
            <p className="text-gray-500 font-medium">{selectedCycle.description || 'מרחב עבודה קבוצתי מנוהל.'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {selectedCycle.whatsappGroupLink && (
            <a 
              href={selectedCycle.whatsappGroupLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
            >
              <MessageCircle size={18} /> WhatsApp
            </a>
          )}
          {selectedCycle.slackChannelLink && (
            <a 
              href={selectedCycle.slackChannelLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg"
            >
              <Slack size={18} /> Slack
            </a>
          )}
          <button
            onClick={() => handleDeleteCycle(selectedCycle.id)}
            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="מחק מחזור"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-gray-200 rounded-[32px] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Users size={20} className="text-nexus-accent" /> 
                חברי המחזור ({cycleClients.length})
              </h3>
              <button 
                onClick={() => setIsAddClientModalOpen(true)}
                className="p-2 text-nexus-primary hover:bg-gray-50 rounded-lg"
              >
                <Plus size={18}/>
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {cycleClients.map((cc) => (
                <div key={cc.client.id} className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-nexus-primary text-white flex items-center justify-center font-bold text-sm">
                      {cc.client.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-gray-900 block">{cc.client.name}</span>
                      <span className="text-[10px] text-gray-500">{cc.client.company_name}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveClient(cc.client.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                  >
                    <Ban size={14}/>
                  </button>
                </div>
              ))}
              {cycleClients.length === 0 && (
                <p className="text-center py-10 text-gray-400 italic text-sm">
                  אין לקוחות במחזור זה עדיין.
                  <br />
                  <button 
                    onClick={() => setIsAddClientModalOpen(true)}
                    className="text-nexus-primary font-bold mt-2 hover:underline"
                  >
                    הוסף לקוח ראשון
                  </button>
                </p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-nexus-primary to-slate-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-nexus-accent/20 rounded-xl flex items-center justify-center text-nexus-accent mb-4">
                <Sparkles size={24} />
              </div>
              <h4 className="font-bold mb-2">אדריכל AI למחזורים</h4>
              <p className="text-xs text-white/60 mb-6 leading-relaxed">
                תנו ל-AI שלנו לנסח הודעת פתיחה מרגשת לכל חברי המחזור או לסכם עבורכם מי עומד ביעדים.
              </p>
              <GlowButton className="w-full py-2 text-xs">נסח הודעת ברוכים הבאים</GlowButton>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white border border-gray-200 rounded-[32px] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Zap size={22} className="text-nexus-accent" fill="currentColor" /> 
                משימות קבוצתיות ({selectedCycle.tasks?.length || 0})
              </h3>
              <button 
                onClick={() => setIsAddTaskModalOpen(true)}
                className="px-4 py-2 bg-nexus-primary text-white rounded-xl text-xs font-bold hover:bg-nexus-accent transition-all flex items-center gap-2"
              >
                <Plus size={14} /> הוסף משימה
              </button>
            </div>
            <div className="space-y-4">
              {selectedCycle.tasks?.map(task => {
                const completionCount = task.completions?.length || 0;
                const clientCount = cycleClients.length;
                const isAllCompleted = completionCount === clientCount && clientCount > 0;
                
                return (
                  <div key={task.id} className="p-5 bg-gray-50 rounded-[24px] border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isAllCompleted ? 'bg-green-500 text-white' : 'bg-white text-nexus-primary'}`}>
                          <CircleCheckBig size={20}/>
                        </div>
                        <div>
                          <h4 className={`font-bold text-gray-900 ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>
                            {task.title}
                          </h4>
                          <p className="text-xs text-gray-500">{task.description}</p>
                          {task.dueDate && (
                            <p className="text-xs text-gray-400 mt-1">דדליין: {new Date(task.dueDate).toLocaleDateString('he-IL')}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex -space-x-2 rtl:space-x-reverse">
                        {task.completions?.slice(0, 5).map((completion) => (
                          <div key={completion.id} className="w-6 h-6 rounded-full border-2 border-white bg-green-500 flex items-center justify-center" title={completion.client?.name}>
                            <CircleCheckBig size={10} className="text-white"/>
                          </div>
                        ))}
                      </div>
                      <span className={`text-[10px] font-black uppercase ${isAllCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                        {completionCount}/{clientCount} הושלמו
                      </span>
                    </div>
                  </div>
                );
              })}
              {(!selectedCycle.tasks || selectedCycle.tasks.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">אין משימות במחזור זה עדיין</p>
                  <button 
                    onClick={() => setIsAddTaskModalOpen(true)}
                    className="text-nexus-primary font-bold text-sm mt-2 hover:underline"
                  >
                    הוסף משימה ראשונה
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[32px] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText size={22} className="text-nexus-accent" /> 
                ספרית חומרים משותפת ({selectedCycle.assets?.length || 0})
              </h3>
              <button 
                onClick={() => setIsUploadAssetModalOpen(true)}
                className="px-4 py-2 bg-nexus-primary text-white rounded-xl text-xs font-bold hover:bg-nexus-accent transition-all flex items-center gap-2"
              >
                <Upload size={14} /> העלה קובץ
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedCycle.assets?.map(asset => (
                <div key={asset.id} className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between group hover:border-nexus-accent/30 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-nexus-primary transition-colors shrink-0">
                      <FileText size={20}/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-sm text-gray-800 block truncate">{asset.name}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-black">{asset.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a 
                      href={asset.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-gray-300 hover:text-nexus-primary"
                    >
                      <ExternalLink size={16}/>
                    </a>
                    <button 
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-2 text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              ))}
              {(!selectedCycle.assets || selectedCycle.assets.length === 0) && (
                <div className="col-span-full text-center py-8 text-gray-400">
                  <p className="text-sm">אין קבצים במחזור זה עדיין</p>
                  <button 
                    onClick={() => setIsUploadAssetModalOpen(true)}
                    className="text-nexus-primary font-bold text-sm mt-2 hover:underline"
                  >
                    העלה קובץ ראשון
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddTaskModal 
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        cycleId={selectedCycleId || ''}
        onSuccess={loadCycles}
      />

      <UploadAssetModal 
        isOpen={isUploadAssetModalOpen}
        onClose={() => setIsUploadAssetModalOpen(false)}
        cycleId={selectedCycleId || ''}
        onSuccess={loadCycles}
      />

      <AddClientToCycleModal 
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        cycleId={selectedCycleId || ''}
        existingClientIds={cycleClients.map(cc => cc.client.id)}
        availableClients={availableClients.map(c => ({ 
          id: c.id, 
          name: c.name, 
          company_name: c.mainContact,
          avatar: c.logoInitials 
        }))}
        onSuccess={loadCycles}
      />
    </div>
  );
};

export default CyclesManager;
