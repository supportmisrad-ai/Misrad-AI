'use client';

import React from 'react';
import { Phone, Zap, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileQuickActionsProps {
    onDialerClick: () => void;
    onAddLeadClick: () => void;
    onFocusClick: () => void;
}

export const MobileQuickActions: React.FC<MobileQuickActionsProps> = ({
    onDialerClick,
    onAddLeadClick,
    onFocusClick
}) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const actions = [
        { id: 'focus', icon: Zap, label: 'פוקוס', onClick: onFocusClick, color: 'bg-indigo-600' },
        { id: 'add', icon: Plus, label: 'ליד חדש', onClick: onAddLeadClick, color: 'bg-rose-600' },
    ];

    return (
        <div className="md:hidden fixed bottom-24 left-6 z-50 flex flex-col items-end gap-3">
            <AnimatePresence>
                {isOpen && (
                    <div className="flex flex-col gap-3 mb-2">
                        {actions.map((action, index) => (
                            <motion.button
                                key={action.id}
                                initial={{ opacity: 0, scale: 0, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0, y: 20 }}
                                transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 25 }}
                                onClick={() => {
                                    action.onClick();
                                    setIsOpen(false);
                                }}
                                className={`flex items-center gap-3 pr-2 pl-4 py-2 ${action.color} text-white rounded-full shadow-lg shadow-black/20 ring-1 ring-white/20 active:scale-90 transition-transform`}
                            >
                                <span className="text-xs font-black uppercase tracking-tighter">{action.label}</span>
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <action.icon size={20} fill={action.id === 'focus' ? 'currentColor' : 'none'} />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileTap={{ scale: 0.9 }}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-300 ${
                    isOpen ? 'bg-slate-800 rotate-45' : 'bg-rose-600'
                } text-white ring-2 ring-white/20`}
            >
                {isOpen ? <Plus size={28} /> : <Phone size={24} fill="currentColor" />}
            </motion.button>
        </div>
    );
};
