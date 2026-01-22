/**
 * מורנינג Connect Modal
 * 
 * Modal for connecting מורנינג account by entering API key
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, AlertCircle, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';

interface GreenInvoiceConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const GreenInvoiceConnectModal: React.FC<GreenInvoiceConnectModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [apiKey, setApiKey] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConnect = async () => {
        if (!apiKey.trim()) {
            setError('נא להזין מפתח API');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const response = await fetch('/api/integrations/green-invoice/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: apiKey.trim() })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to connect מורנינג');
            }

            onSuccess();
            onClose();
            setApiKey('');
        } catch (err: any) {
            setError(err.message || 'שגיאה בחיבור למורנינג');
        } finally {
            setIsConnecting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                <img 
                                    src="https://www.greeninvoice.co.il/wp-content/uploads/2021/06/green-invoice-logo.png" 
                                    alt="חשבונית ירוקה (מורנינג)" 
                                    className="w-8 h-8 object-contain"
                                    onError={(e) => {
                                        // Fallback to icon if image fails to load
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        const parent = (e.target as HTMLImageElement).parentElement;
                                        if (parent) {
                                            parent.innerHTML = '<svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>';
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">חיבור למורנינג</h3>
                                <p className="text-xs text-gray-500">הזן את מפתח ה-API שלך</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                מפתח API
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value);
                                    setError(null);
                                }}
                                placeholder="הזן את מפתח ה-API"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 font-mono text-sm"
                                disabled={isConnecting}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                מפתח ה-API זמין במנוי Best ומעלה. ניתן למצוא אותו בהגדרות החשבון במורנינג.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                                <p className="text-red-800 text-sm font-bold">{error}</p>
                            </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                            <p className="text-xs text-blue-800">
                                <strong>איפה למצוא את מפתח ה-API?</strong><br />
                                התחבר לחשבון מורנינג → הגדרות → API → צור מפתח חדש
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={onClose}
                            disabled={isConnecting}
                            className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-sm disabled:opacity-50"
                        >
                            ביטול
                        </button>
                        <button
                            onClick={handleConnect}
                            disabled={isConnecting || !apiKey.trim()}
                            className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2 text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isConnecting ? (
                                <>
                                    <Skeleton className="w-4 h-4 rounded-full bg-white/30" />
                                    מתחבר...
                                </>
                            ) : (
                                <>
                                    <Check size={16} />
                                    התחבר
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

