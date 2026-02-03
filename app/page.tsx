import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClipboardCheck, ArrowLeft, Sparkles, Zap, Shield, Users, Eye, Target, Rocket, MessageCircle, Share2, Gift } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { loadCurrentUserLastLocation } from '@/lib/server/workspace';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import KillerFeaturesBox from '@/components/landing/KillerFeaturesBox';

// Force dynamic rendering to prevent build-time Clerk errors and handle auth server-side
export const dynamic = 'force-dynamic';

async function resolveRedirectWorkspaceSlugForCurrentUser(): Promise<string | null> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) return null;

  const socialUser = await prisma.social_users.findUnique({
    where: { clerk_user_id: clerkUserId },
    select: { id: true, organization_id: true },
  });

  if (!socialUser?.id) return null;

  const orgIds = new Set<string>();

  if (socialUser.organization_id) {
    orgIds.add(String(socialUser.organization_id));
  }

  const ownedOrgs = await prisma.social_organizations.findMany({
    where: { owner_id: String(socialUser.id) },
    select: { id: true },
  });

  for (const row of ownedOrgs) {
    if (row?.id) orgIds.add(String(row.id));
  }

  const memberships = await prisma.social_team_members.findMany({
    where: { user_id: String(socialUser.id) },
    select: { organization_id: true },
  });

  for (const row of memberships) {
    if (row?.organization_id) orgIds.add(String(row.organization_id));
  }

  const ids = Array.from(orgIds);
  if (!ids.length) return null;

  const orgs = await prisma.social_organizations.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true },
  });

  if (!orgs.length) return null;

  const last = await loadCurrentUserLastLocation();
  const lastKey = last?.orgSlug ? String(last.orgSlug) : '';
  if (lastKey) {
    const match = orgs.find((o) => String(o.slug || '') === lastKey || String(o.id) === lastKey);
    if (match) return String(match.slug || match.id);
  }

  const primaryId = socialUser.organization_id ? String(socialUser.organization_id) : '';
  if (primaryId) {
    const match = orgs.find((o) => String(o.id) === primaryId);
    if (match) return String(match.slug || match.id);
  }

  return String(orgs[0].slug || orgs[0].id);
}

