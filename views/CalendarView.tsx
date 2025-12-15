
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, MoreHorizontal, Filter, X, Loader2, Check, AlertTriangle, Calendar, Layout, Trash2, ArrowLeft } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Task, Priority, Status, CalendarEvent } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { TaskItem } from '../components/TaskItem';

export const CalendarView: React.FC = () => {
  const { tasks, users, openCreateTask, isCalendarConnected, isConnectingCalendar, calendarEvents, connectGoogleCalendar, openTask, updateTask } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [selectedDayDetail, setSelectedDayDetail] = useState<Date | null>(null);
  
  // Drag & Drop State
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null); // NEW: Track which day is being hovered
  const [dropConfirmState, setDropConfirmState] = useState<{
      isOpen: boolean;
      taskId: string | null;
      targetDate: Date | null;
      taskTitle: string;
  }>({ isOpen: false, taskId: null, targetDate: null, taskTitle: '' });

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
    
    const days = [];
    // Padding for prev month
    for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(null);
    }
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  // Data Fetching Logic (Internal Tasks + External Events)
  const getDataForDate = (date: Date) => {
      const dateString = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }); // "1.11"
      const dayNum = date.getDate().toString();
      
      // Calculate ISO string correctly for local time to match DatePickers
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - (offset * 60 * 1000));
      const isoDate = localDate.toISOString().split('T')[0];

      // 1. Tasks
      const dayTasks = tasks.filter(t => {
          if (!t.dueDate) return false;
          if (t.status === Status.DONE || t.status === Status.CANCELED) return false;
          
          // FIX: Use strict equality to prevent "1.11" matching inside "11.11"
          return t.dueDate === dateString || 
                 t.dueDate === isoDate ||
                 t.dueDate === dayNum || 
                 t.dueDate.startsWith(dayNum + ' ') ||
                 (dayNum === '30' && t.dueDate.includes('סוף החודש'));
      });

      // 2. Calendar Events
      const dayEvents = calendarEvents.filter(e => {
          return e.start.getDate() === date.getDate() && 
                 e.start.getMonth() === date.getMonth() &&
                 e.start.getFullYear() === date.getFullYear();
      });

      return { dayTasks, dayEvents };
  };

  const unscheduledTasks = tasks.filter(t => !t.dueDate && t.status !== Status.DONE && t.status !== Status.CANCELED);

  const changeMonth = (delta: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setCurrentDate(newDate);
  };

  const handleDayClick = (date: Date) => {
      setSelectedDayDetail(date);
  };

  // --- Drag & Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, task: Task) => {
      e.dataTransfer.setData('taskId', task.id);
      e.dataTransfer.setData('taskTitle', task.title);
      e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'copy';
      
      // Update visual feedback state only if changed
      if (dragOverIndex !== index) {
          setDragOverIndex(index);
      }
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
      e.preventDefault();
      setDragOverIndex(null); // Clear highlight on drop

      const taskId = e.dataTransfer.getData('taskId');
      const taskTitle = e.dataTransfer.getData('taskTitle');

      if (taskId && date) {
          setDropConfirmState({
              isOpen: true,
              taskId,
              targetDate: date,
              taskTitle
          });
      }
  };

  const confirmDrop = () => {
      if (dropConfirmState.taskId && dropConfirmState.targetDate) {
          const formattedDate = dropConfirmState.targetDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
          
          updateTask(dropConfirmState.taskId, {
              dueDate: formattedDate,
              // If it was backlog, move to Todo
              status: tasks.find(t => t.id === dropConfirmState.taskId)?.status === Status.BACKLOG ? Status.TODO : undefined
          });
          
          setDropConfirmState({ isOpen: false, taskId: null, targetDate: null, taskTitle: '' });
      }
  };

  return (
    <div className="flex h-full gap-6 relative">
      
      {/* Drag Confirmation Modal */}
      <AnimatePresence>
          {dropConfirmState.isOpen && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDropConfirmState(prev => ({ ...prev, isOpen: false }))}>
                  <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      onClick={e => e.stopPropagation()}
                      className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center"
                  >
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Calendar size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">שיבוץ משימה</h3>
                      <p className="text-gray-600 text-sm mb-6">
                          האם לשבץ את המשימה <strong>"{dropConfirmState.taskTitle}"</strong> לתאריך <strong>{dropConfirmState.targetDate?.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</strong>?
                      </p>
                      <div className="flex gap-3">
                          <button 
                              onClick={() => setDropConfirmState(prev => ({ ...prev, isOpen: false }))}
                              className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                          >
                              ביטול
                          </button>
                          <button 
                              onClick={confirmDrop}
                              className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                              <Check size={16} /> אשר שיבוץ
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-5 border-b border-gray-100 gap-4">
              <div className="flex items-center justify-between w-full md:w-auto">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                      {currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
                  </h1>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mr-4">
                      <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded-md transition-shadow text-gray-600"><ChevronRight size={20} /></button>
                      <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-bold text-gray-600">היום</button>
                      <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded-md transition-shadow text-gray-600"><ChevronLeft size={20} /></button>
                  </div>
              </div>
              
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                  {/* Google Calendar Sync Button */}
                  <button 
                    onClick={connectGoogleCalendar}
                    disabled={isCalendarConnected || isConnectingCalendar}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                        isCalendarConnected 
                        ? 'bg-blue-50 text-blue-600 border-blue-100' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                      {isConnectingCalendar ? (
                          <Loader2 size={14} className="animate-spin" />
                      ) : isCalendarConnected ? (
                          <Check size={14} />
                      ) : (
                          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-4 h-4" />
                      )}
                      {isCalendarConnected ? 'מחובר' : 'סנכרן'}
                  </button>

                  <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

                  <button 
                    onClick={() => setShowUnscheduled(!showUnscheduled)}
                    className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${showUnscheduled ? 'bg-black text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  >
                      <Filter size={16} /> <span className="hidden lg:inline">לא משובץ</span> ({unscheduledTasks.length})
                  </button>
                  <button 
                    onClick={() => openCreateTask()}
                    className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                  >
                      <Plus size={20} />
                  </button>
              </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 flex flex-col min-h-0">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
                  {weekDays.map(day => (
                      <div key={day} className="py-2 md:py-3 text-center text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {day.substring(0, 3)}
                      </div>
                  ))}
              </div>
              
              {/* Days */}
              <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-gray-200 gap-px overflow-y-auto" onDragLeave={() => setDragOverIndex(null)}>
                  {days.map((date, idx) => {
                      if (!date) return <div key={idx} className="bg-gray-50/30"></div>;
                      
                      const { dayTasks, dayEvents } = getDataForDate(date);
                      const isToday = new Date().toDateString() === date.toDateString();
                      const isDragTarget = dragOverIndex === idx;

                      return (
                          <div 
                            key={idx}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDrop={(e) => handleDrop(e, date)}
                            className={`bg-white p-1 md:p-2 relative group hover:bg-blue-50/20 transition-all duration-200 flex flex-col gap-1 min-h-[60px] md:min-h-[100px] cursor-pointer 
                                ${isToday ? 'bg-blue-50/10' : ''}
                                ${isDragTarget ? '!bg-blue-100/50 !ring-2 !ring-inset !ring-blue-600 z-10 scale-[1.02] shadow-xl' : ''}
                            `}
                            onClick={() => handleDayClick(date)}
                          >
                              <div className="flex justify-center md:justify-between items-center px-1 mb-1 pointer-events-none">
                                  <span className={`text-xs md:text-sm font-bold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-md ${isToday ? 'bg-blue-600 text-white shadow-md ring-2 ring-black' : 'text-gray-700'}`}>
                                      {date.getDate()}
                                  </span>
                                  {isToday && <span className="text-[10px] font-bold text-blue-600 hidden md:block">היום</span>}
                              </div>

                              {/* Mobile: Dots Only */}
                              <div className="md:hidden flex flex-wrap gap-1 justify-center mt-1 pointer-events-none">
                                  {dayEvents.map(e => <div key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.color || '#3b82f6' }}></div>)}
                                  {dayTasks.map(t => <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${t.priority === Priority.URGENT ? 'bg-red-500' : 'bg-gray-400'}`}></div>)}
                              </div>

                              {/* Desktop: Detailed View */}
                              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 hidden md:block">
                                  
                                  {/* 1. External Events */}
                                  {dayEvents.map(event => (
                                      <div 
                                        key={event.id}
                                        onClick={(e) => e.stopPropagation()} 
                                        className="px-2 py-1 rounded text-[10px] font-bold truncate flex items-center gap-1 opacity-90 hover:opacity-100 cursor-default"
                                        style={{ backgroundColor: event.color || '#e0f2fe', color: '#1e3a8a' }}
                                        title={`${event.start.getHours()}:${event.start.getMinutes().toString().padStart(2, '0')} - ${event.title}`}
                                      >
                                          <div className="w-1 h-1 rounded-full bg-blue-700 flex-shrink-0"></div>
                                          <span className="font-mono opacity-70">{event.start.getHours()}:00</span>
                                          <span className="truncate">{event.title}</span>
                                      </div>
                                  ))}

                                  {/* 3. Internal Tasks */}
                                  {dayTasks.map(task => (
                                      <motion.div 
                                        layoutId={task.id}
                                        key={task.id}
                                        onClick={(e) => { e.stopPropagation(); openTask(task.id); }}
                                        className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer truncate shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 ${
                                            task.priority === Priority.URGENT ? 'bg-red-50 text-red-700 border-red-100' :
                                            task.priority === Priority.HIGH ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                            'bg-white text-gray-700 border-gray-200'
                                        }`}
                                      >
                                          <div className={`w-1.5 h-1.5 rounded-full ${task.status === Status.DONE ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                          {task.title}
                                      </motion.div>
                                  ))}
                              </div>
                              
                              {/* Hover Add Button - Fixed to work properly */}
                              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden md:block">
                                  <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const year = date.getFullYear();
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        openCreateTask({ 
                                            dueDate: `${year}-${month}-${day}` 
                                        });
                                    }}
                                    className="bg-gray-900 text-white p-1.5 rounded-lg shadow-sm hover:scale-110 transition-transform"
                                    title="הוסף משימה ליום זה"
                                  >
                                      <Plus size={14} />
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>

      {/* Sidebar: Unscheduled */}
      {showUnscheduled && (
          <div className="w-80 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300 hidden xl:flex">
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">ממתין לשיבוץ</h3>
                  <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">{unscheduledTasks.length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
                  {unscheduledTasks.length > 0 ? unscheduledTasks.map(task => (
                      <div 
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onClick={() => openTask(task.id)}
                        className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 cursor-grab active:cursor-grabbing group transition-all"
                      >
                          <div className="flex justify-between items-start mb-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${PRIORITY_COLORS[task.priority]}`}>
                                  {task.priority}
                              </span>
                              <MoreHorizontal size={14} className="text-gray-300 group-hover:text-gray-500" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-800 leading-tight mb-2">{task.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Clock size={12} />
                              <span>{task.timeSpent ? Math.round(task.timeSpent / 60) + ' דק׳' : 'לא התחיל'}</span>
                          </div>
                      </div>
                  )) : (
                      <div className="text-center py-10 text-gray-400 text-sm">
                          כל המשימות משובצות! 🎉
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Day Detail Modal */}
      <AnimatePresence>
        {selectedDayDetail && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDayDetail(null)}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative"
                >
                    <div className="p-6 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm flex justify-between items-center sticky top-0 z-10">
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                                {selectedDayDetail.getDate()} {selectedDayDetail.toLocaleDateString('he-IL', { month: 'long' })}
                            </h3>
                            <p className="text-sm text-gray-500 font-bold">{selectedDayDetail.toLocaleDateString('he-IL', { weekday: 'long' })}</p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    // Use local ISO format to preserve date
                                    const year = selectedDayDetail.getFullYear();
                                    const month = String(selectedDayDetail.getMonth() + 1).padStart(2, '0');
                                    const day = String(selectedDayDetail.getDate()).padStart(2, '0');
                                    openCreateTask({ 
                                        dueDate: `${year}-${month}-${day}` 
                                    });
                                    setSelectedDayDetail(null);
                                }}
                                className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors shadow-lg flex items-center gap-2"
                            >
                                <Plus size={16} /> הוסף משימה
                            </button>
                            <button onClick={() => setSelectedDayDetail(null)} className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-black transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        {(() => {
                            const { dayTasks, dayEvents } = getDataForDate(selectedDayDetail);
                            const hasItems = dayTasks.length > 0 || dayEvents.length > 0;

                            if (!hasItems) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <Calendar size={32} className="text-gray-300" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900">היום פנוי!</h4>
                                        <p className="text-sm text-gray-500 max-w-xs">אין משימות או אירועים ליום זה. זה זמן מצוין לתכנן קדימה.</p>
                                    </div>
                                );
                            }

                            return (
                                <>
                                    {/* Events Section */}
                                    {dayEvents.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">אירועים ביומן</h4>
                                            <div className="space-y-2">
                                                {dayEvents.map(event => (
                                                    <div key={event.id} className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-white rounded-lg flex flex-col items-center justify-center text-blue-600 shadow-sm shrink-0">
                                                            <span className="text-[10px] font-bold">{event.start.getHours()}:00</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-gray-900 truncate">{event.title}</div>
                                                            <div className="text-xs text-blue-600">יומן Google</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tasks Section */}
                                    {dayTasks.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">משימות ({dayTasks.length})</h4>
                                            <div className="space-y-2">
                                                {dayTasks.map(task => (
                                                    <TaskItem 
                                                        key={task.id} 
                                                        task={task} 
                                                        users={users} 
                                                        onClick={() => { openTask(task.id); setSelectedDayDetail(null); }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};
