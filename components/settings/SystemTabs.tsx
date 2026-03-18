'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';
import { Trash2, DollarSign, CircleCheckBig, TriangleAlert, Download, Upload, ShieldCheck, SquareCheck, Lightbulb, RotateCcw, BarChart3, FileClock, Database, Archive, Building, History, X, UserCheck, Crown, ChevronDown, Loader2 } from 'lucide-react';
import { Notification, User } from '../../types';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { updateNexusUser } from '@/app/actions/nexus';

interface DepartmentHistory {
    id: string;
    timestamp: number;
    action: 'added' | 'removed' | 'renamed';
    department: string;
    oldValue?: string;
    newValue?: string;
    changedBy: string;
}

export const DepartmentsTab: React.FC = () => {
    const { departments, updateSettings, addToast, currentUser, users, hasPermission } = useData();
    const [newDept, setNewDept] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);
    const [deptToDelete, setDeptToDelete] = useState<string | null>(null);
    const [history, setHistory] = useState<DepartmentHistory[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [displayDepartments, setDisplayDepartments] = useState<string[]>(departments);

    // Initialize display departments from props
    useEffect(() => {
        if (departments && departments.length > 0) {
            setDisplayDepartments(departments);
        }
    }, [departments]);

    const persistDepartmentsAndHistory = (nextDepartments: string[], nextHistory: DepartmentHistory[]) => {
        setHistory(nextHistory);
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            if (!orgSlug) return;
            fetch('/api/system/departments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-org-id': orgSlug },
                body: JSON.stringify({ departments: nextDepartments, history: nextHistory }),
            }).catch(() => null);
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
        if (!orgSlug) {
            setIsLoading(false);
            return;
        }

        const migrateAndLoad = async () => {
            try {
                const res = await fetch('/api/system/departments', {
                    headers: { 'x-org-id': orgSlug },
                    cache: 'no-store',
                });
                const data = await res.json().catch(() => null);
                const serverDepartments = Array.isArray(data?.departments) ? data.departments : null;
                const serverHistory = Array.isArray(data?.history) ? data.history : null;

                if (!cancelled) {
                    if (serverHistory) setHistory(serverHistory);
                    if (serverDepartments && serverDepartments.length > 0) {
                        setDisplayDepartments(serverDepartments);
                        updateSettings('departments', serverDepartments);
                    }
                }

                // One-time migration: if legacy localStorage exists and server history is empty, persist it.
                let legacy: DepartmentHistory[] | null = null;
                try {
                    const stored = localStorage.getItem('department_history');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        legacy = Array.isArray(parsed) ? parsed : null;
                    }
                } catch {
                    legacy = null;
                }

                try {
                    localStorage.removeItem('department_history');
                } catch {
                    // ignore
                }

                const shouldMigrate = legacy && legacy.length > 0 && (!serverHistory || serverHistory.length === 0);
                if (shouldMigrate) {
                    const legacyHistory = legacy as DepartmentHistory[];
                    await fetch('/api/system/departments', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'x-org-id': orgSlug },
                        body: JSON.stringify({
                            departments: serverDepartments || departments,
                            history: legacyHistory,
                        }),
                    }).catch(() => null);

                    if (!cancelled) {
                        setHistory(legacyHistory);
                    }
                }
            } catch {
                // ignore
                try {
                    localStorage.removeItem('department_history');
                } catch {
                    // ignore
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        migrateAndLoad();

        return () => {
            cancelled = true;
        };
    }, [updateSettings]);

    const saveHistory = (newHistory: DepartmentHistory[]) => {
        persistDepartmentsAndHistory(departments, newHistory);
    };

    const addHistoryEntry = (
        action: 'added' | 'removed' | 'renamed',
        department: string,
        oldValue?: string,
        newValue?: string,
        departmentsOverride?: string[]
    ) => {
        const entry: DepartmentHistory = {
            id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            action,
            department,
            oldValue,
            newValue,
            changedBy: currentUser.name
        };
        const newHistory = [entry, ...history].slice(0, 100); // Keep last 100 entries
        persistDepartmentsAndHistory(departmentsOverride || departments, newHistory);
    };

    const addDepartment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDept.trim()) {
            setIsShaking(true);
            inputRef.current?.focus();
            setTimeout(() => setIsShaking(false), 400);
            return;
        }
        if (!displayDepartments.includes(newDept.trim())) {
            const newDepartments = [...displayDepartments, newDept.trim()];
            setDisplayDepartments(newDepartments);
            updateSettings('departments', newDepartments);
            addHistoryEntry('added', newDept.trim(), undefined, undefined, newDepartments);
            addToast(`מחלקה "${newDept.trim()}" נוספה בהצלחה`, 'success');
            setNewDept('');
        } else {
            addToast('המחלקה כבר קיימת', 'warning');
        }
    };

    const handleRemoveClick = (dept: string) => {
        setDeptToDelete(dept);
    };

    const confirmRemoveDepartment = () => {
        if (deptToDelete) {
            const nextDepartments = displayDepartments.filter((d: string) => d !== deptToDelete);
            setDisplayDepartments(nextDepartments);
            updateSettings('departments', nextDepartments);
            addHistoryEntry('removed', deptToDelete, undefined, undefined, nextDepartments);
            addToast('המחלקה הוסרה', 'info');
            setDeptToDelete(null);
        }
    };

    return (
        <motion.div key="departments" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-24 md:pb-20">
            <DeleteConfirmationModal
                isOpen={!!deptToDelete}
                onClose={() => setDeptToDelete(null)}
                onConfirm={confirmRemoveDepartment}
                title="מחיקת מחלקה"
                description="המחלקה תוסר מהרשימה. עובדים המשויכים למחלקה זו יישארו ללא שיוך מחלקתי."
                itemName={deptToDelete || ''}
                isHardDelete={true}
            />

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">מחלקות בארגון</h2>
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 transition-colors"
                >
                    <History size={16} /> היסטוריית שינויים
                </button>
            </div>

            {showHistory && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 max-w-2xl"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <History size={18} /> היסטוריית שינויים במחלקות
                        </h3>
                        <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {history.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-8">אין היסטוריה עדיין</p>
                        ) : (
                            history.map((entry) => (
                                <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className={`p-1.5 rounded-lg ${
                                        entry.action === 'added' ? 'bg-green-100 text-green-600' :
                                        entry.action === 'removed' ? 'bg-red-100 text-red-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                        {entry.action === 'added' ? <CircleCheckBig size={14} /> :
                                         entry.action === 'removed' ? <Trash2 size={14} /> :
                                         <RotateCcw size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm text-gray-900">
                                                {entry.action === 'added' ? 'נוספה' :
                                                 entry.action === 'removed' ? 'הוסרה' :
                                                 'שונה'} מחלקה: {entry.department}
                                            </span>
                                        </div>
                                        {entry.oldValue && entry.newValue && (
                                            <div className="text-xs text-gray-500 mb-1">
                                                {entry.oldValue} → {entry.newValue}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <span>{new Date(entry.timestamp).toLocaleString('he-IL')}</span>
                                            <span>•</span>
                                            <span>{entry.changedBy}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            )}

            <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-sm max-w-2xl">
                <form onSubmit={addDepartment} className="flex flex-col sm:flex-row gap-2 mb-6">
                    <input 
                        ref={inputRef}
                        value={newDept}
                        onChange={(e) => { setNewDept(e.target.value); setIsShaking(false); }}
                        placeholder="שם המחלקה (למשל: שיווק)"
                        className={`flex-1 p-3 bg-gray-50 border rounded-xl outline-none focus:border-black transition-all ${isShaking ? 'border-red-500 ring-2 ring-red-200 animate-shake' : 'border-gray-200'}`}
                    />
                    <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors w-full sm:w-auto">הוסף</button>
                </form>
                <div className="space-y-3 pb-28 md:pb-10">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 text-gray-400">
                            <Loader2 size={24} className="animate-spin mr-2" />
                            <span>טוען מחלקות...</span>
                        </div>
                    ) : displayDepartments.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <Building size={48} className="mx-auto mb-2 opacity-50" />
                            <p>אין מחלקות. הוסף מחלקה ראשונה.</p>
                        </div>
                    ) : (
                        displayDepartments.map((dept: string) => {
                        // Find department manager
                        const deptManager = users.find((u: any) => u.managedDepartment === dept);
                        // Find all users in this department
                        const deptUsers = users.filter((u: any) => u.department === dept);
                        
                        return (
                            <div key={dept} className="bg-gray-50 rounded-xl border border-gray-100 p-4 group hover:border-gray-300 transition-colors">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                        <Building size={18} className="text-gray-500" />
                                        <span className="font-bold text-gray-900">{dept}</span>
                                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                            {deptUsers.length} עובדים
                                        </span>
                                    </div>
                            <button onClick={() => handleRemoveClick(dept)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={18} />
                            </button>
                        </div>
                                
                                {/* Department Manager */}
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Crown size={14} className="text-yellow-500" />
                                            <span className="text-xs font-bold text-gray-600 uppercase">מנהל מחלקה:</span>
                                            {deptManager ? (
                                                <div className="flex items-center gap-2">
                                                    <img src={deptManager.avatar} alt={deptManager.name} className="w-5 h-5 rounded-full object-cover" />
                                                    <span className="text-sm font-bold text-gray-900">{deptManager.name}</span>
                                                    <span className="text-xs text-gray-500">({deptManager.role})</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">לא הוגדר</span>
                                            )}
                                        </div>
                                        
                                        {hasPermission('manage_team') && (
                                            <DepartmentManagerSelect 
                                                department={dept}
                                                currentManager={deptManager}
                                                users={users}
                                                onSelect={async (userId: string | null) => {
                                                    const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                                                    if (!orgSlug) {
                                                        addToast('לא ניתן לזהות סביבת עבודה (org). נסה לרענן.', 'error');
                                                        return;
                                                    }
                                                    if (userId) {
                                                        try {
                                                            await updateNexusUser({ orgId: orgSlug, userId, updates: { managedDepartment: dept } as any });
                                                            addToast('מנהל מחלקה עודכן בהצלחה', 'success');
                                                            // Reload page or update state
                                                            window.location.reload();
                                                        } catch (err: any) {
                                                            addToast(err.message || 'שגיאה בעדכון מנהל מחלקה', 'error');
                                                        }
                                                    } else {
                                                        // Remove manager
                                                        if (deptManager) {
                                                            try {
                                                                await updateNexusUser({ orgId: orgSlug, userId: deptManager.id, updates: { managedDepartment: null } as any });
                                                                addToast('מנהל מחלקה הוסר', 'success');
                                                                window.location.reload();
                                                            } catch (err: any) {
                                                                addToast(err.message || 'שגיאה בהסרת מנהל מחלקה', 'error');
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// Department Manager Select Component
interface DepartmentManagerSelectProps {
    department: string;
    currentManager: User | undefined;
    users: User[];
    onSelect: (userId: string | null) => void;
}

const DepartmentManagerSelect: React.FC<DepartmentManagerSelectProps> = ({ department, currentManager, users, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Show all users except current manager - no department filtering
    const availableManagers = users.filter((u: User) => {
        // Can't select yourself if you're already manager
        if (currentManager && u.id === currentManager.id) return false;
        return true; // Show ALL users
    });
    
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:border-gray-300 transition-all"
            >
                {currentManager ? 'שנה מנהל' : 'הגדר מנהל'}
                <ChevronDown size={12} className={isOpen ? 'rotate-180' : ''} />
            </button>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 min-w-[200px] max-h-60 overflow-y-auto">
                        <div className="p-2">
                            <button
                                onClick={() => {
                                    onSelect(null);
                                    setIsOpen(false);
                                }}
                                className="w-full text-right px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                הסר מנהל
                            </button>
                            {availableManagers.map((user: User) => (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        onSelect(user.id);
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-right px-3 py-2 text-xs font-bold text-gray-900 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full object-cover" />
                                    <span>{user.name}</span>
                                    {user.managed_department && user.managed_department !== department && (
                                        <span className="text-[10px] text-orange-500">(מנהל מחלקה אחרת)</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export const GoalsTab: React.FC = () => {
    const { monthlyGoals, updateMonthlyGoals } = useData();

    return (
        <motion.div key="goals" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-16 md:pb-20">
            <h2 className="text-xl font-bold text-gray-900">יעדים ומדדים</h2>
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm max-w-2xl">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <DollarSign size={16} className="text-green-600" /> יעד הכנסות חודשי (₪)
                        </label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={monthlyGoals.revenue}
                                onChange={(e) => updateMonthlyGoals({...monthlyGoals, revenue: Number(e.target.value)})}
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-xl font-black text-gray-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                            />
                            <div className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400 text-sm font-bold">ILS</div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <CircleCheckBig size={16} className="text-blue-600" /> יעד השלמת משימות (מספרי)
                        </label>
                        <input 
                            type="number" 
                            value={monthlyGoals.tasksCompletion}
                            onChange={(e) => updateMonthlyGoals({...monthlyGoals, tasksCompletion: Number(e.target.value)})}
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-xl font-black text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-2">מספר המשימות שהצוות צריך לסיים החודש כדי לעמוד ביעד.</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export const DataTab: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<Record<string, any> | null>(null);
    const [showConfirmImport, setShowConfirmImport] = useState(false);
    const { addToast } = useData();
    const [offlineBackups, setOfflineBackups] = useState<any[]>([]);
    const [showOfflineBackups, setShowOfflineBackups] = useState(false);

    // Load offline backups
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('../../lib/offline-backup').then(({ getOfflineBackups, initOfflineBackup }) => {
                initOfflineBackup().then(() => {
                    getOfflineBackups().then(setOfflineBackups);
                }).catch((err) => {
                    console.error('[Offline Backup] Error loading backups:', err);
                });
            }).catch((err) => {
                console.error('[Offline Backup] Error importing module:', err);
            });
        }
    }, []);

    const handleExportData = () => {
        const dataToExport = { ...localStorage };
        const nexusData: Record<string, any> = {};
        Object.keys(dataToExport).forEach(key => {
            if (key.startsWith('NEXUS_')) {
                try {
                    nexusData[key] = JSON.parse(dataToExport[key]);
                } catch (e) {
                    nexusData[key] = dataToExport[key];
                }
            }
        });

        const blob = new Blob([JSON.stringify(nexusData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexus_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        addToast('קובץ הגיבוי הורד בהצלחה', 'success');
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                setImportData(data);
                setShowConfirmImport(true);
            } catch (err) {
                addToast('שגיאה בקריאת הקובץ. וודא שזהו קובץ תקין.', 'error');
            }
        };
        reader.readAsText(file);
    };

    const confirmImport = () => {
        if (importData) {
            Object.keys(importData).forEach(key => {
                if (key.startsWith('NEXUS_')) {
                    localStorage.setItem(key, JSON.stringify(importData[key]));
                }
            });
            window.location.reload();
        }
        setShowConfirmImport(false);
    };

    return (
        <motion.div key="data" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-16 md:pb-20">
            
            <DeleteConfirmationModal
                isOpen={showConfirmImport}
                onClose={() => { setShowConfirmImport(false); setImportData(null); }}
                onConfirm={confirmImport}
                title="שחזור נתונים"
                description="פעולה זו תמחק את כל הנתונים הנוכחיים ותחליף אותם בנתונים מהגיבוי. המערכת תבצע רענון לאחר האישור."
                type="danger"
                confirmText="שחזר נתונים"
            />

            <h2 className="text-xl font-bold text-gray-900">ניהול נתונים וגיבוי</h2>
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-6 flex items-start gap-3">
                <TriangleAlert size={20} className="text-red-600 mt-0.5" />
                <div>
                    <h4 className="font-bold text-red-900 text-sm">אזור רגיש</h4>
                    <p className="text-xs text-red-700">פעולות אלו חושפות את כל המידע העסקי. וודא שאתה מורשה לבצע אותן.</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Download size={20} className="text-blue-600" /> ייצוא נתונים</h3>
                    <p className="text-sm text-gray-500 mb-6">הורד את כל נתוני המערכת (משימות, לקוחות, הגדרות) לקובץ JSON לגיבוי מקומי.</p>
                    <button onClick={handleExportData} className="w-full py-3 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors">
                        הורד גיבוי מלא
                    </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Upload size={20} className="text-orange-600" /> שחזור מגיבוי</h3>
                    <p className="text-sm text-gray-500 mb-6">טען קובץ גיבוי כדי לשחזר את המערכת למצב קודם. זהירות: הפעולה תדרוס נתונים קיימים.</p>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".json"
                        className="hidden"
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-orange-50 text-orange-700 font-bold rounded-xl border border-orange-100 hover:bg-orange-100 transition-colors">
                        בחר קובץ לשחזור
                    </button>
                </div>
            </div>

            {/* Offline Backups */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Database size={20} className="text-indigo-600" /> גיבויים אופליין</h3>
                    <button 
                        onClick={() => setShowOfflineBackups(!showOfflineBackups)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        {showOfflineBackups ? 'הסתר' : 'הצג'}
                    </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    גיבויים אוטומטיים שנשמרו במצב אופליין (כשאין אינטרנט). הגיבויים נשמרים במחשב שלך.
                </p>
                {showOfflineBackups && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {offlineBackups.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">אין גיבויים אופליין</p>
                        ) : (
                            offlineBackups.map((backup) => (
                                <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                        <div className="font-bold text-sm text-gray-900">
                                            {new Date(backup.timestamp).toLocaleString('he-IL')}
                                        </div>
                                        <div className="text-xs text-gray-500">גרסה: {backup.version}</div>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const { restoreOfflineBackup } = await import('../../lib/offline-backup');
                                            const data = await restoreOfflineBackup(backup.id);
                                            if (data) {
                                                addToast('גיבוי נטען. שחזור ידני נדרש.', 'info');
                                            }
                                        }}
                                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        שחזר
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export const AuditTab: React.FC = () => {
    const { notifications, organization } = useData();

    const handleExportCSV = () => {
        const logs = notifications.filter((n: Notification) => n.type === 'alert' || n.type === 'system');
        const headers = ['תאריך ושעה', 'משתמש', 'סוג פעולה', 'תיאור האירוע'];
        
        const rows = logs.map((log: Notification) => {
            const dateStr = `${new Date().toLocaleDateString('he-IL')} ${log.time}`;
            const typeStr = log.type === 'alert' ? 'אבטחה/קריטי' : 'פעילות מערכת';
            const userStr = log.actorName || 'מערכת';
            const textStr = `"${String((log as any)?.text ?? '').replace(/"/g, '""')}"`; // Escape quotes
            
            return [dateStr, userStr, typeStr, textStr];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map((row: string[]) => row.join(','))
        ].join('\n');

        // Add BOM for Hebrew support in Excel
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const auditLogs = notifications.filter((n: Notification) => n.type === 'alert' || n.type === 'system');

    return (
        <motion.div key="audit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 md:space-y-6 pb-16 md:pb-20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">אירועים ארגוניים</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        תיעוד פעולות שבוצעו בתוך <span className="font-bold text-gray-700">{organization.name}</span>.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleExportCSV}
                        className="bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors w-full md:w-auto"
                    >
                        ייצוא ל-CSV
                    </button>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-3 md:p-4 rounded-xl flex items-start gap-3">
                <Building size={18} className="md:w-5 md:h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                    <h4 className="font-bold text-blue-900 text-sm">אירועי פעילות למנכ״ל</h4>
                    <p className="text-xs text-blue-700">כאן מוצגים שינויים ופעולות שביצעו עובדי החברה. לאירועי שגיאות מערכת גלובלי, פנה ל-SaaS Admin.</p>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">תאריך ושעה</th>
                            <th className="px-6 py-4">משתמש</th>
                            <th className="px-6 py-4">סוג פעולה</th>
                            <th className="px-6 py-4">תיאור האירוע</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {auditLogs.map((log: Notification) => (
                            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs" style={{ direction: 'ltr', textAlign: 'right' }}>
                                    {new Date().toLocaleDateString('he-IL')} • {log.time}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {log.actorAvatar ? (
                                            <img src={log.actorAvatar} className="w-6 h-6 rounded-full object-cover border border-gray-100" />
                                        ) : (
                                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">S</div>
                                        )}
                                        <span className="font-bold text-gray-900">{log.actorName || 'מערכת'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                        log.type === 'alert' 
                                        ? 'bg-red-50 text-red-700 border-red-100' 
                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}>
                                        {log.type === 'alert' ? 'אבטחה/קריטי' : 'פעילות מערכת'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600 font-medium">
                                    {log.text}
                                </td>
                            </tr>
                        ))}
                        {auditLogs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-gray-400">
                                    <ShieldCheck size={48} className="mx-auto mb-3 text-gray-200" />
                                    <p>אין אירועים. לא נרשמו אירועים חריגים לאחרונה.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {auditLogs.length > 0 ? (
                    auditLogs.map((log: Notification) => (
                        <div key={log.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {log.actorAvatar ? (
                                        <img src={log.actorAvatar} className="w-8 h-8 rounded-full object-cover border border-gray-100 shrink-0" />
                                    ) : (
                                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">S</div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-gray-900 text-sm truncate">{log.actorName || 'מערכת'}</div>
                                        <div className="text-xs text-gray-500 font-mono" style={{ direction: 'ltr', textAlign: 'right' }}>
                                            {new Date().toLocaleDateString('he-IL')} • {log.time}
                                        </div>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border shrink-0 ${
                                    log.type === 'alert' 
                                    ? 'bg-red-50 text-red-700 border-red-100' 
                                    : 'bg-blue-50 text-blue-700 border-blue-100'
                                }`}>
                                    {log.type === 'alert' ? 'אבטחה/קריטי' : 'פעילות מערכת'}
                                </span>
                            </div>
                            <div className="text-sm text-gray-600 font-medium pt-2 border-t border-gray-100">
                                {log.text}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
                        <ShieldCheck size={48} className="mx-auto mb-3 text-gray-200" />
                        <p>אין אירועים. לא נרשמו אירועים חריגים לאחרונה.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
