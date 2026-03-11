
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useData } from '../context/DataContext';
import { Status, Priority, Task } from '../types';
import { Sun, TriangleAlert, CircleCheckBig, X, Calendar, Clock, BrainCircuit, ChevronRight, ArrowLeft, Trophy, Target, Sparkles, Coffee, ArrowUpRight, Zap, ArrowRight, Play, Quote, Plus, Check, Trash2, GripVertical, Lock, Flame, Lightbulb, ListPlus } from 'lucide-react';
import { PRIORITY_LABELS } from '../constants';

// --- Types for the Scheduler ---
interface TimeSlot {
    id: string; // Unique ID for Drag key
    startTime: string; // "09:00"
    endTime: string;   // "10:00"
    type: 'event' | 'task' | 'break' | 'gap';
    title: string;
    taskOriginalId?: string; // Link back to real task
    duration: number; // minutes
    isFixed: boolean; // Can it be dragged?
    reasoning?: string; 
}

export const MorningBriefing: React.FC = () => {
  const { tasks, setShowMorningBrief, currentUser, updateTask, calendarEvents: contextCalendarEvents } = useData();
  const [step, setStep] = useState<'greeting' | 'overview' | 'schedule'>('greeting');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const currentUserId = currentUser.id;

  // --- State for User Selection ---
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [customTasks, setCustomTasks] = useState<{id: string, title: string}[]>([]);
  const [newTaskInput, setNewTaskInput] = useState('');

  // --- Schedule State ---
  const [schedule, setSchedule] = useState<TimeSlot[]>([]);
  const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null);

  // --- Logic Helpers ---
  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'בוקר טוב';
      if (hour < 17) return 'צהריים טובים';
      return 'ערב טוב';
  };

  // 1. Identify Candidate Tasks
  // Red Flags: High priority not done
  const redFlags = tasks.filter((t: Task) => 
    t.status !== Status.DONE && 
    (t.priority === Priority.URGENT || t.priority === Priority.HIGH)
  );

  // Existing Today: Already scheduled for today
  const existingToday = tasks.filter((t: Task) => 
    t.status !== Status.DONE &&
    (t.dueDate === 'היום' || t.dueDate === new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }))
  );

  // Opportunity: My tasks, not urgent, not today
  const opportunities = tasks.filter((t: Task) => 
    t.assigneeIds?.includes(currentUserId) && 
    t.status !== Status.DONE &&
    t.priority !== Priority.URGENT &&
    !existingToday.includes(t) &&
    !redFlags.includes(t)
  ).sort((a: Task, b: Task) => {
      const pWeight: Record<Priority, number> = {
        [Priority.URGENT]: 4,
        [Priority.HIGH]: 3,
        [Priority.MEDIUM]: 2,
        [Priority.LOW]: 1,
      };
      return pWeight[b.priority] - pWeight[a.priority];
  });

  const completedYesterday = Math.floor(Math.random() * 5) + 2; // Mock stat

  // Initialize selection on mount
  useEffect(() => {
      const initialSet = new Set<string>();
      // Auto-select Red Flags and Existing Today Tasks
      redFlags.forEach((t: Task) => initialSet.add(t.id));
      existingToday.forEach((t: Task) => initialSet.add(t.id));
      
      // Auto-select top opportunity if schedule is light
      if (initialSet.size < 3 && opportunities.length > 0) {
          initialSet.add(opportunities[0].id);
      }
      
      setSelectedTaskIds(initialSet);
  }, []);

  const toggleTaskSelection = (id: string) => {
      const newSet = new Set(selectedTaskIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedTaskIds(newSet);
  };

  const addCustomTask = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTaskInput.trim()) return;
      const newTask = { id: `custom-${Date.now()}`, title: newTaskInput };
      setCustomTasks(prev => [...prev, newTask]);
      setNewTaskInput('');
  };

  const removeCustomTask = (id: string) => {
      setCustomTasks(prev => prev.filter(t => t.id !== id));
  };

  // --- The "Pouring Sand" Algorithm ---
  const calculateSchedule = (tasksToSchedule: {id: string, title: string, duration: number, isFixed: boolean}[]) => {
      const dayStartMinutes = 9 * 60; // 09:00
      const dayEndMinutes = 18 * 60; // 18:00
      
      const fixedEvents = [
          { start: 10 * 60, end: 11 * 60, title: 'פגישת צוות שבועית', type: 'event' },
          { start: 13 * 60, end: 13 * 60 + 30, title: 'הפסקת צהריים', type: 'break' }
      ];

      let currentCursor = dayStartMinutes;
      const newSchedule: TimeSlot[] = [];

      const flowTasks = tasksToSchedule.filter(t => !t.isFixed);
      let flowIndex = 0;

      while (currentCursor < dayEndMinutes) {
          const collision = fixedEvents.find(ev => 
              (currentCursor >= ev.start && currentCursor < ev.end) || 
              (currentCursor < ev.start && currentCursor + 15 > ev.start)
          );

          if (collision) {
              newSchedule.push({
                  id: `evt-${collision.start}`,
                  startTime: minutesToTime(collision.start),
                  endTime: minutesToTime(collision.end),
                  type: collision.type as 'task' | 'event' | 'break' | 'gap',
                  title: collision.title,
                  duration: collision.end - collision.start,
                  isFixed: true
              });
              currentCursor = collision.end;
              continue;
          }

          const nextEvent = fixedEvents
              .filter(ev => ev.start > currentCursor)
              .sort((a, b) => a.start - b.start)[0];
          
          const timeUntilNextEvent = nextEvent ? nextEvent.start - currentCursor : dayEndMinutes - currentCursor;

          if (flowIndex < flowTasks.length) {
              const task = flowTasks[flowIndex];
              const taskDuration = task.duration || 60;

              if (taskDuration <= timeUntilNextEvent) {
                  newSchedule.push({
                      id: task.id,
                      startTime: minutesToTime(currentCursor),
                      endTime: minutesToTime(currentCursor + taskDuration),
                      type: 'task',
                      title: task.title,
                      taskOriginalId: task.id.startsWith('custom') ? undefined : task.id,
                      duration: taskDuration,
                      isFixed: false,
                      reasoning: 'שובץ אוטומטית'
                  });
                  currentCursor += taskDuration;
                  flowIndex++;
              } else {
                  if (timeUntilNextEvent >= 15) {
                       newSchedule.push({
                          id: `gap-${currentCursor}`,
                          startTime: minutesToTime(currentCursor),
                          endTime: minutesToTime(currentCursor + timeUntilNextEvent),
                          type: 'gap',
                          title: 'זמן פנוי / מעבר',
                          duration: timeUntilNextEvent,
                          isFixed: true
                      });
                  }
                  currentCursor = nextEvent ? nextEvent.start : dayEndMinutes;
              }
          } else {
              break;
          }
      }

      return newSchedule;
  };

  const minutesToTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleOptimize = async () => {
      setIsOptimizing(true);
      
      const selectedSystemTasks = tasks.filter((t: Task) => selectedTaskIds.has(t.id));
      
      const tasksToSchedule = [
          ...selectedSystemTasks.map((t: Task) => ({ id: t.id, title: t.title, duration: 60, isFixed: false })),
          ...customTasks.map(t => ({ id: t.id, title: t.title, duration: 45, isFixed: false }))
      ];

      await new Promise(resolve => setTimeout(resolve, 1200)); 
      
      const generated = calculateSchedule(tasksToSchedule);
      setSchedule(generated);
      setStep('schedule');
      setIsOptimizing(false);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedSlotIndex(index);
      e.dataTransfer.effectAllowed = "move";
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedSlotIndex === null || draggedSlotIndex === index) return;
      
      const draggedItem = schedule[draggedSlotIndex];
      const targetItem = schedule[index];

      if (draggedItem.isFixed || targetItem.isFixed) return;

      const newSchedule = [...schedule];
      const [removed] = newSchedule.splice(draggedSlotIndex, 1);
      newSchedule.splice(index, 0, removed);
      
      setSchedule(newSchedule);
      setDraggedSlotIndex(index);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setDraggedSlotIndex(null);
      
      const currentTaskOrder = schedule
          .filter(s => !s.isFixed)
          .map(s => ({ id: s.id, title: s.title, duration: s.duration, isFixed: false }));
      
      const recalculated = calculateSchedule(currentTaskOrder);
      setSchedule(recalculated);
  };

  const handleCommit = () => {
      // 1. Reset focus for current user's tasks
      tasks.forEach((t: Task) => {
          if (t.assigneeIds?.includes(currentUserId) && t.isFocus) {
              updateTask(t.id, { isFocus: false });
          }
      });

      // 2. Set new focus and date for scheduled tasks
      schedule.forEach(slot => {
          if (slot.taskOriginalId) {
              updateTask(slot.taskOriginalId, { 
                  dueDate: new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }),
                  status: slot.type === 'task' ? Status.TODO : Status.IN_PROGRESS,
                  isFocus: true // Sync: Explicitly mark as Focus
              });
          }
      });
      setShowMorningBrief(false);
  };

  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.5 } }
  };

  const contentVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut", staggerChildren: 0.1 } },
    exit: { y: -20, opacity: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center font-sans p-4 md:p-0" dir="rtl">
      
      {/* 1. Ambient Backdrop (Sunrise Theme) */}
      <motion.div 
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute inset-0 bg-[#f8f9fa]/95 backdrop-blur-3xl"
      >
          <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-orange-200/40 rounded-full blur-[120px] mix-blend-multiply animate-blob"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
      </motion.div>

      {/* 2. Main Content Container */}
      <div className="relative z-10 w-full max-w-6xl h-[85vh] bg-white/80 md:bg-white/60 shadow-2xl rounded-[2rem] md:rounded-[3rem] border border-white/50 overflow-hidden flex flex-col md:flex-row backdrop-blur-xl">
          
          {/* Sidebar / Progress */}
          <div className="w-full md:w-24 bg-white/50 border-b md:border-b-0 md:border-l border-white/50 flex md:flex-col items-center justify-between py-4 px-6 md:py-6 md:px-0 shrink-0">
              <div className="p-2 md:p-3 bg-white rounded-2xl shadow-sm text-orange-500">
                  <Sun size={20} className="md:w-6 md:h-6" />
              </div>
              
              <div className="flex md:flex-col gap-2 md:gap-3">
                  {['greeting', 'overview', 'schedule'].map((s, idx) => (
                      <div key={s} className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-500 ${step === s ? 'bg-black scale-125' : 'bg-gray-300'}`} />
                  ))}
              </div>

              <button onClick={() => setShowMorningBrief(false)} className="p-2 md:p-3 hover:bg-gray-100 rounded-2xl text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} className="md:w-6 md:h-6" />
              </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 relative flex flex-col overflow-hidden">
            <AnimatePresence mode="sync">
                
                {/* STEP 1: GREETING & FOCUS */}
                {step === 'greeting' && (
                    <motion.div 
                        key="greeting" 
                        variants={contentVariants} 
                        initial="hidden" 
                        animate="visible" 
                        exit="exit" 
                        className="flex-1 flex flex-col p-6 md:p-12 overflow-y-auto no-scrollbar"
                    >
                        <motion.div className="mb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-gray-500 font-medium text-sm md:text-lg">{new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                                <span className="bg-orange-100 text-orange-700 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full border border-orange-200">
                                    בהרצה
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tight mb-4">
                                {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-l from-orange-500 to-pink-600">{currentUser.name.split(' ')[0]}</span>.
                            </h1>
                            <p className="text-lg md:text-xl text-gray-600 max-w-2xl leading-relaxed">
                                "הדרך הטובה ביותר לחזות את העתיד היא ליצור אותו." 
                                <br/> בוא נראה מה מחכה לך היום.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 md:mt-8">
                            {/* The Big Rock */}
                            <motion.div whileHover={{ y: -5 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group cursor-pointer" onClick={() => setStep('overview')}>
                                <div className="absolute top-0 right-0 w-2 h-full bg-orange-500"></div>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                                        <Target size={24} className="md:w-7 md:h-7" />
                                    </div>
                                    <span className="text-xs font-bold bg-orange-100 text-orange-700 px-3 py-1 rounded-full uppercase tracking-wide">הכי חשוב להיום</span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 leading-tight">
                                    {redFlags.length > 0 ? redFlags[0].title : (opportunities[0]?.title || 'אין משימות דחופות')}
                                </h3>
                                <p className="text-sm md:text-base text-gray-500">
                                    {redFlags.length > 0 ? 'משימה זו מסומנת כדחופה וחייבת טיפול.' : 'התחלה רגועה ליום.'}
                                </p>
                            </motion.div>

                            {/* Momentum Stat */}
                            <motion.div whileHover={{ y: -5 }} className="bg-gradient-to-br from-purple-50 to-white p-6 md:p-8 rounded-3xl shadow-sm border border-purple-100 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-2 text-purple-600">
                                    <Trophy size={18} className="md:w-5 md:h-5" />
                                    <span className="font-bold uppercase text-xs tracking-wider">מומנטום</span>
                                </div>
                                <div className="text-3xl md:text-4xl font-black text-gray-900 mb-1">{completedYesterday}</div>
                                <div className="text-sm md:text-base text-gray-500">משימות הושלמו אתמול.</div>
                            </motion.div>
                        </div>

                        <div className="mt-auto pt-10 flex justify-end sticky bottom-0 md:static">
                            <button onClick={() => setStep('overview')} className="flex items-center gap-3 bg-black text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl text-base md:text-lg font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 group w-full md:w-auto justify-center md:justify-start">
                                בוא נצלול פנימה <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STEP 2: OVERVIEW & SELECTION */}
                {step === 'overview' && (
                    <motion.div 
                        key="overview" 
                        variants={contentVariants} 
                        initial="hidden" 
                        animate="visible" 
                        exit="exit" 
                        className="flex-1 flex flex-col h-full bg-[#fafafa]"
                    >
                        <div className="p-6 md:p-8 pb-4 shrink-0">
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">בניית היום שלך</h2>
                            <p className="text-gray-500 mt-1 text-sm md:text-base">ה-AI אסף עבורך את המשימות הרלוונטיות. בחר מה לקדם.</p>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6 p-6 md:p-8 pt-0">
                            
                            {/* LEFT COLUMN: SYSTEM TASKS */}
                            <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar gap-6 pr-2 lg:border-l lg:pl-6 border-gray-200">
                                
                                {/* 1. URGENT / TODAY (Group A) */}
                                {(redFlags.length > 0 || existingToday.length > 0) && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-gray-800 font-bold text-sm uppercase tracking-wide">
                                            <Flame size={16} className="text-red-500 fill-red-500" />
                                            חובה להיום ({redFlags.length + existingToday.length})
                                        </div>
                                        
                                        {/* Existing Scheduled */}
                                        {existingToday.map((task: Task) => (
                                            <div 
                                                key={task.id} 
                                                onClick={() => toggleTaskSelection(task.id)}
                                                className={`group p-4 bg-white rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${selectedTaskIds.has(task.id) ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedTaskIds.has(task.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                                        {selectedTaskIds.has(task.id) && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 leading-tight">{task.title}</h4>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                                <Calendar size={10} /> כבר שובץ
                                                            </span>
                                                            {task.priority === Priority.URGENT && <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full">דחוף</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Urgent / Red Flags */}
                                        {redFlags.filter((t: Task) => !existingToday.includes(t)).map((task: Task) => (
                                            <div 
                                                key={task.id} 
                                                onClick={() => toggleTaskSelection(task.id)}
                                                className={`group p-4 bg-white rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${selectedTaskIds.has(task.id) ? 'border-black ring-1 ring-black shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                                            >
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedTaskIds.has(task.id) ? 'bg-black border-black' : 'border-gray-300'}`}>
                                                        {selectedTaskIds.has(task.id) && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 leading-tight">{task.title}</h4>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <TriangleAlert size={10} /> דורש תשומת לב
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">{task.dueDate ? `יעד: ${task.dueDate}` : 'ללא תאריך'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 2. OPPORTUNITIES (Group B) */}
                                {opportunities.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center gap-2 text-gray-500 font-bold text-sm uppercase tracking-wide">
                                            <Lightbulb size={16} className="text-yellow-500 fill-yellow-500" />
                                            הזדמנויות ({opportunities.length})
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {opportunities.map((task: Task) => (
                                                <div 
                                                    key={task.id} 
                                                    onClick={() => toggleTaskSelection(task.id)}
                                                    className={`p-3 bg-white rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-full ${selectedTaskIds.has(task.id) ? 'border-black ring-1 ring-black shadow-md' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'}`}
                                                >
                                                    <div className="flex justify-between items-start gap-2 mb-2">
                                                        <h4 className={`text-sm font-bold leading-tight ${selectedTaskIds.has(task.id) ? 'text-black' : 'text-gray-600'}`}>{task.title}</h4>
                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedTaskIds.has(task.id) ? 'bg-black border-black' : 'border-gray-300'}`}>
                                                            {selectedTaskIds.has(task.id) && <Check size={10} className="text-white" />}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 text-gray-500 font-medium">
                                                            {PRIORITY_LABELS[task.priority]}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {redFlags.length === 0 && existingToday.length === 0 && opportunities.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-48 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                                        <CircleCheckBig size={32} className="text-green-500 mb-2" />
                                        <p className="text-gray-900 font-bold">היומן נקי!</p>
                                        <p className="text-gray-500 text-sm">אין משימות מערכת דחופות.</p>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: BRAIN DUMP */}
                            <div className="w-full lg:w-80 flex flex-col shrink-0">
                                <div className="bg-yellow-50/50 rounded-3xl border border-yellow-100 p-5 flex flex-col h-full relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-yellow-300 to-orange-300 opacity-50"></div>
                                    
                                    <div className="mb-4">
                                        <h3 className="font-black text-gray-900 flex items-center gap-2 text-lg">
                                            <BrainCircuit size={20} className="text-orange-500" /> 
                                            Brain Dump
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">שפוך לכאן כל מה שעולה לך לראש ולא רשום במערכת.</p>
                                    </div>

                                    <form onSubmit={addCustomTask} className="relative mb-4">
                                        <input 
                                            type="text" 
                                            value={newTaskInput}
                                            onChange={(e) => setNewTaskInput(e.target.value)}
                                            placeholder="הקלד משימה + אנטר..."
                                            className="w-full p-3 pl-10 bg-white border border-yellow-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-medium shadow-sm"
                                        />
                                        <Plus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </form>

                                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                        {customTasks.map(task => (
                                            <div key={task.id} className="group flex items-center justify-between p-3 bg-white border border-yellow-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                                                <span className="text-sm font-medium text-gray-800">{task.title}</span>
                                                <button onClick={() => removeCustomTask(task.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {customTasks.length === 0 && (
                                            <div className="text-center py-8 opacity-40">
                                                <ListPlus size={32} className="mx-auto mb-2 text-gray-400" />
                                                <p className="text-xs text-gray-500">הוסף משימות מהראש</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Decoration */}
                                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-yellow-200/20 rounded-full blur-2xl pointer-events-none"></div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="p-6 md:p-8 pt-0 flex justify-between items-center border-t border-gray-100/50 bg-white/50 backdrop-blur-sm sticky bottom-0 z-10">
                            <button onClick={() => setStep('greeting')} className="text-gray-400 hover:text-gray-600 font-bold text-sm transition-colors">חזרה</button>
                            <button 
                                onClick={handleOptimize}
                                disabled={isOptimizing}
                                className="relative overflow-hidden bg-black text-white px-8 py-4 rounded-2xl text-lg font-bold shadow-xl hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-80 flex items-center gap-3"
                            >
                                {isOptimizing ? (
                                    <>
                                        <BrainCircuit size={20} className="animate-pulse" /> מעבד נתונים...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} className="text-yellow-400" />
                                        צור לו"ז יומי
                                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                                            {selectedTaskIds.size + customTasks.length}
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STEP 3: THE SCHEDULE */}
                {step === 'schedule' && (
                    <motion.div 
                        key="schedule" 
                        variants={contentVariants} 
                        initial="hidden" 
                        animate="visible" 
                        exit="exit" 
                        className="flex-1 flex flex-col p-6 md:p-12 overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">הלו"ז להיום</h2>
                                <p className="text-gray-500 text-xs md:text-sm">גרור משימות לשינוי סדר.</p>
                            </div>
                            <div className="flex gap-2 text-[10px] md:text-xs">
                                <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100"><Lock size={10} /> יומן</span>
                                <span className="flex items-center gap-1 bg-white text-gray-700 px-2 py-1 rounded border border-gray-200"><GripVertical size={10} /> משימה</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar pr-2 relative min-h-0">
                            {/* Timeline Line */}
                            <div className="absolute top-4 bottom-4 right-[50px] md:right-[60px] w-px bg-gray-200/70 border-r border-dashed border-gray-300"></div>

                            <div className="space-y-4 pb-4">
                                {schedule.map((slot, idx) => (
                                    <motion.div 
                                        key={slot.id} 
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        layout 
                                        transition={{ duration: 0.2 }}
                                        className="flex items-start gap-4 md:gap-6 group relative"
                                        draggable={!slot.isFixed}
                                        onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, idx)}
                                        onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, idx)}
                                        onDrop={(e) => handleDrop(e as unknown as React.DragEvent)}
                                        style={{ opacity: draggedSlotIndex === idx ? 0.4 : 1 }}
                                    >
                                        {/* Time Column */}
                                        <div className="w-10 md:w-12 text-xs font-bold text-gray-400 pt-4 text-left font-mono shrink-0">
                                            {slot.startTime}
                                        </div>
                                        
                                        {/* Card */}
                                        <div className={`relative z-10 flex-1 p-3 md:p-4 rounded-xl border transition-all ${
                                            slot.isFixed ? 'bg-purple-50/70 border-purple-100 cursor-default' :
                                            slot.type === 'gap' ? 'bg-gray-50/50 border-dashed border-gray-200 text-gray-400' :
                                            'bg-white border-gray-200 shadow-sm cursor-grab hover:border-black active:cursor-grabbing'
                                        }`}>
                                            {/* Dot on line */}
                                            <div className={`absolute top-5 right-[-21px] md:right-[-29px] w-3 h-3 rounded-full border-2 border-white shadow-sm z-20 ${
                                                slot.isFixed ? 'bg-purple-500' : 'bg-blue-500'
                                            }`}></div>

                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                                    {!slot.isFixed && <GripVertical size={16} className="text-gray-300 shrink-0" />}
                                                    <div className="min-w-0">
                                                        <h4 className={`font-bold text-sm truncate ${slot.isFixed ? 'text-purple-900' : 'text-gray-900'}`}>{slot.title}</h4>
                                                        {slot.reasoning && !slot.isFixed && (
                                                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                                                {slot.reasoning}
                                                            </p>
                                                        )}
                                                        {slot.isFixed && (
                                                            <p className="text-[10px] text-purple-600 mt-0.5 flex items-center gap-1">
                                                                <Lock size={10} /> אירוע יומן
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-mono text-gray-400 bg-white/50 px-2 py-1 rounded-lg border border-gray-100 shrink-0 ml-2">
                                                    {slot.endTime}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 md:pt-6 border-t border-gray-100 flex justify-between items-center bg-white/0 shrink-0">
                            <button onClick={() => setStep('overview')} className="text-gray-400 hover:text-gray-600 font-bold text-sm">ערוך בחירה</button>
                            <button onClick={handleCommit} className="bg-black text-white px-6 md:px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg flex items-center gap-2 text-sm md:text-base">
                                אשר וצא לדרך <Check size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>
          </div>
      </div>
    </div>
  );
};
