
import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useSecureAPI } from '../hooks/useSecureAPI';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { CustomSelect } from '../components/CustomSelect';
import { BarChart3, Clock, CheckCircle2, TrendingUp, Download, Calendar, ShieldAlert, Filter, FileSpreadsheet, ArrowLeft, Activity, Building2, LayoutDashboard, History, Trash2, DollarSign, Lock, Receipt, Plus, Edit2, RefreshCw } from 'lucide-react';
import { Status, TimeEntry, User } from '../types';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { TimeEntryModal } from '../components/nexus/TimeEntryModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeletons';
import { useSearchParams } from 'next/navigation';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { useNexusNavigation, getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { createNexusTimeEntry, listNexusTimeEntries, listNexusUsers, updateNexusTimeEntry, voidNexusTimeEntry } from '@/app/actions/nexus';

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export const ReportsView: React.FC = () => {
    const { tasks, currentUser, hasPermission, addToast, departments, users: contextUsers, timeEntries: contextTimeEntries } = useData();
    const { fetchFinancials, isLoading: isLoadingData } = useSecureAPI();
    const queryClient = useQueryClient();
    const { pathname } = useNexusNavigation();
    const orgSlug = useMemo(() => getWorkspaceOrgSlugFromPathname(pathname), [pathname]);
    const orgId = orgSlug;
    const searchParams = useSearchParams();
    const [users, setUsers] = useState<User[]>(contextUsers || []);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(contextTimeEntries || []);
    const [financeData, setFinanceData] = useState<any[]>([]);
    
    // Cache state - remember last loaded data (with localStorage persistence)
    const [cachedUsers, setCachedUsers] = useState<User[]>(() => {
        return [];
    });
    const [cachedTimeEntries, setCachedTimeEntries] = useState<TimeEntry[]>(() => {
        return [];
    });
    const [cachedFinanceData, setCachedFinanceData] = useState<any[]>(() => {
        return [];
    });
    
    // Separate refreshing states for each data type
    const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
    const [isRefreshingTimeEntries, setIsRefreshingTimeEntries] = useState(false);
    const [isRefreshingFinancials, setIsRefreshingFinancials] = useState(false);
    
    // Combined refreshing state (true if any is refreshing)
    const isRefreshing = isRefreshingUsers || isRefreshingTimeEntries || isRefreshingFinancials;
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'finance'>('overview');

    useEffect(() => {
        const tab = searchParams?.get('tab');
        if (tab === 'overview' || tab === 'attendance' || tab === 'finance') {
            setActiveTab(tab);
        }
    }, [searchParams]);

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
    const isSystemAdmin = currentUser.isSuperAdmin || isTenantAdminRole(currentUser.role);
    const isTeamManager = hasPermission('manage_team'); 
    const myDepartment = currentUser.department;
    const canViewFinancials = hasPermission('view_financials');

    // Admin Filter
    const [selectedDepartment, setSelectedDepartment] = useState<string>('All');

    const usersQuery = useQuery({
        queryKey: ['nexus', 'users', orgSlug, selectedDepartment],
        queryFn: async () => {
            return listNexusUsers({
                orgId: orgSlug as string,
                department: selectedDepartment !== 'All' ? selectedDepartment : undefined,
                page: 1,
                pageSize: 200,
            });
        },
        enabled: Boolean(orgSlug),
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 1,
    });

    const timeEntriesQuery = useQuery({
        queryKey: ['nexus', 'timeEntries', orgSlug, dateRange.start, dateRange.end],
        queryFn: async () => {
            return listNexusTimeEntries({
                orgId: orgSlug as string,
                dateFrom: dateRange.start,
                dateTo: dateRange.end,
                page: 1,
                pageSize: 200,
            });
        },
        enabled: Boolean(orgSlug),
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 1,
    });

    const createEntryMutation = useMutation({
        mutationFn: async (input: Partial<TimeEntry>) => {
            if (!orgSlug) throw new Error('Missing orgSlug');
            return createNexusTimeEntry({ orgId: orgSlug, input: input as any });
        },
    });

    const updateEntryMutation = useMutation({
        mutationFn: async (params: { entryId: string; updates: Partial<TimeEntry> }) => {
            if (!orgSlug) throw new Error('Missing orgSlug');
            return updateNexusTimeEntry({ orgId: orgSlug, entryId: params.entryId, updates: params.updates as any });
        },
    });

    const voidEntryMutation = useMutation({
        mutationFn: async (params: { entryId: string; reason: string }) => {
            if (!orgSlug) throw new Error('Missing orgSlug');
            return voidNexusTimeEntry({ orgId: orgSlug, entryId: params.entryId, reason: params.reason });
        },
    });
    
    useEffect(() => {
        // Show context users immediately if available
        if (contextUsers && contextUsers.length > 0) {
            setUsers(contextUsers);
            setCachedUsers(contextUsers);
        } else if (cachedUsers.length > 0) {
            setUsers(cachedUsers);
        }
    }, [contextUsers]);

    useEffect(() => {
        setIsRefreshingUsers(Boolean(usersQuery.isFetching));
        const next = (usersQuery.data as any)?.users;
        if (Array.isArray(next)) {
            setUsers(next);
            setCachedUsers(next);
        }
    }, [usersQuery.data, usersQuery.isFetching]);

    useEffect(() => {
        // Show context time entries immediately if available
        if (contextTimeEntries && contextTimeEntries.length > 0) {
            const filtered = contextTimeEntries.filter((entry: TimeEntry) => {
                const entryDate = entry.date || entry.startTime?.split('T')[0];
                return entryDate >= dateRange.start && entryDate <= dateRange.end;
            });
            if (filtered.length > 0) {
                setTimeEntries(filtered);
            }
        } else if (cachedTimeEntries.length > 0) {
            setTimeEntries(cachedTimeEntries);
        }
    }, [contextTimeEntries, dateRange]);

    useEffect(() => {
        setIsRefreshingTimeEntries(Boolean(timeEntriesQuery.isFetching));
        const next = (timeEntriesQuery.data as any)?.timeEntries;
        if (Array.isArray(next)) {
            setTimeEntries(next);
            setCachedTimeEntries(next);
        }
    }, [timeEntriesQuery.data, timeEntriesQuery.isFetching]);

    // Load financial data from secure API with cache (only if has permission)
    useEffect(() => {
        const loadFinancials = async () => {
            if (!canViewFinancials) {
                setFinanceData([]);
                setCachedFinanceData([]);
                return;
            }
            
            // Show cached data immediately if available
            if (cachedFinanceData.length > 0) {
                setFinanceData(cachedFinanceData);
            }
            
            setIsRefreshingFinancials(true);
            try {
                const fetchedFinancials: unknown = await fetchFinancials({
                    department: selectedDepartment !== 'All' ? selectedDepartment : undefined,
                    dateRange: `${dateRange.start},${dateRange.end}`
                });

                const fetchedObj = asObject(fetchedFinancials);
                const users = fetchedObj?.users;
                
                // Transform API response to match expected format
                let newFinanceData: any[] = [];
                if (Array.isArray(users)) {
                    newFinanceData = users.map((item: any) => ({
                        user: item.user || item,
                        totalHours: item.totalHours || 0,
                        totalMinutes: item.totalMinutes || 0,
                        estimatedCost: item.estimatedCost || 0,
                        entriesCount: item.entriesCount || 0
                    }));
                } else if (Array.isArray(fetchedFinancials)) {
                    newFinanceData = fetchedFinancials;
                }
                
                setFinanceData(newFinanceData);
                setCachedFinanceData(newFinanceData);
            } catch (error) {
                console.error('Failed to load financials:', error);
                // Keep cached data on error
                if (cachedFinanceData.length === 0) {
                    setFinanceData([]);
                }
            } finally {
                setIsRefreshingFinancials(false);
            }
        };
        
        loadFinancials();
    }, [fetchFinancials, canViewFinancials, selectedDepartment, dateRange]);
    
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

        return tasks.filter((t: any) => {
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

    // 3. Finance Calculations - Now using secure API data
    // financeData is loaded from /api/financials which filters sensitive data server-side
    // If user doesn't have permission, financeData will be empty


    // Calculate Overview Stats per User
    const overviewStats = visibleUsers.map(user => {
        const userTasks = getFilteredTasks(user);
        
        // Calculate Total Time on Tasks
        let totalSeconds = 0;
        userTasks.forEach((t: any) => {
            if (t.completionDetails?.contributors) {
                const contribution = t.completionDetails.contributors.find((c: any) => c.userId === user.id);
                if (contribution) totalSeconds += contribution.timeSpent;
            } else {
                const assigneesCount = t.assigneeIds?.length || 1;
                totalSeconds += (t.completionDetails?.actualTime || t.timeSpent || 0) / assigneesCount;
            }
        });

        const totalHours = Math.round(totalSeconds / 3600);
        const tasksCount = userTasks.length;
        const avgTimePerTask = tasksCount > 0 ? Math.round(totalSeconds / 60 / tasksCount) : 0;
        const totalSnoozes = userTasks.reduce((acc: number, t: any) => acc + (t.snoozeCount || 0), 0);
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

    const confirmDeleteEntry = async (reason?: string) => {
        if (!entryToDelete) return;
        try {
            const safeReason = String(reason || '').trim();
            await voidEntryMutation.mutateAsync({ entryId: entryToDelete.id, reason: safeReason || 'No reason provided' });
            if (orgSlug) {
                queryClient.invalidateQueries({ queryKey: ['nexus', 'timeEntries', orgSlug, dateRange.start, dateRange.end] });
            }
        } catch (error: any) {
            addToast(error?.message || 'שגיאה בביטול דיווח שעות', 'error');
        } finally {
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

    const handleSaveEntry = async (entryData: Partial<TimeEntry>) => {
        try {
            if (entryToEdit) {
                await updateEntryMutation.mutateAsync({
                    entryId: entryToEdit.id,
                    updates: {
                        userId: entryData.userId,
                        date: entryData.date,
                        startTime: entryData.startTime,
                        endTime: entryData.endTime,
                    },
                });
                addToast('דיווח השעות עודכן', 'success');
            } else {
                await createEntryMutation.mutateAsync({
                    userId: entryData.userId,
                    date: entryData.date,
                    startTime: entryData.startTime,
                    endTime: entryData.endTime,
                });
                addToast('דיווח שעות ידני נוסף בהצלחה', 'success');
            }
            if (orgSlug) {
                queryClient.invalidateQueries({ queryKey: ['nexus', 'timeEntries', orgSlug, dateRange.start, dateRange.end] });
            }
        } catch (error: any) {
            addToast(error?.message || 'שגיאה בשמירת הדיווח', 'error');
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
                'מוגן', // Don't expose actual salary/rate - only show estimated cost
                d.totalHours.toFixed(2),
                d.estimatedCost.toFixed(2)
            ]);
            downloadCSV(headers, rows, 'payroll_report');
        }
    };

    const downloadCSV = (headers: string[], rows: (string | number)[][], filename: string) => {
        if (typeof document === 'undefined') return; // SSR guard
        
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}_${dateRange.start}_to_${dateRange.end}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        addToast('הדוח ירד למחשב בהצלחה', 'success');
    };

    const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });

    // Active Employees Counter (Real-time)
    const activeEmployeesCount = timeEntries.filter(t => !t.endTime && visibleUsers.some(u => u.id === t.userId)).length;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div className="max-w-7xl mx-auto w-full pb-16 md:pb-20 px-2 md:px-0">
            
            <DeleteConfirmationModal 
                isOpen={!!entryToDelete}
                onClose={() => setEntryToDelete(null)}
                onConfirm={confirmDeleteEntry}
                title="ביטול דיווח שעות"
                description="שים לב: מחיקת דיווח שעות דורשת תיעוד. הרשומה תסומן כמבוטלת ותועבר לארכיון המערכת."
                itemName={entryToDelete?.name}
                isHardDelete={false}
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

            {/* Header - Standardized */}
            <div className="pt-4 md:pt-6 pb-4 md:pb-6 border-b border-gray-100 shrink-0">
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-4 md:mb-6">
                    <div>
                        <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">מרכז דוחות ומדדים</h1>
                            {isRefreshing && (
                                <div className="flex items-center gap-2 px-2 md:px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                                    <Skeleton className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full" />
                                    <span className="text-[10px] md:text-xs font-bold text-blue-700">מתעדכן...</span>
                                </div>
                            )}
                        </div>
                        <p className="text-gray-500 text-xs md:text-sm">
                            {isSystemAdmin ? 'סקירה ארגונית מלאה: ביצועים, נוכחות ושכר.' : 
                             isTeamManager ? `דוחות ניהול - מחלקת ${myDepartment}` : 
                             'הביצועים והנוכחות שלי'}
                        </p>
                    </div>
                </div>
                    </div>
                
            {/* Filters & Actions Bar */}
            <div className="px-0 py-3 md:py-4 border-b border-gray-100 bg-gray-50/30 shrink-0">
                <div className="flex flex-col gap-3">
                        {/* Department Filter for CEO */}
                        {isSystemAdmin && (
                        <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm relative z-10">
                                <CustomSelect 
                                    value={selectedDepartment}
                                    onChange={setSelectedDepartment}
                                    options={[
                                        { value: 'All', label: 'כל המחלקות', icon: <Building2 size={14} /> },
                                    ...departments.map((d: string) => ({ value: d, label: d, icon: <div className="w-2 h-2 rounded-full bg-gray-400" /> }))
                                ]}
                                className="text-sm font-bold"
                            />
                        </div>
                    )}

                    {/* Date Range Filter */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                        <div className="flex items-center gap-2 shrink-0">
                            <Filter size={14} className="md:w-4 md:h-4 text-gray-500" />
                            <span className="text-xs font-bold text-gray-500 uppercase">טווח:</span>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-1">
                            <div className="flex-1 min-w-0">
                                <CustomDatePicker 
                                    value={dateRange.start}
                                    onChange={(val) => setDateRange({...dateRange, start: val})}
                                    placeholder="מתאריך"
                                    className="text-sm w-full"
                                    showHebrewDate={true}
                                />
                            </div>
                            <ArrowLeft size={12} className="md:w-3.5 md:h-3.5 text-gray-300 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <CustomDatePicker 
                                    value={dateRange.end}
                                    showHebrewDate={true}
                                    onChange={(val) => setDateRange({...dateRange, end: val})}
                                    placeholder="עד תאריך"
                                    className="text-sm w-full"
                                />
                            </div>
                        </div>

                        <div className="h-px md:h-6 md:w-px bg-gray-200 mx-0 md:mx-1"></div>

                        <button 
                            onClick={handleExportCSV}
                            className="bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-xl transition-all font-bold text-sm flex items-center justify-center gap-2 border border-green-100 shrink-0 w-full md:w-auto" 
                            title="ייצוא לאקסל"
                            aria-label="ייצוא נתונים לאקסל"
                        >
                            <FileSpreadsheet size={14} className="md:w-4 md:h-4" /> ייצוא
                        </button>
                    </div>
                </div>
            </div>

            {/* TABS NAVIGATION */}
            <div className="pt-4 md:pt-6 pb-3 md:pb-4 border-b border-gray-200 shrink-0">
                <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
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
                                className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold transition-all border-b-2 whitespace-nowrap shrink-0 ${
                                    activeTab === tab.id
                                        ? 'text-gray-900 border-gray-900'
                                        : 'text-gray-500 border-transparent hover:text-gray-700'
                                }`}
                            aria-label={tab.label}
                        >
                                <div className="flex items-center gap-1.5 md:gap-2">
                                    <tab.icon size={14} className="md:w-4 md:h-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    <span className="sm:hidden">{tab.id === 'overview' ? 'ביצועים' : tab.id === 'attendance' ? 'נוכחות' : 'שכר'}</span>
                                </div>
                        </button>
                    );
                })}
                </div>
            </div>

            <div className="min-h-[400px]">
                {/* --- TAB 1: OVERVIEW (TASKS & KPI) --- */}
                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-10">
                            <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                                <div>
                                    <p className="text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                        {visibleUsers.length > 1 ? 'משימות (צוות)' : 'משימות שהושלמו'}
                                    </p>
                                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 group-hover:text-green-600 transition-colors">{totalOrgTasks}</h2>
                                    <p className="text-[9px] md:text-[10px] text-gray-600 mt-1">בטווח התאריכים הנבחר</p>
                                </div>
                                <div className="p-3 md:p-4 bg-green-50 text-green-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <CheckCircle2 size={24} className="md:w-8 md:h-8" />
                                </div>
                            </div>
                            <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                                <div>
                                    <p className="text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                        {visibleUsers.length > 1 ? 'שעות (על משימות)' : 'שעות עבודה'}
                                    </p>
                                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{totalOrgTaskHours}</h2>
                                    <p className="text-[9px] md:text-[10px] text-gray-600 mt-1">שעות עבודה בפועל</p>
                                </div>
                                <div className="p-3 md:p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Clock size={24} className="md:w-8 md:h-8" />
                                </div>
                            </div>
                            <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                                <div>
                                    <p className="text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">יעילות ממוצעת</p>
                                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 group-hover:text-purple-600 transition-colors">
                                        {avgEfficiency}%
                                    </h2>
                                    <p className="text-[9px] md:text-[10px] text-gray-600 mt-1">מחושב ע״י Nexus AI</p>
                                </div>
                                <div className="p-3 md:p-4 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <TrendingUp size={24} className="md:w-8 md:h-8" />
                                </div>
                            </div>
                        </div>

                        {/* Employee Table */}
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30">
                                <div className="flex gap-2 items-center">
                                    <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                                        <BarChart3 size={18} className="md:w-5 md:h-5 text-gray-500" />
                                    </div>
                                    <h2 className="font-bold text-gray-900 text-base md:text-lg">
                                        {visibleUsers.length > 1 ? 'ניתוח ביצועי צוות' : 'פירוט ביצועים אישי'}
                                    </h2>
                                </div>
                            </div>
                            
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto -mx-2 md:mx-0">
                                <table className="w-full text-right min-w-[600px]">
                                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th scope="col" className="px-3 md:px-6 py-3 md:py-4 rounded-tr-3xl">עובד</th>
                                            <th scope="col" className="px-3 md:px-6 py-3 md:py-4">מחלקה</th>
                                            <th scope="col" className="px-3 md:px-6 py-3 md:py-4">משימות</th>
                                            <th scope="col" className="px-3 md:px-6 py-3 md:py-4">שעות</th>
                                            <th scope="col" className="px-3 md:px-6 py-3 md:py-4 hidden lg:table-cell">זמן ממוצע</th>
                                            <th scope="col" className="px-3 md:px-6 py-3 md:py-4 rounded-tl-3xl">יעילות</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {overviewStats.map((stat, index) => (
                                            <tr key={stat.user.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-3 md:px-6 py-3 md:py-4">
                                                    <div className="flex items-center gap-2 md:gap-4">
                                                        <span className="text-xs font-bold text-gray-300 w-3 md:w-4">{index + 1}</span>
                                                        <div className="relative">
                                                            <img src={stat.user.avatar} alt={stat.user.name} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-100 object-cover group-hover:scale-105 transition-transform shadow-sm" />
                                                            {index === 0 && overviewStats.length > 1 && (
                                                                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 border border-white">
                                                                    <TrendingUp size={10} className="text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-bold text-gray-900 text-sm md:text-base flex items-center gap-2">
                                                                <span className="truncate">{stat.user.name}</span>
                                                                {stat.user.id === currentUser.id && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold border border-gray-200 shrink-0">אני</span>}
                                                            </div>
                                                            <div className="text-xs text-gray-500 truncate">{stat.user.role}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 md:px-6 py-3 md:py-4 text-xs text-gray-600">
                                                    {stat.user.department || '-'}
                                                </td>
                                                <td className="px-3 md:px-6 py-3 md:py-4">
                                                    <div className="font-bold text-gray-900 text-base md:text-lg">{stat.tasksCount}</div>
                                                    <div className="w-20 md:w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (stat.tasksCount / (stat.user.targets?.tasksMonth || 10)) * 100)}%` }}></div>
                                                    </div>
                                                </td>
                                                <td className="px-3 md:px-6 py-3 md:py-4 font-mono text-gray-700 font-bold bg-gray-50/50 rounded-lg text-sm md:text-base">
                                                    {stat.totalHours} <span className="text-xs text-gray-600 font-normal">שעות</span>
                                                </td>
                                                <td className="px-3 md:px-6 py-3 md:py-4 text-gray-600 hidden lg:table-cell">
                                                    {stat.avgTimePerTask > 0 ? (
                                                        <>
                                                            {Math.floor(stat.avgTimePerTask / 60) > 0 && <span className="font-bold">{Math.floor(stat.avgTimePerTask / 60)}</span>}
                                                            {Math.floor(stat.avgTimePerTask / 60) > 0 && <span className="text-xs mx-1">שע׳</span>}
                                                            <span className="font-bold">{stat.avgTimePerTask % 60}</span> <span className="text-xs">דק׳</span>
                                                        </>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-3 md:px-6 py-3 md:py-4">
                                                    <div className={`inline-flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-lg text-xs font-bold border ${
                                                        stat.efficiencyScore >= 90 ? 'bg-green-50 text-green-700 border-green-100' :
                                                        stat.efficiencyScore >= 75 ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        'bg-orange-50 text-orange-700 border-orange-100'
                                                    }`}>
                                                        <Activity size={12} />
                                                        {stat.efficiencyScore}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Mobile Card View */}
                            <div className="md:hidden p-4 space-y-3">
                                {overviewStats.map((stat, index) => (
                                    <div key={stat.user.id} className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-300 w-4">{index + 1}</span>
                                            <div className="relative">
                                                <img src={stat.user.avatar} alt={stat.user.name} className="w-10 h-10 rounded-full border border-gray-100 object-cover shadow-sm" />
                                                {index === 0 && overviewStats.length > 1 && (
                                                    <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 border border-white">
                                                        <TrendingUp size={10} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-gray-900 text-base flex items-center gap-2">
                                                    <span className="truncate">{stat.user.name}</span>
                                                    {stat.user.id === currentUser.id && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold border border-gray-200 shrink-0">אני</span>}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">{stat.user.role}</div>
                                                <div className="text-xs text-gray-600">{stat.user.department || '-'}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">משימות</div>
                                                <div className="font-bold text-gray-900 text-lg">{stat.tasksCount}</div>
                                                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (stat.tasksCount / (stat.user.targets?.tasksMonth || 10)) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">שעות</div>
                                                <div className="font-mono text-gray-700 font-bold text-lg">{stat.totalHours} <span className="text-xs text-gray-600 font-normal">שעות</span></div>
                                            </div>
                                        </div>
                                        
                                        <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">יעילות</div>
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                                                stat.efficiencyScore >= 90 ? 'bg-green-50 text-green-700 border-green-100' :
                                                stat.efficiencyScore >= 75 ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                'bg-orange-50 text-orange-700 border-orange-100'
                                            }`}>
                                                <Activity size={12} />
                                                {stat.efficiencyScore}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* --- TAB 2: ATTENDANCE (TIME CLOCK) --- */}
                {activeTab === 'attendance' && (
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
                                        {(filteredTimeEntries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0) / 60).toFixed(1)}h
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
                                            onClick={handleAddEntryClick}
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
                                            <th className="px-3 md:px-6 py-3 md:py-4">יציאה</th>
                                            <th className="px-3 md:px-6 py-3 md:py-4">משך</th>
                                            <th className="px-3 md:px-6 py-3 md:py-4">סטטוס</th>
                                            {isTeamManager && <th className="px-3 md:px-6 py-3 md:py-4 text-left rounded-tl-3xl">פעולות</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredTimeEntries.length > 0 ? filteredTimeEntries.map((entry) => {
                                            const user = users.find(u => u.id === entry.userId);
                                            return (
                                                <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-3 md:px-6 py-3 md:py-4">
                                                        <div className="flex items-center gap-2 md:gap-3 font-bold text-gray-900">
                                                            <img src={user?.avatar} className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-gray-100 shrink-0" />
                                                            <span className="text-sm md:text-base truncate">{user?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 md:px-6 py-3 md:py-4 text-gray-600 font-medium text-xs md:text-sm">
                                                        {formatDate(entry.date)}
                                                    </td>
                                                    <td className="px-3 md:px-6 py-3 md:py-4 font-mono text-gray-600 text-xs md:text-sm">{formatTime(entry.startTime)}</td>
                                                    <td className="px-3 md:px-6 py-3 md:py-4 font-mono text-gray-600 text-xs md:text-sm">{entry.endTime ? formatTime(entry.endTime) : '-'}</td>
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
                                                                    onClick={() => handleEditEntryClick(entry)}
                                                                    className="p-1.5 md:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                                    title="ערוך דיווח"
                                                                    aria-label="ערוך דיווח"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteEntryClick(entry.id, entry.date, entry.startTime)}
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
                                                <td colSpan={isTeamManager ? 7 : 6} className="p-8 md:p-16 text-center text-gray-600">
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
                                    return (
                                        <div key={entry.id} className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <img src={user?.avatar} className="w-10 h-10 rounded-full border border-gray-100 shrink-0" />
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
                                            
                                            <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase">משך</div>
                                                <div className="font-bold text-gray-800 text-sm">
                                                    {entry.durationMinutes ? `${Math.floor(entry.durationMinutes / 60)}:${(entry.durationMinutes % 60).toString().padStart(2, '0')}` : '-'}
                                                </div>
                                            </div>
                                            
                                            {isTeamManager && (
                                                <div className="pt-2 border-t border-gray-200 flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleEditEntryClick(entry)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                        title="ערוך דיווח"
                                                        aria-label="ערוך דיווח"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteEntryClick(entry.id, entry.date, entry.startTime)}
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
                )}

                {/* --- TAB 3: FINANCE (PAYROLL ESTIMATION) --- */}
                {activeTab === 'finance' && canViewFinancials && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        
                        <div className="bg-yellow-50 border border-yellow-100 p-3 md:p-4 rounded-xl mb-4 md:mb-6 flex items-start gap-2 md:gap-3">
                            <Lock size={16} className="md:w-5 md:h-5 text-yellow-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-yellow-900 text-xs md:text-sm mb-1">אזור רגיש: הערכות שכר</h4>
                                <p className="text-[10px] md:text-xs text-yellow-700 leading-relaxed">
                                    הנתונים להלן הם הערכות בלבד על בסיס שעות נוכחות או שכר חודשי. הנתונים אינם מחליפים תלוש שכר רשמי.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
                            {financeData.map(data => (
                                <div key={data.user.id} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:border-gray-300 transition-all">
                                    <div className="flex items-center gap-3 md:gap-4 mb-4">
                                        <img src={data.user.avatar} alt={data.user.name} className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gray-100 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-gray-900 text-sm md:text-base truncate">{data.user.name}</h4>
                                            <p className="text-xs text-gray-500 truncate">
                                                {data.user.paymentType === 'monthly' ? 'שכר חודשי (גלובלי)' : 'תעריף שעתי'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500">מודל שכר</span>
                                            <span className="font-bold text-gray-900">
                                                {data.user.paymentType === 'monthly' ? 'גלובלי' : 'שעתי'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500">שעות בטווח</span>
                                            <span className="font-bold text-gray-900">{data.totalHours.toFixed(1)} שעות</span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-600 uppercase">עלות משוערת</span>
                                        <span className="text-base md:text-lg font-black text-gray-900">
                                            ₪{data.estimatedCost.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3 md:mb-4 text-gray-500">
                                <Receipt size={24} className="md:w-8 md:h-8" />
                            </div>
                            <h2 className="text-base md:text-lg font-bold text-gray-900 mb-2">מחפש דוח מפורט יותר?</h2>
                            <p className="text-xs md:text-sm text-gray-500 mb-4 max-w-sm">
                                ייצא את נתוני הנוכחות והשכר לקובץ אקסל מפורט להעברה להנהלת חשבונות.
                            </p>
                            <button onClick={handleExportCSV} className="bg-black text-white px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center" aria-label="ייצוא נתוני שכר לאקסל">
                                <FileSpreadsheet size={14} className="md:w-4 md:h-4" /> ייצוא נתוני שכר לאקסל
                            </button>
                        </div>

                    </motion.div>
                )}
            </div>
        </div>
    );
};
