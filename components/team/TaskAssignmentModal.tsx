
import React from 'react';
import { motion } from 'framer-motion';
import { X, Plus, ArrowLeft } from 'lucide-react';
import { Task } from '../../types';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

interface TaskAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    unassignedTasks: Task[];
    onAssignNew: () => void;
    onAssignExisting: (taskId: string) => void;
}

export const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({
    isOpen, onClose, userName, unassignedTasks, onAssignNew, onAssignExisting
}) => {
    useBackButtonClose(isOpen, onClose);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
            >
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg">הקצאת משימה ל{userName}</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
                </div>
                
                <div className="p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                    <button 
                        onClick={onAssignNew}
                        className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                        <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform"><Plus size={20} /></div>
                        <div className="text-right">
                            <span className="block font-bold">צור משימה חדשה</span>
                            <span className="text-xs">הקם כרטיס חדש מאפס</span>
                        </div>
                    </button>

                    {unassignedTasks.length > 0 && (
                        <div className="mt-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">או בחר מהמשימות הפתוחות שלך</p>
                            <div className="space-y-2">
                                {unassignedTasks.map(task => (
                                    <div 
                                        key={task.id}
                                        onClick={() => onAssignExisting(task.id)}
                                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-black cursor-pointer transition-all shadow-sm group"
                                    >
                                        <span className="text-sm font-medium text-gray-800">{task.title}</span>
                                        <ArrowLeft size={16} className="text-gray-300 group-hover:text-black opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {unassignedTasks.length === 0 && (
                        <div className="p-4 text-center text-gray-400 text-xs">
                            אין משימות פתוחות שלך שטרם הוקצו.
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
