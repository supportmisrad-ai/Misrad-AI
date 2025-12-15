
import React, { useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';
import { Building2, Trash2, Lock, Upload, Image as ImageIcon } from 'lucide-react';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';

export const OrganizationTab: React.FC = () => {
    const { organization, updateOrganization, addToast } = useData();
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Basic validation
            if (file.size > 2 * 1024 * 1024) {
                addToast('הקובץ גדול מדי (מקסימום 2MB)', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                updateOrganization({ logo: reader.result as string });
                addToast('לוגו הארגון עודכן בהצלחה', 'success');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogoClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDeleteModalOpen(true);
    };

    const confirmRemoveLogo = () => {
        updateOrganization({ logo: '' });
        
        // Reset file input so same file can be selected again if needed
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
        
        addToast('הלוגו הוסר', 'info');
        setIsDeleteModalOpen(false);
    };

    const handleOrgNameChange = () => {
        addToast('לשינוי שם הארגון אנא צור קשר עם התמיכה הטכנית', 'info');
    };

    const triggerUpload = () => {
        logoInputRef.current?.click();
    };

    return (
        <motion.div key="organization" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
            
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmRemoveLogo}
                title="הסרת לוגו"
                description="הלוגו יוסר מפרופיל הארגון ומסרגל הניווט."
                itemName={organization.name}
                isHardDelete={false}
            />

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">פרופיל ארגון</h2>
                    <p className="text-sm text-gray-500">התאמת המערכת לזהות העסקית שלכם.</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-2xl">
                <div className="space-y-8">
                    
                    {/* Logo Section */}
                    <div className="flex flex-col items-center gap-5">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden shadow-inner">
                                {organization.logo ? (
                                    <img src={organization.logo} alt="Organization Logo" className="w-full h-full object-contain p-4" />
                                ) : (
                                    <div className="text-gray-300 flex flex-col items-center gap-2">
                                        <ImageIcon size={32} />
                                        <span className="text-[10px] font-bold">אין לוגו</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Hidden Input */}
                            <input 
                                type="file" 
                                ref={logoInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoUpload}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                type="button"
                                onClick={triggerUpload}
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95"
                            >
                                <Upload size={14} />
                                {organization.logo ? 'החלף לוגו' : 'העלאת לוגו'}
                            </button>
                            
                            {organization.logo && (
                                <button 
                                    type="button"
                                    onClick={handleRemoveLogoClick}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all border border-red-100 active:scale-95 cursor-pointer"
                                >
                                    <Trash2 size={14} />
                                    הסר
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400">מומלץ להעלות קובץ PNG או SVG שקוף</p>
                    </div>

                    <div className="h-px bg-gray-100 w-full"></div>

                    {/* Company Name */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">שם העסק / חברה</label>
                        <div className="relative group">
                            <Building2 size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400" />
                            <input 
                                type="text" 
                                value={organization.name}
                                readOnly
                                className="w-full p-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-600 outline-none cursor-not-allowed"
                            />
                            <div className="absolute top-1/2 left-2 -translate-y-1/2">
                                <button 
                                    type="button"
                                    onClick={handleOrgNameChange}
                                    className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                >
                                    <Lock size={10} /> פנה לשינוי
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preview Badge */}
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50 text-center">
                        <p className="text-xs text-blue-600 mb-3 font-bold uppercase tracking-wide">תצוגה מקדימה בסרגל הניווט</p>
                        <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm p-3 pr-4 pl-6 rounded-2xl border border-blue-100 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 overflow-hidden flex items-center justify-center shadow-sm">
                                {organization.logo ? (
                                    <img src={organization.logo} className="w-full h-full object-contain p-1" />
                                ) : (
                                    <div className="w-3 h-3 bg-black rounded-full" />
                                )}
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-sm text-gray-900 leading-none mb-1">{organization.name}</div>
                                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Nexus OS</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
