import React from 'react';
import { FileInput, Rocket } from 'lucide-react';

const FormsView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-24 min-h-0">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-3xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-6">
          <FileInput size={36} className="text-violet-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">טפסים</h2>
        <p className="text-slate-500 text-sm max-w-md mb-6">
          ניהול טפסים, עורך ויזואלי ואיסוף לידים. הפיצ׳ר בפיתוח ויהיה זמין בקרוב.
        </p>
        <div className="flex items-center gap-2 bg-violet-50 text-violet-700 px-5 py-2.5 rounded-xl text-sm font-bold border border-violet-100">
          <Rocket size={16} />
          בקרוב
        </div>
      </div>
    </div>
  );
};

export default FormsView;
