'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import type { Task, WorkflowStage } from '@/types';

interface TasksStatusSheetProps {
    isOpen: boolean;
    taskForStatusSheet: Task | null;
    orderedStages: WorkflowStage[];
    onClose: () => void;
    onStatusUpdate: (taskId: string, newStatus: string) => Promise<void>;
}

export const TasksStatusSheet: React.FC<TasksStatusSheetProps> = ({
    isOpen,
    taskForStatusSheet,
    orderedStages,
    onClose,
    onStatusUpdate,
}) => {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                        style={{ zIndex: 1000 }}
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: 24, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 24, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                        className="fixed left-0 right-0 bottom-0 bg-white rounded-t-3xl border border-gray-200 shadow-2xl overflow-hidden"
                        style={{ zIndex: 1001 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
                            <div className="text-right">
                                <div className="text-xs font-black text-gray-900">שינוי שלב</div>
                                <div className="text-[11px] text-gray-500 font-medium truncate max-w-[260px]">{taskForStatusSheet?.title || ''}</div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                                aria-label="סגור"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-2">
                            {orderedStages.map((stage: WorkflowStage) => {
                                const selected = taskForStatusSheet?.status === stage.id;
                                return (
                                    <button
                                        key={stage.id}
                                        type="button"
                                        onClick={async () => {
                                            if (!taskForStatusSheet?.id) return;
                                            await onStatusUpdate(taskForStatusSheet.id, stage.id);
                                            onClose();
                                        }}
                                        className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-2xl transition-colors ${selected ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'}`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${String(stage.color || '').includes('bg-') ? String(stage.color).split(' ')[0] : 'bg-gray-300'}`} />
                                            <span className="text-sm font-bold truncate">{stage.name}</span>
                                        </div>
                                        {selected ? <Check size={16} className="shrink-0" /> : null}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
