
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CircleCheckBig, Users } from 'lucide-react';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

interface GoogleAuthModalProps {
    onClose: () => void;
    onSuccess: () => void;
    serviceName: string;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({ onClose, onSuccess, serviceName }) => {
    useBackButtonClose(true, onClose);
    const [step, setStep] = useState<'account' | 'consent'>('account');
    const [isLoading, setIsLoading] = useState(false);

    const handleAccountSelect = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep('consent');
        }, 800);
    };

    const handleAllow = () => {
        setIsLoading(true);
        setTimeout(() => {
            onSuccess();
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-sans" dir="rtl">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white w-full max-w-[450px] rounded-lg shadow-2xl overflow-hidden flex flex-col min-h-[500px]"
            >
                {isLoading && (
                    <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">מתחבר ל-Google...</p>
                    </div>
                )}
                <div className="px-8 pt-8 pb-4 text-center">
                    <svg viewBox="0 0 74 24" className="h-6 mb-4 mx-auto" xmlns="http://www.w3.org/2000/svg" aria-label="Google">
                        <path d="M9.24 8.19v2.46h5.88c-.18 1.38-.64 2.39-1.34 3.1-.86.86-2.2 1.8-4.54 1.8-3.62 0-6.45-2.92-6.45-6.54s2.83-6.54 6.45-6.54c1.95 0 3.38.77 4.43 1.76L15.4 2.5C13.94 1.08 11.98 0 9.24 0 4.28 0 .11 4.04.11 9s4.17 9 9.13 9c2.68 0 4.7-.88 6.28-2.52 1.62-1.62 2.13-3.91 2.13-5.75 0-.57-.04-1.1-.13-1.54H9.24z" fill="#4285F4"/>
                        <path d="M25 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52z" fill="#EA4335"/>
                        <path d="M53.58 7.49h-.09c-.57-.68-1.67-1.3-3.06-1.3C47.53 6.19 45 8.72 45 12c0 3.26 2.53 5.81 5.43 5.81 1.39 0 2.49-.62 3.06-1.32h.09v.81c0 2.22-1.19 3.41-3.1 3.41-1.56 0-2.53-1.11-2.93-2.05l-2.22.92c.64 1.54 2.33 3.41 5.15 3.41 2.99 0 5.52-1.76 5.52-6.05V6.49h-2.42v1zm-2.93 8.03c-1.76 0-3.1-1.5-3.1-3.52 0-2.05 1.34-3.52 3.1-3.52 1.74 0 3.1 1.5 3.1 3.54-.01 2.03-1.36 3.5-3.1 3.5z" fill="#4285F4"/>
                        <path d="M38 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52z" fill="#FBBC05"/>
                        <path d="M58.07 0h2.55v17.81h-2.55z" fill="#34A853"/>
                        <path d="M68.44 15.52c-1.3 0-2.22-.59-2.82-1.76l7.77-3.21-.26-.66c-.48-1.3-1.96-3.7-4.97-3.7-2.99 0-5.48 2.35-5.48 5.81 0 3.26 2.46 5.81 5.76 5.81 2.66 0 4.2-1.63 4.84-2.57l-1.98-1.32c-.66.96-1.56 1.6-2.86 1.6zm-.18-7.15c1.03 0 1.91.53 2.2 1.28l-5.25 2.17c0-2.44 1.73-3.45 3.05-3.45z" fill="#EA4335"/>
                    </svg>
                    <h2 className="text-2xl font-medium text-gray-800">
                        {step === 'account' ? 'בחר חשבון' : 'MISRAD AI מבקש גישה'}
                    </h2>
                    <p className="text-gray-600 mt-1">
                        {step === 'account' ? `כדי להמשיך ל-MISRAD AI` : `לחשבון ה-Google שלך`}
                    </p>
                </div>
                <div className="flex-1 px-8 py-2 overflow-y-auto">
                    {step === 'account' ? (
                        <div className="space-y-1">
                            <button onClick={handleAccountSelect} className="w-full flex items-center gap-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-right group">
                                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0">I</div>
                                <div className="flex-1">
                                    <div className="font-medium text-gray-700">Itamar The Boss</div>
                                    <div className="text-xs text-gray-500">itamar@nexus-os.co</div>
                                </div>
                            </button>
                            <button onClick={handleAccountSelect} className="w-full flex items-center gap-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-right group">
                                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center shrink-0"><Users size={16} /></div>
                                <div>
                                    <div className="font-medium text-gray-700">השתמש בחשבון אחר</div>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 text-sm">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border border-gray-100">
                                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center shrink-0">
                                    <span className="text-white font-bold text-xs">N</span>
                                </div>
                                <div className="text-gray-600">
                                    <span className="font-bold text-gray-900">MISRAD AI</span> רוצה גישה לנתוני ה-{serviceName === 'Calendar' ? 'יומן' : 'דרייב'} שלך.
                                </div>
                            </div>
                            <div className="space-y-4">
                                <p className="text-gray-500 font-medium uppercase text-xs tracking-wider">ההרשאה תאפשר ל-Nexus:</p>
                                <ul className="space-y-3">
                                    <li className="flex gap-3 text-gray-600 items-start">
                                        <CircleCheckBig size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                                        <span>
                                            {serviceName === 'Calendar' 
                                                ? 'לצפות, לערוך, לשתף ולמחוק לצמיתות את כל היומנים שברשותך.'
                                                : 'לצפות, לערוך, ליצור ולמחוק את כל הקבצים שלך ב-Google Drive.'}
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
                <div className="px-8 py-6 flex justify-end gap-3 border-t border-gray-100">
                    {step === 'consent' && (
                        <button onClick={() => setStep('account')} className="px-6 py-2 rounded text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">ביטול</button>
                    )}
                    {step === 'consent' && (
                        <button onClick={handleAllow} className="px-6 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">אשר</button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
