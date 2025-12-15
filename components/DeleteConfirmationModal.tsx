
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, AlertOctagon, Info, Check, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason?: string) => void;
    title: string;
    description: string;
    itemName?: string;
    isHardDelete?: boolean;
    type?: 'delete' | 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
    requireReason?: boolean; // New prop for audit trail
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    description, 
    itemName,
    isHardDelete = false,
    type = 'delete',
    confirmText,
    cancelText = "ביטול",
    requireReason = false
}) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    // Map legacy isHardDelete to danger type
    const finalType = isHardDelete ? 'danger' : type;

    const handleConfirm = () => {
        if (requireReason && !reason.trim()) return;
        onConfirm(reason);
        setReason(''); // Reset
    };

    const getConfig = () => {
        switch(finalType) {
            case 'danger': 
                return { 
                    icon: AlertOctagon, 
                    color: 'red', 
                    gradient: 'from-red-50 to-red-100', 
                    btn: 'bg-red-600 hover:bg-red-700 shadow-red-200',
                    defaultConfirm: 'מחק לצמיתות'
                };
            case 'warning': 
                return { 
                    icon: AlertTriangle, 
                    color: 'orange', 
                    gradient: 'from-orange-50 to-orange-100', 
                    btn: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200',
                    defaultConfirm: 'אשר'
                };
            case 'info': 
                return { 
                    icon: Info, 
                    color: 'blue', 
                    gradient: 'from-blue-50 to-blue-100', 
                    btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
                    defaultConfirm: 'אישור'
                };
            case 'success': 
                return { 
                    icon: Check, 
                    color: 'green', 
                    gradient: 'from-green-50 to-green-100', 
                    btn: 'bg-green-600 hover:bg-green-700 shadow-green-200',
                    defaultConfirm: 'המשך'
                };
            case 'delete': 
            default: 
                return { 
                    icon: Trash2, 
                    color: 'slate', 
                    gradient: 'from-slate-100 to-white', 
                    btn: 'bg-slate-900 hover:bg-black shadow-slate-300',
                    defaultConfirm: 'אשר מחיקה'
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;
    const finalConfirmText = confirmText || config.defaultConfirm;

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans"
            style={{ direction: 'rtl' }}
        >
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative Background */}
                <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${config.gradient} -z-10`} />

                <div className="p-8 pt-12 flex flex-col items-center text-center">
                    
                    {/* Icon Container */}
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl bg-white border-[4px] border-white transform rotate-3`}>
                        <Icon size={32} className={`text-${config.color}-500 stroke-[2.5px]`} />
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight leading-none">{title}</h3>
                    
                    <p className="text-slate-500 font-medium leading-relaxed mb-1 text-sm px-2">
                        {description}
                    </p>
                    
                    {itemName && (
                        <div className="mt-4 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 w-full truncate text-center shadow-sm">
                            {itemName}
                        </div>
                    )}

                    {finalType === 'danger' && (
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-100/50 uppercase tracking-wide">
                            <AlertOctagon size={12} />
                            פעולה בלתי הפיכה
                        </div>
                    )}

                    {requireReason && (
                        <div className="w-full mt-6 text-right">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">סיבת המחיקה (חובה)</label>
                            <textarea 
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 resize-none transition-all"
                                placeholder="למה אתה מוחק את זה?"
                                rows={2}
                            />
                        </div>
                    )}
                </div>

                <div className="p-3 bg-slate-50/80 border-t border-slate-100 grid grid-cols-2 gap-3 backdrop-blur-sm">
                    <button 
                        onClick={onClose}
                        className="py-3.5 text-slate-500 font-bold hover:bg-white hover:text-slate-800 hover:shadow-sm rounded-[1.5rem] transition-all text-sm border border-transparent hover:border-slate-100"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={requireReason && !reason.trim()}
                        className={`py-3.5 text-white font-bold rounded-[1.5rem] shadow-lg transition-transform active:scale-95 text-sm flex items-center justify-center gap-2 ${config.btn} ${requireReason && !reason.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {finalConfirmText}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};