
import React, { useState } from 'react';
import { 
    Network, Users, Link, DollarSign, Trophy, Copy, 
    ExternalLink, Share2, TrendingUp, Gift, UserPlus, 
    ArrowRight, Wallet, Percent, CheckCircle
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface Partner {
    id: string;
    name: string;
    type: 'affiliate' | 'customer' | 'influencer';
    referrals: number;
    revenue: number;
    commissionRate: number; // Percentage
    unpaidCommission: number;
    lastActive: string;
    avatar: string;
    status: 'active' | 'inactive';
}

const INITIAL_PARTNERS: Partner[] = [
    { id: '1', name: 'יוסי כהן (לקוח עבר)', type: 'customer', referrals: 3, revenue: 45000, commissionRate: 10, unpaidCommission: 4500, lastActive: 'אתמול', avatar: 'YC', status: 'active' },
    { id: '2', name: 'קהילת "עסקים בצמיחה"', type: 'influencer', referrals: 12, revenue: 180000, commissionRate: 15, unpaidCommission: 12000, lastActive: 'לפני שעה', avatar: 'BG', status: 'active' },
    { id: '3', name: 'דנה רוזן (יועצת)', type: 'affiliate', referrals: 1, revenue: 15000, commissionRate: 20, unpaidCommission: 0, lastActive: 'לפני שבוע', avatar: 'DR', status: 'active' },
    { id: '4', name: 'רוני מחשבים', type: 'affiliate', referrals: 0, revenue: 0, commissionRate: 10, unpaidCommission: 0, lastActive: 'לפני חודש', avatar: 'RC', status: 'inactive' },
];

const PartnersView: React.FC = () => {
    const { addToast } = useToast();
    const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS);
    const [searchTerm, setSearchTerm] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);

    const copyLink = (id: string) => {
        const link = `https://growth-consulting.co.il/join?ref=${id}`;
        navigator.clipboard.writeText(link);
        addToast('קישור שותף הועתק ללוח', 'success');
    };

    const handlePay = (id: string) => {
        setPartners(prev => prev.map(p => p.id === id ? { ...p, unpaidCommission: 0 } : p));
        addToast('תשלום עמלה סומן כבוצע', 'success');
    };

    const handleOpenTool = (tool: string) => {
        addToast(`פותח כלי שיווק: ${tool}`, 'info');
    };

    // Calculate Totals
    const totalRevenue = partners.reduce((sum, p) => sum + p.revenue, 0);
    const totalCommissions = partners.reduce((sum, p) => sum + (p.revenue * p.commissionRate / 100), 0);
    const totalPending = partners.reduce((sum, p) => sum + p.unpaidCommission, 0);

    return (
        <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20 space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Network className="text-indigo-600" strokeWidth={2.5} />
                        שתפ"ים
                    </h2>
                </div>
                <button 
                    onClick={() => setShowInviteModal(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 hover:-translate-y-0.5"
                >
                    <UserPlus size={18} />
                    צור שותף חדש
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="ui-card p-6 bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-indigo-200">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">סה"כ הכנסות</span>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold">₪{totalRevenue.toLocaleString()}</h3>
                        <p className="text-indigo-200 text-xs font-medium mt-1">הכנסות שנוצרו משותפים בלבד</p>
                    </div>
                </div>

                <div className="ui-card p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                            <Wallet size={24} />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">עמלות ששולמו</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-slate-800">₪{(totalCommissions - totalPending).toLocaleString()}</h3>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="bg-emerald-500 h-full w-[70%] rounded-full"></div>
                        </div>
                    </div>
                </div>

                <div className="ui-card p-6 border-amber-200 bg-amber-50/50">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl border border-amber-200">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-xs font-bold text-amber-700 uppercase bg-amber-100 px-2 py-1 rounded-lg">לתשלום מיידי</span>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-slate-800">₪{totalPending.toLocaleString()}</h3>
                        <p className="text-slate-500 text-xs font-medium mt-1">ממתין להעברה ל-2 שותפים</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Partners List */}
                <div className="xl:col-span-2 ui-card flex flex-col overflow-hidden min-h-[500px]">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Users size={20} className="text-slate-400" />
                            <h3 className="font-bold text-slate-800 text-lg">רשימת השותפים</h3>
                        </div>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="חיפוש..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-48 focus:w-64"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">שם השותף</th>
                                    <th className="px-6 py-4">הפניות</th>
                                    <th className="px-6 py-4">הכנסות</th>
                                    <th className="px-6 py-4">עמלה</th>
                                    <th className="px-6 py-4">יתרה לתשלום</th>
                                    <th className="px-6 py-4 text-center">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {partners.map(partner => (
                                    <tr key={partner.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100">
                                                    {partner.avatar}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{partner.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                                        {partner.type === 'customer' ? 'לקוח ממליץ' : partner.type === 'influencer' ? 'משפיען' : 'שותף עסקי'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700">
                                            {partner.referrals}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-mono">
                                            ₪{partner.revenue.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-1 rounded-lg w-fit font-bold text-xs">
                                                <Percent size={10} /> {partner.commissionRate}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {partner.unpaidCommission > 0 ? (
                                                <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                                    ₪{partner.unpaidCommission.toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                                                    <CheckCircle size={12} /> שולם
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => copyLink(partner.id)}
                                                    className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"
                                                    title="העתק קישור שותף"
                                                >
                                                    <Link size={16} />
                                                </button>
                                                {partner.unpaidCommission > 0 && (
                                                    <button 
                                                        onClick={() => handlePay(partner.id)}
                                                        className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm"
                                                        title="סמן כשולם"
                                                    >
                                                        <DollarSign size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar: Leaderboard & Tools */}
                <div className="space-y-6">
                    
                    {/* Leaderboard */}
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="flex items-center gap-2 mb-6 relative z-10 text-yellow-400">
                            <Trophy size={20} fill="currentColor" />
                            <h3 className="font-bold text-lg uppercase tracking-wider">טבלת המובילים</h3>
                        </div>

                        <div className="space-y-4 relative z-10">
                            {[...partners].sort((a,b) => b.revenue - a.revenue).slice(0,3).map((p, idx) => (
                                <div key={p.id} className="flex items-center gap-4 bg-white/10 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                                    <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-lg text-slate-900 ${
                                        idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-300' : 'bg-orange-400'
                                    }`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-sm">{p.name}</div>
                                        <div className="text-[10px] text-white/60">גייס: ₪{p.revenue.toLocaleString()}</div>
                                    </div>
                                    {idx === 0 && <CrownIcon />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Tools */}
                    <div className="ui-card p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Gift size={18} className="text-pink-500" />
                            כלי שיווק לשותפים
                        </h3>
                        <div className="space-y-3">
                            <button 
                                onClick={() => handleOpenTool('באנרים')}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-lg text-pink-500 shadow-sm group-hover:text-pink-600"><Share2 size={16} /></div>
                                    <span className="text-sm font-bold text-slate-700">באנרים לסטורי</span>
                                </div>
                                <ArrowRight size={14} className="text-slate-300 group-hover:text-pink-500" />
                            </button>
                            <button 
                                onClick={() => handleOpenTool('טקסטים')}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-lg text-blue-500 shadow-sm group-hover:text-blue-600"><Copy size={16} /></div>
                                    <span className="text-sm font-bold text-slate-700">טקסטים לוואטסאפ</span>
                                </div>
                                <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500" />
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Invite Modal (Mock) */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={() => setShowInviteModal(false)}>
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 animate-scale-in text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                            <UserPlus size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">הזמן שותף חדש</h3>
                        <p className="text-slate-500 text-sm mb-6">שלח הזמנה אישית להצטרף לתוכנית השותפים שלנו.</p>
                        
                        <input type="email" placeholder="דוא&quot;ל שותף" className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-4 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" />
                        
                        <button onClick={() => { addToast('הזמנה נשלחה בהצלחה', 'success'); setShowInviteModal(false); }} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors">
                            שלח הזמנה
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

const CrownIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-yellow-400 fill-yellow-400">
        <path d="M2 4l3 12h14l3-12-6 7-4-13-4 13-6-7zm3 16h14v2H5v-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export default PartnersView;
