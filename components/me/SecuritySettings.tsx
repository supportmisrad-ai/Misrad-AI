
import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Shield, QrCode, ChevronRight, ShieldCheck, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { BiometricSetup } from '../nexus/BiometricSetup';

export const SecuritySettings: React.FC = () => {
    const { currentUser, updateUser, addToast } = useData();
    const [is2FASetup, setIs2FASetup] = useState(false);
    const [verifyCode, setVerifyCode] = useState('');
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);

    const handleVerify2FA = () => {
        if (verifyCode.length === 6) {
            updateUser(currentUser.id, { twoFactorEnabled: true });
            setIs2FASetup(false);
            setVerifyCode('');
            addToast('אימות דו-שלבי הופעל בהצלחה!', 'success');
        } else {
            addToast('קוד שגוי (נדרש 6 ספרות)', 'error');
        }
    };

    const confirmDisable2FA = () => {
        updateUser(currentUser.id, { twoFactorEnabled: false });
        addToast('אימות דו-שלבי כובה', 'info');
        setShowDisableConfirm(false);
    };

    return (
        <div className="space-y-6">
            <DeleteConfirmationModal
                isOpen={showDisableConfirm}
                onClose={() => setShowDisableConfirm(false)}
                onConfirm={confirmDisable2FA}
                title="ביטול אימות דו-שלבי"
                description="החשבון יהיה פחות מאובטח. האם להמשיך?"
                type="warning"
                confirmText="כבה הגנה"
            />

            <div className="flex items-center gap-3 p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100">
                <div className="p-2 bg-white rounded-full shadow-sm"><Shield size={16} className="text-yellow-600" /></div>
                <div>
                    <p className="text-sm font-bold">אבטחת חשבון</p>
                    <p className="text-xs opacity-80">הסיסמה שונתה לאחרונה לפני 3 חודשים.</p>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">סיסמה נוכחית</label>
                <input type="password" value="********" readOnly className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-black" />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">סיסמה חדשה</label>
                <input type="password" placeholder="הקלד סיסמה חזקה..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-black" />
            </div>
            
            {/* Biometric Setup (Passkeys) */}
            <div className="pt-4 border-t border-gray-100">
                <BiometricSetup />
            </div>
            
            <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-gray-900">אימות דו-שלבי (2FA)</h4>
                    {currentUser.twoFactorEnabled ? (
                        <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 flex items-center gap-1"><Check size={12} /> מופעל</span>
                    ) : (
                        <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200">כבוי</span>
                    )}
                </div>

                {!is2FASetup && !currentUser.twoFactorEnabled && (
                    <button 
                        onClick={() => setIs2FASetup(true)}
                        className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all border border-gray-200 hover:border-gray-300 flex items-center gap-4 group"
                    >
                        <div className="bg-white p-3 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                            <QrCode size={24} className="text-gray-600" />
                        </div>
                        <div className="text-right flex-1">
                            <div className="font-bold text-sm text-gray-900">הפעל אימות דו-שלבי</div>
                            <div className="text-xs text-gray-500">הוסף שכבת הגנה באמצעות Google Authenticator</div>
                        </div>
                        <div className="bg-black text-white p-2 rounded-full shadow-md"><ChevronRight size={16} className="rotate-180" /></div>
                    </button>
                )}

                {is2FASetup && !currentUser.twoFactorEnabled && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center overflow-hidden">
                        <div className="mb-4">
                            <div className="w-40 h-40 mx-auto bg-white p-2 rounded-xl shadow-sm mb-4 border border-gray-100 flex items-center justify-center">
                                {/* Simulated QR Code Pattern */}
                                <div className="grid grid-cols-6 gap-1 w-full h-full p-1 opacity-80">
                                    {[...Array(36)].map((_, i) => (
                                        <div key={i} className={`bg-black rounded-sm ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-10'}`}></div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 font-medium mb-1">סרוק את הקוד באפליקציית האימות</p>
                            <p className="text-[10px] text-gray-400 font-mono tracking-widest">KEY: J7X9-2M4K-L5P1-Q3R8</p>
                        </div>
                        
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value)}
                                placeholder="קוד אימות (6 ספרות)"
                                maxLength={6}
                                className="flex-1 p-2 text-center text-lg tracking-widest font-mono border border-gray-300 rounded-lg outline-none focus:border-black transition-colors"
                            />
                            <button onClick={handleVerify2FA} className="bg-black text-white px-4 rounded-lg font-bold text-sm">אמת</button>
                        </div>
                        <button onClick={() => setIs2FASetup(false)} className="text-xs text-gray-400 mt-4 hover:text-gray-600 underline">ביטול</button>
                    </motion.div>
                )}

                {currentUser.twoFactorEnabled && (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-full text-green-600"><ShieldCheck size={20} /></div>
                            <div>
                                <div className="text-sm font-bold text-green-800">החשבון מאובטח</div>
                                <div className="text-xs text-green-600">אימות דו-שלבי פעיל ומגן על החשבון.</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowDisableConfirm(true)}
                            className="text-xs text-red-500 font-bold hover:bg-red-50 p-2 rounded-lg transition-colors text-right w-fit mr-auto"
                        >
                            השבת אימות דו-שלבי
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
