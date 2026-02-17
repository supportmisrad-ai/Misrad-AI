'use client';


import React, { useState } from 'react';
import { Student } from './types';
import { 
    GraduationCap, Users, Calendar, CircleAlert, CircleCheck, 
    MoreHorizontal, Flame, Layout, MessageSquare, ArrowRight,
    TrendingUp, Award, BookOpen, TriangleAlert, UserCheck
} from 'lucide-react';
import { useToast } from './contexts/ToastContext';

interface DeliveryViewProps {
    students?: Student[];
    onUpdateStudent?: (student: Student) => void;
}

const DeliveryView: React.FC<DeliveryViewProps> = ({ students = [], onUpdateStudent }) => {
    const { addToast } = useToast();
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

    const totalStudents = students.length;
    const averageProgress = totalStudents === 0
        ? null
        : Math.round(students.reduce((sum, s) => sum + (Number.isFinite(s.progress) ? s.progress : 0), 0) / totalStudents);

    const cohorts = Array.from(new Set(students.map(s => s.cohort).filter(c => c && c.trim().length > 0)));

    // FIX: Create a shallow copy before sorting to avoid "Cannot assign to read only property" error
    const hotSeatQueue = [...students]
        .filter(s => s.nextHotSeat)
        .sort((a,b) => (a.nextHotSeat?.getTime() || 0) - (b.nextHotSeat?.getTime() || 0));

    const handleFilter = () => {
        addToast('סינון רשימה אינו זמין כרגע', 'info');
    };

    const handleManageList = () => {
        addToast('ניהול רשימת מושב חם אינו זמין כרגע', 'info');
    };

    const getStatusColor = (status: Student['status']) => {
        switch(status) {
            case 'on_track': return 'text-emerald-700 bg-emerald-50 border-emerald-100';
            case 'needs_help': return 'text-amber-700 bg-amber-50 border-amber-100';
            case 'at_risk': return 'text-red-700 bg-red-50 border-red-100';
            default: return 'text-slate-700 bg-slate-50 border-slate-100';
        }
    };

    const getStatusIcon = (status: Student['status']) => {
        switch(status) {
            case 'on_track': return <CircleCheck size={14} />;
            case 'needs_help': return <CircleAlert size={14} />;
            case 'at_risk': return <TriangleAlert size={14} />;
            default: return <UserCheck size={14} />;
        }
    };

    const getStatusText = (status: Student['status']) => {
        switch(status) {
            case 'on_track': return 'בקצב הנכון';
            case 'needs_help': return 'זקוק לעזרה';
            case 'at_risk': return 'בסיכון נטישה';
            default: return status;
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20 space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <GraduationCap className="text-indigo-600" strokeWidth={2.5} />
                        ניהול הכשרה
                    </h2>
                </div>
                <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-500 px-3 border-l border-slate-100">מחזור פעיל:</span>
                    <select className="bg-transparent border-none text-sm font-bold text-indigo-700 rounded-lg py-1.5 pl-3 pr-8 focus:ring-0 cursor-pointer outline-none" disabled={cohorts.length === 0}>
                        {cohorts.length === 0 ? (
                          <option>לא הוגדר</option>
                        ) : (
                          cohorts.map(c => <option key={c}>{c}</option>)
                        )}
                    </select>
                </div>
            </div>

            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="ui-card p-6 relative overflow-hidden group hover:border-indigo-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                            <Users size={24} />
                        </div>
                        <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-full text-slate-500">{totalStudents === 0 ? '—' : `${totalStudents} תלמידים`}</span>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold text-slate-800">{totalStudents === 0 ? '—' : totalStudents}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase mt-1">תלמידים</p>
                    </div>
                </div>

                <div className="ui-card p-6 relative overflow-hidden group hover:border-amber-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                            <Flame size={24} fill="currentColor" />
                        </div>
                        <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-100">—</span>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold text-slate-800">אין מפגש מתוכנן</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase mt-1">אין נתונים להצגה</p>
                    </div>
                </div>

                <div className="ui-card p-6 relative overflow-hidden group hover:border-emerald-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold text-slate-800">{averageProgress === null ? '—' : `${averageProgress}%`}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase mt-1">ממוצע התקדמות</p>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${averageProgress ?? 0}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Main Student List */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Layout size={20} className="text-slate-400" />
                            תלמידים בכיתה
                        </h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleFilter}
                                className="text-xs font-bold bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl hover:bg-white transition-colors text-slate-600"
                            >
                                סינון מתקדם
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {students.map(student => (
                            <div 
                                key={student.id} 
                                onClick={() => setSelectedStudent(student.id)}
                                className={`bg-white p-5 rounded-3xl border transition-all cursor-pointer group relative overflow-hidden ${selectedStudent === student.id ? 'border-indigo-500 shadow-md ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-700 font-bold text-lg border border-slate-100 shadow-sm">
                                            {student.avatar}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg">{student.name}</h4>
                                            <p className="text-xs text-slate-500 font-medium">{student.company}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 ${getStatusColor(student.status)}`}>
                                        {getStatusIcon(student.status)}
                                        {getStatusText(student.status)}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                                            <span>התקדמות בקורס</span>
                                            <span>{student.progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-50">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${student.progress < 30 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                                style={{ width: `${student.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                                        <div className="text-[10px] text-slate-400 font-mono font-medium">
                                            צ'ק אין אחרון: {new Date(student.lastCheckIn).toLocaleDateString()}
                                        </div>
                                        <button className="text-slate-300 hover:text-indigo-600 transition-colors bg-slate-50 p-2 rounded-lg hover:bg-indigo-50">
                                            <MessageSquare size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar: Hot Seat & Curriculum */}
                <div className="space-y-8">
                    
                    {/* Hot Seat Queue */}
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Flame size={18} className="text-amber-400 fill-amber-400" />
                                רשימת מושב חם (Hot Seat)
                            </h3>
                            <span className="text-[10px] bg-white/10 px-2 py-1 rounded border border-white/10 font-bold">למפגש הקרוב</span>
                        </div>

                        <div className="space-y-3 relative z-10">
                            {hotSeatQueue.length === 0 ? (
                                <p className="text-white/50 text-xs text-center py-4">אין משתתפים רשומים לייעוץ</p>
                            ) : (
                                hotSeatQueue.map((s, idx) => (
                                    <div key={s.id} className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/5 backdrop-blur-sm group hover:bg-white/20 transition-colors cursor-pointer">
                                        <span className="font-mono text-amber-400 font-bold text-sm w-5 text-center">{idx + 1}</span>
                                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                            {s.avatar}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">{s.name}</div>
                                            <div className="text-[10px] text-white/60">{s.nextHotSeat ? `מועד: ${new Date(s.nextHotSeat).toLocaleDateString()}` : 'מועד: —'}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <button 
                            onClick={handleManageList}
                            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-xs font-bold transition-all shadow-lg text-white"
                        >
                            נהל רשימה
                        </button>
                    </div>

                    {/* Curriculum Status */}
                    <div className="ui-card p-6">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <BookOpen size={18} className="text-slate-400" />
                            סילבוס
                        </h3>
                        <div className="text-center py-8 text-slate-400">
                          <p className="text-sm font-medium">אין סילבוס להצגה</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DeliveryView;
