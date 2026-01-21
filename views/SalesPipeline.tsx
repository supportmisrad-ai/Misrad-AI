
import React from 'react';
import { useData } from '../context/DataContext';
import type { Lead } from '../types';
import { LeadStatus } from '../types';
import { motion } from 'framer-motion';
import { User, Phone, Mail, MoreHorizontal, DollarSign } from 'lucide-react';

export const SalesPipeline: React.FC = () => {
    const { leads, updateLead } = useData();

    const KANBAN_COLUMNS = [
        { id: LeadStatus.NEW, label: 'ליד נפתח', color: 'border-blue-500/50' },
        { id: LeadStatus.QUALIFIED, label: 'סונן בהצלחה', color: 'border-purple-500/50' },
        { id: LeadStatus.MEETING, label: 'פגישה', color: 'border-orange-500/50' },
        { id: LeadStatus.NEGOTIATION, label: 'משא ומתן', color: 'border-yellow-500/50' },
        { id: LeadStatus.WON, label: 'סגירה (Won)', color: 'border-emerald-500/50' },
    ];

    const formatCurrency = (val: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('leadId', id);
    };

    const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
        const id = e.dataTransfer.getData('leadId');
        if (id) updateLead(id, { status });
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-black text-white">צנרת עסקאות</h1>
                    <p className="text-slate-500 text-sm mt-1">נהל את תהליך המכירה מגילוי לסגירה.</p>
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-1 flex text-xs font-bold text-slate-400">
                    <span className="px-3 py-1 bg-slate-800 text-white rounded shadow-sm">לוח</span>
                    <span className="px-3 py-1 hover:text-white cursor-pointer transition-colors">רשימה</span>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
                <div className="flex h-full min-w-max gap-4">
                    {KANBAN_COLUMNS.map(col => {
                        const colLeads = (leads as Lead[]).filter((l: Lead) => l.status === col.id);
                        const colValue = colLeads.reduce((acc: number, l: Lead) => acc + l.value, 0);

                        return (
                            <div 
                                key={col.id} 
                                className="w-80 flex flex-col bg-slate-900/30 rounded-2xl border border-slate-800/50"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <div className={`p-4 border-b border-slate-800 flex justify-between items-center border-t-2 ${col.color}`}>
                                    <div>
                                        <h3 className="font-bold text-slate-200 text-sm">{col.label}</h3>
                                        <p className="text-xs text-slate-500">{colLeads.length} עסקאות</p>
                                    </div>
                                    <div className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">
                                        {formatCurrency(colValue)}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                    {colLeads.map((lead: Lead) => (
                                        <motion.div
                                            key={lead.id}
                                            layoutId={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e as any, lead.id)}
                                            whileHover={{ y: -2, scale: 1.02 }}
                                            className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg cursor-grab active:cursor-grabbing group hover:border-slate-600 transition-colors"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-white text-sm">{lead.name}</h4>
                                                <button className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={14} /></button>
                                            </div>
                                            {lead.company && <p className="text-xs text-slate-400 mb-3">{lead.company}</p>}
                                            
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-xs font-bold font-mono border border-emerald-500/20">
                                                    {formatCurrency(lead.value)}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center border-t border-slate-700 pt-3 mt-auto">
                                                <div className="flex -space-x-2 space-x-reverse">
                                                    <div className="w-6 h-6 rounded-full bg-slate-600 border border-slate-800 flex items-center justify-center text-[10px] text-white">
                                                        <User size={12} />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button className="p-1.5 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition-colors">
                                                        <Phone size={12} />
                                                    </button>
                                                    <button className="p-1.5 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition-colors">
                                                        <Mail size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};
