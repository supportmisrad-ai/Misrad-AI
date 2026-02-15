
import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';

interface BonusConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    recommendation: { amount: number; userName: string } | null;
    onConfirm: () => void;
}

export const BonusConfirmationModal: React.FC<BonusConfirmationModalProps> = ({ 
    isOpen, onClose, recommendation, onConfirm 
}) => {
    if (!isOpen || !recommendation) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
            >
                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-yellow-50">
                    <DollarSign size={32} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">אישור בונוס כספי</h3>
                <p className="text-gray-500 text-sm mb-6">
                    אתה עומד לאשר בונוס בסך <span className="font-bold text-gray-900">₪{recommendation.amount}</span> לעובד <span className="font-bold text-gray-900">{recommendation.userName}</span>.
                    <br/><br/>
                    הפעולה תעדכן את ארנק העובד ותשלח לו התראה מיידית. האם להמשיך?
                </p>
                
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">
                        ביטול
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200">
                        אשר העברה
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
