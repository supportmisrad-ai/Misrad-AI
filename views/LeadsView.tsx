
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { LeadStatus, Lead } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Phone, Mail, User, Clock, CircleCheckBig, MoreHorizontal, Plus, Search, RefreshCw, ShoppingBag, Copy, Check, X, Calendar as CalendarIcon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { CustomDatePicker } from '@/components/CustomDatePicker';

export const LeadsView: React.FC = () => {
    const { leads, updateLead, addLead, products, convertLeadToClient } = useData();
    const { orgSlug } = useApp();
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [selectedLeadForDate, setSelectedLeadForDate] = useState<Lead | null>(null);

    const handleCopyLeadFormLink = () => {
        if (!orgSlug) return;
        const leadFormUrl = typeof window !== 'undefined'
            ? `${window.location.origin}/lead/${orgSlug}`
            : `/lead/${orgSlug}`;
        navigator.clipboard.writeText(leadFormUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // KPI Calculations - Memoized for performance
    const totalRevenue = useMemo(() => 
        leads.reduce((sum: number, lead: Lead) => lead.status === LeadStatus.WON ? sum + lead.value : sum, 0),
    [leads]);
    
    const potentialRevenue = useMemo(() => 
        leads.reduce((sum: number, lead: Lead) => (lead.status !== LeadStatus.WON && lead.status !== LeadStatus.LOST) ? sum + lead.value : sum, 0),
    [leads]);
    
    const winRate = useMemo(() => {
        const won = leads.filter((l: Lead) => l.status === LeadStatus.WON).length;
        const decided = leads.filter((l: Lead) => l.status === LeadStatus.WON || l.status === LeadStatus.LOST).length || 1;
        return (won / decided) * 100;
    }, [leads]);
    
    const newLeadsCount = useMemo(() => 
        leads.filter((l: Lead) => l.status === LeadStatus.NEW).length,
    [leads]);
    
    const KANBAN_COLUMNS = [
        { id: LeadStatus.NEW, label: 'ליד נפתח', color: 'bg-blue-50 text-blue-700' },
        { id: LeadStatus.QUALIFIED, label: 'סונן/מתאים', color: 'bg-purple-50 text-purple-700' },
        { id: LeadStatus.MEETING, label: 'פגישה נקבעה', color: 'bg-orange-50 text-orange-700' },
        { id: LeadStatus.NEGOTIATION, label: 'משא ומתן', color: 'bg-yellow-50 text-yellow-700' },
        { id: LeadStatus.WON, label: 'נסגר (לקוח)', color: 'bg-green-50 text-green-700' },
        { id: LeadStatus.LOST, label: 'לא רלוונטי', color: 'bg-gray-100 text-gray-500' },
    ];

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        setDraggedLeadId(leadId);
        e.dataTransfer.setData('leadId', leadId);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (leadId) {
            updateLead(leadId, { status });
            // AUTOMATION: If WON, convert to client
            if (status === LeadStatus.WON) {
                convertLeadToClient(leadId);
            }
        }
        setDraggedLeadId(null);
    };

    const handleSync = () => {
        setIsSyncing(true);
        // Simulate Sync
        setTimeout(() => setIsSyncing(false), 2000);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="w-full h-full flex flex-col">
            {/* Header & KPIs */}
            <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">ניהול לידים</h1>
                        <p className="text-gray-500 text-sm mt-1">מעקב אחר פניות, מכירות וסגירת עסקאות.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                         <button 
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="bg-white border border-gray-200 text-gray-600 hover:text-gray-900 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            title="סנכרן נתונים ממערכת CRM חיצונית"
                        >
                            <RefreshCw size={14} className={isSyncing ? 'opacity-70' : ''} /> 
                            <span className="hidden sm:inline">{isSyncing ? 'מסנכרן...' : 'סנכרן CRM'}</span>
                        </button>
                        <button 
                            onClick={() => {
                                const name = prompt('שם הליד:');
                                if(name) {
                                    addLead({
                                        id: `L-${Date.now()}`,
                                        name,
                                        email: '',
                                        status: LeadStatus.NEW,
                                        value: 0,
                                        source: 'Manual',
                                        createdAt: new Date().toISOString(),
                                        lastContact: new Date().toISOString()
                                    });
                                }
                            }}
                            className="bg-black text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold shadow-lg flex items-center gap-1.5 sm:gap-2"
                        >
                            <Plus size={16} /> <span className="hidden sm:inline">הוסף ליד</span>
                        </button>
                        <button 
                            onClick={handleCopyLeadFormLink}
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-colors"
                            title="העתק לינק לטופס לידים ציבורי"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            <span className="hidden sm:inline">{copied ? 'הועתק!' : 'לינק טופס'}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                    <div className="bg-white p-2 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <TrendingUp size={12} className="text-green-600 sm:size-14" /> הכנסות
                        </div>
                        <div className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
                    </div>
                    <div className="bg-white p-2 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <DollarSign size={12} className="text-blue-600 sm:size-14" /> פוטנציאל
                        </div>
                        <div className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(potentialRevenue)}</div>
                    </div>
                    <div className="bg-white p-2 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <Users size={12} className="text-purple-600 sm:size-14" /> סגירה
                        </div>
                        <div className="text-lg sm:text-2xl font-bold text-gray-900">{Math.round(winRate)}%</div>
                    </div>
                    <div className="bg-white p-2 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200 shadow-sm">
                         <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <Users size={12} className="text-orange-600 sm:size-14" /> חדשים
                        </div>
                        <div className="text-lg sm:text-2xl font-bold text-gray-900">{newLeadsCount}</div>
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex h-full min-w-max gap-4 px-1">
                    {KANBAN_COLUMNS.map(col => {
                        const colLeads = (leads as Lead[]).filter((l: Lead) => l.status === col.id);
                        return (
                            <div 
                                key={col.id}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, col.id)}
                                className="w-[92vw] sm:w-[300px] flex flex-col h-full rounded-xl bg-gray-50/80 border border-gray-200 flex-shrink-0"
                            >
                                <div className="p-3 border-b border-gray-200/50 bg-gray-50 sticky top-0 rounded-t-xl z-10 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${col.color}`}>{col.label}</span>
                                        <span className="text-xs text-gray-400 font-mono">({colLeads.length})</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium">
                                        {formatCurrency(colLeads.reduce((acc: number, curr: Lead) => acc + curr.value, 0))}
                                    </div>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                                    {colLeads.map((lead: Lead) => {
                                        const product = (products as unknown[]).find((p: unknown) => (p as { name?: string }).name === (lead as unknown as { interestedIn?: string }).interestedIn);
                                        return (
                                            <motion.div
                                                key={lead.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent<Element>, lead.id)}
                                                {...(typeof window !== 'undefined' && window.innerWidth >= 768 && { whileHover: { y: -2 } })}
                                                className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 transition-all group"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-bold text-sm text-gray-900 truncate">{lead.name}</h4>
                                                    <button className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                </div>
                                                
                                                {lead.company && (
                                                    <p className="text-[11px] text-gray-500 mb-1 truncate">{lead.company}</p>
                                                )}

                                                {lead.interestedIn && (
                                                    <div className="flex items-center gap-1 mb-2">
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 ${product ? String((product as Record<string, unknown>)?.color ?? '').replace('text-white', 'bg-opacity-10 text-gray-800') : 'bg-gray-100 text-gray-600'}`}>
                                                            <ShoppingBag size={10} /> {lead.interestedIn}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 mb-2">
                                                    {lead.phone && (
                                                        <a href={`tel:${lead.phone}`} className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors">
                                                            <Phone size={10} />
                                                        </a>
                                                    )}
                                                    {lead.email && (
                                                        <a href={`mailto:${lead.email}`} className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
                                                            <Mail size={10} />
                                                        </a>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedLeadForDate(lead);
                                                        }}
                                                        className="flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:bg-blue-50 px-1.5 py-0.5 rounded-md transition-colors"
                                                    >
                                                        <Clock size={10} />
                                                        {new Date(lead.lastContact).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                                                    </button>
                                                    <div className="font-bold text-xs text-gray-700">
                                                        {formatCurrency(lead.value)}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    {colLeads.length === 0 && (
                                        <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300 text-xs">
                                            ריק
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Date Selection Modal for Mobile */}
            <AnimatePresence>
                {selectedLeadForDate && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setSelectedLeadForDate(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                        <CalendarIcon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-900">עדכון מועד יצירת קשר</h3>
                                        <p className="text-xs text-gray-500 font-bold">{selectedLeadForDate.name}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedLeadForDate(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 px-1">
                                        תאריך ושעה
                                    </label>
                                    <CustomDatePicker
                                        showHebrewDate
                                        value={selectedLeadForDate.lastContact.split('T')[0]}
                                        onChange={(newDate) => {
                                            if (newDate) {
                                                const currentFullDate = new Date(selectedLeadForDate.lastContact);
                                                const [year, month, day] = newDate.split('-').map(Number);
                                                currentFullDate.setFullYear(year, month - 1, day);
                                                updateLead(selectedLeadForDate.id, { lastContact: currentFullDate.toISOString() });
                                                setSelectedLeadForDate(null);
                                            }
                                        }}
                                        className="w-full"
                                    />
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                        <Clock size={16} className="text-gray-400" />
                                        <input 
                                            type="time" 
                                            defaultValue={new Date(selectedLeadForDate.lastContact).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 w-full"
                                            onChange={(e) => {
                                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                                const currentFullDate = new Date(selectedLeadForDate.lastContact);
                                                currentFullDate.setHours(hours, minutes);
                                                updateLead(selectedLeadForDate.id, { lastContact: currentFullDate.toISOString() });
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedLeadForDate(null)}
                                className="w-full mt-6 py-3 bg-black text-white rounded-2xl font-black text-sm shadow-xl active:scale-[0.98] transition-all"
                            >
                                סיום
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
