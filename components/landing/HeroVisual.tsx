'use client';

import React from 'react';
import { motion, useTransform, useMotionValue } from 'framer-motion';
import { DollarSign, Users } from 'lucide-react';

export const HeroVisual = () => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [30, -30]);
    const rotateY = useTransform(x, [-100, 100], [-30, 30]);

    function handleMouseMove(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        const rect = event.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const xPct = (mouseX / width - 0.5) * 2;
        const yPct = (mouseY / height - 0.5) * 2;
        x.set(xPct * 100);
        y.set(yPct * 100);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <motion.div 
            style={{ perspective: 2000 }}
            className="w-full h-full flex items-center justify-center py-10"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <motion.div
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                className="relative w-full max-w-4xl aspect-[16/9] bg-white rounded-2xl border border-slate-200 shadow-xl"
            >
                {/* Floating Elements (Parallax) */}
                <motion.div 
                    style={{ transform: "translateZ(60px)" }} 
                    className="absolute -top-10 -right-10 bg-white p-4 rounded-xl border border-slate-200 shadow-md z-20"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-green-500/20 p-2 rounded-lg text-green-600"><DollarSign size={24} /></div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase font-bold">הכנסה חודשית</div>
                            <div className="text-slate-900 font-bold text-xl">₪84,200</div>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    style={{ transform: "translateZ(40px)" }} 
                    className="absolute -bottom-5 -left-5 bg-white p-4 rounded-xl border border-slate-200 shadow-md z-20"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-600"><Users size={24} /></div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase font-bold">לקוחות פעילים</div>
                            <div className="text-slate-900 font-bold text-xl">+12 השבוע</div>
                        </div>
                    </div>
                </motion.div>

                {/* Dashboard Image / Mock */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden bg-slate-50">
                    <div className="h-10 border-b border-slate-200 flex items-center px-4 gap-2 bg-white">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                        </div>
                        <div className="h-6 w-32 bg-slate-100 rounded-md ml-4"></div>
                    </div>
                    <div className="p-6 grid grid-cols-3 gap-4 opacity-80">
                        <div className="col-span-2 h-40 bg-white rounded-xl border border-slate-200"></div>
                        <div className="col-span-1 h-40 bg-white rounded-xl border border-slate-200"></div>
                        <div className="col-span-1 h-40 bg-white rounded-xl border border-slate-200"></div>
                        <div className="col-span-2 h-40 bg-white rounded-xl border border-slate-200"></div>
                    </div>
                    
                    {/* Reflection overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/60 to-transparent pointer-events-none"></div>
                </div>
            </motion.div>
        </motion.div>
    );
};
