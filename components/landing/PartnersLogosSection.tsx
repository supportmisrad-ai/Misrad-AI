'use client';

import { useEffect, useState } from 'react';
import { Building2, Sparkles } from 'lucide-react';

interface PartnerLogo {
  id: string;
  name: string;
  logo: string;
  website?: string;
  isActive: boolean;
}

export function PartnersLogosSection() {
  const [logos, setLogos] = useState<PartnerLogo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load logos from localStorage (synced from admin panel)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('partners_logos');
      if (saved) {
        try {
          const allLogos: PartnerLogo[] = JSON.parse(saved);
          const activeLogos = allLogos.filter(logo => logo.isActive);
          setLogos(activeLogos);
        } catch (e) {
          console.error('Error loading partner logos:', e);
        }
      }
    }
    setIsLoading(false);
  }, []);

  // Don't render if no logos or still loading
  if (isLoading || logos.length === 0) {
    return null;
  }

  // Duplicate logos for seamless infinite scroll
  const duplicatedLogos = [...logos, ...logos, ...logos];
  const duplicatedLogosReverse = [...logos.slice().reverse(), ...logos.slice().reverse(), ...logos.slice().reverse()];

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden" dir="rtl">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-indigo-100/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-purple-100/20 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-black mb-4 shadow-sm">
            <Sparkles size={14} className="text-indigo-600" />
            הלקוחות שלנו
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            עסקים מובילים סומכים עלינו
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            מאות עסקים כבר משתמשים ב-Misrad AI כדי להפוך את העבודה שלהם לחכמה יותר
          </p>
        </div>

        {/* Logos Marquee - Row 1 (RTL) */}
        <div className="relative mb-8">
          {/* Gradient Edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-l from-transparent to-white z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-r from-transparent to-white z-10 pointer-events-none" />
          
          <div className="flex overflow-hidden">
            <div className="flex animate-marquee-rtl gap-12 py-8">
              {duplicatedLogos.map((logo, idx) => (
                <div
                  key={`logo-1-${idx}`}
                  className="flex-shrink-0 w-[180px] h-[90px] flex items-center justify-center group"
                >
                  <div className="relative w-full h-full flex items-center justify-center p-6 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 transition-all duration-300 hover:shadow-lg">
                    <img
                      src={logo.logo}
                      alt={logo.name}
                      className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all duration-300"
                      title={logo.name}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex animate-marquee-rtl gap-12 py-8">
              {duplicatedLogos.map((logo, idx) => (
                <div
                  key={`logo-1-dup-${idx}`}
                  className="flex-shrink-0 w-[180px] h-[90px] flex items-center justify-center group"
                >
                  <div className="relative w-full h-full flex items-center justify-center p-6 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 transition-all duration-300 hover:shadow-lg">
                    <img
                      src={logo.logo}
                      alt={logo.name}
                      className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all duration-300"
                      title={logo.name}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logos Marquee - Row 2 (LTR - reverse) */}
        <div className="relative">
          {/* Gradient Edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-l from-transparent to-white z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-r from-transparent to-white z-10 pointer-events-none" />
          
          <div className="flex overflow-hidden">
            <div className="flex animate-marquee-ltr gap-12 py-8">
              {duplicatedLogosReverse.map((logo, idx) => (
                <div
                  key={`logo-2-${idx}`}
                  className="flex-shrink-0 w-[180px] h-[90px] flex items-center justify-center group"
                >
                  <div className="relative w-full h-full flex items-center justify-center p-6 rounded-xl bg-white border border-slate-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg">
                    <img
                      src={logo.logo}
                      alt={logo.name}
                      className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all duration-300"
                      title={logo.name}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex animate-marquee-ltr gap-12 py-8">
              {duplicatedLogosReverse.map((logo, idx) => (
                <div
                  key={`logo-2-dup-${idx}`}
                  className="flex-shrink-0 w-[180px] h-[90px] flex items-center justify-center group"
                >
                  <div className="relative w-full h-full flex items-center justify-center p-6 rounded-xl bg-white border border-slate-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg">
                    <img
                      src={logo.logo}
                      alt={logo.name}
                      className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all duration-300"
                      title={logo.name}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-sm text-slate-600 font-medium">
            רוצה להצטרף לרשימה?{' '}
            <a
              href="/pricing"
              className="text-indigo-600 hover:text-indigo-700 font-bold underline underline-offset-2 transition-colors"
            >
              התחל עכשיו חינם
            </a>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee-rtl {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes marquee-ltr {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .animate-marquee-rtl {
          animation: marquee-rtl 40s linear infinite;
        }

        .animate-marquee-ltr {
          animation: marquee-ltr 40s linear infinite;
        }

        /* Pause on hover */
        .animate-marquee-rtl:hover,
        .animate-marquee-ltr:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
