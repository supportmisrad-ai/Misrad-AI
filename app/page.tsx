import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';
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
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden" dir="rtl">
      <Navbar />
      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[560px] h-[560px] bg-amber-200/35 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[640px] h-[640px] bg-rose-200/20 rounded-full blur-[170px] pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
                  <span className="px-2 py-0.5 rounded-full bg-onyx-900 text-white text-[10px] font-black">MISRAD OS</span>
                </div>

                <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
                  MISRAD OS:
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-rose-700 to-indigo-700">
                    המערכת היחידה ששומעת אותך,
                  </span>
                  <span className="block">עובדת בשבילך, ומתאימה את עצמה לעסק.</span>
                </h1>

                <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
                  במקום עוד תוכנה שמוסיפה עבודה — מערכת שמורידה לך עומס. מהטלפון, מהטאבלט, ובקול.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/sign-up"
                    className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-xl bg-onyx-900 text-white font-black shadow-xl shadow-onyx-900/10 hover:bg-black"
                  >
                    נסה בחינם
                  </Link>
                  <Link
                    href="/operations"
                    className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50"
                  >
                    ראה דוגמה למודול תפעול
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-amber-50 via-white to-indigo-50">
                  <div className="text-xs font-black text-slate-600">בשטח זה חייב להיות פשוט</div>
                  <div className="mt-2 text-xl font-black text-slate-900">שליטה בלי בלגן</div>
                </div>
                <div className="p-6">
                  <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-amber-50 p-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-slate-700">מוכן לעבודה בשטח</div>
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900">
                        <ClipboardCheck size={18} />
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { title: 'סידור עבודה', desc: 'מי הולך לאן ומתי' },
                        { title: 'קריאה', desc: 'פתיחה וסיום' },
                        { title: 'דיווח', desc: 'תיעוד בשטח' },
                      ].map((x) => (
                        <div key={x.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="font-black text-slate-900">{x.title}</div>
                          <div className="text-xs text-slate-600 mt-1">{x.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <KillerFeaturesBox id="features" />

        <section id="pricing" className="py-14 sm:py-16 bg-slate-50 border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <div className="text-xs font-black text-slate-600">מחירים</div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">בחר חבילה. התחל לעבוד היום.</div>
                <div className="mt-3 text-slate-600 leading-relaxed">ניסיון חינם מלא — בלי כרטיס.</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <Link
                  href="/pricing"
                  className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-xl bg-slate-900 text-white font-black hover:bg-black"
                >
                  ראה מחירים
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50"
                >
                  נסה בחינם
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="comparison" className="py-14 sm:py-16 bg-white border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'שקיפות', desc: 'סטטוס לכל קריאה — בלי לרדוף אחרי אנשים.' },
                { title: 'אחידות', desc: 'תהליך אחיד שמקטין טעויות וחוסך זמן.' },
                { title: 'מהירות', desc: 'עובדים מהטלפון/טאבלט — בלי חיכוך.' },
              ].map((x) => (
                <div key={x.title} className="rounded-2xl bg-slate-50 border border-slate-200 p-6">
                  <div className="font-black text-slate-900">{x.title}</div>
                  <div className="text-sm text-slate-600 mt-2">{x.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16 bg-white border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <div className="text-xs font-black text-slate-600">MISRAD Connect</div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">רוצים לגדול? שתפו לידים שלא הספקתם לקחת.</div>
                <div className="mt-3 text-slate-600 leading-relaxed">
                  היומן מלא? אל תזרקו את העבודה. העבירו את הליד לקולגה בקליק אחד דרך וואטסאפ — וקבלו עמלה או קרדיט.
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <Link
                  href="/pricing"
                  className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-xl bg-slate-900 text-white font-black hover:bg-black"
                >
                  ראה חבילות
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50"
                >
                  נסה בחינם
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
