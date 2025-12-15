
import React, { useState, useEffect, useRef } from 'react';
import { Priority, Task, Status, TaskCreationDefaults } from '../types';
import { useData } from '../context/DataContext';
import { TaskItem } from '../components/TaskItem';
import { TaskCard } from '../components/TaskCard';
import { Filter, List, Kanban, Plus, Zap, Copy, ChevronDown, Layers, UserPlus, FileText, CheckSquare, Star, Users, Flag, Briefcase, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../constants';
import { CustomSelect } from '../components/CustomSelect';

// Map string names to components for templates
const ICON_MAP: Record<string, any> = {
    'Layers': Layers,
    'UserPlus': UserPlus,
    'FileText': FileText,
    'CheckSquare': CheckSquare,
    'Star': Star,
    'Zap': Zap,
    'Server': Server
};

type GroupByOption = 'status' | 'assignee' | 'priority' | 'client';

export const TasksView: React.FC = () => {
  const { tasks, users, updateTask, templates, applyTemplate, openCreateTask, workflowStages, openTask, clients, currentUser, hasPermission } = useData();
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null); // Visual feedback
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  // Group By State
  const [groupBy, setGroupBy] = useState<GroupByOption>('status');
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);

  // Filter State
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string | 'all'>('all');

  const templatesButtonRef = useRef<HTMLButtonElement>(null);
  const templatesDropdownRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const groupByButtonRef = useRef<HTMLButtonElement>(null);
  const groupByDropdownRef = useRef<HTMLDivElement>(null);

  // --- SCOPING LOGIC ---
  const isGlobalAdmin = currentUser.isSuperAdmin || currentUser.role === 'מנכ״ל' || currentUser.role === 'אדמין';
  const isManager = hasPermission('manage_team');

  // Filter users for the dropdown based on scope
  const scopedUsers = users.filter(u => {
        if (isGlobalAdmin) return true;
        if (isManager) return u.department === currentUser.department;
        return u.id === currentUser.id;
  });

  // Close Dropdowns on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          // Handle Templates Dropdown
          if (
              isTemplatesOpen &&
              templatesDropdownRef.current &&
              !templatesDropdownRef.current.contains(event.target as Node) &&
              templatesButtonRef.current &&
              !templatesButtonRef.current.contains(event.target as Node)
          ) {
              setIsTemplatesOpen(false);
          }
          
          // Handle Filter Dropdown
          if (
              isFilterMenuOpen &&
              filterDropdownRef.current &&
              !filterDropdownRef.current.contains(event.target as Node) &&
              filterButtonRef.current &&
              !filterButtonRef.current.contains(event.target as Node)
          ) {
              setIsFilterMenuOpen(false);
          }

          // Handle Group By Dropdown
          if (
              isGroupByOpen &&
              groupByDropdownRef.current &&
              !groupByDropdownRef.current.contains(event.target as Node) &&
              groupByButtonRef.current &&
              !groupByButtonRef.current.contains(event.target as Node)
          ) {
              setIsGroupByOpen(false);
          }
      };

      if (isTemplatesOpen || isFilterMenuOpen || isGroupByOpen) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTemplatesOpen, isFilterMenuOpen, isGroupByOpen]);

  const getFilteredTasks = () => {
      // 1. Initial Scope Filtering
      let filtered = tasks.filter(t => {
          if (isGlobalAdmin) return true;
          if (isManager && t.department === currentUser.department) return true;
          // Employees see tasks assigned to them OR tasks they created
          return t.assigneeIds?.includes(currentUser.id) || t.assigneeId === currentUser.id || t.creatorId === currentUser.id;
      });
      
      // 2. Focus Mode
      if (isFocusMode) {
          filtered = filtered.filter(t => 
              t.assigneeIds?.includes(currentUser.id) && 
              t.status !== 'Done' && 
              t.status !== 'Canceled'
          ).sort((a, b) => {
              const priorityWeight = { [Priority.URGENT]: 4, [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
              return priorityWeight[b.priority] - priorityWeight[a.priority];
          });
      }

      // 3. User Selected Filters
      if (filterPriority !== 'all') {
          filtered = filtered.filter(t => t.priority === filterPriority);
      }
      if (filterAssignee !== 'all') {
          filtered = filtered.filter(t => t.assigneeIds?.includes(filterAssignee) || t.assigneeId === filterAssignee);
      }

      return filtered;
  };

  const filteredTasks = getFilteredTasks();
  const activeFiltersCount = (filterPriority !== 'all' ? 1 : 0) + (filterAssignee !== 'all' ? 1 : 0);

  // --- Grouping Logic ---
  
  const getColumns = (): { id: string; title: string; color: string; avatar?: string }[] => {
      switch (groupBy) {
          case 'status':
              return workflowStages.map(s => ({ id: s.id, title: s.name, color: s.color }));
          case 'assignee':
              return [
                  ...scopedUsers.map(u => ({ id: u.id, title: u.name, color: 'bg-white border-gray-200 text-gray-900', avatar: u.avatar })),
                  { id: 'unassigned', title: 'לא משויך', color: 'bg-gray-50 border-gray-200 text-gray-500' }
              ];
          case 'priority':
              return (Object.values(Priority) as Priority[]).map(p => ({ 
                  id: p, 
                  title: PRIORITY_LABELS[p], 
                  color: PRIORITY_COLORS[p].replace('bg-', 'border-t-4 bg-white border-') // Custom style for priority cols
              }));
          case 'client':
              return [
                  ...clients.map(c => ({ id: c.id, title: c.companyName, color: 'bg-white border-gray-200 text-gray-900', avatar: c.avatar })),
                  { id: 'no-client', title: 'ללא לקוח (פנימי)', color: 'bg-gray-50 border-gray-200 text-gray-500' }
              ];
          default:
              return [];
      }
  };

  const getTasksForColumn = (columnId: string) => {
      return filteredTasks.filter(task => {
          switch (groupBy) {
              case 'status':
                  return task.status === columnId;
              case 'assignee':
                  if (columnId === 'unassigned') return !task.assigneeIds || task.assigneeIds.length === 0;
                  return task.assigneeIds?.includes(columnId) || task.assigneeId === columnId;
              case 'priority':
                  return task.priority === columnId;
              case 'client':
                  if (columnId === 'no-client') return !task.clientId && !task.tags.some(t => clients.some(c => c.companyName === t));
                  // Match by ID or Tag Name
                  const client = clients.find(c => c.id === columnId);
                  return task.clientId === columnId || (client && task.tags.includes(client.companyName));
              default:
                  return false;
          }
      });
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag image
    const dragIcon = document.createElement('div');
    dragIcon.style.width = '1px';
    dragIcon.style.height = '1px';
    dragIcon.style.opacity = '0';
    document.body.appendChild(dragIcon);
    e.dataTransfer.setDragImage(dragIcon, 0, 0);
    setTimeout(() => document.body.removeChild(dragIcon), 0);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault(); // Necessary for drop to work
    if (dragOverColumnId !== columnId) {
        setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = () => {
      // Small debounce to prevent flickering when moving between child elements
      // setDragOverColumnId(null); 
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const taskId = e.dataTransfer.getData('taskId');
    
    if (taskId) {
        const updates: Partial<Task> = {};
        
        switch (groupBy) {
            case 'status':
                updates.status = columnId;
                break;
            case 'assignee':
                if (columnId === 'unassigned') updates.assigneeIds = [];
                else updates.assigneeIds = [columnId]; // Simple reassign for drag
                break;
            case 'priority':
                updates.priority = columnId as Priority;
                break;
            case 'client':
                if (columnId === 'no-client') updates.clientId = undefined;
                else updates.clientId = columnId;
                break;
        }
        
        updateTask(taskId, updates);
    }
    setDraggedTaskId(null);
  };

  // ----------------------

  const handleApplyTemplate = (id: string) => {
      applyTemplate(id);
      setIsTemplatesOpen(false);
  };

  const clearFilters = () => {
      setFilterPriority('all');
      setFilterAssignee('all');
      setIsFilterMenuOpen(false);
  };

  const columns = getColumns();

  return (
    <div className="w-full h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] flex flex-col overflow-hidden">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 px-1 md:px-0 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              {isFocusMode ? 'מיקוד אישי' : 'ניהול משימות'}
          </h2>
          <button 
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${isFocusMode ? 'bg-black text-white shadow-lg ring-2 ring-offset-2 ring-black' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            <Zap size={14} className={isFocusMode ? 'fill-yellow-400 text-yellow-400' : ''} />
            {isFocusMode ? 'יציאה' : 'מצב מיקוד'}
          </button>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
            <button 
                onClick={() => openCreateTask()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 hover:-translate-y-0.5 border border-slate-700 transition-all active:scale-95 group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300 text-indigo-300 group-hover:text-white" />
                <span className="hidden sm:inline relative z-10">משימה חדשה</span>
            </button>

            <div className="h-8 w-px bg-gray-300 mx-1 hidden md:block"></div>

            {/* Templates Button */}
            <div className="relative">
                <button 
                    ref={templatesButtonRef}
                    onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-white hover:border-gray-300 bg-gray-50 shadow-sm transition-all"
                >
                    <Copy size={16} />
                    <span className="hidden sm:inline">תבניות</span>
                </button>
                <AnimatePresence>
                    {isTemplatesOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            ref={templatesDropdownRef}
                            className="absolute top-full right-0 md:left-0 md:right-auto mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden ring-1 ring-black/5 origin-top-right md:origin-top-left"
                        >
                            <div className="p-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">צור במהירות</div>
                            {templates.map(tmp => {
                                const IconComponent = ICON_MAP[tmp.icon] || Layers;
                                return (
                                    <button 
                                        key={tmp.id}
                                        onClick={() => handleApplyTemplate(tmp.id)}
                                        className="w-full text-right px-4 py-3 hover:bg-blue-50 text-sm font-medium text-gray-700 flex items-center gap-3 transition-colors"
                                    >
                                        <IconComponent size={16} className="text-blue-500" />
                                        {tmp.name}
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Group By Dropdown */}
            <div className="relative">
                <button 
                    ref={groupByButtonRef}
                    onClick={() => setIsGroupByOpen(!isGroupByOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${groupBy !== 'status' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 bg-gray-50 shadow-sm'}`}
                >
                    {groupBy === 'status' && <Kanban size={16} />}
                    {groupBy === 'client' && <Briefcase size={16} />}
                    {groupBy === 'assignee' && <Users size={16} />}
                    {groupBy === 'priority' && <Flag size={16} />}
                    
                    <span className="hidden sm:inline">
                        מיון לפי
                    </span>
                    <ChevronDown size={14} className="opacity-50" />
                </button>

                <AnimatePresence>
                    {isGroupByOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            ref={groupByDropdownRef}
                            className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-2 overflow-hidden origin-top-right"
                        >
                            <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">קבץ משימות לפי</div>
                            {[
                                { id: 'status', label: 'תהליך (סטטוס)', icon: Kanban },
                                { id: 'client', label: 'לקוחות (פרויקטים)', icon: Briefcase },
                                { id: 'assignee', label: 'צוות', icon: Users },
                                { id: 'priority', label: 'דחיפות', icon: Flag },
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => { setGroupBy(opt.id as GroupByOption); setIsGroupByOpen(false); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${groupBy === opt.id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <opt.icon size={16} />
                                    {opt.label}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
                <button 
                    ref={filterButtonRef}
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${isFilterMenuOpen || activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 bg-gray-50 shadow-sm'}`}
                >
                    <Filter size={16} />
                    <span className="hidden sm:inline">סינון</span>
                    {activeFiltersCount > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>

                <AnimatePresence>
                    {isFilterMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            ref={filterDropdownRef}
                            className="absolute top-full right-0 md:left-0 md:right-auto mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-4 space-y-4 origin-top-right md:origin-top-left"
                        >
                            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                <span className="text-xs font-bold text-gray-400 uppercase">סינון לפי</span>
                                {activeFiltersCount > 0 && (
                                    <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">נקה הכל</button>
                                )}
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-2">דחיפות</label>
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        onClick={() => setFilterPriority('all')}
                                        className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${filterPriority === 'all' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        הכל
                                    </button>
                                    {(Object.values(Priority) as Priority[]).map(p => (
                                        <button 
                                            key={p}
                                            onClick={() => setFilterPriority(p)}
                                            className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${filterPriority === p ? PRIORITY_COLORS[p] + ' ring-1 ring-offset-1 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            {PRIORITY_LABELS[p]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-2">אחראי</label>
                                <CustomSelect 
                                    value={filterAssignee}
                                    onChange={setFilterAssignee}
                                    options={[
                                        { value: 'all', label: 'כל העובדים' },
                                        ...scopedUsers.map(u => ({ value: u.id, label: u.name }))
                                    ]}
                                    className="text-sm"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <div className="hidden md:flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    title="תצוגת רשימה"
                >
                    <List size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('board')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    title="לוח משימות"
                >
                    <Kanban size={18} />
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 md:overflow-hidden relative">
        {/* Mobile List View */}
        <div className="block md:hidden h-auto p-1 pb-20">
             {filteredTasks.length > 0 ? filteredTasks.map(task => (
                <TaskItem 
                    key={task.id} 
                    task={task} 
                    users={users} 
                    onClick={() => openTask(task.id)}
                />
            )) : (
                <div className="p-10 text-center text-gray-400">
                        {isFocusMode ? 'אין משימות דחופות כרגע! 🎉' : 'אין משימות להצגה'}
                </div>
            )}
        </div>

        {/* Desktop Views */}
        <div className="hidden md:block h-full">
            {viewMode === 'list' ? (
                <div className="bg-white/50 border border-gray-200 rounded-3xl overflow-hidden min-h-[400px] shadow-sm">
                    <div className="hidden md:flex items-center gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <div className="w-5"></div>
                        <div className="flex-1">שם המשימה</div>
                        <div className="w-32 text-right">זמן עבודה</div>
                        <div className="w-24 text-right">דחיפות</div>
                        <div className="w-24 text-right">תאריך יעד</div>
                        <div className="w-16 text-right">אחראי</div>
                    </div>
            
                    <div className="overflow-y-auto max-h-[calc(100vh-320px)] no-scrollbar p-2">
                        {filteredTasks.length > 0 ? filteredTasks.map(task => (
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                users={users} 
                                onClick={() => openTask(task.id)}
                            />
                        )) : (
                            <div className="p-10 text-center text-gray-400">
                                {isFocusMode ? 'אין משימות דחופות כרגע! 🎉' : 'אין משימות להצגה'}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-full overflow-x-auto overflow-y-hidden pb-4">
                    <div className="flex h-full min-w-max gap-3 px-4">
                        {columns.map(col => {
                            // Don't show "Done" in Focus mode
                            if (isFocusMode && col.id === 'Done') return null;

                            const columnTasks = getTasksForColumn(col.id);
                            const isDragTarget = dragOverColumnId === col.id;
                            
                            return (
                                <div 
                                    key={col.id} 
                                    className={`w-[260px] min-w-[260px] flex flex-col h-full rounded-2xl transition-all duration-300 ${
                                        isDragTarget ? 'bg-blue-50/60 ring-2 ring-blue-100' : 'bg-gray-50/40'
                                    }`}
                                    onDragOver={(e) => handleDragOver(e, col.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, col.id)}
                                >
                                    {/* Minimalist Header */}
                                    <div className="p-4 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-2">
                                            {col.avatar ? (
                                                <img src={col.avatar} className="w-6 h-6 rounded-full border border-white shadow-sm" />
                                            ) : (
                                                <div className={`w-2 h-2 rounded-full ${col.color.includes('bg-') ? col.color.split(' ')[0].replace('bg-', 'bg-') : 'bg-gray-400'}`}></div>
                                            )}
                                            
                                            <h3 className="text-sm font-bold text-gray-900 truncate max-w-[120px]" title={col.title}>{col.title}</h3>
                                            <span className="text-[10px] text-gray-400 font-medium bg-white px-2 py-0.5 rounded-full shadow-sm border border-gray-100">
                                                {columnTasks.length}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                // Smart create defaults based on column
                                                const defaults: TaskCreationDefaults = { priority: Priority.MEDIUM };
                                                
                                                if (groupBy === 'status') defaults.status = col.id;
                                                if (groupBy === 'priority') defaults.priority = col.id as Priority;
                                                if (groupBy === 'assignee' && col.id !== 'unassigned') defaults.assigneeId = col.id;
                                                if (groupBy === 'client' && col.id !== 'no-client') defaults.clientId = col.id;
                                                
                                                openCreateTask(defaults);
                                            }}
                                            className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-white transition-colors"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>

                                    {/* Infinite Drop Zone with Padding to prevent clipping */}
                                    <div className="flex-1 overflow-y-auto px-2 pb-20 pt-2 space-y-3 no-scrollbar h-full min-h-[150px] relative">
                                        {columnTasks.map((task) => (
                                            <div 
                                                key={task.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task.id)}
                                                className={`transform transition-all duration-200 ${draggedTaskId === task.id ? 'opacity-50 scale-95 grayscale' : 'hover:scale-[1.02]'}`}
                                            >
                                                <TaskCard 
                                                    task={task} 
                                                    users={users} 
                                                    onClick={() => openTask(task.id)}
                                                />
                                            </div>
                                        ))}
                                        
                                        {/* Drop Zone Visual Cue - fills empty space */}
                                        <div className={`flex-1 min-h-[100px] transition-all rounded-xl border-2 border-dashed ${isDragTarget ? 'border-blue-300 bg-blue-50/20' : 'border-transparent'}`}>
                                            {columnTasks.length === 0 && !isDragTarget && (
                                                <div className="h-full flex items-center justify-center text-gray-300 text-xs font-medium">
                                                    ריק
                                                </div>
                                            )}
                                            {isDragTarget && columnTasks.length === 0 && (
                                                <div className="h-full flex items-center justify-center text-blue-400 text-xs font-medium">
                                                    שחרר כאן
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
