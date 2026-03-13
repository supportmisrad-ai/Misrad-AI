// Reports Finance Tab Component
// Extracted from ReportsView.tsx for better performance and maintainability

'use client';

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lock, Receipt, FileSpreadsheet } from 'lucide-react';
import { Avatar } from '../../components/Avatar';
import type { User, TimeEntry } from '../../types';

interface FinanceRow {
    user: {
        id: string;
        name: string;
        avatar: string;
        paymentType?: 'hourly' | 'monthly';
    };
    totalHours: number;
    totalMinutes: number;
    estimatedCost: number;
    entriesCount: number;
}

interface ReportsFinanceTabProps {
    financeData: FinanceRow[];
    timeEntries: TimeEntry[];
    visibleUsers: User[];
    users: User[];
    dateRange: { start: string; end: string };
    onExportCSV: () => void;
}

export const ReportsFinanceTab: React.FC<ReportsFinanceTabProps> = ({
    financeData,
    timeEntries,
    visibleUsers,
    users,
    dateRange,
    onExportCSV,
}) => {
    // Memoized calculations
    const totalEstimatedCost = useMemo(() => {
        return financeData.reduce((acc, curr) => acc + curr.estimatedCost, 0);
    }, [financeData]);

    const totalHours = useMemo(() => {
        return financeData.reduce((acc, curr) => acc + curr.totalHours, 0);
    }, [financeData]);

    const formatCurrency = useCallback((value: number) => {
        return `₪${value.toLocaleString()}`;
    }, []);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="bg-yellow-50 border border-yellow-100 p-3 md:p-4 rounded-xl mb-4 md:mb-6 flex items-start gap-2 md:gap-3">
                <Lock size={16} className="md:w-5 md:h-5 text-yellow-600 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-yellow-900 text-xs md:text-sm mb-1">אזור רגיש: הערכות שכר</h4>
                    <p className="text-[10px] md:text-xs text-yellow-700 leading-relaxed">
                        הנתונים להלן הם הערכות בלבד על בסיס שעות נוכחות או שכר חודשי. הנתונים אינם מחליפים תלוש שכר רשמי.
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">עלות משוערת כוללת</p>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900">{formatCurrency(totalEstimatedCost)}</h2>
                        <p className="text-[9px] md:text-[10px] text-gray-600 mt-1">בטווח התאריכים הנבחר</p>
                    </div>
                    <div className="p-3 md:p-4 bg-yellow-50 text-yellow-600 rounded-2xl">
                        <Receipt size={24} className="md:w-8 md:h-8" />
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">סה"כ שעות</p>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900">{totalHours.toFixed(1)}</h2>
                        <p className="text-[9px] md:text-[10px] text-gray-600 mt-1">שעות עבודה בפועל</p>
                    </div>
                    <div className="p-3 md:p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <Receipt size={24} className="md:w-8 md:h-8" />
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">עובדים פעילים</p>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900">{financeData.length}</h2>
                        <p className="text-[9px] md:text-[10px] text-gray-600 mt-1">עם נתוני שכר</p>
                    </div>
                    <div className="p-3 md:p-4 bg-green-50 text-green-600 rounded-2xl">
                        <Receipt size={24} className="md:w-8 md:h-8" />
                    </div>
                </div>
            </div>

            {/* Finance Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
                {financeData.map(data => (
                    <div key={data.user.id} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:border-gray-300 transition-all">
                        <div className="flex items-center gap-3 md:gap-4 mb-4">
                            <Avatar src={data.user.avatar} alt={data.user.name} name={data.user.name} size="lg" className="border border-gray-100 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-gray-900 text-sm md:text-base truncate">{data.user.name}</h4>
                                <p className="text-xs text-gray-500 truncate">
                                    {data.user.paymentType === 'monthly' ? 'שכר חודשי (גלובלי)' : 'תעריף שעתי'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">מודל שכר</span>
                                <span className="font-bold text-gray-900">
                                    {data.user.paymentType === 'monthly' ? 'גלובלי' : 'שעתי'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">שעות בטווח</span>
                                <span className="font-bold text-gray-900">{data.totalHours.toFixed(1)} שעות</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">רשומות</span>
                                <span className="font-bold text-gray-900">{data.entriesCount}</span>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-600 uppercase">עלות משוערת</span>
                            <span className="text-base md:text-lg font-black text-gray-900">
                                {formatCurrency(data.estimatedCost)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {financeData.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3 md:mb-4 text-gray-500">
                        <Receipt size={24} className="md:w-8 md:h-8" />
                    </div>
                    <h2 className="text-base md:text-lg font-bold text-gray-900 mb-2">אין נתוני שכר זמינים</h2>
                    <p className="text-xs md:text-sm text-gray-500 mb-4 max-w-sm">
                        ייתכן שאין לך הרשאות לצפות בנתוני שכר או שאין נתוני נוכחות בטווח התאריכים הנבחר.
                    </p>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3 md:mb-4 text-gray-500">
                    <Receipt size={24} className="md:w-8 md:h-8" />
                </div>
                <h2 className="text-base md:text-lg font-bold text-gray-900 mb-2">מחפש דוח מפורט יותר?</h2>
                <p className="text-xs md:text-sm text-gray-500 mb-4 max-w-sm">
                    ייצא את נתוני הנוכחות והשכר לקובץ אקסל מפורט להעברה להנהלת חשבונות.
                </p>
                <button 
                    onClick={onExportCSV} 
                    className="bg-black text-white px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center" 
                    aria-label="ייצוא נתוני שכר לאקסל"
                >
                    <FileSpreadsheet size={14} className="md:w-4 md:h-4" /> ייצוא נתוני שכר לאקסל
                </button>
            </div>
        </motion.div>
    );
};
