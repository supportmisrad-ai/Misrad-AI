
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { LeadStatus, Lead } from '../types';
import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Phone, Mail, User, Clock, CheckCircle2, MoreHorizontal, Plus, Search, RefreshCw, ShoppingBag } from 'lucide-react';

export const LeadsView: React.FC = () => {
    const { leads, updateLead, addLead, products, convertLeadToClient } = useData();
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // KPI Calculations
    const totalRevenue = leads.reduce((sum: number, lead: Lead) => lead.status === LeadStatus.WON ? sum + lead.value : sum, 0);
    const potentialRevenue = leads.reduce((sum: number, lead: Lead) => (lead.status !== LeadStatus.WON && lead.status !== LeadStatus.LOST) ? sum + lead.value : sum, 0);
    const winRate = leads.filter((l: Lead) => l.status === LeadStatus.WON).length / (leads.filter((l: Lead) => l.status === LeadStatus.WON || l.status === LeadStatus.LOST).length || 1) * 100;
    
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
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="bg-white border border-gray-200 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            title="סנכרן נתונים ממערכת CRM חיצונית"
                        >
                            <RefreshCw size={16} className={isSyncing ? 'opacity-70' : ''} /> 
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
                            className="bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2"
                        >
                            <Plus size={18} /> הוסף ליד
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                            <TrendingUp size={14} className="text-green-600" /> הכנסות
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                            <DollarSign size={14} className="text-blue-600" /> פוטנציאל פתוח
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(potentialRevenue)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                            <Users size={14} className="text-purple-600" /> יחס סגירה
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{Math.round(winRate)}%</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                         <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                            <Users size={14} className="text-orange-600" /> לידים חדשים
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{(leads as Lead[]).filter((l: Lead) => l.status === LeadStatus.NEW).length}</div>
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
                                className="w-[300px] flex flex-col h-full rounded-xl bg-gray-50/80 border border-gray-200"
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
                                        const product = (products as any[]).find((p: any) => p.name === (lead as any).interestedIn);
                                        return (
                                            <motion.div
                                                key={lead.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e as any, lead.id)}
                                                {...(typeof window !== 'undefined' && window.innerWidth >= 768 && { whileHover: { y: -2 } })}
                                                className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 transition-all group"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-sm text-gray-900">{lead.name}</h4>
                                                    <button className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                </div>
                                                
                                                {lead.company && (
                                                    <p className="text-xs text-gray-500 mb-2">{lead.company}</p>
                                                )}

                                                {lead.interestedIn && (
                                                    <div className="flex items-center gap-1 mb-3">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${product ? String((product as any)?.color ?? '').replace('text-white', 'bg-opacity-10 text-gray-800') : 'bg-gray-100 text-gray-600'}`}>
                                                            <ShoppingBag size={10} /> {lead.interestedIn}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-3 mb-3">
                                                    {lead.phone && (
                                                        <a href={`tel:${lead.phone}`} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100">
                                                            <Phone size={12} />
                                                        </a>
                                                    )}
                                                    {lead.email && (
                                                        <a href={`mailto:${lead.email}`} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                                                            <Mail size={12} />
                                                        </a>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                                        <Clock size={10} />
                                                        {new Date(lead.lastContact).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                                                    </div>
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
        </div>
    );
};
