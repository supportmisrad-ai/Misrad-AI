'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Timer, MapPin, MapPinned, SquareActivity, CalendarDays, CircleAlert } from 'lucide-react';
import { HoldButton } from '@/components/HoldButton';
import type { LeaveRequest } from '@/types';

interface TimeEntry {
    id: string;
    startTime: string;
    endTime?: string;
    durationMinutes?: number;
    startLat?: number;
    startLng?: number;
    endLat?: number;
    endLng?: number;
}


interface MeAttendancePanelProps {
    activeShift: { startTime: string } | null;
    elapsed: string;
    totalTodayLabel: string;
    lastActivityLabel: string | null;
    myHistory: TimeEntry[];
    showHistory: boolean;
    setShowHistory: (v: boolean) => void;
    myLeaveRequests: LeaveRequest[];
    isLoadingLeaveRequests: boolean;
    isLoadingHistory?: boolean;
    onClockIn: () => void;
    onClockOut: () => void;
    onRequestLeave: () => void;
    actionsEnabled?: boolean;
}

const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
const getMapUrl = (lat?: number, lng?: number) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
};

export const MeAttendancePanel: React.FC<MeAttendancePanelProps> = ({
    activeShift,
    elapsed,
    totalTodayLabel,
    lastActivityLabel,
    myHistory,
    showHistory,
    setShowHistory,
    myLeaveRequests,
    isLoadingLeaveRequests,
    isLoadingHistory,
    onClockIn,
    onClockOut,
    onRequestLeave,
    actionsEnabled = true,
}) => {
    return (
        <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 text-center md:text-right w-full">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2 mb-2">
                        <Clock size={20} className="text-blue-600" />
                        שעון נוכחות
                        {actionsEnabled && activeShift && (
                            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full animate-pulse border border-green-200">פעיל</span>
                        )}
                    </h3>
                    
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 mb-6">
                        {actionsEnabled ? (
                            <div className="font-mono text-4xl md:text-5xl font-black text-gray-900 tracking-tight tabular-nums">
                                {elapsed}
                            </div>
                        ) : null}
                    </div>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8 border-t border-gray-100 pt-6 w-full">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-blue-600 border border-blue-100"><Timer size={18} /></div>
                            <div className="text-right">
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-0.5">סה״כ היום</div>
                                <div className="font-black text-gray-900 text-base tracking-tight">{totalTodayLabel}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-xl text-gray-500"><MapPinned size={18} /></div>
                            <div className="text-right">
                                {/* Location placeholder */}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-xl text-gray-500"><SquareActivity size={18} /></div>
                            <div className="text-right">
                                <div className="text-[10px] text-gray-600 font-bold uppercase tracking-wide">פעילות אחרונה</div>
                                <div className="font-bold text-gray-900 text-sm">{String(lastActivityLabel ?? '').replace('כניסה ב-', '').replace('יציאה ב-', '')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {actionsEnabled ? (
                    <div className="shrink-0 relative">
                        <div className="absolute inset-0 bg-blue-50/50 rounded-full blur-3xl transform scale-150 pointer-events-none"></div>
                        <HoldButton 
                            isActive={!!activeShift} 
                            onComplete={activeShift ? onClockOut : onClockIn} 
                            label={activeShift ? 'יציאה' : 'כניסה'} 
                            size="normal"
                        />
                    </div>
                ) : null}
            </div>

            <div className="border-t border-gray-100 bg-gray-50/30">
                <div className="flex border-b border-gray-200">
                    <button 
                        onClick={() => setShowHistory(true)}
                        className={`flex-1 p-3 text-xs font-bold transition-colors ${
                            showHistory 
                                ? 'text-gray-900 border-b-2 border-gray-900 bg-white' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        היסטוריית נוכחות
                    </button>
                    <button 
                        onClick={() => setShowHistory(false)}
                        className={`flex-1 p-3 text-xs font-bold transition-colors ${
                            !showHistory 
                                ? 'text-gray-900 border-b-2 border-gray-900 bg-white' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        בקשות חופש
                    </button>
                </div>
                
                <AnimatePresence mode="sync">
                    {showHistory ? (
                        <motion.div
                            key="history"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="text-gray-600 font-bold text-[10px] uppercase tracking-wider border-b border-gray-200/50">
                                        <tr>
                                            <th className="px-4 py-2">תאריך</th>
                                            <th className="px-4 py-2">כניסה</th>
                                            <th className="px-4 py-2">מיקום כניסה</th>
                                            <th className="px-4 py-2">יציאה</th>
                                            <th className="px-4 py-2">מיקום יציאה</th>
                                            <th className="px-4 py-2">סה״כ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {isLoadingHistory ? (
                                            // Skeleton rows for history
                                            [1, 2, 3, 4, 5].map((i) => (
                                                <tr key={`skeleton-${i}`} className="text-gray-600">
                                                    <td className="px-4 py-3"><div className="w-16 h-3 bg-gray-200 animate-pulse rounded" /></td>
                                                    <td className="px-4 py-3"><div className="w-12 h-3 bg-gray-200 animate-pulse rounded" /></td>
                                                    <td className="px-4 py-3"><div className="w-10 h-3 bg-gray-200 animate-pulse rounded" /></td>
                                                    <td className="px-4 py-3"><div className="w-12 h-3 bg-gray-200 animate-pulse rounded" /></td>
                                                    <td className="px-4 py-3"><div className="w-10 h-3 bg-gray-200 animate-pulse rounded" /></td>
                                                    <td className="px-4 py-3"><div className="w-10 h-3 bg-gray-200 animate-pulse rounded" /></td>
                                                </tr>
                                            ))
                                        ) : (
                                            <>
                                                {myHistory.slice(0, 5).map((entry) => {
                                                    const startMapUrl = getMapUrl(entry?.startLat, entry?.startLng);
                                                    const endMapUrl = getMapUrl(entry?.endLat, entry?.endLng);
                                                    return (
                                                        <tr key={entry.id} className="text-gray-600 hover:bg-white transition-colors">
                                                            <td className="px-4 py-3 font-bold text-gray-900">{formatDate(entry.startTime)}</td>
                                                            <td className="px-4 py-3 font-mono text-xs">{formatTime(entry.startTime)}</td>
                                                            <td className="px-4 py-3 text-xs">
                                                                {startMapUrl ? (
                                                                    <a href={startMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold">
                                                                        <MapPin size={14} /> הצג
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 font-mono text-xs">{entry.endTime ? formatTime(entry.endTime) : '-'}</td>
                                                            <td className="px-4 py-3 text-xs">
                                                                {endMapUrl ? (
                                                                    <a href={endMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold">
                                                                        <MapPin size={14} /> הצג
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 font-bold">{entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}:${(entry.durationMinutes % 60).toString().padStart(2, '0')}` : '-'}</td>
                                                        </tr>
                                                    );
                                                })}
                                                {myHistory.length === 0 && (
                                                    <tr><td colSpan={6} className="p-6 text-center text-gray-600 text-xs">אין נתונים להצגה</td></tr>
                                                )}
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="leave-requests"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4">
                                {isLoadingLeaveRequests ? (
                                    <div className="p-4 space-y-3">
                                        {/* Skeleton for leave requests */}
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded bg-gray-200 animate-pulse" />
                                                        <div className="w-24 h-4 rounded bg-gray-200 animate-pulse" />
                                                    </div>
                                                    <div className="w-16 h-5 rounded-full bg-gray-200 animate-pulse" />
                                                </div>
                                                <div className="w-3/4 h-3 rounded bg-gray-200 animate-pulse" />
                                            </div>
                                        ))}
                                    </div>
                                ) : myLeaveRequests.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CalendarDays size={48} className="mx-auto mb-3 text-gray-300" />
                                        <p className="text-gray-600 text-sm mb-4">אין בקשות חופש</p>
                                        <button
                                            onClick={onRequestLeave}
                                            className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
                                        >
                                            בקש חופש
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {myLeaveRequests.slice(0, 3).map((req) => (
                                            <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <CalendarDays size={16} className="text-blue-600" />
                                                        <span className="text-sm font-bold text-gray-900">
                                                            {req.startDate ? new Date(req.startDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) : ''}
                                                            {req.endDate && req.endDate !== req.startDate && ` - ${new Date(req.endDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}`}
                                                        </span>
                                                        {Boolean(req.metadata?.isUrgent) && (
                                                            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                                                                <CircleAlert size={12} />
                                                                דחוף
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                                        req.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                        req.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                                                        'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                    }`}>
                                                        {req.status === 'approved' ? 'אושר' : req.status === 'rejected' ? 'נדחה' : 'ממתין'}
                                                    </span>
                                                </div>
                                                {req.reason && (
                                                    <p className="text-xs text-gray-600 mt-1">{req.reason}</p>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={onRequestLeave}
                                            className="w-full bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors mt-3"
                                        >
                                            בקש חופש
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
