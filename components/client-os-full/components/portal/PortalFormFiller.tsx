
import React from 'react';
import { X, Check, ArrowLeft } from 'lucide-react';

interface PortalFormFillerProps {
  activeForm: any;
  onClose: () => void;
  onSubmit: () => void;
}

export const PortalFormFiller: React.FC<PortalFormFillerProps> = ({ activeForm, onClose, onSubmit }) => {
  return (
    <div className="fixed inset-0 z-[140] bg-white animate-fade-in flex flex-col font-sans">
      <header className="p-6 border-b border-slate-200/70 flex justify-between items-center bg-slate-50/50 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
          <div className="h-8 w-px bg-slate-200"></div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{activeForm.title}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Interactive Form • Nexus Intelligence</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-20 lg:p-32 flex justify-center bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-3xl w-full animate-slide-up">
          <div className="space-y-12 animate-fade-in">
            <div className="space-y-4">
              <span className="text-nexus-accent font-black text-6xl opacity-10 block mb-2">01.</span>
              <h3 className="text-4xl font-display font-black text-slate-900 leading-tight">מהם יעדי הצמיחה העיקריים שלכם לרבעון הקרוב?</h3>
              <p className="text-xl text-slate-400 font-light">תתפרעו, אנחנו כאן כדי להגשים.</p>
            </div>
            <textarea 
              className="w-full p-8 bg-white border-2 border-slate-100 rounded-[40px] shadow-xl shadow-slate-200/50 outline-none focus:border-nexus-accent transition-all min-h-[250px] text-2xl font-light placeholder:text-slate-200" 
              placeholder="הקלד כאן..." 
              autoFocus
            />
            <div className="pt-10 mt-6 border-t border-slate-100 flex justify-end items-center">
              <button 
                onClick={onSubmit}
                className="px-12 py-5 bg-slate-900 text-white rounded-[32px] font-bold text-xl shadow-2xl hover:bg-nexus-accent hover:-translate-y-1 transition-all flex items-center gap-3"
              >
                שלח טופס והשלם משימה <Check size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
