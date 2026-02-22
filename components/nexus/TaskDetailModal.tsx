'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Task } from '../../types';
import { useData } from '../../context/DataContext';
import { X, Check, Lock, Layout, StickyNote, Trash2, Clock, Paperclip, TriangleAlert, Zap, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { generateTaskShareLink } from '@/app/actions/guest';
import { motion, AnimatePresence } from 'framer-motion';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { TaskDetailChat } from './TaskDetailChat';
import { TaskDetailProperties } from './TaskDetailProperties';
import { TaskDetailPopovers } from './TaskDetailPopovers';
import { CustomDatePicker } from '../CustomDatePicker';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
  useBackButtonClose(true, onClose);
  const { currentUser, updateTask, deleteTask, snoozeTask, clients } = useData();
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details'); 
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Popover State
  const [activePopover, setActivePopover] = useState<'none' | 'assignee' | 'priority' | 'estimate'>('none');
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left?: number; right?: number; width?: number } | null>(null);
  
  // Snooze State - NEW FULL MODAL
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState('');
  const [snoozeReason, setSnoozeReason] = useState('');

  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // CRM Integration Check
  const linkedClient = task.clientId 
      ? clients.find((c: { id: string; companyName: string }) => c.id === task.clientId) 
      : clients.find((c: { id: string; companyName: string }) => task.tags.some(t => t.toLowerCase() === c.companyName.toLowerCase()));

  // Scroll to top on mobile when modal opens
  useEffect(() => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (isMobile) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  }, []);

  // Flash "Saved" when task updates
  useEffect(() => {
      setIsSaving(true);
      const timer = setTimeout(() => setIsSaving(false), 1000);
      return () => clearTimeout(timer);
  }, [task]);

  // Handle click outside for popovers
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          if (target.closest('.property-popover') || target.closest('.property-trigger')) return;
          
          if (activePopover !== 'none') setActivePopover('none');
      };

      const handleScroll = (event: Event) => {
          const target = event.target as HTMLElement;
          if (target.closest('.property-popover')) return;
          setActivePopover('none');
      };

      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', () => setActivePopover('none'));
      window.addEventListener('scroll', handleScroll, true);

      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
          window.removeEventListener('resize', () => setActivePopover('none'));
          window.removeEventListener('scroll', handleScroll, true);
      };
  }, [activePopover]);

  const handleOpenPopover = (type: typeof activePopover, rect: DOMRect) => {
      if (activePopover === type) {
          setActivePopover('none');
          return;
      }
      
      const coords: unknown = {
          top: rect.bottom + 5,
          width: Math.max(rect.width, 180)
      };

      // Handle RTL alignment properly or time popover special alignment
      const typedCoords = coords as { top: number; left?: number; right?: number; width?: number };
      if (type === 'estimate') {
          typedCoords.left = rect.left;
          typedCoords.top = rect.bottom + 8;
      } else {
          typedCoords.right = window.innerWidth - rect.right;
      }

      setPopoverCoords(typedCoords);
      setActivePopover(type);
  };

  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const routeParams = useParams();
  const orgSlug = typeof routeParams?.orgSlug === 'string' ? routeParams.orgSlug : '';

  const handleShare = useCallback(async () => {
    if (isGeneratingShare) return;
    setIsGeneratingShare(true);
    try {
      if (orgSlug) {
        const result = await generateTaskShareLink({ orgSlug, taskId: task.id });
        const url = `${window.location.origin}${result.shareUrl}`;
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback: use task ID directly
        const url = `${window.location.origin}/guest/${task.id}`;
        await navigator.clipboard.writeText(url);
      }
      setShowShareTooltip(true);
      setTimeout(() => setShowShareTooltip(false), 2000);
    } catch {
      // Fallback on error
      const url = `${window.location.origin}/guest/${task.id}`;
      await navigator.clipboard.writeText(url);
      setShowShareTooltip(true);
      setTimeout(() => setShowShareTooltip(false), 2000);
    } finally {
      setIsGeneratingShare(false);
    }
  }, [isGeneratingShare, orgSlug, task.id]);

  const openSnoozeModal = () => {
      setSnoozeDate('');
      setSnoozeReason('');
      setIsSnoozeModalOpen(true);
  }

  const confirmSnooze = () => {
      if (!snoozeDate) {
          alert("נא לבחור תאריך יעד חדש");
          return;
      }

      // Convert standard date string YYYY-MM-DD to display format if needed, 
      // but snoozeTask expects a string. Let's keep it consistent.
      // The CustomDatePicker returns YYYY-MM-DD. 
      // The system usually displays DD.MM. Let's format it.
      const dateObj = new Date(snoozeDate);
      const formattedDate = dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });

      const currentSnoozes = task.snoozeCount || 0;
      if (currentSnoozes >= 2 && !snoozeReason.trim()) {
          alert("חובה להזין סיבת דחייה מכיוון שהמשימה נדחתה כבר פעמיים.");
          return;
      }

      snoozeTask(task.id, formattedDate, snoozeReason || 'ללא סיבה');
      setIsSnoozeModalOpen(false);
  };

  const quickSnooze = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      const formattedDate = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
      snoozeTask(task.id, formattedDate, 'דחייה מהירה');
      setIsSnoozeModalOpen(false);
  }

  const isSafeDelete = (task.creatorId === currentUser.id) || (task.creatorId === 'system' && !['High', 'Urgent'].includes(task.priority));
  
  const handleConfirmDelete = () => {
      deleteTask(task.id);
      setShowDeleteModal(false);
      onClose();
  };

  const RenderLabel = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
      {icon} {label}
    </div>
  );

  return (
    <div>
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="מחיקת משימה"
        description={
          isSafeDelete
            ? 'המשימה תועבר לסל המיחזור.'
            : 'זוהי משימה בעדיפות גבוהה או שלא נוצרה על ידך. מחיקתה תתועד.'
        }
        itemName={task.title}
        isHardDelete={false}
      />

      {/* NEW SNOOZE MODAL */}
      <AnimatePresence>
        {isSnoozeModalOpen && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSnoozeModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative overflow-visible"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Clock size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">דחיית ביצוע</h3>
                <p className="text-xs text-gray-500 mt-1">מתי תרצה לחזור למשימה הזו?</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => quickSnooze(1)}
                    className="p-3 border border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all text-sm font-bold text-gray-600"
                  >
                    מחר
                  </button>
                  <button
                    onClick={() => quickSnooze(3)}
                    className="p-3 border border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all text-sm font-bold text-gray-600"
                  >
                    בעוד 3 ימים
                  </button>
                  <button
                    onClick={() => quickSnooze(7)}
                    className="p-3 border border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all text-sm font-bold text-gray-600"
                  >
                    שבוע הבא
                  </button>
                  <button
                    onClick={() => quickSnooze(30)}
                    className="p-3 border border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all text-sm font-bold text-gray-600"
                  >
                    חודש הבא
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400 font-bold">או בחר תאריך</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                    תאריך יעד חדש
                  </label>
                  <CustomDatePicker
                    value={snoozeDate}
                    onChange={setSnoozeDate}
                    placeholder="בחר תאריך..."
                    className="w-full"
                    showHebrewDate={true}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                    סיבת הדחייה (אופציונלי)
                  </label>
                  <textarea
                    value={snoozeReason}
                    onChange={(e) => setSnoozeReason(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition-colors resize-none h-20"
                    placeholder="למה זה נדחה? (עומס, מחכה ללקוח...)"
                  />
                </div>

                <button
                  onClick={confirmSnooze}
                  className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  עדכן תאריך <CalendarIcon size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TaskDetailPopovers
        task={task}
        activePopover={activePopover}
        popoverCoords={popoverCoords}
        onClose={() => setActivePopover('none')}
      />

      <div
        className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-0 md:p-6 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full h-full md:h-[85vh] md:max-w-6xl bg-white md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/20"
        >
          {/* Mobile Header */}
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-20">
            <div className="flex items-center gap-3 overflow-hidden w-full">
              <button onClick={onClose} className="bg-gray-50 text-gray-600 p-2 rounded-full shrink-0">
                <X size={20} />
              </button>
              <span className="font-bold text-gray-900 truncate w-full">{task.title}</span>
            </div>
          </div>
          <div className="md:hidden flex bg-white border-b border-gray-100 px-2 pt-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 pb-3 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'chat' ? 'border-black text-black' : 'border-transparent text-gray-400'
              }`}
            >
              הערות ועדכונים
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 pb-3 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'details' ? 'border-black text-black' : 'border-transparent text-gray-400'
              }`}
            >
              פרטים ראשיים
            </button>
          </div>

          {/* CHAT SECTION (Left) */}
          <TaskDetailChat task={task} activeTab={activeTab} />

          {/* DETAILS SECTION (Right) */}
          <div
            className={`w-full md:w-[65%] flex flex-col bg-white overflow-y-auto custom-scrollbar ${
              activeTab === 'details' ? 'flex-1 h-full min-h-0' : 'hidden md:flex h-full'
            }`}
          >
            <div className="hidden md:flex items-center justify-between p-6 pb-2 bg-white sticky top-0 z-20">
              <div className="flex items-center gap-2 text-gray-400 font-mono text-xs">
                <Layout size={14} />
                <span>{task.id}</span>
                <AnimatePresence>
                  {isSaving && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-green-600 font-bold ml-2"
                    >
                      <Check size={12} /> נשמר
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2">
                {linkedClient && (
                  <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[10px] font-bold border border-emerald-100 flex items-center gap-1.5">
                    <Zap size={12} /> {linkedClient.companyName}
                  </div>
                )}
                {task.isPrivate && <Lock size={14} className="text-gray-400" />}

                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-black hover:bg-gray-100 p-2 rounded-full transition-colors ml-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              <div>
                <textarea
                  value={task.title}
                  onChange={(e) => updateTask(task.id, { title: e.target.value })}
                  className="text-3xl font-black text-gray-900 leading-tight w-full bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-gray-300"
                  placeholder="שם המשימה..."
                  rows={2}
                />
              </div>

              <TaskDetailProperties
                task={task}
                onOpenPopover={handleOpenPopover}
                activePopover={activePopover}
              />

              {/* Snooze Alert Banner */}
              {(task.snoozeCount || 0) > 0 && (
                <div
                  className={`text-xs px-3 py-2 rounded-lg font-bold flex items-center gap-2 border ${
                    (task.snoozeCount || 0) >= 3
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-orange-50 text-orange-600 border-orange-200'
                  }`}
                >
                  <Clock size={14} />
                  נדחה {task.snoozeCount} פעמים
                  {(task.snoozeCount || 0) >= 3 && (
                    <span className="mr-auto flex items-center gap-1">
                      <TriangleAlert size={12} /> בטיפול מנהל
                    </span>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <RenderLabel icon={<StickyNote size={12} />} label="תיאור ופרטים" />
                <textarea
                  className="w-full min-h-[140px] md:min-h-[200px] p-4 text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-all leading-relaxed hover:bg-gray-100/50"
                  placeholder="תיאור המשימה, פרטים נוספים והערות..."
                  defaultValue={task.description}
                  onBlur={(e) => updateTask(task.id, { description: e.target.value })}
                />
              </div>

              {/* Footer Actions */}
              <div className="mt-auto space-y-3 pb-6 md:pb-0">
                <div className="flex gap-2 relative snooze-container">
                  <div className="relative flex-1">
                    <button
                      onClick={openSnoozeModal}
                      className="w-full flex items-center justify-center gap-2 text-orange-600 bg-orange-50 hover:bg-orange-100 py-3 rounded-xl transition-colors text-xs font-bold border border-orange-100"
                    >
                      <Clock size={16} /> דחה ביצוע
                    </button>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-red-500 bg-red-50 hover:bg-red-100 py-3 rounded-xl transition-colors text-xs font-bold border border-red-100"
                  >
                    <Trash2 size={16} /> מחק
                  </button>
                  {!task.isPrivate && (
                    <button
                      onClick={handleShare}
                      disabled={isGeneratingShare}
                      className="flex-1 flex items-center justify-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 py-3 rounded-xl transition-colors text-xs font-bold relative border border-blue-100 disabled:opacity-60"
                    >
                      {showShareTooltip ? (
                        'הלינק הועתק!'
                      ) : isGeneratingShare ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <span className="flex items-center gap-2">
                          <div className="rotate-45">
                            <Paperclip size={16} />
                          </div>
                          שיתוף
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
