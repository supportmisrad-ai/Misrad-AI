
import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Tenant, ModuleId } from '../../types';
import { MODULES_CONFIG } from './SaasConstants';

interface ModuleManagementModalProps {
    tenant: Tenant;
    onClose: () => void;
    onToggle: (moduleId: ModuleId) => void;
}

export const ModuleManagementModal: React.FC<ModuleManagementModalProps> = ({ tenant, onClose, onToggle }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6"
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white">ניהול מודולים</h3>
                        <p className="text-slate-400 text-sm">עבור: {tenant.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                
                <div className="space-y-3">
                    {MODULES_CONFIG.map(mod => {
                        const isEnabled = tenant.modules.includes(mod.id as ModuleId);
                        return (
                            <div key={mod.id} 
                                onClick={() => onToggle(mod.id as ModuleId)}
                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${isEnabled ? 'bg-slate-800 border-indigo-500/50' : 'bg-slate-900 border-slate-800 opacity-60 hover:opacity-80'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <mod.icon size={20} className={isEnabled ? mod.color : 'text-slate-500'} />
                                    <span className={`font-bold ${isEnabled ? 'text-white' : 'text-slate-500'}`}>{mod.label}</span>
                                </div>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isEnabled ? '-translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
                    שינויים משפיעים מיידית על ממשק הלקוח.
                </div>
            </motion.div>
        </div>
    );
};
