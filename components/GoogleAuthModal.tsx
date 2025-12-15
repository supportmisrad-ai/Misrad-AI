
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Users } from 'lucide-react';

interface GoogleAuthModalProps {
    onClose: () => void;
    onSuccess: () => void;
    serviceName: string;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({ onClose, onSuccess, serviceName }) => {
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
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" className="h-6 mb-4 mx-auto" />
                    <h2 className="text-2xl font-medium text-gray-800">
                        {step === 'account' ? 'בחר חשבון' : 'Nexus OS מבקש גישה'}
                    </h2>
                    <p className="text-gray-600 mt-1">
                        {step === 'account' ? `כדי להמשיך ל-Nexus OS` : `לחשבון ה-Google שלך`}
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
                                    <span className="font-bold text-gray-900">Nexus OS</span> רוצה גישה לנתוני ה-{serviceName === 'Calendar' ? 'יומן' : 'דרייב'} שלך.
                                </div>
                            </div>
                            <div className="space-y-4">
                                <p className="text-gray-500 font-medium uppercase text-xs tracking-wider">ההרשאה תאפשר ל-Nexus:</p>
                                <ul className="space-y-3">
                                    <li className="flex gap-3 text-gray-600 items-start">
                                        <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
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