export default async function RootPage() {
  // Server-side auth check. If authenticated -> go straight to workspace entry.
  const clerkUserId = await getCurrentUserId();
  if (clerkUserId) {
    let orgSlug: string | null = null;
    try {
      orgSlug = await resolveRedirectWorkspaceSlugForCurrentUser();
    } catch (error) {
      console.error('[RootPage] failed to resolve redirect workspace:', error);
    }

    if (orgSlug) {
      redirect(`/w/${encodeURIComponent(orgSlug)}`);
    }

    redirect('/workspaces');
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden flex flex-col" dir="rtl">
      <Navbar />
      <main className="pt-20 flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-white">
          {/* Background Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-[600px] h-[600px] bg-gradient-to-br from-amber-200/40 via-rose-200/30 to-transparent rounded-full blur-[120px]" />
            <div className="absolute -bottom-32 -left-24 w-[700px] h-[700px] bg-gradient-to-tr from-indigo-200/30 via-purple-200/20 to-transparent rounded-full blur-[150px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-emerald-100/20 to-cyan-100/20 rounded-full blur-[200px]" />
          </div>

          <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                {/* Badge */}
                <div className="inline-flex items-center gap-3 px-1.5 py-1.5 pr-5 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200/80 shadow-lg shadow-slate-200/50">
                  <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black flex items-center gap-1.5">
                    <Sparkles size={12} />
                    MISRAD AI
                  </span>
                  <span className="text-xs font-bold text-slate-600">מערכת הפעלה לעסקים</span>
                </div>

                <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] tracking-tight">
                  <span className="text-slate-900">המערכת היחידה</span>
                  <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600">
                    ששומעת אותך,
                  </span>
                  <span className="block mt-2 text-slate-900">עובדת בשבילך.</span>
                </h1>

                <p className="mt-8 text-lg text-slate-600 max-w-xl leading-relaxed">
                  במקום עוד תוכנה שמוסיפה עבודה — מערכת שמורידה לך עומס. 
                  <span className="font-semibold text-slate-700">מהטלפון, מהטאבלט, ובקול.</span>
                </p>

                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/pricing"
                    className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-slate-900 text-white font-black shadow-lg hover:bg-slate-800 transition-colors"
                  >
                    התחל ניסיון חינם
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/operations"
                    className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-black hover:border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    ראה דמו חי
                    <Zap size={16} className="text-amber-500" />
                  </Link>
                </div>

                {/* Trust Badges */}
                <div className="mt-10 flex items-center gap-6 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-emerald-500" />
                    <span>אבטחה מלאה</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" />
                    <span>מערכת ישראלית</span>
                  </div>
                </div>
              </div>

              {/* Hero Card */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-rose-500/20 rounded-[2rem] blur-2xl" />
                <div className="relative rounded-3xl bg-white border border-slate-200/80 shadow-2xl shadow-slate-300/50 overflow-hidden">
                  {/* Card Header */}
                  <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-indigo-600">בשטח זה חייב להיות פשוט</div>
                        <div className="mt-1 text-xl font-black text-slate-900">שליטה בלי בלגן</div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                        <ClipboardCheck size={22} />
                      </div>
                    </div>
                  </div>
                  {/* Card Content */}
                  <div className="p-6">
                    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5">
                      <div className="text-sm font-bold text-slate-600 mb-4">מוכן לעבודה בשטח</div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { title: 'סידור עבודה', desc: 'מי הולך לאן', color: 'from-amber-400 to-orange-500' },
                          { title: 'קריאות', desc: 'פתיחה וסיום', color: 'from-emerald-400 to-teal-500' },
                          { title: 'דיווח', desc: 'תיעוד בשטח', color: 'from-indigo-400 to-purple-500' },
                        ].map((x) => (
                          <div key={x.title} className="group rounded-xl border border-slate-100 bg-white p-4 hover:shadow-lg hover:border-slate-200 transition-all cursor-pointer">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${x.color} mb-3 flex items-center justify-center`}>
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                            <div className="font-bold text-slate-900 text-sm">{x.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{x.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Stats */}
                    <div className="mt-4 flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-emerald-600">Online</span>
                      </div>
                      <div className="text-xs text-slate-400">עדכון אחרון: עכשיו</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <KillerFeaturesBox id="features" />

        {/* Pricing CTA Section */}
        <section id="pricing" className="py-20 sm:py-28 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-[100px]" />
          </div>
          <div className="max-w-6xl mx-auto px-6 relative">
            <div className="relative rounded-[2rem] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
              <div className="relative p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="text-center lg:text-right">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-bold mb-4">
                    <Gift size={14} />
                    ניסיון חינם מלא — בלי כרטיס
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white">בחר חבילה. התחל לעבוד היום.</div>
                  <div className="mt-3 text-white/80 text-lg">חבילות גמישות לכל גודל עסק</div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/pricing"
                    className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-indigo-600 font-black shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
                  >
                    ראה מחירים
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Props Section */}
        <section id="comparison" className="py-20 sm:py-28 bg-white relative">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">למה דווקא MISRAD?</h2>
              <p className="mt-4 text-lg text-slate-600">כי אנחנו לא מוכרים תוכנה, אנחנו מוכרים שיטת עבודה.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Eye, title: 'שקיפות מלאה', desc: 'סטטוס לכל קריאה — בלי לרדוף אחרי אנשים.', gradient: 'from-cyan-500 to-blue-600' },
                { icon: Target, title: 'אחידות', desc: 'תהליך אחיד שמקטין טעויות וחוסך זמן.', gradient: 'from-purple-500 to-indigo-600' },
                { icon: Rocket, title: 'מהירות', desc: 'עובדים מהטלפון/טאבלט — בלי חיכוך.', gradient: 'from-amber-500 to-orange-600' },
              ].map((x) => (
                <div key={x.title} className="group rounded-3xl bg-white border border-slate-200 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${x.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <x.icon size={24} />
                  </div>
                  <div className="mt-6 text-xl font-black text-slate-900">{x.title}</div>
                  <div className="mt-3 text-slate-600 leading-relaxed">{x.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MISRAD Connect Section */}
        <section className="py-20 sm:py-28 bg-gradient-to-b from-white to-emerald-50/50 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-[120px]" />
          </div>
          <div className="max-w-6xl mx-auto px-6 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-black mb-6">
                  <Share2 size={14} />
                  MISRAD Connect
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                  רוצים לגדול?
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">שתפו לידים.</span>
                </h2>
                <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                  היומן מלא? אל תזרקו את העבודה. העבירו את הליד לקולגה בקליק אחד דרך וואטסאפ — <span className="font-semibold text-slate-700">וקבלו עמלה או קרדיט.</span>
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/pricing"
                    className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-slate-900 text-white font-black shadow-lg hover:bg-slate-800 transition-colors"
                  >
                    גלה עוד
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
              {/* WhatsApp Visual */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-[2rem] blur-2xl" />
                <div className="relative rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8">
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white">
                      <MessageCircle size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">ליד חדש הועבר</div>
                      <div className="text-sm text-slate-500">דרך WhatsApp</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="bg-emerald-50 rounded-2xl rounded-tr-sm p-4 max-w-[80%]">
                      <div className="text-sm text-slate-700">היי, יש לי ליד שלא מספיק לקחת אותו. מעוניין?</div>
                    </div>
                    <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-4 max-w-[80%] mr-auto">
                      <div className="text-sm text-slate-700">בטח! שלח לי</div>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-emerald-700">עמלה שהתקבלה</div>
                      <div className="text-lg font-black text-emerald-600">₪150</div>
                    </div>
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
