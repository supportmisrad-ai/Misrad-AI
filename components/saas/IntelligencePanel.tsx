
import React from 'react';
import { motion } from 'framer-motion';
import { FileText, BrainCircuit, ArrowUpRight } from 'lucide-react';
import { GeneratedReport, Feedback } from '../../types';

interface IntelligencePanelProps {
    systemReports: GeneratedReport[];
    feedbacks: Feedback[];
    onViewReport: (report: GeneratedReport) => void;
    onGenerateReport: (period: 'Quarterly' | 'Annual') => void;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({ 
    systemReports, feedbacks, onViewReport, onGenerateReport 
}) => {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">בינה עסקית ודוחות</h1>
                    <p className="text-slate-400 mt-1">דוחות רווחיות (P&L) ומשובי AI.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onGenerateReport('Quarterly')} className="bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-bold border border-slate-700 hover:bg-slate-700 transition-colors">דוח רבעוני</button>
                    <button onClick={() => onGenerateReport('Annual')} className="bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-bold border border-slate-700 hover:bg-slate-700 transition-colors">דוח שנתי</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Generated Reports Inbox */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden flex flex-col h-[500px]">
                    <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            <FileText size={20} className="text-indigo-400" /> דואר נכנס: דוחות אוטומטיים
                        </h3>
                        <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                            {systemReports.filter(r => !r.isRead).length} חדשים
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {systemReports.map(report => (
                            <div 
                                key={report.id} 
                                onClick={() => onViewReport(report)}
                                className={`p-4 rounded-xl border transition-all flex justify-between items-center cursor-pointer hover:bg-slate-700/50 ${report.isRead ? 'bg-slate-800/30 border-slate-700 text-slate-400' : 'bg-slate-800 border-indigo-500/50 shadow-md text-white'}`}
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        {!report.isRead && <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>}
                                        <h4 className="font-bold text-sm">{report.title}</h4>
                                    </div>
                                    <div className="text-xs opacity-70 flex gap-3">
                                        <span>נוצר: {new Date(report.dateGenerated).toLocaleDateString()}</span>
                                        <span className={`font-bold ${report.data.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            • רווח נקי: ₪{report.data.netProfit.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2 bg-slate-700 rounded-lg text-slate-300">
                                    <ArrowUpRight size={16} className="rotate-45" />
                                </div>
                            </div>
                        ))}
                        {systemReports.length === 0 && (
                            <div className="text-center py-12 text-slate-500">
                                <p>אין דוחות זמינים כרגע.</p>
                                <p className="text-xs">דוחות נוצרים אוטומטית בסוף כל חודש.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Feedbacks Table */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden flex flex-col h-[500px]">
                    <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            <BrainCircuit size={20} className="text-emerald-400" /> משובי AI מהצוות
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-700 sticky top-0">
                                <tr>
                                    <th className="px-6 py-4">עובד</th>
                                    <th className="px-6 py-4">שאילתה</th>
                                    <th className="px-6 py-4">תשובת AI</th>
                                    <th className="px-6 py-4">תאריך</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50 text-slate-300">
                                {feedbacks.map(fb => (
                                    <tr key={fb.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-white">{fb.userName}</td>
                                        <td className="px-6 py-4 max-w-[150px] truncate" title={fb.query}>{fb.query}</td>
                                        <td className="px-6 py-4 max-w-[200px] truncate text-slate-400" title={fb.aiResponseSummary}>{fb.aiResponseSummary}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{new Date(fb.date).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {feedbacks.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-slate-500">
                                            לא נשמרו משובים מה-AI עדיין.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </motion.div>
    );
};
