
import React, { useState } from 'react';
import { 
    Bell, CircleCheck, TriangleAlert, Info, Clock, Filter, 
    Trash2, Check, User, DollarSign, FileText, Zap, Shield
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

type NotificationType = 'success' | 'warning' | 'error' | 'info' | 'financial';
type Category = 'all' | 'leads' | 'finance' | 'system' | 'tasks';

interface NotificationItem {
    id: string;
    title: string;
    description: string;
    time: string; // Relative time
    type: NotificationType;
    category: Category;
    isRead: boolean;
    actionLabel?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
    { id: '1', title: 'עסקה נסגרה!', description: 'יואב כהן חתם על הצטרפות למאסטרמיינד (₪15,000).', time: 'לפני 10 דק\'', type: 'success', category: 'leads', isRead: false, actionLabel: 'צפה בתיק' },
    { id: '2', title: 'תשלום נכשל', description: 'חיוב חודשי עבור "רון שוורץ" נדחה ע"י חברת האשראי.', time: 'לפני 45 דק\'', type: 'error', category: 'finance', isRead: false, actionLabel: 'נסה שנית' },
    { id: '3', title: 'משימה באיחור', description: 'הכנת מצגת למשקיעים (דדליין: אתמול).', time: 'לפני שעתיים', type: 'warning', category: 'tasks', isRead: false, actionLabel: 'סמן כבוצע' },
    { id: '4', title: 'ליד נפתח ("חם")', description: 'שרה נתניהו השאירה פרטים בקמפיין פייסבוק.', time: 'לפני 3 שעות', type: 'info', category: 'leads', isRead: true },
    { id: '5', title: 'גיבוי מערכת', description: 'גיבוי לילי של בסיס הנתונים בוצע בהצלחה.', time: 'אתמול, 23:00', type: 'info', category: 'system', isRead: true },
    { id: '6', title: 'חשבונית הופקה', description: 'חשבונית מס #1023 נשלחה ללקוח "הייטק סולושנס".', time: 'אתמול, 14:30', type: 'financial', category: 'finance', isRead: true, actionLabel: 'הורד PDF' },
];

const NotificationsView: React.FC = () => {
    const { addToast } = useToast();
    const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
    const [filter, setFilter] = useState<Category>('all');

    const filteredNotifications = notifications.filter(n => filter === 'all' || n.category === filter);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        addToast('כל ההתראות סומנו כנקראו', 'success');
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleAction = (id: string, action: string) => {
        addToast(`פעולה בוצעה: ${action}`, 'success');
        markAsRead(id);
    };

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'success': return <CircleCheck size={20} className="text-emerald-500" />;
            case 'warning': return <TriangleAlert size={20} className="text-amber-500" />;
            case 'error': return <TriangleAlert size={20} className="text-red-500" />;
            case 'financial': return <DollarSign size={20} className="text-blue-500" />;
            default: return <Info size={20} className="text-indigo-500" />;
        }
    };

    const getTypeStyles = (type: NotificationType) => {
        switch (type) {
            case 'success': return 'bg-emerald-50 border-emerald-100';
            case 'warning': return 'bg-amber-50 border-amber-100';
            case 'error': return 'bg-red-50 border-red-100';
            case 'financial': return 'bg-blue-50 border-blue-100';
            default: return 'bg-white border-slate-100';
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-[1200px] mx-auto animate-fade-in pb-20 space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Bell className="text-indigo-600" strokeWidth={2.5} />
                        מרכז העדכון
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">
                        יש לך <span className="font-bold text-slate-800">{unreadCount}</span> עדכונים שלא נקראו.
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={markAllRead}
                        className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                        <Check size={16} /> סמן הכל כנקרא
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* Sidebar Filters */}
                <div className="w-full lg:w-64 shrink-0 space-y-2">
                    <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm sticky top-6">
                        {[
                            { id: 'all', label: 'כל ההתראות', icon: Bell },
                            { id: 'leads', label: 'לידים ומכירות', icon: User },
                            { id: 'finance', label: 'כספים וגבייה', icon: DollarSign },
                            { id: 'tasks', label: 'משימות', icon: CircleCheck },
                            { id: 'system', label: 'מערכת', icon: Shield },
                        ].map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setFilter(cat.id as Category)}
                                className={`w-full text-right px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between transition-colors ${filter === cat.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <cat.icon size={16} />
                                    {cat.label}
                                </div>
                                {cat.id === 'all' && unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notifications List */}
                <div className="flex-1 space-y-4">
                    {filteredNotifications.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <Bell size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">הכל מעודכן!</h3>
                            <p className="text-slate-500 mt-2">אין התראות חדשות בקטגוריה זו.</p>
                        </div>
                    ) : (
                        filteredNotifications.map(notification => (
                            <div 
                                key={notification.id} 
                                onClick={() => markAsRead(notification.id)}
                                className={`relative p-5 rounded-2xl border transition-all cursor-pointer group hover:shadow-md ${
                                    notification.isRead 
                                    ? 'bg-white border-slate-100 opacity-80 hover:opacity-100' 
                                    : `${getTypeStyles(notification.type)} shadow-sm ring-1 ring-inset ring-black/5`
                                }`}
                            >
                                {!notification.isRead && (
                                    <div className="absolute top-5 left-5 w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
                                )}
                                
                                <div className="flex items-start gap-4 pr-2">
                                    <div className={`p-3 rounded-xl bg-white shadow-sm shrink-0 border border-slate-100`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`font-bold text-sm ${notification.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                                                {notification.title}
                                            </h4>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-lg">
                                                <Clock size={10} /> {notification.time}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                            {notification.description}
                                        </p>
                                        
                                        {notification.actionLabel && (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleAction(notification.id, notification.actionLabel!); }}
                                                    className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm"
                                                >
                                                    {notification.actionLabel}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-4 bottom-4">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="מחק התראה"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
};

export default NotificationsView;
