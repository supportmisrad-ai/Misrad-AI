
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock, Calendar, User } from 'lucide-react';
import { User as UserType, TimeEntry } from '../../types';
import { CustomSelect } from '../CustomSelect';
import { CustomDatePicker } from '../CustomDatePicker';
import { CustomTimePicker } from '../CustomTimePicker';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

interface TimeEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    entryToEdit?: TimeEntry | null;
    onSave: (entry: Partial<TimeEntry>) => void;
    users: UserType[];
    currentUserId: string;
    isManager: boolean;
}

export const TimeEntryModal: React.FC<TimeEntryModalProps> = ({ 
    isOpen, onClose, entryToEdit, onSave, users, currentUserId, isManager 
}) => {
    useBackButtonClose(isOpen, onClose);
    const [userId, setUserId] = useState(currentUserId);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');

    useEffect(() => {
        if (isOpen) {
            if (entryToEdit) {
                setUserId(entryToEdit.userId);
                setDate(entryToEdit.date);
                setStartTime(new Date(entryToEdit.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }));
                setEndTime(entryToEdit.endTime ? new Date(entryToEdit.endTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '');
            } else {
                // Defaults for new entry
                setUserId(currentUserId);
                setDate(new Date().toISOString().split('T')[0]);
                setStartTime('09:00');
                setEndTime('17:00');
            }
        }
    }, [isOpen, entryToEdit, currentUserId]);

    const handleSubmit = () => {
        // Construct full ISO strings
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = endTime ? new Date(`${date}T${endTime}`) : undefined;

        if (endDateTime && endDateTime < startDateTime) {
            alert("שעת הסיום חייבת להיות אחרי שעת ההתחלה");
            return;
        }

        const entryData: Partial<TimeEntry> = {
            userId,
            date,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime?.toISOString()
        };

        if (entryToEdit) {
            entryData.id = entryToEdit.id;
        } else {
            entryData.id = `TE-${Date.now()}`;
        }

        onSave(entryData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-lg text-gray-900">
                        {entryToEdit ? 'עריכת דיווח שעות' : 'דיווח שעות ידני'}
                    </h3>
                    <button onClick={onClose} className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-all" aria-label="סגור חלון">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* User Selection (Manager Only) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">עובד</label>
                        {isManager ? (
                            <CustomSelect 
                                value={userId}
                                onChange={setUserId}
                                options={users.map(u => ({ value: u.id, label: u.name, icon: <User size={14} /> }))}
                                icon={<User size={16} />}
                            />
                        ) : (
                            <div className="p-3 bg-gray-100 rounded-xl text-sm font-bold text-gray-600 flex items-center gap-2 cursor-not-allowed">
                                <User size={16} />
                                {users.find(u => u.id === userId)?.name || 'אני'}
                            </div>
                        )}
                    </div>

                    {/* Date Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">תאריך</label>
                        <CustomDatePicker 
                            value={date}
                            onChange={setDate}
                            placeholder="תאריך"
                            className="w-full"
                            showHebrewDate={true}
                        />
                    </div>

                    {/* Time Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">כניסה</label>
                            <CustomTimePicker 
                                value={startTime}
                                onChange={setStartTime}
                                placeholder="09:00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">יציאה</label>
                            <CustomTimePicker 
                                value={endTime}
                                onChange={setEndTime}
                                placeholder="--:--"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-2 pb-6">
                    <button 
                        onClick={handleSubmit}
                        className="w-full py-3.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        <Check size={18} /> {entryToEdit ? 'שמור שינויים' : 'הוסף דיווח'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
