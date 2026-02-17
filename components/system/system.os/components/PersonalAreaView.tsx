
import React, { useState } from 'react';
import { 
    User, Mail, Phone, Lock, Save, Bell, Shield, 
    SquareActivity, Clock, Camera, Award, Star, Zap, Settings,
    LogOut, CircleCheckBig, TrendingUp, Trophy
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Lead, Task } from '../types';

interface PersonalAreaViewProps {
    leads?: Lead[];
    tasks?: Task[];
}

const PersonalAreaView: React.FC<PersonalAreaViewProps> = ({ leads = [], tasks = [] }) => {
    const { user, logout } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'SquareActivity'>('overview');
    
    // Form State
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: 'user@nexus.os',
        phone: '050-1234567',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [notifications, setNotifications] = useState({
        email_leads: true,
        email_tasks: false,
        push_leads: true,
        push_mentions: true,
        push_system: false
    });

    // Mock Data for Personal Stats
    const myLeads = leads.filter(l => l.assignedAgentId === user?.id || !l.assignedAgentId);
    const myWon = myLeads.filter(l => l.status === 'won').length;
    const myAssignedTasks = tasks.filter(t => t.assigneeId === user?.id);
    const myTasks = myAssignedTasks.filter(t => String(t.status).toLowerCase() !== 'done').length;
    const completedTasks = myAssignedTasks.filter(t => String(t.status).toLowerCase() === 'done').length;
    const completionRate = myAssignedTasks.length ? Math.round((completedTasks / myAssignedTasks.length) * 100) : 0;

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        addToast('הפרופיל עודכן בהצלחה', 'success');
    };

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            addToast('הסיסמאות אינן תואמות', 'error');
            return;
        }
        addToast('הסיסמה שונתה בהצלחה', 'success');
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    };

    return (
        <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20 space-y-8 h-full flex flex-col">
            
            {/* Hero Profile Header */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shrink-0">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-rose-600/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    <div className="relative group cursor-pointer">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-indigo-500 to-rose-500 p-1 shadow-2xl">
                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-4xl md:text-5xl font-bold border-4 border-slate-900 overflow-hidden relative">
                                {user?.avatar}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera size={24} />
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-2 right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-lg" title="מחובר">
                            <CircleCheckBig size={14} fill="currentColor" className="text-white" />
                        </div>
                    </div>
                    
                    <div className="text-center md:text-right flex-1">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-2">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight">{user?.name}</h1>
                            <span className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                {user?.role === 'admin' ? <Shield size={12} className="text-rose-400" /> : <User size={12} className="text-indigo-400" />}
                                {user?.role === 'admin' ? 'Super Admin' : 'Sales Agent'}
                            </span>
                        </div>
                        <p className="text-slate-400 text-lg font-medium mb-6">{formData.email} • מחובר מאז הבוקר</p>
                        
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
                                <div className="p-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg"><Trophy size={16} /></div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">דירוג</div>
                                    <div className="font-bold leading-none">—</div>
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
                                <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg"><Zap size={16} /></div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">יעילות</div>
                                    <div className="font-bold leading-none">—</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={logout}
                        className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 backdrop-blur-sm border border-white/5 group"
                    >
                        <LogOut size={18} className="text-rose-400 group-hover:text-rose-300 transition-colors" />
                        התנתק
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 border-b border-slate-200 px-4 md:px-0 overflow-x-auto no-scrollbar">
                {[
                    { id: 'overview', label: 'סקירה אישית', icon: SquareActivity },
                    { id: 'settings', label: 'הגדרות חשבון', icon: Settings },
                    { id: 'SquareActivity', label: 'אירועי פעילות', icon: Clock },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'overview' | 'settings' | 'SquareActivity')}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all font-bold whitespace-nowrap text-sm md:text-base ${
                            activeTab === tab.id 
                            ? 'border-slate-900 text-slate-900' 
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 animate-slide-up">
                
                {/* --- TAB: OVERVIEW --- */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Stats Cards */}
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40 group hover:border-indigo-300 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Star size={24} fill="currentColor" /></div>
                                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">+5 השבוע</span>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-slate-800">{myWon}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase mt-1">סגירות החודש</div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40 group hover:border-rose-300 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><TrendingUp size={24} /></div>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-slate-800">{completionRate}%</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase mt-1">אחוז השלמת משימות</div>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${completionRate}%` }}></div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40 group hover:border-emerald-300 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Award size={24} /></div>
                                    <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">מקום 1</span>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-slate-800">42</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase mt-1">ימי רצף (Streak)</div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Achievements */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Award size={20} className="text-yellow-500" /> ההישגים שלי
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { title: 'סוגר העל', desc: '5 סגירות בשבוע אחד', date: 'לפני יומיים', icon: '🔥', color: 'bg-orange-100 text-orange-600' },
                                    { title: 'מאסטר CRM', desc: 'ביצוע מושלם של כל המשימות', date: 'לפני שבוע', icon: '⚡', color: 'bg-blue-100 text-blue-600' },
                                    { title: 'חביב הקהל', desc: 'משוב חיובי מ-10 לקוחות', date: 'לפני שבועיים', icon: '❤️', color: 'bg-rose-100 text-rose-600' },
                                ].map((badge, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-default">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm ${badge.color}`}>
                                            {badge.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-800 text-sm">{badge.title}</div>
                                            <div className="text-xs text-slate-500">{badge.desc}</div>
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                                            {badge.date}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: SETTINGS --- */}
                {activeTab === 'settings' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* Personal Info Form */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <User size={20} className="text-slate-400" />
                                פרטים אישיים
                            </h3>
                            <form onSubmit={handleSaveProfile} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">שם מלא</label>
                                    <input 
                                        type="text" 
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">אימייל</label>
                                        <input 
                                            type="email" 
                                            value={formData.email}
                                            disabled
                                            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">טלפון</label>
                                        <input 
                                            type="tel" 
                                            value={formData.phone}
                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button type="submit" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-all flex items-center gap-2">
                                        <Save size={16} /> שמור שינויים
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Security & Notifications */}
                        <div className="space-y-8">
                            
                            {/* Password Change */}
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Lock size={20} className="text-slate-400" />
                                    אבטחה וסיסמה
                                </h3>
                                <form onSubmit={handlePasswordChange} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">סיסמה נוכחית</label>
                                        <input 
                                            type="password" 
                                            value={formData.currentPassword}
                                            onChange={e => setFormData({...formData, currentPassword: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">סיסמה חדשה</label>
                                            <input 
                                                type="password" 
                                                value={formData.newPassword}
                                                onChange={e => setFormData({...formData, newPassword: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">אימות סיסמה</label>
                                            <input 
                                                type="password" 
                                                value={formData.confirmPassword}
                                                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-2 text-right">
                                        <button type="submit" className="text-sm font-bold text-slate-600 hover:text-slate-900 underline">
                                            עדכן סיסמה
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Notification Preferences */}
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Bell size={20} className="text-slate-400" />
                                    העדפות התראה
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600"><Mail size={16} /></div>
                                            <span className="text-sm font-bold text-slate-700">סיכום יומי במייל</span>
                                        </div>
                                        <div 
                                            onClick={() => setNotifications(p => ({ ...p, email_leads: !p.email_leads }))}
                                            className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${notifications.email_leads ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${notifications.email_leads ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-rose-600"><Bell size={16} /></div>
                                            <span className="text-sm font-bold text-slate-700">לידים חדשים (Push)</span>
                                        </div>
                                        <div 
                                            onClick={() => setNotifications(p => ({ ...p, push_leads: !p.push_leads }))}
                                            className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${notifications.push_leads ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${notifications.push_leads ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* --- TAB: SquareActivity --- */}
                {activeTab === 'SquareActivity' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 text-lg">אירועי פעילות אישיים</h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {[
                                    { action: 'התחברות למערכת', time: 'היום, 09:00', ip: '84.102.12.5', device: 'Chrome / Mac' },
                                    { action: 'עדכון סטטוס ליד (יואב כהן)', time: 'אתמול, 14:30', ip: '84.102.12.5', device: 'Chrome / Mac' },
                                    { action: 'יצירת הצעת מחיר', time: 'אתמול, 11:15', ip: '84.102.12.5', device: 'Chrome / Mac' },
                                    { action: 'שינוי סיסמה', time: 'לפני יומיים', ip: '84.102.12.5', device: 'Chrome / Mac' },
                                ].map((log, idx) => (
                                    <div key={idx} className="p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                                <SquareActivity size={18} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{log.action}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{log.device} • {log.ip}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                                            {log.time}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default PersonalAreaView;
