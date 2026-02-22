'use client';

import React, { useState, useMemo } from 'react';
import { Lead, Campaign, Task } from './types';
import { 
    BarChart3, PieChart as PieChartIcon, TrendingUp, Calendar, 
    Download, Filter, FileText, ChevronDown, ArrowUpRight, 
    ArrowDownRight, Printer, Share2, Layers, FileSpreadsheet, 
    ChevronRight, MoreVertical, Search, FilterX, DollarSign,
    Zap, SquareActivity, DownloadCloud
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend, ComposedChart, Line
} from 'recharts';
import { useToast } from './contexts/ToastContext';

interface ReportsViewProps {
    leads: Lead[];
    campaigns: Campaign[];
    tasks: Task[];
}

const ReportsView: React.FC<ReportsViewProps> = ({ leads, campaigns, tasks }) => {
    const { addToast } = useToast();
    const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

    const trendData = useMemo(() => [], []);

    const wonLeadsCount = useMemo(
      () => leads.filter(l => String(l.status).toLowerCase() === 'won').length,
      [leads]
    );

    const totalRevenue = useMemo(
      () => leads.reduce((sum, l) => (String(l.status).toLowerCase() === 'won' ? sum + (Number(l.value) || 0) : sum), 0),
      [leads]
    );

    const totalSpent = useMemo(
      () => campaigns.reduce((sum, c) => sum + (Number((c as unknown as { spent?: number }).spent) || 0), 0),
      [campaigns]
    );

    const totalProfit = useMemo(() => Math.max(0, totalRevenue - totalSpent), [totalRevenue, totalSpent]);

    const conversionRate = useMemo(
      () => (leads.length ? Math.round((wonLeadsCount / leads.length) * 1000) / 10 : null),
      [leads.length, wonLeadsCount]
    );

    const cpl = useMemo(
      () => (leads.length ? Math.round((totalSpent / leads.length) * 10) / 10 : null),
      [leads.length, totalSpent]
    );

    const formatILS = (amount: number) => `₪${Math.round(amount).toLocaleString('he-IL')}`;

    // Traffic Sources
    const sourceData = useMemo(() => {
        const counts: Record<string, number> = {};
        leads.forEach(l => {
            counts[l.source] = (counts[l.source] || 0) + 1;
        });
        return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
    }, [leads]);

    const funnelData = useMemo(
      () => [
        { name: 'לידים', value: leads.length, fill: '#4338CA' },
        { name: 'סגירות', value: wonLeadsCount, fill: '#818CF8' },
      ],
      [leads.length, wonLeadsCount]
    );

    const SAVED_REPORTS: { id: string; name: string; type: 'PDF' | 'XLSX'; date: string; size: string; color: string }[] = [];

    return (
        <div className="p-4 md:p-10 space-y-10 animate-fade-in pb-32 max-w-[1920px] mx-auto w-full font-sans">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">דוחות ונתונים</h1>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex">
                        {[
                            { id: 'month', label: 'החודש' },
                            { id: 'quarter', label: 'רבעון' },
                            { id: 'year', label: 'שנתי' }
                        ].map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id as 'month' | 'quarter' | 'year')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    period === p.id 
                                    ? 'bg-slate-900 text-white shadow-lg' 
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => {
                            if (!leads.length) { addToast('אין נתונים לייצוא', 'error'); return; }
                            if (typeof document === 'undefined') return;
                            const headers = ['שם', 'מקור', 'סטטוס', 'ערך', 'תאריך'];
                            const rows = leads.map(l => {
                                const rec = l as unknown as Record<string, unknown>;
                                return [
                                    String(rec.name ?? ''),
                                    String(l.source ?? ''),
                                    String(l.status ?? ''),
                                    String(rec.value ?? '0'),
                                    String(rec.createdAt ?? rec.date ?? ''),
                                ];
                            });
                            const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
                            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            URL.revokeObjectURL(url);
                            addToast('הדוח ירד למחשב בהצלחה', 'success');
                        }}
                        className="bg-primary text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-primary-dark transition-all flex items-center gap-2"
                    >
                        <DownloadCloud size={18} />
                        ייצוא דוח
                    </button>
                </div>
            </div>

            {/* KPI Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'הכנסות', value: leads.length ? formatILS(totalRevenue) : '—', delta: null as string | null, isPos: true, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'רווח נקי', value: leads.length ? formatILS(totalProfit) : '—', delta: null as string | null, isPos: true, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'יחס המרה', value: conversionRate === null ? '—' : `${conversionRate}%`, delta: null as string | null, isPos: true, icon: Zap, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'עלות ליד (CPL)', value: cpl === null ? '—' : formatILS(cpl), delta: null as string | null, isPos: true, icon: SquareActivity, color: 'text-amber-600', bg: 'bg-amber-50' }
                ].map((kpi, idx) => (
                    <div key={idx} className="ui-card p-8 flex flex-col justify-between h-44 relative overflow-hidden group">
                        <div className="flex justify-between items-start z-10">
                            <div className={`p-3 rounded-2xl ${kpi.bg} ${kpi.color}`}>
                                <kpi.icon size={24} />
                            </div>
                            <span className="text-xs font-black px-2.5 py-1 rounded-full border text-slate-500 bg-slate-50 border-slate-100">—</span>
                        </div>
                        <div className="z-10 mt-4">
                            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</div>
                            <div className="text-3xl font-black text-slate-900 tracking-tight font-mono">{kpi.value}</div>
                        </div>
                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                    </div>
                ))}
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Revenue Trend - Primary Chart */}
                <div className="lg:col-span-8 ui-card p-8 md:p-10 min-h-[500px] flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">מגמת הכנסות ורווח</h3>
                            <p className="text-slate-400 text-sm font-medium">ביצועים שבועיים בהשוואה לתחזית</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                                <span className="text-xs font-bold text-slate-500">הכנסות</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <span className="text-xs font-bold text-slate-500">רווח</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#94A3B8', fontSize: 12, fontWeight: 700}} 
                                    dy={10}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} />
                                <Tooltip 
                                    cursor={{fill: '#F8FAFC', radius: 12}}
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.1)', padding: '16px' }}
                                />
                                <Bar dataKey="revenue" name="הכנסות" fill="#4338CA" radius={[8, 8, 0, 0]} barSize={40} />
                                <Line type="monotone" dataKey="profit" name="רווח" stroke="#10B981" strokeWidth={4} dot={{ r: 6, fill: '#10B981', strokeWidth: 3, stroke: '#fff' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Traffic Sources - Pie Chart */}
                <div className="lg:col-span-4 ui-card p-8 md:p-10 flex flex-col">
                    <div className="mb-6">
                        <h3 className="text-xl font-black text-slate-800">מקורות תנועה</h3>
                        <p className="text-slate-400 text-sm font-medium">פילוח אפקטיביות ערוצים</p>
                    </div>
                    
                    <div className="flex-1 relative min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sourceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                    cornerRadius={12}
                                    stroke="none"
                                >
                                    {sourceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#4338CA', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE', '#E0E7FF', '#F1F5F9'][index % 7]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-black text-slate-800 leading-none">{leads.length}</span>
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">לידים</span>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {sourceData.slice(0, 4).map((entry, index) => (
                            <div key={index} className="flex items-center justify-between text-xs font-bold">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#4338CA', '#6366F1', '#818CF8', '#A5B4FC'][index % 4] }}></div>
                                    <span>{entry.name}</span>
                                </div>
                                <span className="font-mono text-slate-900">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Funnel & Saved Reports Section */}
                <div className="lg:col-span-6 ui-card p-8 md:p-10 min-h-[400px] flex flex-col">
                    <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
                        <Layers size={22} className="text-rose-500" />
                        משפך המרה (Funnel)
                    </h3>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} layout="vertical" margin={{ left: 40 }}>
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#64748B', fontWeight: 700, fontSize: 13}} 
                                />
                                <Tooltip cursor={{fill: '#F1F5F9', radius: 10}} contentStyle={{ borderRadius: '12px' }} />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                                    {funnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Saved Reports Archive */}
                <div className="lg:col-span-6 ui-card p-8 md:p-10 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <FileText size={22} className="text-indigo-600" />
                            דוחות שמורים
                        </h3>
                        <button className="text-xs font-black text-indigo-600 hover:underline uppercase tracking-wider">הצג הכל</button>
                    </div>
                    
                    <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                        {SAVED_REPORTS.length === 0 ? (
                          <div className="p-6 bg-white border border-slate-100 rounded-[24px] text-center text-sm font-bold text-slate-500">
                            אין דוחות שמורים
                          </div>
                        ) : SAVED_REPORTS.map((report) => (
                            <div key={report.id} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-[24px] hover:border-indigo-200 hover:shadow-md transition-all group cursor-pointer">
                                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm ${report.color}`}>
                                    <span className="text-[10px] font-black uppercase tracking-tighter">{report.type}</span>
                                    {report.type === 'PDF' ? <FileText size={18} /> : <FileSpreadsheet size={18} />}
                                </div>
                                <div className="flex-1 min-w-0 text-right">
                                    <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-indigo-700 transition-colors">{report.name}</h4>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{report.date} • {report.size}</p>
                                </div>
                                <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                                    <Download size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Print / Footer Action Bar */}
            <div className="fixed bottom-24 right-10 left-10 md:right-20 md:left-20 z-40 md:hidden flex gap-2">
                 <button onClick={() => window.print()} className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-4 rounded-3xl font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <Printer size={20} /> הדפס דוח
                 </button>
            </div>
        </div>
    );
};

export default ReportsView;
