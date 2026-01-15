'use client';

import React from 'react';
import { Star } from 'lucide-react';
import Image from 'next/image';

interface TestimonialCardNewProps {
    name: string;
    role: string;
    company: string;
    text: string;
    image: string;
    color?: 'indigo' | 'purple' | 'emerald' | 'blue' | 'pink';
}

export const TestimonialCardNew = ({ name, role, company, text, image, color = "indigo" }: TestimonialCardNewProps) => {
    // Fixed: Explicit mapping for Tailwind to pick up classes instead of dynamic string interpolation
    const colorClasses: Record<string, string> = {
        indigo: "bg-indigo-500/5 group-hover:bg-indigo-500/10",
        purple: "bg-purple-500/5 group-hover:bg-purple-500/10",
        emerald: "bg-emerald-500/5 group-hover:bg-emerald-500/10",
        blue: "bg-blue-500/5 group-hover:bg-blue-500/10",
        pink: "bg-pink-500/5 group-hover:bg-pink-500/10",
    };
    const bgClass = colorClasses[color] || colorClasses.indigo;

    return (
        <div className="min-w-[350px] md:min-w-[400px] bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors mx-4 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl transition-colors ${bgClass}`}></div>
            <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(i => <Star key={i} size={14} className="text-yellow-500 fill-yellow-500" />)}
            </div>
            <p className="text-slate-700 text-base leading-relaxed mb-6 font-medium">"{text}"</p>
            <div className="flex items-center gap-3">
                <Image
                    src={image}
                    alt={name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full border border-slate-200"
                />
                <div>
                    <h4 className="text-slate-900 font-bold text-sm">{name}</h4>
                    <p className="text-xs text-slate-500">{role}, {company}</p>
                </div>
            </div>
        </div>
    );
};
