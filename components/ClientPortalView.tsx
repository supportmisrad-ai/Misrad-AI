'use client';

import React, { useState, useEffect } from 'react';
import { 
    Layout, CheckCircle2, Clock, FileText, CreditCard, 
    MessageSquare, Download, ChevronRight, Bell, Shield, 
    LogOut, ExternalLink, Image as ImageIcon, Send,
    X, Check, ClipboardCheck, ArrowRight, Smartphone,
    FileSignature, HelpCircle, Package, Lock, ListChecks,
    CheckCircle, Star, MessageCircle, AlertTriangle, LifeBuoy,
    ThumbsUp, Heart, Sparkles
} from 'lucide-react';
import { Lead, PortalApproval, PortalTask, SupportTicket } from './system/types';
import { useToast } from '../contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

declare const confetti: unknown;

interface ClientPortalProps {
    client: Lead;
    onExit: () => void;
}

const INITIAL_TIMELINE = [
    { id: 1, label: 'אפיון', status: 'done' as const, date: '10/10/23' },
    { id: 2, label: 'הצעת מחיר', status: 'done' as const, date: '12/10/23' },
    { id: 3, label: 'חתימת חוזה', status: 'done' as const, date: '15/10/23' },
    { id: 4, label: 'ביצוע (Delivery)', status: 'active' as const, date: 'בתהליך' },
    { id: 5, label: 'מסירה והשקה', status: 'pending' as const, date: '01/11/23' },
];

const INITIAL_APPROVALS: PortalApproval[] = [
    { id: 'ap1', type: 'proposal', title: 'הצעת מחיר מעודכנת (v2)', date: 'היום, 10:00', status: 'waiting' },
    { id: 'ap2', type: 'feedback', title: 'איך הייתה הפגישה אתמול?', date: 'לפני שעה', status: 'waiting' },
];

const INITIAL_SUPPORT: SupportTicket[] = [
    { id: 'tk1', category: 'service', subject: 'שינוי מועד פגישה שבועית', status: 'in_progress', createdAt: new Date() }
];

