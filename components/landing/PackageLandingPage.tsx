import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export type PackageLandingBullet = {
  title: string;
  desc: string;
};

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
  const rootClassName = isTactical ? 'min-h-screen bg-[#f7f7f5] text-slate-900' : 'min-h-screen bg-white text-slate-900';
  const primaryCtaClassName = isTactical
    ? 'inline-flex items-center justify-center px-6 py-3 rounded-xl bg-orange-600 text-white font-bold shadow-xl shadow-orange-600/10 hover:bg-orange-500'
    : 'inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-900 text-white font-bold shadow-xl shadow-slate-900/10 hover:bg-black';

  return (
    <div className={rootClassName} dir="rtl">
      <Navbar />
      <main className="pt-24">
        <section className="relative overflow-hidden">
          {isTactical ? (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
              <div className="absolute -top-24 -right-24 w-[560px] h-[560px] bg-slate-200/40 rounded-full blur-[140px] pointer-events-none" />
              <div className="absolute -bottom-32 -left-24 w-[640px] h-[640px] bg-amber-200/20 rounded-full blur-[170px] pointer-events-none" />
            </>
          ) : (
            <>
              <div className="absolute -top-24 -right-24 w-[560px] h-[560px] bg-indigo-200/25 rounded-full blur-[140px] pointer-events-none" />
              <div className="absolute -bottom-32 -left-24 w-[640px] h-[640px] bg-emerald-200/15 rounded-full blur-[170px] pointer-events-none" />
            </>
          )}

          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>{badge}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black">7 ימים בלי אשראי</span>
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              {title}
            </h1>

            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">{subtitle}</p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <div className="text-xs font-black text-slate-500">למי זה</div>
                <div className="mt-2 font-black text-slate-900">{audience}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <div className="text-xs font-black text-slate-500">הבעיה שאנחנו פותרים</div>
                <div className="mt-2 font-black text-slate-900">{pain}</div>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href={ctaPrimaryHref}
                className={primaryCtaClassName}
              >
                {ctaPrimaryLabel}
              </Link>
              {ctaSecondaryHref && ctaSecondaryLabel ? (
                <Link
                  href={ctaSecondaryHref}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  {ctaSecondaryLabel}
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black leading-tight">למה זה עובד בפועל</h2>
                <div className="mt-6 space-y-3">
                  {bullets.map((b) => (
                    <div key={b.title} className="rounded-2xl bg-white border border-slate-200 p-4">
                      <div className="font-black text-slate-900">{b.title}</div>
                      <div className="text-sm text-slate-600 mt-1 leading-relaxed">{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50">
                  <div className="text-xs font-black text-slate-600">{videoTitle}</div>
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
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                      <div className="text-slate-900 font-black">כאן יופיע סרטון הדגמה</div>
                      <div className="text-slate-600 text-sm mt-2">אפשר להדביק קישור סרטון דרך פאנל האדמין.</div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Link
                      href={ctaPrimaryHref}
                      className={
                        isTactical
                          ? 'inline-flex items-center justify-center flex-1 px-6 py-3 rounded-xl bg-orange-600 text-white font-black hover:bg-orange-500'
                          : 'inline-flex items-center justify-center flex-1 px-6 py-3 rounded-xl bg-slate-900 text-white font-black hover:bg-black'
                      }
                    >
                      {ctaPrimaryLabel}
                    </Link>
                    {ctaSecondaryHref && ctaSecondaryLabel ? (
                      <Link
                        href={ctaSecondaryHref}
                        className="inline-flex items-center justify-center flex-1 px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50"
                      >
                        {ctaSecondaryLabel}
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-4 text-xs text-slate-500">
                    בלי התחייבות. בלי כרטיס אשראי. פשוט מתחילים לעבוד.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
