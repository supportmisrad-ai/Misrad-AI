import Link from 'next/link';
import { ShieldAlert, ArrowRight, Home } from 'lucide-react';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function NoAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
  searchParams: { module?: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;
  const sp = searchParams;
  const requestedModule = sp?.module ? String(sp.module) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white" dir="rtl">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                <ShieldAlert className="text-rose-200" size={26} />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">אין לך גישה לחדר הזה</h1>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">
                  ניסית להיכנס למודול שאינו מורשה עבורך במרחב העבודה הזה.
                  {requestedModule ? (
                    <span className="block mt-2">מודול מבוקש: <span className="font-bold text-white">{requestedModule}</span></span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link
                href={`/subscribe/checkout?orgSlug=${encodeURIComponent(orgSlug)}`}
                className="rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-400 text-slate-900 font-black px-5 py-4 flex items-center justify-between shadow-lg shadow-emerald-500/20"
              >
                <span>פתיחת גישה / תשלום</span>
                <ArrowRight size={18} />
              </Link>

              <Link
                href={`/w/${encodeURIComponent(orgSlug)}/nexus`}
                className="rounded-2xl bg-white text-slate-900 font-black px-5 py-4 flex items-center justify-between"
              >
                <span>חזרה ל-Nexus</span>
                <ArrowRight size={18} />
              </Link>

              <Link
                href={`/w/${encodeURIComponent(orgSlug)}/lobby`}
                className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-black px-5 py-4 flex items-center justify-between transition-colors"
              >
                <span>לובי החדרים</span>
                <Home size={18} />
              </Link>
            </div>

            <div className="mt-8 rounded-2xl bg-black/20 border border-white/10 p-5">
              <div className="text-xs text-white/60 font-bold">טיפ</div>
              <div className="mt-1 text-sm text-white/75 leading-relaxed">
                אם אתה חושב שזו טעות, בקש מהמנהל להחזיר הרשאה למודול דרך ניהול הצוות ב-Nexus.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-white/40">
          MISRAD AI · בקרת גישה
        </div>
      </div>
    </div>
  );
}
