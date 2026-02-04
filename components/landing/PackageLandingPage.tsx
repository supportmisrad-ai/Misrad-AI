import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import { SalesFaq } from '@/components/landing/SalesFaq';
import { PackageCTAButtons } from '@/components/landing/PackageCTAButtons';
import { Users, AlertTriangle, CheckCircle2, Play, ArrowLeft, Sparkles, Gift } from 'lucide-react';

export type PackageLandingBullet = {
  title: string;
  desc: string;
};

const bulletGradients = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

export default function PackageLandingPage({
  badge,
  title,
  subtitle,
  audience,
  pain,
  bullets,
  ctaPrimaryHref,
  ctaPrimaryLabel,
  ctaSecondaryHref,
  ctaSecondaryLabel,
  videoUrl,
  videoTitle = 'סרטון הדגמה',
  variant = 'default',
}: {
  badge: string;
  title: string;
  subtitle: string;
  audience: string;
  pain: string;
  bullets: PackageLandingBullet[];
  ctaPrimaryHref: string;
  ctaPrimaryLabel: string;
  ctaSecondaryHref?: string;
  ctaSecondaryLabel?: string;
  videoUrl: string | null;
  videoTitle?: string;
  variant?: 'default' | 'tactical';
}) {
  const isTactical = variant === 'tactical';

  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          {isTactical ? (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
              <div className="absolute -top-24 -right-24 w-[560px] h-[560px] bg-orange-200/30 rounded-full blur-[140px] pointer-events-none" />
              <div className="absolute -bottom-32 -left-24 w-[640px] h-[640px] bg-amber-200/25 rounded-full blur-[170px] pointer-events-none" />
            </>
          ) : (
            <>
              <div className="absolute -top-24 -right-24 w-[560px] h-[560px] bg-indigo-200/30 rounded-full blur-[140px] pointer-events-none" />
              <div className="absolute -bottom-32 -left-24 w-[640px] h-[640px] bg-purple-200/20 rounded-full blur-[170px] pointer-events-none" />
            </>
          )}

          <div className="max-w-6xl mx-auto px-6 relative">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black ${
              isTactical 
                ? 'bg-orange-50 border-orange-200 text-orange-700'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}>
              <Sparkles size={14} />
              <span>{badge}</span>
              <span className={`px-2.5 py-1 rounded-full text-white text-[10px] font-black ${
                isTactical ? 'bg-orange-600' : 'bg-indigo-600'
              }`}>
                <Gift size={10} className="inline ml-1" />
                7 ימים חינם
              </span>
            </div>

            <h1 className="mt-6 sm:mt-8 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight max-w-4xl">
              {title.split(':')[0]}
              {title.includes(':') && (
                <span className={`block text-transparent bg-clip-text bg-gradient-to-r ${
                  isTactical ? 'from-orange-600 via-amber-600 to-orange-600' : 'from-indigo-600 via-purple-600 to-indigo-600'
                }`}>
                  {title.split(':')[1]}
                </span>
              )}
              {!title.includes(':') && null}
            </h1>

            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed">{subtitle}</p>

            <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="group rounded-3xl bg-white border border-slate-200 p-6 hover:shadow-xl transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-600 flex items-center justify-center text-white flex-shrink-0">
                    <Users size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-500">למי זה</div>
                    <div className="mt-1.5 sm:mt-2 text-base sm:text-lg font-black text-slate-900">{audience}</div>
                  </div>
                </div>
              </div>
              <div className="group rounded-3xl bg-white border border-slate-200 p-6 hover:shadow-xl transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-600 flex items-center justify-center text-white flex-shrink-0">
                    <AlertTriangle size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-500">הבעיה שאנחנו פותרים</div>
                    <div className="mt-1.5 sm:mt-2 text-base sm:text-lg font-black text-slate-900">{pain}</div>
                  </div>
                </div>
              </div>
            </div>

            <PackageCTAButtons 
              ctaPrimaryHref={ctaPrimaryHref}
              ctaPrimaryLabel={ctaPrimaryLabel}
              ctaSecondaryHref={ctaSecondaryHref}
              ctaSecondaryLabel={ctaSecondaryLabel}
            />
          </div>
        </section>

        {/* Features + Video Section */}
        <section className="py-20 sm:py-28 bg-gradient-to-b from-slate-50 to-white relative">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Bullets */}
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight">
                  למה זה עובד
                  <span className={`block text-transparent bg-clip-text bg-gradient-to-r ${
                    isTactical ? 'from-orange-600 to-amber-600' : 'from-indigo-600 to-purple-600'
                  }`}>בפועל</span>
                </h2>
                <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                  {bullets.map((b, i) => (
                    <div key={b.title} className="group rounded-2xl sm:rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${bulletGradients[i % bulletGradients.length]} flex items-center justify-center text-white shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform`}>
                          <CheckCircle2 size={18} className="sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <div className="text-base sm:text-lg font-black text-slate-900">{b.title}</div>
                          <div className="text-sm sm:text-base text-slate-600 mt-1.5 sm:mt-2 leading-relaxed">{b.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video Card */}
              <div className="relative lg:sticky lg:top-28">
                                <div className="relative rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
                  <div className={`p-6 border-b border-slate-100 bg-gradient-to-r ${
                    isTactical ? 'from-orange-50 via-white to-amber-50' : 'from-indigo-50 via-white to-purple-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Play size={16} className={isTactical ? 'text-orange-600' : 'text-indigo-600'} />
                      <span className="text-xs font-black text-slate-600">{videoTitle}</span>
                    </div>
                    <div className="mt-2 text-xl font-black text-slate-900">איך זה נראה במסך</div>
                  </div>

                  <div className="p-6">
                    {videoUrl ? (
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                        <iframe
                          src={videoUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={videoTitle}
                        />
                      </div>
                    ) : (
                      <div className={`rounded-2xl border-2 border-dashed p-10 text-center ${
                        isTactical ? 'border-orange-200 bg-orange-50/50' : 'border-indigo-200 bg-indigo-50/50'
                      }`}>
                        <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                          isTactical ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'
                        }`}>
                          <Play size={28} />
                        </div>
                        <div className="mt-4 text-slate-900 font-black">כאן יופיע סרטון הדגמה</div>
                        <div className="text-slate-500 text-sm mt-2">אפשר להדביק קישור סרטון דרך פאנל האדמין.</div>
                      </div>
                    )}

                    <div className="mt-6">
                      <Link
                        href={ctaPrimaryHref}
                        className="w-full group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-slate-900 text-white font-black shadow-lg hover:bg-slate-800 transition-colors"
                      >
                        {ctaPrimaryLabel}
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                      </Link>
                    </div>

                    <div className="mt-4 text-center text-xs text-slate-500">
                      בלי התחייבות · פשוט מתחילים לעבוד
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <TestimonialsSection />

        <SalesFaq variant="default" />
      </main>
      <Footer />
    </div>
  );
}
