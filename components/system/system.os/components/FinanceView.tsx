
import React, { useState, useMemo } from 'react';
import { 
    Wallet, TrendingUp, DollarSign, Receipt, 
    AlertCircle, FileText, Gem, Coins, Repeat, AlertTriangle, Send, CheckCircle2, Crown, ArrowRight, ShoppingBag, Clock, RotateCcw, ArrowUpRight, Users, Zap, ShieldCheck
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import CatalogView from './CatalogView';
import { Invoice, Lead } from '../types';

interface FinanceViewProps {
    invoices?: Invoice[];
    onAddInvoice?: (invoice: Invoice) => void;
    onUpdateInvoice?: (invoice: Invoice) => void;
    leads?: Lead[]; // Added leads to calculate MRR from recurring products
}

const FinanceView: React.FC<FinanceViewProps> = ({ invoices = [], onAddInvoice, onUpdateInvoice, leads = [] }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'commission' | 'mrr' | 'invoices' | 'catalog'>('mrr');

    // --- Mock MRR Data ---
    const mrrTrend = useMemo(() => {
        const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = (d: Date) => d.toLocaleDateString('he-IL', { month: 'short' });

        const now = new Date();
        const months: { key: string; label: string }[] = [];
        for (let i = 5; i >= 0; i -= 1) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ key: monthKey(d), label: monthLabel(d) });
        }

        const totalsByMonth = new Map<string, number>();
        for (const inv of invoices) {
            if (inv.status !== 'paid') continue;
            const d = new Date(inv.date);
            if (Number.isNaN(d.getTime())) continue;
            const key = monthKey(d);
            totalsByMonth.set(key, (totalsByMonth.get(key) || 0) + (inv.amount || 0));
        }

        return months.map(m => ({ month: m.label, mrr: totalsByMonth.get(m.key) || 0 }));
    }, [invoices]);

    const activeSubscriptions = useMemo(() => {
        // Filter leads with products that are recurring (mastermind, consulting)
        return leads.filter(l => l.status === 'won' && (l.productInterest === 'mastermind_group' || l.productInterest === 'premium_1on1'));
    }, [leads]);

    const totalMRR = activeSubscriptions.reduce((sum, l) => sum + (l.productInterest === 'mastermind_group' ? 5000 : 15000), 0);
    const arpu = activeSubscriptions.length ? Math.round(totalMRR / activeSubscriptions.length) : 0;

    const healthBreakdown = useMemo(() => {
        const now = new Date();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const active = activeSubscriptions as any[];
        if (!active.length) return { stable: 0, medium: 0, high: 0 };

        let stable = 0;
        let medium = 0;
        let high = 0;

        for (const sub of active) {
            const end = sub?.subscriptionEndDate ? new Date(sub.subscriptionEndDate) : null;
            if (!end || Number.isNaN(end.getTime())) {
                stable += 1;
                continue;
            }
            const daysLeft = (end.getTime() - endOfDay.getTime()) / 86400000;
            if (daysLeft > 30) stable += 1;
            else if (daysLeft >= 0) medium += 1;
            else high += 1;
        }

        const total = stable + medium + high;
        return {
            stable: Math.round((stable / total) * 100),
            medium: Math.round((medium / total) * 100),
            high: Math.max(0, 100 - Math.round((stable / total) * 100) - Math.round((medium / total) * 100)),
        };
    }, [activeSubscriptions]);

    // Stats Calculations - Net Revenue (subtracting refunded)
    const stats = useMemo(() => {
        const paid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
        const refunded = invoices.filter(i => i.status === 'refunded').reduce((sum, i) => sum + i.amount, 0);
        const pending = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0);
        return { net: paid - refunded, gross: paid, refunded, pending };
    }, [invoices]);

    const currentCommission = Math.round(stats.net * 0.05);
    const nextTier = 10000;
    const progressPercent = Math.min((currentCommission / nextTier) * 100, 100);

    const handleRefund = (invoice: Invoice) => {
        if (user?.role !== 'admin') {
            addToast('רק מנהל רשאי לבצע החזר כספי', 'error');
            return;
        }
        
        if (window.confirm(`האם אתה בטוח שברצונך לזכות את ${invoice.client} על סך ₪${invoice.amount.toLocaleString()}? הפעולה תתועד ותקוזז מהעמלות.`)) {
            if (onUpdateInvoice) {
                onUpdateInvoice({ ...invoice, status: 'refunded', refundReason: 'Manual Refund' });
                addToast('הזיכוי בוצע בהצלחה ודווח למערכת', 'success');
            }
        }
    };

    return (
        <div className="h-full flex flex-col font-sans">
            {/* Header Tabs */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-2 sticky top-0 z-30 shadow-sm overflow-x-auto no-scrollbar">
                <div className="flex gap-6 min-w-max">
                    <button onClick={() => setActiveTab('commission')} className={`flex items-center gap-2 py-3 px-1 border-b-2 transition-all font-bold ${activeTab === 'commission' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Gem size={18} /> הבונוס שלי</button>
                    {user?.role === 'admin' && <button onClick={() => setActiveTab('mrr')} className={`flex items-center gap-2 py-3 px-1 border-b-2 transition-all font-bold ${activeTab === 'mrr' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Repeat size={18} /> הכנסה קבועה (MRR)</button>}
                    <button onClick={() => setActiveTab('invoices')} className={`flex items-center gap-2 py-3 px-1 border-b-2 transition-all font-bold ${activeTab === 'invoices' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Receipt size={18} /> גבייה וזיכויים</button>
                    <button onClick={() => setActiveTab('catalog')} className={`flex items-center gap-2 py-3 px-1 border-b-2 transition-all font-bold ${activeTab === 'catalog' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><ShoppingBag size={18} /> קטלוג</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                
                {/* --- TAB: MRR DASHBOARD --- */}
                {activeTab === 'mrr' && (
                    <div className="p-4 md:p-8 max-w-[1920px] mx-auto space-y-8 animate-fade-in pb-24">
                        
                        {/* Summary Header */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="ui-card p-8 bg-onyx-900 text-white border-none shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full"></div>
                                <div className="relative z-10">
                                    <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Monthly Recurring Revenue</p>
                                    <h3 className="text-4xl font-mono font-black tracking-tighter">₪{totalMRR.toLocaleString()}</h3>
                                    <div className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                        <ArrowUpRight size={14} /> +8.4% מהחודש שעבר
                                    </div>
                                </div>
                            </div>

                            <div className="ui-card p-8 flex flex-col justify-between h-44">
                                <div>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">לקוחות פעילים (Subscribed)</p>
                                    <h3 className="text-3xl font-mono font-black text-slate-900">{activeSubscriptions.length}</h3>
                                </div>
                                <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">ARPU: <span className="text-slate-800">₪{arpu.toLocaleString()}</span></div>
                                </div>
                            </div>

                            <div className="ui-card p-8 flex flex-col justify-between h-44">
                                <div>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">שיעור נטישה (Net Churn)</p>
                                    <h3 className="text-3xl font-mono font-black text-rose-600">0%</h3>
                                </div>
                                <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 w-fit">מתחת לממוצע הענפי</div>
                            </div>

                            <div className="ui-card p-8 flex flex-col justify-between h-44 bg-indigo-50/30 border-indigo-100">
                                <div>
                                    <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1">צפי שנתי (ARR)</p>
                                    <h3 className="text-3xl font-mono font-black text-indigo-900">₪{(totalMRR * 12).toLocaleString()}</h3>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400">
                                    <Zap size={10} fill="currentColor" /> מבוסס על צמיחה נוכחית
                                </div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 ui-card p-8 md:p-10 min-h-[450px] flex flex-col">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800">מגמת צמיחה חודשית</h3>
                                        <p className="text-slate-400 text-sm font-medium">מעקב MRR וצמצום נטישה</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                                            <span className="text-xs font-bold text-slate-500">הכנסה (MRR)</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex-1 w-full mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={mrrTrend}>
                                            <defs>
                                                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4338CA" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#4338CA" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12, fontWeight: 700}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.1)', padding: '16px' }}
                                                formatter={(value: number) => [`₪${value.toLocaleString()}`, 'MRR']}
                                            />
                                            <Area type="monotone" dataKey="mrr" stroke="#4338CA" strokeWidth={4} fillOpacity={1} fill="url(#colorMrr)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="ui-card p-8 flex flex-col">
                                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <ShieldCheck size={20} className="text-emerald-500" />
                                    ניתוח בריאות מנויים
                                </h3>
                                <div className="space-y-6 flex-1">
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                        <div className="flex justify-between text-xs font-bold text-emerald-800 mb-2">
                                            <span>במצב מצוין (יציב)</span>
                                            <span>{healthBreakdown.stable}%</span>
                                        </div>
                                        <div className="w-full bg-white/50 h-2 rounded-full overflow-hidden">
                                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${healthBreakdown.stable}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                        <div className="flex justify-between text-xs font-bold text-amber-800 mb-2">
                                            <span>סיכון בינוני</span>
                                            <span>{healthBreakdown.medium}%</span>
                                        </div>
                                        <div className="w-full bg-white/50 h-2 rounded-full overflow-hidden">
                                            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${healthBreakdown.medium}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                                        <div className="flex justify-between text-xs font-bold text-red-800 mb-2">
                                            <span>בסכנת נטישה מיידית</span>
                                            <span>{healthBreakdown.high}%</span>
                                        </div>
                                        <div className="w-full bg-white/50 h-2 rounded-full overflow-hidden">
                                            <div className="bg-red-500 h-full rounded-full" style={{ width: `${healthBreakdown.high}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <button className="mt-8 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all flex items-center justify-center gap-2">
                                    הפק דוח נטישה מפורט <FileText size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Active Subscribers Table */}
                        <div className="ui-card overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Users size={20} className="text-slate-400" /> רשימת מנויים פעילה</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">לקוח</th>
                                            <th className="px-6 py-4">תוכנית</th>
                                            <th className="px-6 py-4">סכום חודשי</th>
                                            <th className="px-6 py-4">חיוב הבא</th>
                                            <th className="px-6 py-4">סטטוס</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {activeSubscriptions.map(client => (
                                            <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200">{client.name.charAt(0)}</div>
                                                        <div className="font-bold text-slate-800">{client.name}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-slate-600 font-medium">{client.productInterest === 'mastermind_group' ? 'מאסטרמיינד' : 'ליווי פרימיום'}</span>
                                                </td>
                                                <td className="px-6 py-4 font-mono font-bold text-indigo-600">₪{client.productInterest === 'mastermind_group' ? '5,000' : '15,000'}</td>
                                                <td className="px-6 py-4 text-slate-500 font-medium">{(client as any)?.subscriptionEndDate ? new Date((client as any).subscriptionEndDate).toLocaleDateString('he-IL') : '—'}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                        <span className="text-xs font-bold text-emerald-700">פעיל</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-left">
                                                    <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><ArrowRight size={18} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: COMMISSION --- */}
                {activeTab === 'commission' && (
                    <div className="p-4 md:p-8 max-w-[1920px] mx-auto space-y-8 animate-slide-up pb-20">
                        <div className="bg-[#0f172a] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10 group">
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-amber-500/20 to-transparent rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                            <div className="relative z-10 flex flex-col items-center text-center mb-10">
                                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 shadow-lg shadow-amber-500/20"><Crown size={14} fill="currentColor" /> בונוס חודשי (נטו)</div>
                                <h3 className="text-6xl md:text-8xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 mb-2 tracking-tighter">₪{currentCommission.toLocaleString()}</h3>
                                <p className="text-amber-200/60 font-bold uppercase tracking-widest text-xs">עמלות לאחר קיזוז החזרים</p>
                            </div>
                            <div className="relative h-3 bg-slate-800 rounded-full mb-3 max-w-3xl mx-auto"><div className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-200 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.6)] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div></div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest max-w-3xl mx-auto"><span>0</span><span className="text-amber-400 animate-pulse">עוד ₪{(nextTier - currentCommission).toLocaleString()} ליעד הבא</span><span>₪{nextTier.toLocaleString()}</span></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div className="text-slate-400 text-xs font-bold uppercase mb-2">סה"כ הכנסות (ברוטו)</div>
                                <div className="text-3xl font-black text-slate-800">₪{stats.gross.toLocaleString()}</div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm flex flex-col justify-between bg-red-50/20">
                                <div className="text-red-400 text-xs font-bold uppercase mb-2">החזרים וזיכויים</div>
                                <div className="text-3xl font-black text-red-600">₪{stats.refunded.toLocaleString()}</div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-between bg-emerald-50/20">
                                <div className="text-emerald-400 text-xs font-bold uppercase mb-2">הכנסה נטו (לחישוב)</div>
                                <div className="text-3xl font-black text-emerald-600">₪{stats.net.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: INVOICES --- */}
                {activeTab === 'invoices' && (
                    <div className="p-4 md:p-8 max-w-[1920px] mx-auto space-y-6 animate-slide-up pb-20">
                        <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Receipt size={20} className="text-slate-500" /> יומן חשבוניות וזיכויים</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">לקוח</th>
                                            <th className="px-6 py-4">תיאור</th>
                                            <th className="px-6 py-4">סכום</th>
                                            <th className="px-6 py-4">סטטוס</th>
                                            <th className="px-6 py-4 text-center">פעולות</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {invoices.map(inv => (
                                            <tr key={inv.id} className={`hover:bg-slate-50 transition-colors ${inv.status === 'refunded' ? 'bg-red-50/30' : ''}`}>
                                                <td className="px-6 py-4 font-bold text-slate-800">{inv.client}</td>
                                                <td className="px-6 py-4 text-slate-500">{inv.item}</td>
                                                <td className="px-6 py-4 font-mono font-bold text-slate-700">₪{inv.amount.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                                                        inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                                        inv.status === 'refunded' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        'bg-slate-50 text-slate-500 border-slate-200'
                                                    }`}>
                                                        {inv.status === 'paid' ? 'שולם' : inv.status === 'refunded' ? 'בוצע זיכוי' : 'ממתין'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        {inv.status === 'paid' && user?.role === 'admin' && (
                                                            <button onClick={() => handleRefund(inv)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="בצע החזר כספי"><RotateCcw size={16} /></button>
                                                        )}
                                                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><FileText size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'catalog' && <CatalogView />}
            </div>
        </div>
    );
};

export default FinanceView;
