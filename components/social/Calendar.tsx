'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Trash2, Edit3, 
  Clock, X, CalendarDays, RefreshCw, Settings, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Facebook, Instagram, Linkedin, Video, Globe, MessageCircle, Twitter, Share2, PinIcon, MessageSquare } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useSocialData } from '@/contexts/SocialDataContext';
import { useSocialUI } from '@/contexts/SocialUIContext';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';
import { SocialPost, SocialPlatform } from '@/types/social';
import { gregorianToHebrew, getHebrewDateString, isShabbat, getHoliday, isHoliday, isFastDay, getFastDay } from '@/lib/hebrewCalendar';
import { Avatar } from '@/components/Avatar';

const PLATFORM_ICONS: Record<SocialPlatform, any> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: Video,
  twitter: Twitter,
  google: Globe,
  whatsapp: MessageCircle,
  threads: Share2,
  youtube: Video,
  pinterest: PinIcon,
  portal: MessageSquare
};

export default function Calendar() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = getSocialBasePath(pathname);
  const { clients, posts, setActiveDraft, setActiveClientId, setPosts } = useSocialData();
  const { addToast } = useSocialUI();

  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showHebrewCalendar, setShowHebrewCalendar] = useState(true);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  
  const hebDays = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

  const monthPosts = useMemo(() => {
    return posts.filter(p => {
      const d = new Date(p.scheduledAt);
      return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });
  }, [posts, viewDate]);

  const postsForDay = useMemo(() => {
    if (selectedDay === null) return [];
    return monthPosts.filter(p => new Date(p.scheduledAt).getDate() === selectedDay);
  }, [monthPosts, selectedDay]);

  const handleNext = () => {
    if (viewMode === 'month') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    } else {
      // Move to next week (start from Monday)
      const nextWeek = new Date(viewDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setViewDate(nextWeek);
    }
  };

  const handlePrev = () => {
    if (viewMode === 'month') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    } else {
      // Move to previous week (start from Monday)
      const prevWeek = new Date(viewDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setViewDate(prevWeek);
    }
  };

  const handleBackToToday = () => {
    const today = new Date();
    setViewDate(today);
    setSelectedDay(today.getDate());
    setIsDetailOpen(true);
    addToast('חזרנו להיום');
  };

  const handleGoogleSync = async () => {
    setIsSyncing(true);
    try {
      const { syncGoogleCalendar } = await import('@/app/actions/integrations');
      const result = await syncGoogleCalendar();
      if (result.success) {
        addToast(`לוח השידורים סונכרן עם Google Calendar: ${result.events?.length || 0} אירועים`, 'success');
        // Reload posts to show synced events
        window.location.reload();
      } else {
        addToast(result.error || 'שגיאה בסנכרון Google Calendar', 'error');
      }
    } catch (error) {
      addToast('שגיאה בסנכרון Google Calendar', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNewPost = (day: number) => {
    setActiveDraft(null);
    router.push(joinPath(basePath, '/machine'));
  };

  const handleEditPost = (post: SocialPost) => {
    setActiveDraft({ 
      id: post.id, 
      clientId: post.clientId, 
      title: 'עריכה', 
      description: post.content, 
      type: 'gap', 
      draftContent: post.content 
    });
    setActiveClientId(post.clientId);
    router.push(joinPath(basePath, '/machine'));
  };

  const handleDeletePost = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    addToast('פוסט נמחק');
  };

  const renderWeekView = () => {
    // Calculate start of week (Sunday in Hebrew calendar)
    const startOfWeek = new Date(viewDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Sunday as first day (Hebrew calendar)
    startOfWeek.setDate(diff);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayPosts = posts.filter(p => {
        const pDate = new Date(p.scheduledAt);
        return pDate.toDateString() === date.toDateString();
      });
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDay === date.getDate() && date.getMonth() === viewDate.getMonth() && date.getFullYear() === viewDate.getFullYear();
      
      const hebDate = showHebrewCalendar ? gregorianToHebrew(date) : null;
      const isShabbatDay = showHebrewCalendar ? isShabbat(date) : false;
      const holiday = showHebrewCalendar ? getHoliday(date) : null;
      const isHolidayDay = showHebrewCalendar ? isHoliday(date) : false;
      const isFastDayDate = showHebrewCalendar ? isFastDay(date) : false;
      const fastDayName = showHebrewCalendar ? getFastDay(date) : null;

      const dayBadgeLabel = holiday || (isShabbatDay ? 'שבת' : (isFastDayDate ? (fastDayName || 'צום') : null));
      const dayBadgeClass = holiday || isShabbatDay ? 'bg-purple-100 text-purple-700' : 'bg-rose-100 text-rose-700';
      
      weekDays.push(
        <div key={i} className="flex flex-col gap-2">
          <div className={`text-center text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest py-2 ${isToday ? 'text-blue-600' : ''}`}>
            {hebDays[i]}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedDay(date.getDate());
              setViewDate(new Date(date));
              setIsDetailOpen(true);
            }}
            className={`relative min-h-[120px] md:min-h-[200px] border border-slate-200 p-2 md:p-4 flex flex-col gap-2 transition-all rounded-lg md:rounded-2xl ${
              isSelected 
                ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                : isToday 
                  ? 'bg-blue-50 border-blue-200 text-blue-900' 
                  : isShabbatDay || isHolidayDay
                    ? 'bg-purple-50 border-purple-200'
                    : isFastDayDate
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`text-sm md:text-base font-black ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                {date.getDate()}
              </span>
              {showHebrewCalendar && hebDate && (
                <span className={`text-[10px] font-black ${isSelected ? 'text-white/70' : 'text-slate-300'}`}>
                  {hebDate.dayHebrew || hebDate.day}
                </span>
              )}
            </div>

            {showHebrewCalendar && dayBadgeLabel && (
              <span
                className={`absolute top-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-full max-w-[75%] truncate ${
                  isSelected ? 'bg-white/20 text-white' : dayBadgeClass
                }`}
              >
                {dayBadgeLabel}
              </span>
            )}
            <div className="flex flex-col gap-1 flex-1 w-full">
              {dayPosts.slice(0, 4).map((p, idx) => (
                <div key={idx} className={`w-full h-6 md:h-8 rounded-md flex items-center px-2 gap-1 overflow-hidden ${isSelected ? 'bg-white text-slate-900' : 'bg-blue-100'}`}>
                  <span className="text-[8px] md:text-[10px] font-black truncate">
                    {clients.find(c => c.id === p.clientId)?.companyName}
                  </span>
                </div>
              ))}
              {dayPosts.length > 4 && (
                <span className={`text-[8px] font-black ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                  +{dayPosts.length - 4} נוספים
                </span>
              )}
            </div>
          </motion.button>
        </div>
      );
    }
    
    return (
      <>
        <div className="grid grid-cols-7 mb-2">
          {hebDays.map((d, i) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const hebDate = showHebrewCalendar ? gregorianToHebrew(date) : null;
            return (
              <div key={d} className="text-center text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest py-2">
                {d}
                {showHebrewCalendar && hebDate && (
                  <div className="text-[8px] text-purple-400 mt-1">{hebDate.dayHebrew || hebDate.day}</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7 gap-2 md:gap-4">
          {weekDays}
        </div>
      </>
    );
  };

  const renderMonthGrid = () => {
    const grid = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      grid.push(<div key={`empty-${i}`} className="h-16 md:h-32 bg-slate-50/20 border border-transparent rounded-lg md:rounded-2xl opacity-10" />);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dayPosts = monthPosts.filter(p => new Date(p.scheduledAt).getDate() === d);
      const today = new Date();
      const isToday = d === today.getDate() && viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();
      const isSelected = d === selectedDay;

      const dayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
      const hebDate = showHebrewCalendar ? gregorianToHebrew(dayDate) : null;
      const isShabbatDay = showHebrewCalendar ? isShabbat(dayDate) : false;
      const holiday = showHebrewCalendar ? getHoliday(dayDate) : null;
      const isHolidayDay = showHebrewCalendar ? isHoliday(dayDate) : false;
      const isFastDayDate = showHebrewCalendar ? isFastDay(dayDate) : false;
      const fastDayName = showHebrewCalendar ? getFastDay(dayDate) : null;

      const dayBadgeLabel = holiday || (isShabbatDay ? 'שבת' : (isFastDayDate ? (fastDayName || 'צום') : null));
      const dayBadgeClass = holiday || isShabbatDay ? 'bg-purple-100 text-purple-700' : 'bg-rose-100 text-rose-700';
      
      grid.push(
        <motion.button
          key={d}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setSelectedDay(d);
            setIsDetailOpen(true);
          }}
          className={`h-16 md:h-32 border border-slate-200 p-1 md:p-3 flex flex-col items-center md:items-start gap-1 transition-all relative rounded-lg md:rounded-2xl group ${
            isSelected 
              ? 'bg-slate-900 border-slate-900 text-white shadow-lg z-10' 
              : isToday 
                ? 'bg-blue-50 border-blue-200 text-blue-900' 
                : isShabbatDay || isHolidayDay
                  ? 'bg-purple-50 border-purple-200'
                  : isFastDayDate
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-white border-slate-100'
          }`}
        >
          <div className="flex items-center gap-1 w-full">
            <span className={`text-[10px] md:text-sm font-black ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`}>{d}</span>
            {showHebrewCalendar && hebDate && (
              <span className={`text-[8px] md:text-[10px] font-black ${isSelected ? 'text-white/70' : 'text-slate-300'}`}>
                {hebDate.dayHebrew || hebDate.day}
              </span>
            )}
          </div>

          {showHebrewCalendar && dayBadgeLabel && (
            <span
              className={`absolute top-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-full max-w-[75%] truncate ${
                isSelected ? 'bg-white/20 text-white' : dayBadgeClass
              }`}
            >
              {dayBadgeLabel}
            </span>
          )}
          
          <div className="flex flex-wrap md:flex-col gap-0.5 md:gap-1 w-full mt-auto justify-center md:justify-start">
            {dayPosts.slice(0, 2).map((p, idx) => (
              <div key={idx} className={`w-1 h-1 md:w-full md:h-5 rounded-full md:rounded-md flex items-center px-0 md:px-2 gap-1 overflow-hidden truncate ${isSelected ? 'bg-white' : 'bg-blue-500 md:bg-slate-100'}`}>
                <span className="hidden md:block text-[8px] font-black truncate">{clients.find(c => c.id === p.clientId)?.companyName}</span>
              </div>
            ))}
          </div>
        </motion.button>
      );
    }
    return grid;
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 md:gap-10 pb-32">
      {/* Calendar Controller */}
      <section className="bg-white p-4 md:px-8 md:py-6 rounded-3xl md:rounded-[40px] shadow-lg border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
        <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={handlePrev} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
              <ChevronRight size={20}/>
            </button>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 min-w-[120px] md:min-w-[160px] text-center tracking-tighter">
              {viewMode === 'month' 
                ? viewDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
                : (() => {
                    const startOfWeek = new Date(viewDate);
                    const day = startOfWeek.getDay();
                    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
                    startOfWeek.setDate(diff);
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    return `${startOfWeek.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })} - ${endOfWeek.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
                  })()}
            </h2>
            <button onClick={handleNext} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
              <ChevronLeft size={20}/>
            </button>
          </div>
          
          <div className="hidden lg:flex gap-2">
            <button
              type="button"
              onClick={() => setShowHebrewCalendar((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 font-black text-xs rounded-xl border transition-all ${
                showHebrewCalendar
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  showHebrewCalendar ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-300 text-transparent'
                }`}
              >
                <Check size={14} />
              </span>
              לוח עברי
            </button>
            <button 
              onClick={handleBackToToday} 
              className="px-4 py-2 bg-slate-50 text-blue-600 font-black text-xs rounded-xl border border-blue-50 transition-all hover:bg-blue-50"
            >
              היום
            </button>
            <button 
              onClick={handleGoogleSync}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={isSyncing ? 'opacity-60' : undefined} />
              {isSyncing ? 'מסנכרן...' : 'סנכרן'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner flex-1 md:flex-initial">
            <button 
              onClick={() => setViewMode('month')} 
              className={`flex-1 md:px-6 py-2 rounded-lg text-xs font-black transition-all ${
                viewMode === 'month' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'
              }`}
            >
              חודשי
            </button>
            <button 
              onClick={() => setViewMode('week')} 
              className={`flex-1 md:px-6 py-2 rounded-lg text-xs font-black transition-all ${
                viewMode === 'week' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'
              }`}
            >
              שבועי
            </button>
          </div>
          
          <button 
            onClick={() => handleNewPost(selectedDay || new Date().getDate())} 
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm shadow-xl flex items-center gap-2 whitespace-nowrap active:scale-95 transition-all"
          >
            <Plus size={18} /> פוסט חדש
          </button>
        </div>

        <div className="flex lg:hidden gap-2 w-full">
          <button
            type="button"
            onClick={() => setShowHebrewCalendar((v) => !v)}
            className={`flex-1 py-3 font-black text-xs rounded-xl border transition-all flex items-center justify-center gap-2 ${
              showHebrewCalendar
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                showHebrewCalendar ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-300 text-transparent'
              }`}
            >
              <Check size={14} />
            </span>
            לוח עברי
          </button>
          <button onClick={handleBackToToday} className="flex-1 py-3 bg-slate-50 text-blue-600 font-black text-xs rounded-xl border border-blue-50">
            חזרה להיום
          </button>
          <button 
            onClick={handleGoogleSync} 
            disabled={isSyncing}
            className="flex-1 py-3 bg-blue-50 text-blue-600 font-black text-xs rounded-xl border border-blue-100 flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} className={isSyncing ? 'opacity-60' : undefined} /> {isSyncing ? 'מסנכרן...' : 'סנכרן אירועים'}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-start">
        <div className="lg:col-span-7 w-full">
          <div className="bg-white p-3 md:p-6 rounded-3xl md:rounded-[48px] border border-slate-100 shadow-sm relative overflow-hidden">
            {viewMode === 'month' ? (
              <>
                <div className="grid grid-cols-7 mb-2">
                  {hebDays.map(d => (
                    <div key={d} className="text-center text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest py-2">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 md:gap-4">
                  {renderMonthGrid()}
                </div>
              </>
            ) : (
              renderWeekView()
            )}
          </div>
        </div>

        <AnimatePresence>
          {isDetailOpen && selectedDay && (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed md:relative inset-x-0 bottom-0 md:inset-auto z-[200] md:z-10 lg:col-span-5 h-[80vh] md:h-auto overflow-y-auto"
            >
              <div className="bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+96px)] md:p-12 md:pb-12 rounded-t-[40px] md:rounded-[48px] border-t md:border-2 border-slate-200 shadow-2xl flex flex-col gap-6 md:gap-8 h-full md:h-auto">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="text-2xl md:text-5xl font-black text-slate-900">
                      {selectedDay} ב{viewDate.toLocaleDateString('he-IL', { month: 'long' })}
                    </h3>
                    {showHebrewCalendar && selectedDay && (() => {
                      const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDay);
                      const hebDate = gregorianToHebrew(selectedDate);
                      const holiday = getHoliday(selectedDate);
                      const fastDay = getFastDay(selectedDate);
                      return (
                        <div className="flex flex-col gap-1 mt-2">
                          <p className="text-sm md:text-base font-black text-purple-600">
                            {getHebrewDateString(selectedDate)}
                            {holiday && ` • ${holiday}`}
                            {fastDay && !holiday && ` • ${fastDay}`}
                            {isShabbat(selectedDate) && !holiday && !fastDay && ' • שבת'}
                          </p>
                          <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">
                            לוח שידורים יומי • {postsForDay.length} פרסומים
                          </p>
                        </div>
                      );
                    })()}
                    {!showHebrewCalendar && (
                      <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
                        לוח שידורים יומי • {postsForDay.length} פרסומים
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => setIsDetailOpen(false)} 
                    className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 text-slate-400 rounded-xl md:rounded-2xl flex items-center justify-center transition-all"
                  >
                    <X size={20}/>
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {postsForDay.length > 0 ? postsForDay.map(post => {
                    const client = clients.find(c => c.id === post.clientId);
                    return (
                      <div key={post.id} className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-100 flex flex-col gap-4 group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={String(client?.avatar || '')}
                              name={String(client?.companyName || client?.name || '')}
                              alt={String(client?.companyName || '')}
                              size="lg"
                              rounded="lg"
                              className="w-8 h-8 md:w-10 md:h-10 shadow-sm"
                            />
                            <div className="min-w-0">
                              <p className="font-black text-sm md:text-base text-slate-800 truncate max-w-[120px]">
                                {client?.companyName}
                              </p>
                              <p className="text-[9px] md:text-[10px] font-black text-slate-400 mt-1 flex items-center gap-1">
                                <Clock size={10}/> {new Date(post.scheduledAt).getHours()}:00
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-4 items-start">
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-200">
                            {post.mediaUrl && <img src={post.mediaUrl} className="w-full h-full object-cover" alt="Post media" />}
                          </div>
                          <p className="text-xs md:text-sm font-bold text-slate-600 line-clamp-3 italic">
                            "{post.content}"
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                          <span className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase ${
                            post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {post.status === 'published' ? 'שודר' : 'מתוזמן'}
                          </span>
                          <div className="flex gap-1 md:gap-2">
                            <button 
                              onClick={() => handleEditPost(post)} 
                              className="w-8 h-8 md:w-10 md:h-10 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 rounded-lg md:rounded-xl flex items-center justify-center"
                            >
                              <Edit3 size={14}/>
                            </button>
                            <button 
                              onClick={() => handleDeletePost(post.id)} 
                              className="w-8 h-8 md:w-10 md:h-10 bg-white border border-slate-100 text-slate-400 hover:text-red-500 rounded-lg md:rounded-xl flex items-center justify-center"
                            >
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-12 md:py-20 flex flex-col items-center text-center gap-4">
                      <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 text-slate-200 rounded-3xl md:rounded-[40px] flex items-center justify-center">
                        <CalendarDays size={32}/>
                      </div>
                      <p className="text-sm font-bold text-slate-300 px-4">
                        אין שידורים מתוזמנים ליום זה. זה הזמן להוסיף פוסט!
                      </p>
                      <button 
                        onClick={() => handleNewPost(selectedDay)} 
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm"
                      >
                        צור פוסט ראשון ליום זה
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

