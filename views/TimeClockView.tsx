
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Clock, History, MapPin, CheckCircle2, Users, ArrowRight, Star, CircleAlert, Calendar, Trash2, Filter, ArrowLeft, FileSpreadsheet, Plus, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Priority, Status, TimeEntry, User } from '../types';
import { PRIORITY_LABELS } from '../constants';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { TimeEntryModal } from '../components/nexus/TimeEntryModal';

export const TimeClockView: React.FC = () => {
  const { currentUser, timeEntries, users, deleteTimeEntry, addManualTimeEntry, updateTimeEntry, hasPermission, addToast } = useData();
  
  // Date Range State (Default to today)
  const [dateRange, setDateRange] = useState({
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
  });
  
  // Delete Modal State
  const [entryToDelete, setEntryToDelete] = useState<{id: string, name: string} | null>(null);

  // Edit/Add Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<TimeEntry | null>(null);

  // 1. Real-time Status (Independent of filter)
  const activeEntries = timeEntries.filter((t: TimeEntry) => !t.endTime);
  const onlineUsersCount = activeEntries.length;

  // 2. Historical Data (Filtered by Range)
  const filteredEntries = timeEntries.filter((t: TimeEntry) => {
      const entryDate = new Date(t.date);
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      // Normalize times to ensure inclusive comparison
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      const entryTime = new Date(t.date); 
      // A safer comparison for YYYY-MM-DD strings:
      return t.date >= dateRange.start && t.date <= dateRange.end;
  }).sort((a: TimeEntry, b: TimeEntry) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()); // Sort Descending

  const totalHoursInRange = Math.floor(filteredEntries.reduce((acc: number, curr: TimeEntry) => acc + (curr.durationMinutes || 0), 0) / 60);
  const uniqueEmployeesInRange = new Set(filteredEntries.map((e: TimeEntry) => e.userId)).size;
  
  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });

  const getMapUrl = (lat?: number, lng?: number) => {
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  };

  // Permission check
  const isManager = hasPermission('manage_team');

  const handleDeleteClick = (id: string, date: string, startTime: string) => {
      const timeStr = formatTime(startTime);
      setEntryToDelete({ id, name: `דיווח שעות: ${date} (${timeStr})` });
  };

  const confirmDelete = (reason?: string) => {
      if (entryToDelete) {
          deleteTimeEntry(entryToDelete.id, reason);
          setEntryToDelete(null);
      }
  };

  const handleEditClick = (entry: TimeEntry) => {
      setEntryToEdit(entry);
      setIsEditModalOpen(true);
  };

  const handleAddClick = () => {
      setEntryToEdit(null);
      setIsEditModalOpen(true);
  };

  const handleSaveEntry = (entryData: Partial<TimeEntry>) => {
      if (entryToEdit) {
          updateTimeEntry(entryToEdit.id, entryData);
      } else {
          addManualTimeEntry(entryData as TimeEntry);
      }
  };

  const handleExportExcel = () => {
        if (filteredEntries.length === 0) {
            addToast('אין נתונים לייצוא בטווח הנבחר', 'warning');
            return;
        }

        const headers = ['שם העובד', 'תאריך', 'שעת כניסה', 'שעת יציאה', 'משך זמן (דקות)', 'סטטוס'];
        const rows = filteredEntries.map((entry: TimeEntry) => {
            const user = users.find((u: User) => u.id === entry.userId);
            const startTime = new Date(entry.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
            const endTime = entry.endTime ? new Date(entry.endTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '-';
            const status = entry.endTime ? 'הושלם' : 'פעיל';
            
            return [
                user?.name || 'לא ידוע',
                new Date(entry.date).toLocaleDateString('he-IL'),
                startTime,
                endTime,
                entry.durationMinutes || 0,
                status
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map((row: Array<string | number>) => row.join(','))
        ].join('\n');

        if (typeof document === 'undefined') return; // SSR guard
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `attendance_report_${dateRange.start}_to_${dateRange.end}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast('קובץ הנוכחות ירד בהצלחה', 'success');
    };

  return (
    <div className="max-w-7xl mx-auto w-full pb-16 md:pb-24 px-4 md:px-0">
        
        <DeleteConfirmationModal 
            isOpen={!!entryToDelete}
            onClose={() => setEntryToDelete(null)}
            onConfirm={confirmDelete}
            title="ביטול דיווח שעות"
            description="שים לב: מחיקת דיווח שעות דורשת תיעוד. הרשומה תסומן כמבוטלת ותועבר לארכיון המערכת."
            itemName={entryToDelete?.name}
            isHardDelete={true}
            requireReason={true}
            confirmText="בטל דיווח"
        />

        <TimeEntryModal 
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            entryToEdit={entryToEdit}
            onSave={handleSaveEntry}
            users={users}
            currentUserId={currentUser.id}
            isManager={isManager}
        />

        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 pt-6">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">דוחות נוכחות וצוות</h1>
                <p className="text-gray-500 mt-1">
                    סקירה ניהולית על שעות העבודה וסטטוס העובדים.
                </p>
            </div>
            
            <div className="flex gap-2 items-center">
                {isManager && (
                    <button 
                        onClick={handleAddClick}
                        className="bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-gray-800 transition-all"
                    >
                        <Plus size={18} /> הוסף דיווח ידני
                    </button>
                )}

                {/* Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 px-2">
                        <Filter size={16} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-500 uppercase">טווח:</span>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
                        <div className="w-32 sm:w-40">
                            <CustomDatePicker 
                                value={dateRange.start}
                                onChange={(val) => setDateRange({...dateRange, start: val})}
                                placeholder="מתאריך"
                                className="text-sm"
                                showHebrewDate={true}
                            />
                        </div>
                        <ArrowLeft size={14} className="text-gray-300" />
                        <div className="w-32 sm:w-40">
                            <CustomDatePicker 
                                value={dateRange.end}
                                showHebrewDate={true}
                                onChange={(val) => setDateRange({...dateRange, end: val})}
                                placeholder="עד תאריך"
                                className="text-sm"
                            />
                        </div>
                    </div>

                    <div className="h-8 w-px bg-gray-200 hidden sm:block mx-1"></div>

                    <button 
                        onClick={handleExportExcel}
                        className="w-full sm:w-auto bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2.5 rounded-xl transition-all font-bold text-xs flex items-center justify-center gap-2 border border-green-100" 
                        title="ייצוא לאקסל"
                    >
                        <FileSpreadsheet size={16} /> ייצוא
                    </button>
                </div>
            </div>
        </div>

        <div className="space-y-8">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">עובדים פעילים כרגע</p>
                        <h3 className="text-3xl font-black text-gray-900">{onlineUsersCount} <span className="text-sm text-gray-400 font-medium">/ {users.length}</span></h3>
                        <p className="text-[10px] text-green-600 font-bold mt-1">Live Status</p>
                    </div>
                    <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
                        <Users size={32} />
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">סה״כ שעות (בטווח)</p>
                        <h3 className="text-3xl font-black text-gray-900">
                            {totalHoursInRange}ש׳
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-1">מצטבר לכל העובדים</p>
                    </div>
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <Clock size={32} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">עובדים שדיווחו (בטווח)</p>
                        <h3 className="text-3xl font-black text-gray-900">
                            {uniqueEmployeesInRange}
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-1">מתוך {users.length} עובדים</p>
                    </div>
                    <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
                        <CheckCircle2 size={32} />
                    </div>
                </div>
            </div>

            {/* Team Status Grid (Real-time) */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div> סטטוס עובדים בזמן אמת
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((user: User) => {
                        const userActiveShift = timeEntries.find((t: TimeEntry) => t.userId === user.id && !t.endTime);
                        // Stats for the selected range for this specific user
                        const userRangeEntries = filteredEntries.filter((t: TimeEntry) => t.userId === user.id);
                        const totalMinutes = userRangeEntries.reduce((acc: number, curr: TimeEntry) => acc + (curr.durationMinutes || 0), 0);
                        
                        return (
                            <div key={user.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between h-full relative overflow-hidden group hover:border-gray-300 transition-all">
                                {userActiveShift && <div className="absolute top-0 right-0 w-1 h-full bg-green-500"></div>}
                                
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img src={user.avatar} className="w-12 h-12 rounded-full border border-gray-100 object-cover" />
                                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${userActiveShift ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">{user.name}</h4>
                                            <p className="text-xs text-gray-500">{user.role}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {userActiveShift ? (
                                            <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-100 flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> פעיל
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                                                לא פעיל
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t border-gray-50 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">כניסה אחרונה</p>
                                        <p className="text-xs font-mono font-medium text-gray-700">
                                            {userRangeEntries.length > 0 
                                                ? formatTime(userRangeEntries[0].startTime)
                                                : userActiveShift ? formatTime(userActiveShift.startTime) : '--:--'}
                                        </p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">שעות (בטווח)</p>
                                        <p className="text-sm font-black text-gray-900">
                                            {(() => {
                                                const h = Math.floor(totalMinutes / 60);
                                                const m = totalMinutes % 60;
                                                return h > 0 ? `${h}ש׳ ${m > 0 ? `${m}דק׳` : ''}`.trim() : `${m}דק׳`;
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Detailed Log Table */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <History size={20} className="text-gray-500" />
                    <h3 className="font-bold text-gray-900 text-lg">רישום כניסות ויציאות</h3>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                    {filteredEntries.length} רשומות
                </span>
            </div>
            <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 rounded-tr-3xl">שם העובד</th>
                                <th className="px-6 py-4">תאריך</th>
                                <th className="px-6 py-4">שעת כניסה</th>
                                <th className="px-6 py-4">מיקום כניסה</th>
                                <th className="px-6 py-4">שעת יציאה</th>
                                <th className="px-6 py-4">מיקום יציאה</th>
                                <th className="px-6 py-4">משך זמן</th>
                                <th className="px-6 py-4">סטטוס</th>
                                {isManager && <th className="px-6 py-4 text-left rounded-tl-3xl">פעולות</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredEntries.length > 0 ? filteredEntries.map((entry: TimeEntry) => {
                                const user = users.find((u: User) => u.id === entry.userId);
                                const startMapUrl = getMapUrl(entry?.startLat, entry?.startLng);
                                const endMapUrl = getMapUrl(entry?.endLat, entry?.endLng);
                                return (
                                    <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 flex items-center gap-3 font-bold text-gray-900">
                                            <img src={user?.avatar} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                                            {user?.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">
                                            {formatDate(entry.date)}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600">{formatTime(entry.startTime)}</td>
                                        <td className="px-6 py-4 text-xs">
                                            {entry?.startCity ? (
                                                startMapUrl ? (
                                                    <a href={startMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gray-700 hover:text-blue-700 font-bold transition-colors">
                                                        <MapPin size={14} className="text-blue-500" /> {entry.startCity}
                                                    </a>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-gray-700 font-bold">
                                                        <MapPin size={14} className="text-blue-500" /> {entry.startCity}
                                                    </span>
                                                )
                                            ) : startMapUrl ? (
                                                <a href={startMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold transition-colors">
                                                    <MapPin size={14} /> מפה
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600">{entry.endTime ? formatTime(entry.endTime) : '-'}</td>
                                        <td className="px-6 py-4 text-xs">
                                            {entry?.endCity ? (
                                                endMapUrl ? (
                                                    <a href={endMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gray-700 hover:text-blue-700 font-bold transition-colors">
                                                        <MapPin size={14} className="text-blue-500" /> {entry.endCity}
                                                    </a>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-gray-700 font-bold">
                                                        <MapPin size={14} className="text-blue-500" /> {entry.endCity}
                                                    </span>
                                                )
                                            ) : endMapUrl ? (
                                                <a href={endMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold transition-colors">
                                                    <MapPin size={14} /> מפה
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800">
                                            {entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}:${(entry.durationMinutes % 60).toString().padStart(2, '0')}` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {entry.endTime ? (
                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-bold border border-gray-200">הושלם</span>
                                            ) : (
                                                <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-full font-bold animate-pulse border border-green-100">פעיל</span>
                                            )}
                                        </td>
                                        {isManager && (
                                            <td className="px-6 py-4 text-left">
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleEditClick(entry)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                        title="ערוך דיווח"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteClick(entry.id, entry.date, entry.startTime)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        title="בטל דיווח"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={isManager ? 9 : 8} className="p-16 text-center text-gray-400">
                                        <History size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>אין רישומים בטווח התאריכים הנבחר.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

        </div>
    </div>
  );
};
