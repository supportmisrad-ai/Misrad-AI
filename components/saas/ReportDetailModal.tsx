
import React from 'react';
import { motion } from 'framer-motion';
import { X, Download } from 'lucide-react';
import { GeneratedReport } from '../../types';

interface ReportDetailModalProps {
    report: GeneratedReport;
    onClose: () => void;
    onDownload: (report: GeneratedReport) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, onClose, onDownload }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white text-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
            >
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-900">{report.title}</h3>
                        <p className="text-slate-500 text-sm">{new Date(report.dateGenerated).toLocaleDateString('he-IL')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 transition-colors"><X size={20} /></button>
                </div>
                
                <div className="p-8 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                            <div className="text-xs font-bold text-emerald-600 uppercase mb-1">הכנסות</div>
                            <div className="text-2xl font-black text-emerald-700">{formatCurrency(report.data.totalRevenue)}</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                            <div className="text-xs font-bold text-red-600 uppercase mb-1">הוצאות (שכר)</div>
                            <div className="text-2xl font-black text-red-700">{formatCurrency(report.data.totalCost)}</div>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700 text-center text-white shadow-lg">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">רווח נקי</div>
                            <div className={`text-2xl font-black ${report.data.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrency(report.data.netProfit)}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="font-bold text-slate-600">יעילות תפעולית</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold">{report.data.efficiencyScore}/10</span>
                                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${report.data.efficiencyScore * 10}%` }}></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="font-bold text-slate-600">משימות שהושלמו</span>
                            <span className="font-mono font-bold text-lg">{report.data.tasksCompleted}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:text-slate-900 transition-colors">סגור</button>
                    <button onClick={() => onDownload(report)} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2">
                        <Download size={16} /> הורד קובץ
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
