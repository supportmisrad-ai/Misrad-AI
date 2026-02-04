import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import { getCurrentUserId } from '@/lib/server/authHelper';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getFirstWorkspaceSlug(): Promise<string | null> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) return null;

  try {
    const socialUser = await prisma.social_users.findFirst({
      where: { clerk_user_id: clerkUserId },
      select: { id: true, organization_id: true },
    });

    if (!socialUser?.id) return null;

    const orgIds = new Set<string>();
    if (socialUser.organization_id) orgIds.add(String(socialUser.organization_id));

    const ownedOrgs = await prisma.social_organizations.findMany({
      where: { owner_id: socialUser.id },
      select: { id: true },
    });
    ownedOrgs.forEach(o => o?.id && orgIds.add(String(o.id)));

    const memberships = await prisma.social_team_members.findMany({
      where: { user_id: socialUser.id },
      select: { organization_id: true },
    });
    memberships.forEach(m => m?.organization_id && orgIds.add(String(m.organization_id)));

    if (orgIds.size === 0) return null;

    const orgs = await prisma.social_organizations.findMany({
      where: { id: { in: Array.from(orgIds) } },
      select: { slug: true, has_nexus: true },
      orderBy: { created_at: 'asc' },
    });

    const nexusOrg = orgs.find(o => o.has_nexus);
    if (nexusOrg?.slug) return nexusOrg.slug;

    return orgs[0]?.slug || null;
  } catch {
    return null;
  }
}

export default async function NexusMarketingPage() {
  const workspaceSlug = await getFirstWorkspaceSlug();
  if (workspaceSlug) {
    redirect(`/w/${encodeURIComponent(workspaceSlug)}/nexus`);
  }
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-slate-200/50 rounded-full blur-[130px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-indigo-200/15 rounded-full blur-[160px] pointer-events-none" />
          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>{getModuleLabelHe('nexus')}</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              {getModuleLabelHe('nexus')}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900">
                חדר המנהלים שלך
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
              Nexus הוא מרכז השליטה של Misrad AI: תמונת מצב אחת לצוות, משימות, הרשאות ותהליכים — כדי שתוכל לנהל את העסק מהר ובביטחון.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="text-xs font-black text-slate-500">ניהול צוות</div>
                <div className="mt-2 text-lg font-black">מי עושה מה ומתי</div>
                <div className="mt-2 text-sm text-slate-600">תמונה רחבה, עומסים, משימות ותיעדוף.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="text-xs font-black text-slate-500">תפעול</div>
                <div className="mt-2 text-lg font-black">תהליכים קצרים</div>
                <div className="mt-2 text-sm text-slate-600">הכל נגיש, ברור ומדיד.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="text-xs font-black text-slate-500">סנכרון</div>
                <div className="mt-2 text-lg font-black">חיבור לכל המודולים</div>
                <div className="mt-2 text-sm text-slate-600">נגיעה אחת שמחברת System, Client ו-Social.</div>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-900 text-white font-bold shadow-xl shadow-slate-900/10"
              >
                התחל חינם
              </Link>
              <Link
                href="/subscribe/checkout?package=solo&module=nexus&billing=monthly"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
              >
                מעבר לתשלום
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
