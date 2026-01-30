
import React from 'react';
import { motion } from 'framer-motion';
import { HardHat, Home, RefreshCw } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getNexusBasePath, toNexusPath } from '@/lib/os/nexus-routing';

export const MaintenanceOverlay: React.FC = () => {
    const router = useRouter();
    const pathname = usePathname();
    const basePath = getNexusBasePath(pathname);

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 relative overflow-hidden rounded-3xl border-2 border-dashed border-yellow-200">
            {/* Background Stripes */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 10px, transparent 10px, transparent 20px)" }}></div>
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 rounded-3xl shadow-xl border border-yellow-100 max-w-md text-center relative z-10"
            >
                <div className="w-20 h-20 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-yellow-100">
                    <HardHat size={40} />
                </div>
                
                <h2 className="text-2xl font-black text-slate-900 mb-2">אזור בשיפוצים</h2>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    אנחנו משדרגים את האזור הזה ברגעים אלו ממש כדי לשפר את החוויה שלך. נחזור בקרוב!
                </p>
                
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={() => router.push(toNexusPath(basePath, '/'))}
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors flex items-center gap-2"
                    >
                        <Home size={18} /> חזרה לבית
                    </button>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-yellow-50 text-yellow-700 px-6 py-3 rounded-xl font-bold hover:bg-yellow-100 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw size={18} /> רענן
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
