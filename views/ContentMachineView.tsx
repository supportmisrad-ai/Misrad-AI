
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { ContentTaskCard } from '../components/nexus/ContentTaskCard';
import { TaskDetailModal } from '../components/nexus/TaskDetailModal';
import { Video, Layers, Plus, Image, FileText, Paperclip, CheckCircle2, Clock, Trash2, Edit2, Lightbulb, Zap, Repeat, Search, MonitorPlay, LayoutGrid, Calendar as CalendarIcon, BarChart3, Rocket, Target, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContentItem, ContentType, Platform, Status, Priority, Task, ContentStage } from '../types';
import { ContentModal } from '../components/ContentModal';
import { CustomSelect } from '../components/CustomSelect';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export const ContentMachineView: React.FC = () => {
  const { tasks, users, openCreateTask, contentItems, deleteContent, contentStages, platforms, addContent } = useData();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'ideas' | 'bank'>('pipeline');
  
  // Content Bank State
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ideas State
  const [newIdeaText, setNewIdeaText] = useState('');

  // Delete Modal
  const [contentToDelete, setContentToDelete] = useState<{id: string, name: string} | null>(null);

  const activeTask = selectedTaskId ? tasks.find((t: Task) => t.id === selectedTaskId) : null;

  // Stats for Header
  const totalProduced = contentItems.length;
  const inProduction = tasks.filter((t: Task) => t.tags.includes('תוכן') && t.status !== Status.DONE).length;
  const totalViews = contentItems.reduce((acc: number, item: ContentItem) => acc + (item.performance?.views || 0), 0);

  // Filter Bank Content
  const filteredContent = contentItems.filter((item: ContentItem) => {
      if (item.type === 'idea' && activeTab !== 'ideas') return false; // Hide ideas in bank
      if (activeTab === 'ideas' && item.type !== 'idea') return false; // Show only ideas in idea tab

      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterPlatform !== 'all' && !item.platforms.includes(filterPlatform)) return false;
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
  });

  const handleEditContent = (item: ContentItem) => {
      setEditingContent(item);
      setIsContentModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
      e.stopPropagation();
      setContentToDelete({ id, name });
  };

  const confirmDelete = () => {
      if (contentToDelete) {
          deleteContent(contentToDelete.id);
          setContentToDelete(null);
      }
  };

  const handleAddIdea = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newIdeaText.trim()) return;
      
      const idea: ContentItem = {
          id: `idea-${Date.now()}`,
          title: newIdeaText,
          type: 'idea',
          status: 'draft',
          platforms: [],
          tags: ['רעיון'],
          createdAt: new Date().toISOString(),
          creatorId: '1' // Current User
      };
      addContent(idea);
      setNewIdeaText('');
  };

  const convertIdeaToTask = (idea: ContentItem) => {
      openCreateTask({
          title: idea.title,
          description: `הפקה על בסיס רעיון: ${idea.title}`,
          tags: ['תוכן', 'הפקה'],
          priority: Priority.MEDIUM
      });
      // Optionally delete idea or mark converted
  };

  // Helper to filter tasks for each dynamic stage
  const getTasksForStage = (triggerTag: string) => {
      if (!triggerTag) return [];
      return tasks.filter((t: Task) => 
          t.status !== Status.DONE && 
          t.status !== Status.CANCELED &&
          t.tags.some(tag => tag.toLowerCase().includes(triggerTag.toLowerCase()))
      );
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      
      <DeleteConfirmationModal 
          isOpen={!!contentToDelete}
          onClose={() => setContentToDelete(null)}
          onConfirm={confirmDelete}
          title="מחיקת תוכן"
          description="הפריט יועבר לסל המיחזור."
          itemName={contentToDelete?.name}
          isHardDelete={false}
      />

      <AnimatePresence>
        {activeTask && (
            <TaskDetailModal 
                task={activeTask} 
                onClose={() => setSelectedTaskId(null)} 
            />
        )}
        {isContentModalOpen && (
            <ContentModal 
                onClose={() => { setIsContentModalOpen(false); setEditingContent(null); }} 
                editItem={editingContent}
            />
        )}
      </AnimatePresence>

      {/* Professional Studio Header */}
      <div className="bg-[#0f172a] text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-end gap-6 shrink-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          
          <div className="relative z-10">
              <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-xs mb-2">
                  <MonitorPlay size={14} /> Studio Command Center
              </div>
              <h1 className="text-4xl font-black tracking-tight mb-2">מכונת התוכן</h1>
              <p className="text-slate-400 max-w-lg text-sm">
                  ניהול פס ייצור מדיה: מתסריט ועד הפצה. מינוף תוכן מקסימלי.
              </p>
              
              <div className="flex gap-6 mt-6">
                  <div>
                      <div className="text-2xl font-bold font-mono">{totalProduced}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">תוצרים</div>
                  </div>
                  <div>
                      <div className="text-2xl font-bold font-mono text-indigo-400">{inProduction}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">בתהליך</div>
                  </div>
                  <div>
                      <div className="text-2xl font-bold font-mono text-green-400">{(totalViews/1000).toFixed(1)}k</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">צפיות</div>
                  </div>
              </div>
          </div>

          <div className="relative z-10 flex gap-3">
              <button 
                  onClick={() => setIsContentModalOpen(true)}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
              >
                  <Plus size={18} /> העלאה
              </button>
              <button 
                  onClick={() => openCreateTask({ tags: ['תוכן', 'צילום', 'Hub'], priority: Priority.HIGH })}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-900/50 flex items-center gap-2 transition-all"
              >
                  <Video size={18} /> הפקה חדשה
              </button>
          </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white/50 backdrop-blur-sm rounded-xl w-fit border border-gray-200 shadow-sm shrink-0">
          {[
              { id: 'pipeline', label: 'פס ייצור', icon: Layers },
              { id: 'ideas', label: 'רעיונות', icon: Lightbulb },
              { id: 'bank', label: 'ארכיון תוכן', icon: LayoutGrid },
          ].map((tab) => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'ideas' | 'pipeline' | 'bank')}
                  className={`
                      flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all
                      ${activeTab === tab.id 
                          ? 'bg-black text-white shadow-md' 
                          : 'text-gray-500 hover:text-black hover:bg-gray-100'}
                  `}
              >
                  <tab.icon size={16} />
                  {tab.label}
              </button>
          ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
          
          {/* PIPELINE VIEW */}
          {activeTab === 'pipeline' && (
              <div className="h-full overflow-x-auto overflow-y-hidden pb-2 custom-scrollbar">
                  <div className="flex h-full min-w-max gap-4 px-1">
                      {contentStages.map((stage: ContentStage) => {
                          const stageTasks = getTasksForStage(stage.tagTrigger);
                          return (
                            <div key={stage.id} className="w-[320px] flex flex-col h-full rounded-2xl bg-gray-50/50 border border-gray-200">
                                <div className={`p-4 border-b border-gray-200/50 flex justify-between items-center sticky top-0 bg-gray-50/90 backdrop-blur-md rounded-t-2xl z-10`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${String((stage as unknown as Record<string, unknown>).color ?? '').split(' ')[0]}`}></div>
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{stage.name}</h3>
                                    </div>
                                    <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500">
                                        {stageTasks.length}
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                    {stageTasks.map((task: Task) => (
                                        <ContentTaskCard 
                                            key={task.id}
                                            task={task}
                                            users={users}
                                            platforms={platforms}
                                            onClick={() => setSelectedTaskId(task.id)}
                                        />
                                    ))}
                                    {stageTasks.length === 0 && (
                                        <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-2">
                                            <div className="bg-gray-100 p-2 rounded-full"><Plus size={16} /></div>
                                            <span className="text-xs font-medium">גרור לכאן</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                          );
                      })}
                  </div>
              </div>
          )}

          {/* IDEAS VIEW */}
          {activeTab === 'ideas' && (
              <div className="h-full flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="max-w-2xl mx-auto w-full mb-8">
                      <form onSubmit={handleAddIdea} className="relative shadow-xl rounded-2xl">
                          <input 
                              value={newIdeaText}
                              onChange={(e) => setNewIdeaText(e.target.value)}
                              placeholder="יש לך רעיון? כתוב אותו כאן..."
                              className="w-full p-5 pr-14 rounded-2xl border-none outline-none text-lg font-medium placeholder:text-gray-300 focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                          <button 
                              type="submit"
                              disabled={!newIdeaText.trim()}
                              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <Plus size={24} />
                          </button>
                      </form>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {filteredContent.map((idea: ContentItem) => (
                              <div key={idea.id} className="bg-yellow-50 border border-yellow-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group relative flex flex-col justify-between min-h-[180px]">
                                  <div>
                                      <div className="flex justify-between items-start mb-3">
                                          <div className="bg-yellow-100 p-2 rounded-full text-yellow-600"><Lightbulb size={20} /></div>
                                          <button 
                                              onClick={(e) => handleDeleteClick(e, idea.id, idea.title)}
                                              className="text-yellow-300 hover:text-red-400 transition-colors"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                      <h3 className="font-bold text-gray-800 text-lg leading-snug">{idea.title}</h3>
                                  </div>
                                  <div className="mt-4 pt-4 border-t border-yellow-100/50">
                                      <button 
                                          onClick={() => convertIdeaToTask(idea)}
                                          className="w-full py-2 bg-white border border-yellow-200 rounded-xl text-xs font-bold text-yellow-700 hover:bg-yellow-100 transition-colors flex items-center justify-center gap-2"
                                      >
                                          <Rocket size={14} /> הפוך לפרויקט
                                      </button>
                                  </div>
                              </div>
                          ))}
                          {filteredContent.length === 0 && (
                              <div className="col-span-full text-center py-20 text-gray-400">
                                  <Lightbulb size={48} className="mx-auto mb-4 opacity-20" />
                                  <p>אין רעיונות כרגע. זה הזמן להיות יצירתיים!</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {/* BANK VIEW (Existing Grid) */}
          {activeTab === 'bank' && (
              <div className="h-full overflow-y-auto custom-scrollbar p-1">
                  {/* Reuse existing grid logic but filter out 'idea' type which is handled in separate tab */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* ... Existing Grid Cards Code ... */}
                      {filteredContent.length > 0 ? filteredContent.map((item: ContentItem) => (
                          <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-all flex flex-col h-full">
                              {/* Preview Area */}
                              <div className="h-40 bg-gray-100 relative flex items-center justify-center border-b border-gray-100 group-hover:bg-gray-50 transition-colors">
                                  {/* Type Badge */}
                                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow-sm text-gray-700 z-10">
                                      {/* Icon logic */}
                                      {item.type === 'video' ? <Video size={16}/> : <FileText size={16}/>}
                                  </div>

                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                                      <button onClick={(e) => { e.stopPropagation(); handleEditContent(item); }} className="p-2 bg-white rounded-full text-gray-700 hover:text-black hover:scale-110 transition-transform" aria-label={`ערוך תוכן ${item.title}`}><Edit2 size={16} /></button>
                                      <button onClick={(e) => handleDeleteClick(e, item.id, item.title)} className="p-2 bg-white rounded-full text-red-500 hover:text-red-700 hover:scale-110 transition-transform" aria-label={`מחק תוכן ${item.title}`}><Trash2 size={16} /></button>
                                  </div>
                                  
                                  {/* Simple Mock Preview */}
                                  {item.type === 'image' && <Image size={48} className="text-gray-300" />}
                                  {item.type === 'video' && <Video size={48} className="text-gray-300" />}
                                  {item.type === 'text' && <div className="p-4 text-xs text-gray-400 text-center line-clamp-4">{item.description}</div>}
                                  {item.type === 'document' && <Paperclip size={48} className="text-gray-300" />}
                              </div>

                              <div className="p-4 flex flex-col flex-1">
                                  <div className="flex justify-between items-start mb-2">
                                      <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight">{item.title}</h3>
                                  </div>
                                  <div className="mt-auto space-y-2 pt-2 border-t border-gray-50">
                                      <div className="flex justify-between items-center text-xs text-gray-500">
                                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                          <span className="font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">פורסם</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )) : (
                          <div className="col-span-full text-center py-20 text-gray-400">
                              <LayoutGrid size={48} className="mx-auto mb-4 opacity-20" />
                              <p>לא נמצאו תכנים.</p>
                          </div>
                      )}
                  </div>
              </div>
          )}

      </div>
    </div>
  );
};
