
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, MoreHorizontal, X, Check, TriangleAlert, Calendar, Layout, Trash2, ArrowLeft } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Task, Priority, Status, CalendarEvent } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { TaskItem } from '../components/nexus/TaskItem';
import { formatHebrewDate, getHebrewDay, getHebrewMonthName, getHebrewYear, getHebrewYearLetters, isShabbat, isJewishHoliday, getJewishHolidayName, getJewishHolidays } from '../lib/hebrew-calendar';
import { Skeleton } from '@/components/ui/skeletons';

export const CalendarView: React.FC = () => {
  const { tasks, users, openCreateTask, isCalendarConnected, isConnectingCalendar, calendarEvents, connectGoogleCalendar, openTask, updateTask } = useData();
  // Initialize with static date to avoid hydration mismatch, then update on mount
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 0, 1));
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    setCurrentDate(new Date());
  }, []);
  
  const showUnscheduled = true; // Always show unscheduled sidebar
  const [selectedDayDetail, setSelectedDayDetail] = useState<Date | null>(null);
  const [showHebrewCalendar, setShowHebrewCalendar] = useState(false);

  // Load Hebrew calendar preference from localStorage after mount (client-side only)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('showHebrewCalendar');
        if (saved === 'true') {
          setShowHebrewCalendar(true);
        }
      }
    } catch { }
  }, []);

  // Save preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('showHebrewCalendar', showHebrewCalendar.toString());
    }
  }, [showHebrewCalendar]);
  
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
  
  // Get holidays for current month (memoized for performance)
  const monthHolidays = useMemo(() => {
    if (!showHebrewCalendar) return [];
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return getJewishHolidays(monthStart, monthEnd);
  }, [currentDate, showHebrewCalendar]);
  
  // Get all holidays for next 10 years (for comprehensive display)
  const upcomingHolidays = useMemo(() => {
    if (!showHebrewCalendar) return [];
    const today = new Date();
    const tenYearsFromNow = new Date(today.getFullYear() + 10, 11, 31);
    return getJewishHolidays(today, tenYearsFromNow);
  }, [showHebrewCalendar]);

  // Data Fetching Logic (Internal Tasks + External Events)
  const getDataForDate = (date: Date) => {
      const dateString = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }); // "1.11"
      const dayNum = date.getDate().toString();
      
      // Calculate ISO string correctly for local time to match DatePickers
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - (offset * 60 * 1000));
      const isoDate = localDate.toISOString().split('T')[0];

      // 1. Tasks
      const dayTasks = tasks.filter((t: Task) => {
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
      const dayEvents = (calendarEvents as unknown as CalendarEvent[]).filter((e) => {
          return e.start.getDate() === date.getDate() && 
                 e.start.getMonth() === date.getMonth() &&
                 e.start.getFullYear() === date.getFullYear();
      });

      return { dayTasks, dayEvents };
  };

  const unscheduledTasks = tasks.filter((t: Task) => !t.dueDate && t.status !== Status.DONE && t.status !== Status.CANCELED);

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
              status: tasks.find((t: Task) => t.id === dropConfirmState.taskId)?.status === Status.BACKLOG ? Status.TODO : undefined
          });
          
          setDropConfirmState({ isOpen: false, taskId: null, targetDate: null, taskTitle: '' });
      }
  };

  const [showUnscheduledMobile, setShowUnscheduledMobile] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 relative overflow-hidden" style={{ touchAction: 'pan-y' }}>
      
      {/* Drag Confirmation Modal */}
      <AnimatePresence mode="sync">
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
          {/* Header - Standardized */}
          <div className="pt-6 pb-4 px-6 border-b border-gray-100 shrink-0">
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-4">
                  <div>
                      <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">אירועים</h1>
                      <p className="text-gray-500 text-sm">
                          {showHebrewCalendar 
                            ? `${getHebrewMonthName(currentDate)} ${getHebrewYearLetters(currentDate)} - ${currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}`
                            : currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
                          }
                          {showHebrewCalendar && monthHolidays.length > 0 && (
                              <span className="mr-2"> • {monthHolidays.length} חגים בחודש</span>
                          )}
                      </p>
                  </div>
                  
                  <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                      {/* Navigation buttons */}
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                          <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded-md transition-shadow text-gray-600" aria-label="חודש קודם"><ChevronRight size={18} /></button>
                          <button onClick={() => setCurrentDate(new Date())} className="px-2 md:px-3 text-xs font-bold text-gray-600" aria-label="עבור להיום">היום</button>
                          <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded-md transition-shadow text-gray-600" aria-label="חודש הבא"><ChevronLeft size={18} /></button>
                      </div>
                      
                      <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
                      
                      {/* Hebrew Calendar Toggle */}
                      <button 
                        onClick={() => setShowHebrewCalendar(!showHebrewCalendar)}
                        className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                            showHebrewCalendar 
                            ? 'bg-purple-50 text-purple-600 border-purple-100' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                          {showHebrewCalendar ? <Check size={12} /> : <CalendarIcon size={12} />}
                          <span>לוח עברי</span>
                      </button>

                      {/* Google Calendar Sync Button - Hidden on mobile */}
                      <button 
                        onClick={connectGoogleCalendar}
                        disabled={isCalendarConnected || isConnectingCalendar}
                        className={`hidden md:flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                            isCalendarConnected 
                            ? 'bg-blue-50 text-blue-600 border-blue-100' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                          {isConnectingCalendar ? (
                              <Skeleton className="w-3 h-3 md:w-4 md:h-4 rounded-full" />
                          ) : isCalendarConnected ? (
                              <Check size={12} />
                          ) : (
                              <svg viewBox="0 0 48 48" className="w-3 h-3 md:w-4 md:h-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="4" y="8" width="40" height="36" rx="3" fill="white" stroke="#DADCE0" strokeWidth="2"/>
                                <rect x="4" y="8" width="40" height="10" rx="3" fill="#1A73E8"/>
                                <rect x="4" y="16" width="40" height="2" fill="#1A73E8"/>
                                <rect x="14" y="4" width="4" height="7" rx="2" fill="#BDBDBD"/>
                                <rect x="30" y="4" width="4" height="7" rx="2" fill="#BDBDBD"/>
                                <text x="24" y="34" fontSize="14" fontWeight="bold" fill="#1A73E8" textAnchor="middle" fontFamily="sans-serif" dominantBaseline="middle">31</text>
                              </svg>
                          )}
                          <span>{isCalendarConnected ? 'מחובר' : 'סנכרן'}</span>
                      </button>
                      
                      {/* Mobile: Unscheduled Button */}
                      {isMobile && unscheduledTasks.length > 0 && (
                          <button 
                            onClick={() => setShowUnscheduledMobile(true)}
                            className="bg-orange-50 text-orange-600 border border-orange-200 px-2 md:px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                          >
                              <span className="bg-orange-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">{unscheduledTasks.length}</span>
                              <span className="hidden sm:inline">ממתין</span>
                          </button>
                      )}
                      
                      <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
                      
                      {/* Create Task Button - Left Side (RTL) */}
                      <button 
                        onClick={() => openCreateTask()}
                        className="bg-black text-white px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5 md:gap-2 ml-auto"
                        aria-label="צור משימה חדשה"
                      >
                          <Plus size={16} /> <span className="hidden sm:inline">משימה חדשה</span>
                      </button>
                  </div>
              </div>
              
              {/* Holiday badges - moved to subtitle area */}
              {showHebrewCalendar && monthHolidays.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mt-2 px-0">
                      <span className="text-[10px] text-gray-600 font-bold uppercase">חגים בחודש:</span>
                      {monthHolidays.slice(0, 5).map((holiday, idx) => (
                          <span 
                              key={idx} 
                              className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-bold"
                              title={`${holiday.date.toLocaleDateString('he-IL')} - ${holiday.name}`}
                          >
                              {holiday.hebrewName}
                          </span>
                      ))}
                      {monthHolidays.length > 5 && (
                          <span className="text-[10px] text-gray-500">+{monthHolidays.length - 5} נוספים</span>
                      )}
                  </div>
              )}
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 flex flex-col min-h-0">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
                  {weekDays.map((day, idx) => (
                      <div 
                          key={day} 
                          className={`py-1.5 md:py-2 lg:py-3 text-center text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider ${
                              idx === 5 ? 'text-blue-600' : 'text-gray-600' // Saturday in blue
                          }`}
                      >
                          {day.substring(0, 3)}
                      </div>
                  ))}
              </div>
              
              {/* Days */}
              <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-gray-200 gap-px overflow-y-auto border-4 border-white md:border-0" onDragLeave={() => setDragOverIndex(null)}>
                  {days.map((date, idx) => {
                      if (!date) return <div key={idx} className="bg-gray-50/30"></div>;
                      
                      const { dayTasks, dayEvents } = getDataForDate(date);
                      const isToday = new Date().toDateString() === date.toDateString();
                      const isDragTarget = dragOverIndex === idx;
                      const isShabbatDay = isShabbat(date);
                      const isHoliday = isJewishHoliday(date);
                      const holidayName = isHoliday ? getJewishHolidayName(date) : null;

                      return (
                          <div 
                            key={idx}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDrop={(e) => handleDrop(e, date)}
                            className={`p-1 md:p-2 relative group hover:bg-blue-50/20 transition-all duration-200 flex flex-col gap-1 min-h-[60px] md:min-h-[100px] cursor-pointer 
                                ${isShabbatDay ? 'bg-blue-50/30 border-r-2 border-blue-300' : ''}
                                ${isHoliday ? 'bg-yellow-50/40 border-r-2 border-yellow-400' : ''}
                                ${!isShabbatDay && !isHoliday ? 'bg-white' : ''}
                                ${isToday ? 'ring-2 ring-blue-400' : ''}
                                ${isDragTarget ? '!bg-blue-100/50 !ring-2 !ring-inset !ring-blue-600 z-10 scale-[1.02] shadow-xl' : ''}
                            `}
                            onClick={() => handleDayClick(date)}
                            title={holidayName ? holidayName : (isShabbatDay ? 'שבת' : undefined)}
                          >
                              <div className="flex justify-center md:justify-between items-start px-1 mb-1 pointer-events-none flex-col gap-1">
                                  <div className="flex items-center gap-1.5 w-full justify-center md:justify-start">
                                      <span className={`text-xs md:text-sm font-bold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-md ${
                                          isToday ? 'bg-blue-600 text-white shadow-md ring-2 ring-gray-900/10' : 
                                          isShabbatDay ? 'bg-blue-100 text-blue-700' :
                                          isHoliday ? 'bg-yellow-100 text-yellow-700' :
                                          'text-gray-700'
                                      }`}>
                                          {date.getDate()}
                                      </span>
                                      {showHebrewCalendar && (
                                          <span className={`text-[10px] font-bold ${
                                              isShabbatDay ? 'text-blue-700' :
                                              isHoliday ? 'text-yellow-800' :
                                              'text-purple-700'
                                          }`}>
                                              {getHebrewDay(date)}
                                          </span>
                                      )}
                                      {(isShabbatDay || isHoliday) && (
                                          <span className="text-[8px] font-bold text-red-700">
                                              {isShabbatDay ? 'ש' : 'חג'}
                                          </span>
                                      )}
                                  </div>
                                  {showHebrewCalendar && (
                                      <span className="text-[9px] text-gray-700 leading-tight text-center w-full">
                                          {getHebrewMonthName(date)}
                                      </span>
                                  )}
                                  {holidayName && (
                                      <span className="text-[8px] font-bold text-yellow-800 text-center w-full truncate" title={holidayName}>
                                          {holidayName}
                                      </span>
                                  )}
                                  {isToday && <span className="text-[10px] font-bold text-blue-700 hidden md:block">היום</span>}
                              </div>

                              {/* Mobile: Dots Only - Better contrast */}
                              <div className="md:hidden flex flex-wrap gap-1.5 justify-center mt-1 pointer-events-none">
                                  {/* Events - Softer, smaller dots */}
                                  {dayEvents.map((e) => (
                                      <div 
                                          key={e.id} 
                                          className="w-1.5 h-1.5 rounded-full opacity-60 border border-blue-300/30" 
                                          style={{ backgroundColor: e.color ? `${e.color}80` : '#93c5fd' }}
                                      ></div>
                                  ))}
                                  {/* Tasks - More prominent, larger dots with ring */}
                                  {dayTasks.map((t: Task) => (
                                      <div 
                                          key={t.id} 
                                          className={`w-2 h-2 rounded-full ring-1 ${
                                              t.priority === Priority.URGENT ? 'bg-red-500 ring-red-300' : 
                                              t.priority === Priority.HIGH ? 'bg-orange-500 ring-orange-300' : 
                                              'bg-gray-600 ring-gray-300'
                                          }`}
                                      ></div>
                                  ))}
                              </div>

                              {/* Desktop: Detailed View */}
                              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 hidden md:block">
                                  
                                  {/* 1. External Events - Softer, background-like appearance */}
                                  {dayEvents.map((event) => (
                                      <div 
                                        key={event.id}
                                        onClick={(e) => e.stopPropagation()} 
                                        className="px-2 py-1 rounded-md text-[10px] font-medium truncate flex items-center gap-1.5 opacity-75 hover:opacity-90 cursor-default border border-blue-200/30"
                                        style={{ 
                                            backgroundColor: event.color ? `${event.color}40` : 'rgba(224, 242, 254, 0.4)', 
                                            color: '#1e40af' 
                                        }}
                                        title={`${event.start.getHours()}:${event.start.getMinutes().toString().padStart(2, '0')} - ${event.title}`}
                                      >
                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60 flex-shrink-0"></div>
                                          <span className="font-mono text-[9px] opacity-80">{event.start.getHours()}:00</span>
                                          <span className="truncate">{event.title}</span>
                                      </div>
                                  ))}

                                  {/* 3. Internal Tasks - More prominent, actionable appearance */}
                                  {dayTasks.map((task: Task) => (
                                      <motion.div 
                                        layoutId={task.id}
                                        key={task.id}
                                        onClick={(e) => { e.stopPropagation(); openTask(task.id); }}
                                        className={`px-2.5 py-1.5 rounded-lg border-2 text-[10px] font-bold cursor-pointer truncate shadow-md hover:shadow-lg hover:scale-[1.02] transition-all flex items-center gap-1.5 ${
                                            task.priority === Priority.URGENT ? 'bg-red-50 text-red-800 border-red-300 shadow-red-100' :
                                            task.priority === Priority.HIGH ? 'bg-orange-50 text-orange-800 border-orange-300 shadow-orange-100' :
                                            'bg-white text-gray-800 border-gray-300 shadow-gray-100'
                                        }`}
                                      >
                                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === Status.DONE ? 'bg-green-500 ring-1 ring-green-300' : 'bg-gray-500 ring-1 ring-gray-300'}`}></div>
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

      {/* Sidebar: Unscheduled + Holidays */}
      {showUnscheduled && (
          <>
          {/* Desktop Sidebar */}
          <div className="w-80 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300 hidden xl:flex">
              {/* Holidays Section (if Hebrew calendar is enabled) */}
              {showHebrewCalendar && upcomingHolidays.length > 0 && (
                  <div className="p-4 border-b border-gray-100 bg-yellow-50/30">
                      <h3 className="font-bold text-gray-900 mb-2 text-sm flex items-center justify-between">
                          <span>חגים קרובים (10 שנים)</span>
                          <span className="text-xs text-gray-700 font-normal">{upcomingHolidays.length}</span>
                      </h3>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1.5">
                          {upcomingHolidays
                              .filter(h => h.date >= new Date()) // Only future holidays
                              .slice(0, 15)
                              .map((holiday, idx) => {
                                  const isThisMonth = holiday.date.getMonth() === currentDate.getMonth() && 
                                                      holiday.date.getFullYear() === currentDate.getFullYear();
                                  return (
                                      <div 
                                          key={idx}
                                          className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                                              isThisMonth 
                                                  ? 'bg-yellow-100 border-yellow-300' 
                                                  : 'bg-white border-yellow-100 hover:border-yellow-200'
                                          }`}
                                      >
                                          <div className="flex-1 min-w-0">
                                              <div className="text-xs font-bold text-gray-900 truncate">{holiday.hebrewName}</div>
                                              <div className="text-[10px] text-gray-500">
                                                  {holiday.date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                                              </div>
                                          </div>
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                              isThisMonth ? 'bg-yellow-200 text-yellow-800' : 'bg-yellow-100 text-yellow-700'
                                          }`}>
                                              חג
                                          </span>
                                      </div>
                                  );
                              })}
                          {upcomingHolidays.filter(h => h.date >= new Date()).length > 15 && (
                              <div className="text-center text-xs text-gray-600 pt-2">
                                  +{upcomingHolidays.filter(h => h.date >= new Date()).length - 15} חגים נוספים
                              </div>
                          )}
                      </div>
                  </div>
              )}
              
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">ממתין לשיבוץ</h3>
                  <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">{unscheduledTasks.length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 pb-4 md:pb-3 space-y-3 bg-gray-50/50">
                  {unscheduledTasks.length > 0 ? unscheduledTasks.map((task: Task) => (
                      <div 
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onClick={() => openTask(task.id)}
                        className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 cursor-grab active:cursor-grabbing group transition-all"
                      >
                          <div className="flex justify-between items-start mb-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${PRIORITY_COLORS[task.priority as Priority]}`}>
                                  {task.priority}
                              </span>
                              <MoreHorizontal size={14} className="text-gray-300 group-hover:text-gray-500" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-800 leading-tight mb-2">{task.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Clock size={12} />
                              <span>{task.timeSpent ? Math.round(task.timeSpent / 60) + ' דק׳' : 'לא התחיל'}</span>
                          </div>
                      </div>
                  )) : (
                      <div className="text-center py-10 text-gray-600 text-sm">
                          כל המשימות משובצות! 🎉
                      </div>
                  )}
              </div>
          </div>
          
          {/* Mobile Modal for Unscheduled */}
          <AnimatePresence mode="sync">
              {showUnscheduledMobile && (
                  <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm xl:hidden" onClick={() => setShowUnscheduledMobile(false)}>
                      <motion.div 
                          initial={{ opacity: 0, y: 100 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 100 }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white w-full h-[85vh] md:h-auto md:max-h-[85vh] md:max-w-md md:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
                      >
                          <div className="p-4 md:p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center sticky top-0 z-10">
                              <h3 className="font-bold text-gray-900 text-lg">ממתין לשיבוץ</h3>
                              <div className="flex items-center gap-2">
                                  <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">{unscheduledTasks.length}</span>
                                  <button onClick={() => setShowUnscheduledMobile(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg" aria-label="סגור">
                                      <X size={20} />
                                  </button>
                              </div>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-3 md:p-4 pb-4 md:pb-4 space-y-3 bg-gray-50/50">
                              {unscheduledTasks.length > 0 ? unscheduledTasks.map((task: Task) => (
                                  <div 
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task)}
                                    onClick={() => { openTask(task.id); setShowUnscheduledMobile(false); }}
                                    className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 cursor-grab active:cursor-grabbing group transition-all"
                                  >
                                      <div className="flex justify-between items-start mb-2">
                                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${PRIORITY_COLORS[task.priority as Priority]}`}>
                                              {task.priority}
                                          </span>
                                          <MoreHorizontal size={14} className="text-gray-300 group-hover:text-gray-500" />
                                      </div>
                                      <h4 className="text-sm font-bold text-gray-800 leading-tight mb-2">{task.title}</h4>
                                      <div className="flex items-center gap-2 text-xs text-gray-600">
                                          <Clock size={12} />
                                          <span>{task.timeSpent ? Math.round(task.timeSpent / 60) + ' דק׳' : 'לא התחיל'}</span>
                                      </div>
                                  </div>
                              )) : (
                                  <div className="text-center py-10 text-gray-600 text-sm">
                                      כל המשימות משובצות! 🎉
                                  </div>
                              )}
                          </div>
                      </motion.div>
                  </div>
              )}
          </AnimatePresence>
          </>
      )}

      {/* Day Detail Modal */}
      <AnimatePresence mode="sync">
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
                            {showHebrewCalendar && (
                                <p className="text-sm text-purple-600 font-bold mt-1">
                                    {formatHebrewDate(selectedDayDetail, { includeYear: true })}
                                </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm text-gray-700 font-bold">{selectedDayDetail.toLocaleDateString('he-IL', { weekday: 'long' })}</p>
                                {isShabbat(selectedDayDetail) && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">
                                        שבת
                                    </span>
                                )}
                                {isJewishHoliday(selectedDayDetail) && getJewishHolidayName(selectedDayDetail) && (
                                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-bold">
                                        {getJewishHolidayName(selectedDayDetail)}
                                    </span>
                                )}
                            </div>
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
                            <button onClick={() => setSelectedDayDetail(null)} className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-black transition-colors" aria-label="סגור פרטי יום">
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
                                    {/* Events Section - Softer appearance */}
                                    {dayEvents.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                אירועים בלוח השנה
                                            </h4>
                                            <div className="space-y-2">
                                                {dayEvents.map((event) => (
                                                    <div key={event.id} className="p-3 bg-blue-50/30 border border-blue-200/50 rounded-lg flex items-center gap-3 opacity-90">
                                                        <div className="w-10 h-10 bg-white/80 rounded-lg flex flex-col items-center justify-center text-blue-500 shadow-sm shrink-0 border border-blue-200/30">
                                                            <span className="text-[10px] font-medium">{event.start.getHours()}:00</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-gray-700 truncate">{event.title}</div>
                                                            <div className="text-xs text-blue-500">לוח שנה Google</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tasks Section */}
                                    {dayTasks.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3 px-1">משימות ({dayTasks.length})</h4>
                                            <div className="space-y-2">
                                                {dayTasks.map((task: Task) => (
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