const ClientPortalView: React.FC<ClientPortalProps> = ({ client, onExit }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'billing' | 'assets' | 'support'>('dashboard');
    const [isChatOpen, setIsChatOpen] = useState(false);
    
    // State-driven data
    const [approvals, setApprovals] = useState(INITIAL_APPROVALS);
    const [tickets, setTickets] = useState(INITIAL_SUPPORT);
    const [activeFeedback, setActiveFeedback] = useState<boolean>(false);
    const [rating, setRating] = useState<number>(0);

    const handleApprove = (id: string) => {
        setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' as const } : a));
        if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
        addToast('האישור התקבל! תודה על הפידבק.', 'success');
    };

    const submitTicket = (e: React.FormEvent) => {
        e.preventDefault();
        addToast('פנייתך התקבלה ותטופל תוך 4 שעות עבודה.', 'success');
        setActiveTab('dashboard');
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 animate-fade-in relative overflow-x-hidden">
            
            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
                            <Layout size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Nexus Connect</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Client Portal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setActiveTab('support')}
                            className="bg-rose-50 text-primary px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 hover:bg-rose-100"
                        >
                            <LifeBuoy size={14} /> עזרה ופניות
                        </button>
                        <button 
                            onClick={onExit}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-xl transition-colors"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Container */}
            <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
                
                {/* Hero / Pulse Check */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <h2 className="text-3xl font-black text-slate-900 mb-2">שלום, {client.name.split(' ')[0]} 👋</h2>
                        <p className="text-slate-500 font-medium">הנה תמונת המצב של הפרויקט. אנחנו דואגים שהכל יתקדם לפי התוכנית.</p>
                    </div>
                    
                    {/* Experience Score Card - Psychological Anchor */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">מדד חווית שירות</div>
                            <div className="flex gap-1">
                                {[1,2,3,4,5].map(s => (
                                    <Star key={s} size={14} fill={s <= 4 ? "#fbbf24" : "none"} className={s <= 4 ? "text-amber-400" : "text-slate-200"} />
                                ))}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black text-slate-800 leading-none">Excellent</div>
                            <div className="text-[10px] font-bold text-emerald-500 mt-1">עקבי ב-30 יום האחרונים</div>
                        </div>
                    </div>
                </div>

                {/* Sub Navigation */}
                <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit">
                    {[
                        { id: 'dashboard', label: 'פרויקט', icon: Layout },
                        { id: 'billing', label: 'כספים', icon: CreditCard },
                        { id: 'assets', label: 'קבצים', icon: Shield },
                        { id: 'support', label: 'מרכז עזרה', icon: LifeBuoy },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'dashboard' | 'assets' | 'billing' | 'support')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                                activeTab === tab.id 
                                ? 'bg-primary text-white shadow-lg' 
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                        
                        {/* Automatic Feedback Nudge - Triggered by milestones */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="text-center md:text-right">
                                    <div className="inline-flex items-center gap-2 bg-white/20 border border-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                        <Sparkles size={12} className="text-yellow-300" /> Milestone Achievement
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black mb-2">השלמנו את שלב האפיון! 🚀</h3>
                                    <p className="text-indigo-100 font-medium max-w-md">איך הייתה החוויה שלך עד עכשיו? הפידבק שלך עוזר לנו להשתפר.</p>
                                </div>
                                <div className="flex flex-col gap-3 min-w-[200px]">
                                    <button onClick={() => setActiveFeedback(true)} className="bg-white text-indigo-900 px-6 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                                        <ThumbsUp size={18} /> תנו לי לפרגן
                                    </button>
                                    <button className="text-white/60 text-xs font-bold hover:text-white transition-colors underline">יש לי הערות לשיפור</button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Live Approvals / Feedback Tasks */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <FileSignature size={20} className="text-primary" />
                                    ממתין להתייחסותך
                                </h3>
                                <div className="space-y-4">
                                    {approvals.filter(a => a.status === 'waiting').map(item => (
                                        <div key={item.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all group">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${item.type === 'feedback' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                        {item.type === 'feedback' ? <Star size={20} /> : <FileText size={20} />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{item.title}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{item.date}</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleApprove(item.id)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:border-primary hover:text-primary transition-all">
                                                    {item.type === 'feedback' ? 'דרג עכשיו' : 'אשר'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ticket Status - Transparency for complaints/requests */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    < LifeBuoy size={20} className="text-slate-400" />
                                    סטטוס פניות שירות
                                </h3>
                                <div className="space-y-4">
                                    {tickets.map(tk => (
                                        <div key={tk.id} className="p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800">{tk.subject}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium">#{tk.id} • נפתח ב-{tk.createdAt.toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">בטיפול</span>
                                        </div>
                                    ))}
                                    <button onClick={() => setActiveTab('support')} className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold hover:border-primary hover:text-primary transition-all">
                                        + פתח פנייה חדשה
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'support' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto space-y-8 pb-20">
                        <div className="text-center">
                            <h2 className="text-3xl font-black text-slate-900 mb-2">איך אנחנו יכולים לעזור?</h2>
                            <p className="text-slate-500">אנחנו פה בשבילך לכל שאלה, הערה או בקשה לשיפור.</p>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex gap-4">
                                <div className="bg-white p-3 rounded-2xl shadow-sm text-rose-500"><AlertTriangle size={24} /></div>
                                <div>
                                    <h3 className="font-black text-slate-800">דיווח על בעיה או בקשת שינוי</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">אנחנו מתחייבים למענה מהיר ומקצועי</p>
                                </div>
                            </div>
                            
                            <form onSubmit={submitTicket} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">נושא הפנייה</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-primary/5 transition-all outline-none">
                                        <option>בעיה טכנית במערכת</option>
                                        <option>בקשה לשינוי בלו"ז</option>
                                        <option>הערה לגבי איכות השירות</option>
                                        <option>שאלה בנושא תשלומים</option>
                                        <option>אחר</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">פירוט הבקשה</label>
                                    <textarea 
                                        required
                                        rows={5}
                                        placeholder="נא פרט כאן את בקשתך כדי שנוכל לעזור בצורה הטובה ביותר..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-primary/5 transition-all outline-none resize-none"
                                    />
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                    <LifeBuoy size={20} className="text-amber-600 shrink-0" />
                                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                                        <strong>חשוב לנו שתדע:</strong> אנחנו רואים בכל תלונה או הערה הזדמנות להשתפר. הצוות שלנו יחזור אליך בהקדם האפשרי.
                                    </p>
                                </div>
                                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                                    <Send size={18} /> שלח פנייה לצוות
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>

            </main>

            {/* Testimonial Collector Modal - Pop-up after milestone */}
            <AnimatePresence>
            {activeFeedback && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
                        <div className="p-10 text-center space-y-6">
                            <div className="w-20 h-20 bg-rose-50 text-primary rounded-full flex items-center justify-center mx-auto shadow-inner">
                                <Heart size={40} fill="currentColor" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900">וואו, איזה כיף! 🌟</h2>
                            <p className="text-slate-500 font-medium leading-relaxed">
                                שמחים לשמוע ששלב האפיון עבר בהצלחה. האם תרצה להשאיר המלצה קצרה שנוכל לשתף? זה עוזר לנו המון!
                            </p>
                            
                            <div className="flex justify-center gap-2">
                                {[1,2,3,4,5].map(s => (
                                    <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-125">
                                        <Star size={32} fill={s <= rating ? "#fbbf24" : "none"} className={s <= rating ? "text-amber-400" : "text-slate-200"} />
                                    </button>
                                ))}
                            </div>

                            <textarea 
                                placeholder="כתבו כמה מילים על החוויה שלכם..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-primary/5 outline-none resize-none"
                                rows={3}
                            />

                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => {
                                        setActiveFeedback(false);
                                        addToast('תודה רבה! המלצתך נשמרה.', 'success');
                                        if (typeof confetti === 'function') confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
                                    }}
                                    className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-rose-200"
                                >
                                    פרסם המלצה
                                </button>
                                <button onClick={() => setActiveFeedback(false)} className="text-slate-400 text-xs font-bold hover:text-slate-600">לא עכשיו, תודה</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            </AnimatePresence>

        </div>
    );
};

export default ClientPortalView;
