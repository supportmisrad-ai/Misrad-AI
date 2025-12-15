
import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';
import { Trash2, DollarSign, CheckCircle2, AlertTriangle, Download, Upload, ShieldCheck, CheckSquare, Lightbulb, RotateCcw, BarChart3, FileClock, Database, Archive, Building } from 'lucide-react';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';

export const DepartmentsTab: React.FC = () => {
    const { departments, updateSettings, addToast } = useData();
    const [newDept, setNewDept] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [deptToDelete, setDeptToDelete] = useState<string | null>(null);

    const addDepartment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDept.trim()) {
            setIsShaking(true);
            inputRef.current?.focus();
            setTimeout(() => setIsShaking(false), 400);
            return;
        }
        if (!departments.includes(newDept.trim())) {
            updateSettings('departments', [...departments, newDept.trim()]);
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
            updateSettings('departments', departments.filter(d => d !== deptToDelete));
            addToast('המחלקה הוסרה', 'info');
            setDeptToDelete(null);
        }
    };

    return (
        <motion.div key="departments" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
            <DeleteConfirmationModal
                isOpen={!!deptToDelete}
                onClose={() => setDeptToDelete(null)}
                onConfirm={confirmRemoveDepartment}
                title="מחיקת מחלקה"
                description="המחלקה תוסר מהרשימה. עובדים המשויכים למחלקה זו יישארו ללא שיוך מחלקתי."
                itemName={deptToDelete || ''}
                isHardDelete={true}
            />

            <h2 className="text-xl font-bold text-gray-900">מחלקות בארגון</h2>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm max-w-2xl">
                <form onSubmit={addDepartment} className="flex gap-2 mb-6">
                    <input 
                        ref={inputRef}
                        value={newDept}
                        onChange={(e) => { setNewDept(e.target.value); setIsShaking(false); }}
                        placeholder="שם המחלקה (למשל: שיווק)"
                        className={`flex-1 p-3 bg-gray-50 border rounded-xl outline-none focus:border-black transition-all ${isShaking ? 'border-red-500 ring-2 ring-red-200 animate-shake' : 'border-gray-200'}`}
                    />
                    <button type="submit" className="bg-black text-white px-6 rounded-xl font-bold hover:bg-gray-800 transition-colors">הוסף</button>
                </form>
                <div className="space-y-2">
                    {departments.map(dept => (
                        <div key={dept} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-gray-300 transition-colors">
                            <span className="font-bold text-gray-700">{dept}</span>
                            <button onClick={() => handleRemoveClick(dept)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export const GoalsTab: React.FC = () => {
    const { monthlyGoals, updateMonthlyGoals } = useData();

    return (
        <motion.div key="goals" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
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
                            <CheckCircle2 size={16} className="text-blue-600" /> יעד השלמת משימות (מספרי)
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
        document.body.removeChild(a);
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
        <motion.div key="data" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
            
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
                <AlertTriangle size={20} className="text-red-600 mt-0.5" />
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
        </motion.div>
    );
};

export const AuditTab: React.FC = () => {
    const { notifications, organization } = useData();

    const handleExportCSV = () => {
        const logs = notifications.filter(n => n.type === 'alert' || n.type === 'system');
        const headers = ['תאריך ושעה', 'משתמש', 'סוג פעולה', 'תיאור האירוע'];
        
        const rows = logs.map(log => {
            const dateStr = `${new Date().toLocaleDateString('he-IL')} ${log.time}`;
            const typeStr = log.type === 'alert' ? 'אבטחה/קריטי' : 'פעילות מערכת';
            const userStr = log.actorName || 'מערכת';
            const textStr = `"${log.text.replace(/"/g, '""')}"`; // Escape quotes
            
            return [dateStr, userStr, typeStr, textStr];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Add BOM for Hebrew support in Excel
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <motion.div key="audit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">יומן אירועים ארגוני</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        תיעוד פעולות שבוצעו בתוך <span className="font-bold text-gray-700">{organization.name}</span>.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleExportCSV}
                        className="bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        ייצוא ל-CSV
                    </button>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <Building size={20} className="text-blue-600 mt-0.5" />
                <div>
                    <h4 className="font-bold text-blue-900 text-sm">יומן פעילות למנכ״ל</h4>
                    <p className="text-xs text-blue-700">כאן מוצגים שינויים ופעולות שביצעו עובדי החברה. ליומן שגיאות מערכת גלובלי, פנה ל-SaaS Admin.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
                        {notifications.filter(n => n.type === 'alert' || n.type === 'system').map(log => (
                            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs" style={{ direction: 'ltr', textAlign: 'right' }}>
                                    {new Date().toLocaleDateString('he-IL')} • {log.time}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {log.actorAvatar ? (
                                            <img src={log.actorAvatar} className="w-6 h-6 rounded-full border border-gray-100" />
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
                        {notifications.filter(n => n.type === 'alert' || n.type === 'system').length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-gray-400">
                                    <ShieldCheck size={48} className="mx-auto mb-3 text-gray-200" />
                                    <p>היומן נקי. לא נרשמו אירועים חריגים לאחרונה.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};
