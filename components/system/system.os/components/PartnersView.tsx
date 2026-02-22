
import React from 'react';
import { Network, Rocket } from 'lucide-react';

const PartnersView: React.FC = () => {
    return (
        <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6">
                    <Network size={36} className="text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">שותפים</h2>
                <p className="text-slate-500 text-sm max-w-md mb-6">
                    ניהול תוכנית שותפים, הפניות ועמלות. הפיצ׳ר בפיתוח ויהיה זמין בקרוב.
                </p>
                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-bold border border-indigo-100">
                    <Rocket size={16} />
                    בקרוב
                </div>
            </div>
        </div>
    );
};

export default PartnersView;
