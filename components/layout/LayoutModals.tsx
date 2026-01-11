'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ExternalLink, X, RotateCcw } from 'lucide-react';
import { Task, Notification } from '../../types';
import { MorningBriefing } from '../nexus/MorningBriefing';
import { VoiceRecorder } from '../VoiceRecorder';
import { CreateTaskModal } from '../nexus/CreateTaskModal';
import { TaskCompletionModal } from '../TaskCompletionModal';
import { SupportModal } from '../SupportModal';
import { TaskDetailModal } from '../nexus/TaskDetailModal';

interface LayoutModalsProps {
  showMorningBrief: boolean;
  isVoiceRecorderOpen: boolean;
  setIsVoiceRecorderOpen: (open: boolean) => void;
  isCreateTaskOpen: boolean;
  closeCreateTask: () => void;
  taskToComplete: any;
  isSupportModalOpen: boolean;
  currentOpenedTask: Task | null;
  openedTaskId: string | null;
  tasks: Task[];
  closeTask: () => void;
  incomingCall: {
    callerName: string;
    company?: string;
    isClient?: boolean;
  } | null;
  dismissCall: () => void;
  navigate: (path: string) => void;
  lastDeletedTask: Task | null;
  undoDelete: () => void;
}

export const LayoutModals: React.FC<LayoutModalsProps> = ({
  showMorningBrief,
  isVoiceRecorderOpen,
  setIsVoiceRecorderOpen,
  isCreateTaskOpen,
  closeCreateTask,
  taskToComplete,
  isSupportModalOpen,
  currentOpenedTask,
  openedTaskId,
  tasks,
  closeTask,
  incomingCall,
  dismissCall,
  navigate,
  lastDeletedTask,
  undoDelete,
}) => {
  return (
    <>
      <AnimatePresence>{showMorningBrief && <MorningBriefing />}</AnimatePresence>
      <AnimatePresence>{isVoiceRecorderOpen && <VoiceRecorder onClose={() => setIsVoiceRecorderOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{isCreateTaskOpen && <CreateTaskModal onClose={closeCreateTask} />}</AnimatePresence>
      <AnimatePresence>{taskToComplete && <TaskCompletionModal />}</AnimatePresence>
      <AnimatePresence>{isSupportModalOpen && <SupportModal />}</AnimatePresence>
      
      <AnimatePresence>
        {(() => {
          if (currentOpenedTask) {
            return <TaskDetailModal task={currentOpenedTask} onClose={closeTask} />;
          }
          if (openedTaskId && !currentOpenedTask) {
            console.warn('[Layout] openedTaskId is set but task not found:', openedTaskId, 'Available tasks:', tasks.length);
          }
          return null;
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[100] bg-gray-900/90 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl w-[90vw] max-w-sm flex items-center gap-4 border border-white/10"
          >
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-green-500/30">
              <Phone size={24} fill="currentColor" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-0.5">שיחה נכנסת...</p>
              <h3 className="text-lg font-bold leading-tight">{incomingCall.callerName}</h3>
              {incomingCall.isClient && <p className="text-xs text-gray-400">{incomingCall.company} • לקוח קיים</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { dismissCall(); navigate('/clients'); }} className="bg-white text-black p-2 rounded-full hover:bg-gray-200 transition-colors"><ExternalLink size={20} /></button>
              <button onClick={dismissCall} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"><X size={20} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lastDeletedTask && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-28 left-4 right-4 md:top-28 md:left-auto md:right-8 md:w-96 z-[100] bg-gray-900/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-white/10"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">הועבר לארכיון</span>
              <span className="text-sm font-bold truncate">{lastDeletedTask.title}</span>
            </div>
            <button onClick={undoDelete} className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm">
              <RotateCcw size={14} /> בטל
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

