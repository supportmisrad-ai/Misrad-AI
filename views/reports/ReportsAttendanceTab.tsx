// Reports Attendance Tab Component
// Extracted from ReportsView.tsx for better performance and maintainability

'use client';

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, History, Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import { Avatar } from '../../components/Avatar';
import type { User, TimeEntry } from '../../types';

interface ReportsAttendanceTabProps {
    visibleUsers: User[];
    users: User[];
    timeEntries: TimeEntry[];
    dateRange: { start: string; end: string };
    isTeamManager: boolean;
    onAddEntry: () => void;
    onEditEntry: (entry: TimeEntry) => void;
    onDeleteEntry: (id: string, date: string, startTime: string) => void;
}

export const ReportsAttendanceTab: React.FC<ReportsAttendanceTabProps> = ({
    visibleUsers,
    users,
    timeEntries,
    dateRange,
    isTeamManager,
    onAddEntry,
    onEditEntry,
    onDeleteEntry,
}) => {
    // Memoized filtered and sorted time entries
    const filteredTimeEntries = useMemo(() => {
        return timeEntries.filter(t => {
            if (!visibleUsers.some(u => u.id === t.userId)) return false;
            if (!t.endTime) return true;
            const entryDate = t.date;
            return entryDate >= dateRange.start && entryDate <= dateRange.end;
        }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }, [timeEntries, visibleUsers, dateRange]);

    // Memoized active employees count
    const activeEmployeesCount = useMemo(() => {
        return timeEntries.filter(t => !t.endTime && visibleUsers.some(u => u.id === t.userId)).length;
    }, [timeEntries, visibleUsers]);

    // Memoized total hours calculation
    const totalHoursInRange = useMemo(() => {
        return filteredTimeEntries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0) / 60;
    }, [filteredTimeEntries]);

    // Format helpers
    const formatTime = useCallback((isoString: string) => {
        return new Date(isoString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    }, []);

    const formatDate = useCallback((isoString: string) => {
        return new Date(isoString).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
    }, []);

    const getMapUrl = useCallback((lat?: number, lng?: number) => {
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
    }, []);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">עובדים פעילים כרגע</p>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900">{activeEmployeesCount} <span className="text-xs md:text-sm text-gray-600 font-medium">/ {users.length}</span></h2>
                        <p className="text-[9px] md:text-[10px] text-green-600 font-bold mt-1">Live Status</p>
                    </div>
                    <div className="p-3 md:p-4 bg-green-50 text-green-600 rounded-2xl animate-pulse">
                        <Clock size={24} className="md:w-8 md:h-8" />
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">סה״כ שעות (בטווח)</p>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                            {totalHoursInRange.toFixed(1)}h
                        </h2>
                        <p className="text-[9px] md:text-[10px] text-gray-600 mt-1">שעות נוכחות מדווחות</p>
                    </div>
                    <div className="p-3 md:p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <History size={24} className="md:w-8 md:h-8" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                        <History size={18} className="md:w-5 md:h-5 text-gray-500" />
                        <h2 className="font-bold text-gray-900 text-base md:text-lg">רישום כניסות ויציאות</h2>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {isTeamManager && (
                            <button 
                                onClick={onAddEntry}
                                className="bg-black text-white px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg flex-1 sm:flex-none"
                            >
                                <Plus size={12} className="md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">הוסף דיווח ידני</span><span className="sm:hidden">הוסף</span>
                            </button>
                        )}
                        <span className="text-xs font-bold text-gray-500 bg-white px-2 md:px-3 py-1 rounded-full border border-gray-200 shadow-sm shrink-0">
                            {filteredTimeEntries.length} רשומות
                        </span>
                    </div>
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto -mx-2 md:mx-0">
                    <table className="w-full text-sm text-right min-w-[700px]">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-3 md:px-6 py-3 md:py-4 rounded-tr-3xl">שם העובד</th>
                                <th className="px-3 md:px-6 py-3 md:py-4">תאריך</th>
                                <th className="px-3 md:px-6 py-3 md:py-4">כניסה</th>
                                <th className="px-3 md:px-6 py-3 md:py-4">מיקום כניסה</th>
                                <th className="px-3 md:px-6 py-3 md:py-4">יציאה</th>
                                <th className="px-3 md:px-6 py-3 md:py-4">מיקום יציאה</th>
                                <th className="px-3 md:px-6 py-3 md:py-4">משך</th>
                                <th className="px-3 md:px-6 py-3 md:py-4">סטטוס</th>
                                {isTeamManager && <th className="px-3 md:px-6 py-3 md:py-4 text-left rounded-tl-3xl">פעולות</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTimeEntries.length > 0 ? filteredTimeEntries.map((entry) => {
                                const user = users.find(u => u.id === entry.userId);
                                const startMapUrl = getMapUrl(entry.startLat, entry.startLng);
                                const endMapUrl = getMapUrl(entry.endLat, entry.endLng);
                                return (
                                    <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-3 md:px-6 py-3 md:py-4">
                                            <div className="flex items-center gap-2 md:gap-3 font-bold text-gray-900">
                                                <Avatar src={user?.avatar} name={user?.name} size="sm" className="border border-gray-100 shrink-0" />
                                                <span className="text-sm md:text-base truncate">{user?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 text-gray-600 font-medium text-xs md:text-sm">
                                            {formatDate(entry.date)}
                                        </td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 font-mono text-gray-600 text-xs md:text-sm">{formatTime(entry.startTime)}</td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm">
                                            {entry?.startCity ? (
                                                <span className="inline-flex items-center gap-1 text-gray-700 font-bold">
                                                    <MapPin size={14} className="text-blue-500" /> {entry.startCity}
                                                </span>
                                            ) : startMapUrl ? (
                                                <a href={startMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold">
                                                    <MapPin size={14} /> הצג במפה
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 font-mono text-gray-600 text-xs md:text-sm">{entry.endTime ? formatTime(entry.endTime) : '-'}</td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm">
                                            {entry?.endCity ? (
                                                <span className="inline-flex items-center gap-1 text-gray-700 font-bold">
                                                    <MapPin size={14} className="text-blue-500" /> {entry.endCity}
                                                </span>
                                            ) : endMapUrl ? (
                                                <a href={endMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold">
                                                    <MapPin size={14} /> הצג במפה
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 font-bold text-gray-800 text-xs md:text-sm">
                                            {entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}:${(entry.durationMinutes % 60).toString().padStart(2, '0')}` : '-'}
                                        </td>
                                        <td className="px-3 md:px-6 py-3 md:py-4">
                                            {entry.endTime ? (
                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-bold border border-gray-200">הושלם</span>
                                            ) : (
                                                <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-full font-bold animate-pulse border border-green-100">פעיל</span>
                                            )}
                                        </td>
                                        {isTeamManager && (
                                            <td className="px-3 md:px-6 py-3 md:py-4 text-left">
                                                <div className="flex items-center gap-1 opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => onEditEntry(entry)}
                                                        className="p-1.5 md:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                        title="ערוך דיווח"
                                                        aria-label="ערוך דיווח"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => onDeleteEntry(entry.id, entry.date, entry.startTime)}
                                                        className="p-1.5 md:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        title="בטל דיווח"
                                                        aria-label="בטל דיווח"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={isTeamManager ? 9 : 8} className="p-8 md:p-16 text-center text-gray-600">
                                        <History size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="text-gray-700 text-sm md:text-base">אין רישומים בטווח התאריכים הנבחר.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-3">
                    {filteredTimeEntries.length > 0 ? filteredTimeEntries.map((entry) => {
                        const user = users.find(u => u.id === entry.userId);
                        const startMapUrl = getMapUrl(entry.startLat, entry.startLng);
                        const endMapUrl = getMapUrl(entry.endLat, entry.endLng);
                        return (
                            <div key={entry.id} className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <Avatar src={user?.avatar} name={user?.name} size="lg" className="border border-gray-100 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-gray-900 text-base truncate">{user?.name}</div>
                                        <div className="text-xs text-gray-500">{formatDate(entry.date)}</div>
                                    </div>
                                    {entry.endTime ? (
                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-bold border border-gray-200 shrink-0">הושלם</span>
                                    ) : (
                                        <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-full font-bold animate-pulse border border-green-100 shrink-0">פעיל</span>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">כניסה</div>
                                        <div className="font-mono text-gray-600 text-sm">{formatTime(entry.startTime)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">יציאה</div>
                                        <div className="font-mono text-gray-600 text-sm">{entry.endTime ? formatTime(entry.endTime) : '-'}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">מיקום כניסה</div>
                                        {startMapUrl ? (
                                            <a href={startMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold text-xs">
                                                <MapPin size={14} /> הצג
                                            </a>
                                        ) : (
                                            <div className="text-xs text-gray-400">-</div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">מיקום יציאה</div>
                                        {endMapUrl ? (
                                            <a href={endMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold text-xs">
                                                <MapPin size={14} /> הצג
                                            </a>
                                        ) : (
                                            <div className="text-xs text-gray-400">-</div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">משך</div>
                                    <div className="font-bold text-gray-800 text-sm">
                                        {entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}:${(entry.durationMinutes % 60).toString().padStart(2, '0')}` : '-'}
                                    </div>
                                </div>
                                
                                {isTeamManager && (
                                    <div className="pt-2 border-t border-gray-200 flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => onEditEntry(entry)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            title="ערוך דיווח"
                                            aria-label="ערוך דיווח"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => onDeleteEntry(entry.id, entry.date, entry.startTime)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                            title="בטל דיווח"
                                            aria-label="בטל דיווח"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="p-8 text-center text-gray-600">
                            <History size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-gray-700 text-sm">אין רישומים בטווח התאריכים הנבחר.</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
