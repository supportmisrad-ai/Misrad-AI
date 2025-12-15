
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { CustomSelect } from '../components/CustomSelect';
import { BarChart3, Clock, CheckCircle2, TrendingUp, Download, Calendar, ShieldAlert, Filter, FileSpreadsheet, ArrowLeft, Activity, Building2, LayoutDashboard, History, Trash2, DollarSign, Lock, Receipt, Plus, Edit2 } from 'lucide-react';
import { Status, TimeEntry } from '../types';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { TimeEntryModal } from '../components/TimeEntryModal';
import { motion, AnimatePresence } from 'framer-motion';

export const ReportsView: React.FC = () => {
    const { tasks, users, currentUser, hasPermission, addToast, departments, timeEntries, deleteTimeEntry, addManualTimeEntry, updateTimeEntry } = useData();
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'finance'>('overview');

    // Default to current month start -> today
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Delete Modal for Attendance
    const [entryToDelete, setEntryToDelete] = useState<{id: string, name: string} | null>(null);

    // Edit/Add Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<TimeEntry | null>(null);

    // Permissions & Logic
    const isSystemAdmin = currentUser.isSuperAdmin || currentUser.role === 'מנכ״ל' || currentUser.role === 'אדמין';
    const isTeamManager = hasPermission('manage_team'); 
    const myDepartment = currentUser.department;
    const canViewFinancials = hasPermission('view_financials');

    // Admin Filter
    const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
    
    // Determine which users to show based on Hierarchy & Filter
    const visibleUsers = users.filter(user => {
        // 1. CEO/Admin sees EVERYONE, unless filtered
        if (isSystemAdmin) {
            if (selectedDepartment !== 'All') {
                return user.department === selectedDepartment;
            }
            return true;
        }

        // 2. Department Manager sees ONLY their department
        if (isTeamManager && user.department && user.department === myDepartment) {
            return true;
        }

        // 3. Regular Employee sees ONLY THEMSELVES
        return user.id === currentUser.id;
    });

    // --- DATA PREPARATION ---

    // 1. Filtered Tasks (Completed within Range)
    const getFilteredTasks = (user: any) => {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);

        return tasks.filter(t => {
            const isAssigned = t.assigneeIds?.includes(user.id) || t.assigneeId === user.id;
            const isDone = t.status === Status.DONE;
            if (!isAssigned || !isDone || !t.completionDetails?.completedAt) return false;
            const completedAt = new Date(t.completionDetails.completedAt);
            return completedAt >= startDate && completedAt <= endDate;
        });
    };

    // 2. Filtered Attendance Entries
    const getFilteredTimeEntries = () => {
        return timeEntries.filter(t => {
            if (!visibleUsers.some(u => u.id === t.userId)) return false; // Scope check
            
            // Allow active entries to show even if date filter excludes "today" (optional, but good UX)
            if (!t.endTime) return true; 

            // Check date range
            const entryDate = t.date; // YYYY-MM-DD string
            return entryDate >= dateRange.start && entryDate <= dateRange.end;
        }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    };

    const filteredTimeEntries = getFilteredTimeEntries();

    // 3. Finance Calculations (Aggregated by user)
    const financeData = visibleUsers.map(user => {
        const userEntries = filteredTimeEntries.filter(e => e.userId === user.id && e.endTime);
        const totalMinutes = userEntries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
        const totalHours = totalMinutes / 60;
        
        let estimatedCost = 0;
        if (user.paymentType === 'hourly') {
            estimatedCost = totalHours * (user.hourlyRate || 0);
        } else if (user.paymentType === 'monthly') {
            estimatedCost = user.monthlySalary || 0;
        }

        return {
            user,
            totalHours,
            totalMinutes,
            estimatedCost,
            entriesCount: userEntries.length
        };
    });


    // Calculate Overview Stats per User
    const overviewStats = visibleUsers.map(user => {
        const userTasks = getFilteredTasks(user);
        
        // Calculate Total Time on Tasks
        let totalSeconds = 0;
        userTasks.forEach(t => {
            if (t.completionDetails?.contributors) {
                const contribution = t.completionDetails.contributors.find(c => c.userId === user.id);
                if (contribution) totalSeconds += contribution.timeSpent;
            } else {
                const assigneesCount = t.assigneeIds?.length || 1;
                totalSeconds += (t.completionDetails?.actualTime || t.timeSpent || 0) / assigneesCount;
            }
        });

        const totalHours = Math.round(totalSeconds / 3600);
        const tasksCount = userTasks.length;
        const avgTimePerTask = tasksCount > 0 ? Math.round(totalSeconds / 60 / tasksCount) : 0;
        const totalSnoozes = userTasks.reduce((acc, t) => acc + (t.snoozeCount || 0), 0);
        const efficiencyScore = tasksCount === 0 ? 0 : Math.max(0, Math.min(100, 80 + (tasksCount * 1.5) - (totalSnoozes * 2)));

        return { user, totalHours, tasksCount, avgTimePerTask, efficiencyScore };
    });
    
    // Sort Overview by efficiency
    overviewStats.sort((a, b) => b.efficiencyScore - a.efficiencyScore);

    // Totals for Overview Header
    const totalOrgTasks = overviewStats.reduce((acc, stat) => acc + stat.tasksCount, 0);
    const totalOrgTaskHours = overviewStats.reduce((acc, stat) => acc + stat.totalHours, 0);
    const avgEfficiency = overviewStats.length > 0 ? Math.round(overviewStats.reduce((acc, s) => acc + s.efficiencyScore, 0) / overviewStats.length) : 0;

    // --- Actions ---

    const handleDeleteEntryClick = (id: string, date: string, startTime: string) => {
        const timeStr = new Date(startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        setEntryToDelete({ id, name: `דיווח שעות: ${date} (${timeStr})` });
    };

    const confirmDeleteEntry = (reason?: string) => {
        if (entryToDelete) {
            deleteTimeEntry(entryToDelete.id, reason);
            setEntryToDelete(null);
        }
    };

    const handleEditEntryClick = (entry: TimeEntry) => {
        setEntryToEdit(entry);
        setIsEditModalOpen(true);
    };

    const handleAddEntryClick = () => {
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

    const handleExportCSV = () => {
        if (activeTab === 'overview') {
            const headers = ['שם העובד', 'מחלקה', 'תפקיד', 'משימות שהושלמו', 'שעות עבודה (משימות)', 'ציון יעילות'];
            const rows = overviewStats.map(stat => [
                stat.user.name, stat.user.department || '-', stat.user.role, stat.tasksCount, stat.totalHours, stat.efficiencyScore
            ]);
            downloadCSV(headers, rows, 'performance_report');
        } else if (activeTab === 'attendance') {
            const headers = ['שם העובד', 'תאריך', 'כניסה', 'יציאה', 'סה״כ שעות'];
            const rows = filteredTimeEntries.map(e => {
                const u = users.find(usr => usr.id === e.userId);
                return [
                    u?.name || 'Unknown',
                    e.date,
                    new Date(e.startTime).toLocaleTimeString('he-IL'),
                    e.endTime ? new Date(e.endTime).toLocaleTimeString('he-IL') : 'Active',
                    e.durationMinutes ? (e.durationMinutes / 60).toFixed(2) : '-'
                ];
            });
            downloadCSV(headers, rows, 'attendance_report');
        } else if (activeTab === 'finance') {
            const headers = ['שם העובד', 'מודל שכר', 'תעריף/שכר', 'שעות בפועל', 'עלות משוערת (בטווח)'];
            const rows = financeData.map(d => [
                d.user.name,
                d.user.paymentType === 'monthly' ? 'גלובלי' : 'שעתי',
                d.user.paymentType === 'monthly' ? d.user.monthlySalary : d.user.hourlyRate,
                d.totalHours.toFixed(2),
                d.estimatedCost.toFixed(2)
            ]);
            downloadCSV(headers, rows, 'payroll_report');
        }
    };

    const downloadCSV = (headers: string[], rows: (string | number)[][], filename: string) => {
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}_${dateRange.start}_to_${dateRange.end}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast('הדוח ירד למחשב בהצלחה', 'success');
    };

    const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });

    // Active Employees Counter (Real-time)
    const activeEmployeesCount = timeEntries.filter(t => !t.endTime && visibleUsers.some(u => u.id === t.userId)).length;

    return (
        <div className="max-w-7xl mx-auto w-full pb-20 px-4 md:px-8">
            
            <DeleteConfirmationModal 
                isOpen={!!entryToDelete}
                onClose={() => setEntryToDelete(null)}
                onConfirm={confirmDeleteEntry}
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
                isManager={isTeamManager}
            />

            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 pt-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">מרכז דוחות ומדדים</h1>
                    <p className="text-gray-500 mt-1">
                        {isSystemAdmin ? 'סקירה ארגונית מלאה: ביצועים, נוכחות ושכר.' : 
                         isTeamManager ? `דוחות ניהול - מחלקת ${myDepartment}` : 
                         'הביצועים והנוכחות שלי'}
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Department Filter for CEO */}
                    {isSystemAdmin && (
                        <div className="w-48 bg-white rounded-2xl border border-gray-200 shadow-sm relative z-10">
                            <CustomSelect 
                                value={selectedDepartment}
                                onChange={setSelectedDepartment}
                                options={[
                                    { value: 'All', label: 'כל המחלקות', icon: <Building2 size={14} /> },
                                    ...departments.map(d => ({ value: d, label: d, icon: <div className="w-2 h-2 rounded-full bg-gray-400" /> }))
                                ]}
                                className="text-sm font-bold"
                            />
                        </div>
                    )}

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
                                />
                            </div>
                            <ArrowLeft size={14} className="text-gray-300" />
                            <div className="w-32 sm:w-40">
                                <CustomDatePicker 
                                    value={dateRange.end}
                                    onChange={(val) => setDateRange({...dateRange, end: val})}
                                    placeholder="עד תאריך"
                                    className="text-sm"
                                />
                            </div>
                        </div>

                        <div className="h-8 w-px bg-gray-200 hidden sm:block mx-1"></div>

                        <button 
                            onClick={handleExportCSV}
                            className="w-full sm:w-auto bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2.5 rounded-xl transition-all font-bold text-xs flex items-center justify-center gap-2 border border-green-100" 
                            title="ייצוא לאקסל"
                        >
                            <FileSpreadsheet size={16} /> ייצוא
                        </button>
                    </div>
                </div>
            </div>

            {/* TABS NAVIGATION */}
            <div className="flex p-1 bg-gray-100/80 rounded-xl mb-8 w-fit">
                {[
                    { id: 'overview', label: 'ביצועים ומשימות', icon: LayoutDashboard },
                    { id: 'attendance', label: 'נוכחות ושעות', icon: Clock },
                    { id: 'finance', label: 'שכר ועלויות', icon: DollarSign, restricted: !canViewFinancials },
                ].map((tab) => {
                    if (tab.restricted) return null;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200
                                ${activeTab === tab.id 
                                    ? 'bg-white shadow-sm text-gray-900 ring-1 ring-black/5' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}
                            `}
                        >
                            <tab.icon size={16} className={activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400'} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="min-h-[400px]">
                {/* --- TAB 1: OVERVIEW (TASKS & KPI) --- */}
                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                        {visibleUsers.length > 1 ? 'משימות (צוות)' : 'משימות שהושלמו'}
                                    </p>
                                    <h3 className="text-4xl font-black text-gray-900 group-hover:text-green-600 transition-colors">{totalOrgTasks}</h3>
                                    <p className="text-[10px] text-gray-400 mt-1">בטווח התאריכים הנבחר</p>
                                </div>
                                <div className="p-4 bg-green-50 text-green-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <CheckCircle2 size={32} />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                        {visibleUsers.length > 1 ? 'שעות (על משימות)' : 'שעות עבודה'}
                                    </p>
                                    <h3 className="text-4xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{totalOrgTaskHours}</h3>
                                    <p className="text-[10px] text-gray-400 mt-1">שעות עבודה בפועל</p>
                                </div>
                                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Clock size={32} />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">יעילות ממוצעת</p>
                                    <h3 className="text-4xl font-black text-gray-900 group-hover:text-purple-600 transition-colors">
                                        {avgEfficiency}%
                                    </h3>
                                    <p className="text-[10px] text-gray-400 mt-1">מחושב ע״י Nexus AI</p>
                                </div>
                                <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <TrendingUp size={32} />
                                </div>
                            </div>
                        </div>

                        {/* Employee Table */}
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30">
                                <div className="flex gap-2 items-center">
                                    <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                                        <BarChart3 size={20} className="text-gray-500" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg">
                                        {visibleUsers.length > 1 ? 'ניתוח ביצועי צוות' : 'פירוט ביצועים אישי'}
                                    </h3>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 rounded-tr-3xl">עובד</th>
                                            <th className="px-6 py-4">מחלקה</th>
                                            <th className="px-6 py-4">משימות שהושלמו</th>
                                            <th className="px-6 py-4">שעות עבודה (נטו)</th>
                                            <th className="px-6 py-4">זמן ממוצע למשימה</th>
                                            <th className="px-6 py-4 rounded-tl-3xl">ציון יעילות</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {overviewStats.map((stat, index) => (
                                            <tr key={stat.user.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs font-bold text-gray-300 w-4">{index + 1}</span>
                                                        <div className="relative">
                                                            <img src={stat.user.avatar} className="w-10 h-10 rounded-full border border-gray-100 object-cover group-hover:scale-105 transition-transform shadow-sm" />
                                                            {index === 0 && overviewStats.length > 1 && (
                                                                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 border border-white">
                                                                    <TrendingUp size={10} className="text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 flex items-center gap-2">
                                                                {stat.user.name} 
                                                                {stat.user.id === currentUser.id && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold border border-gray-200">אני</span>}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{stat.user.role}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-600">
                                                    {stat.user.department || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 text-lg">{stat.tasksCount}</div>
                                                    <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (stat.tasksCount / (stat.user.targets?.tasksMonth || 10)) * 100)}%` }}></div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-gray-700 font-bold bg-gray-50/50 rounded-lg">
                                                    {stat.totalHours} <span className="text-xs text-gray-400 font-normal">שעות</span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {stat.avgTimePerTask > 0 ? (
                                                        <>
                                                            {Math.floor(stat.avgTimePerTask / 60) > 0 && <span className="font-bold">{Math.floor(stat.avgTimePerTask / 60)}</span>}
                                                            {Math.floor(stat.avgTimePerTask / 60) > 0 && <span className="text-xs mx-1">שע׳</span>}
                                                            <span className="font-bold">{stat.avgTimePerTask % 60}</span> <span className="text-xs">דק׳</span>
                                                        </>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                                                        stat.efficiencyScore >= 90 ? 'bg-green-50 text-green-700 border-green-100' :
                                                        stat.efficiencyScore >= 75 ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        'bg-orange-50 text-orange-700 border-orange-100'
                                                    }`}>
                                                        <Activity size={14} />
                                                        {stat.efficiencyScore}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* --- TAB 2: ATTENDANCE (TIME CLOCK) --- */}
                {activeTab === 'attendance' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">עובדים פעילים כרגע</p>
                                    <h3 className="text-3xl font-black text-gray-900">{activeEmployeesCount} <span className="text-sm text-gray-400 font-medium">/ {users.length}</span></h3>
                                    <p className="text-[10px] text-green-600 font-bold mt-1">Live Status</p>
                                </div>
                                <div className="p-4 bg-green-50 text-green-600 rounded-2xl animate-pulse">
                                    <Clock size={32} />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">סה״כ שעות (בטווח)</p>
                                    <h3 className="text-3xl font-black text-gray-900">
                                        {(filteredTimeEntries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0) / 60).toFixed(1)}h
                                    </h3>
                                    <p className="text-[10px] text-gray-400 mt-1">שעות נוכחות מדווחות</p>
                                </div>
                                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                                    <History size={32} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <History size={20} className="text-gray-500" />
                                    <h3 className="font-bold text-gray-900 text-lg">יומן כניסות ויציאות</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isTeamManager && (
                                        <button 
                                            onClick={handleAddEntryClick}
                                            className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-gray-800 transition-colors shadow-sm"
                                        >
                                            <Plus size={14} /> הוסף דיווח ידני
                                        </button>
                                    )}
                                    <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                                        {filteredTimeEntries.length} רשומות
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 rounded-tr-3xl">שם העובד</th>
                                            <th className="px-6 py-4">תאריך</th>
                                            <th className="px-6 py-4">שעת כניסה</th>
                                            <th className="px-6 py-4">שעת יציאה</th>
                                            <th className="px-6 py-4">משך זמן</th>
                                            <th className="px-6 py-4">סטטוס</th>
                                            {isTeamManager && <th className="px-6 py-4 text-left rounded-tl-3xl">פעולות</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredTimeEntries.length > 0 ? filteredTimeEntries.map((entry) => {
                                            const user = users.find(u => u.id === entry.userId);
                                            return (
                                                <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-6 py-4 flex items-center gap-3 font-bold text-gray-900">
                                                        <img src={user?.avatar} className="w-8 h-8 rounded-full border border-gray-100" />
                                                        {user?.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600 font-medium">
                                                        {formatDate(entry.date)}
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-gray-600">{formatTime(entry.startTime)}</td>
                                                    <td className="px-6 py-4 font-mono text-gray-600">{entry.endTime ? formatTime(entry.endTime) : '-'}</td>
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
                                                    {isTeamManager && (
                                                        <td className="px-6 py-4 text-left">
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button 
                                                                    onClick={() => handleEditEntryClick(entry)}
                                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                                    title="ערוך דיווח"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteEntryClick(entry.id, entry.date, entry.startTime)}
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
                                                <td colSpan={isTeamManager ? 7 : 6} className="p-16 text-center text-gray-400">
                                                    <History size={48} className="mx-auto mb-4 opacity-20" />
                                                    <p>אין רישומים בטווח התאריכים הנבחר.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </motion.div>
                )}

                {/* --- TAB 3: FINANCE (PAYROLL ESTIMATION) --- */}
                {activeTab === 'finance' && canViewFinancials && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        
                        <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl mb-6 flex items-start gap-3">
                            <Lock size={20} className="text-yellow-600 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-yellow-900 text-sm">אזור רגיש: הערכות שכר</h4>
                                <p className="text-xs text-yellow-700">
                                    הנתונים להלן הם הערכות בלבד על בסיס שעות נוכחות או שכר חודשי. הנתונים אינם מחליפים תלוש שכר רשמי.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {financeData.map(data => (
                                <div key={data.user.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:border-gray-300 transition-all">
                                    <div className="flex items-center gap-4 mb-4">
                                        <img src={data.user.avatar} className="w-12 h-12 rounded-full border border-gray-100" />
                                        <div>
                                            <h4 className="font-bold text-gray-900">{data.user.name}</h4>
                                            <p className="text-xs text-gray-500">
                                                {data.user.paymentType === 'monthly' ? 'שכר חודשי (גלובלי)' : 'תעריף שעתי'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">תעריף בסיס</span>
                                            <span className="font-bold">
                                                {data.user.paymentType === 'monthly' ? `₪${data.user.monthlySalary?.toLocaleString()}` : `₪${data.user.hourlyRate}/שעה`}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">שעות בטווח</span>
                                            <span className="font-bold">{data.totalHours.toFixed(1)} שעות</span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-400 uppercase">עלות משוערת</span>
                                        <span className="text-lg font-black text-gray-900">
                                            ₪{data.estimatedCost.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                <Receipt size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">מחפש דוח מפורט יותר?</h3>
                            <p className="text-sm text-gray-500 mb-4 max-w-sm">
                                ייצא את נתוני הנוכחות והשכר לקובץ אקסל מפורט להעברה להנהלת חשבונות.
                            </p>
                            <button onClick={handleExportCSV} className="bg-black text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
                                <FileSpreadsheet size={16} /> ייצוא נתוני שכר לאקסל
                            </button>
                        </div>

                    </motion.div>
                )}
            </div>
        </div>
    );
};