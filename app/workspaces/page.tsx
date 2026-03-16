import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getCurrentUserId } from '@/lib/server/authHelper';
import prisma from '@/lib/prisma';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

type WorkspaceItem = {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
};

async function loadWorkspacesForCurrentUser(): Promise<WorkspaceItem[]> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    redirect('/login?redirect=/workspaces');
  }

  let socialUser: { id: string; organization_id: string | null } | null = null;
  try {
    socialUser = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: clerkUserId },
      select: { id: true, organization_id: true },
    });
  } catch {
    socialUser = null;
  }

  if (!socialUser?.id) {
    redirect('/workspaces/new');
  }

  const orgIds = new Set<string>();

  if (socialUser.organization_id) {
    orgIds.add(String(socialUser.organization_id));
  }

  // Run owned orgs and memberships queries in parallel
  const [ownedOrgs, membershipRows] = await Promise.all([
    prisma.organization.findMany({
      where: { owner_id: socialUser.id },
      select: { id: true },
    }),
    prisma.teamMember.findMany({
      where: { user_id: socialUser.id },
      select: { organization_id: true },
    }),
  ]);
  for (const org of ownedOrgs) {
    if (org?.id) orgIds.add(String(org.id));
  }
  for (const row of membershipRows) {
    if (row?.organization_id) orgIds.add(String(row.organization_id));
  }

  if (orgIds.size === 0) {
    redirect('/workspaces/new');
  }

  const orgs = await prisma.organization.findMany({
    where: { id: { in: Array.from(orgIds) } },
    select: {
      id: true,
      slug: true,
      name: true,
      logo: true,
      subscription_plan: true,
      subscription_status: true,
    },
  });

  return orgs.map((o: { id: string; slug: string | null; name: string; logo: string | null; subscription_plan: string | null; subscription_status: string | null }) => ({
    id: String(o.id),
    slug: String(o.slug || o.id),
    name: String(o.name || 'Workspace'),
    logo: o.logo ?? null,
    subscriptionPlan: o.subscription_plan ?? null,
    subscriptionStatus: o.subscription_status ?? null,
  }));
}

export default async function WorkspacesPage() {
  const workspaces = await loadWorkspacesForCurrentUser();

  // Check for pinned org in cookie
  const cookieStore = await cookies();
  const pinnedOrgId = cookieStore.get('misrad_pinned_org')?.value;
  
  if (pinnedOrgId) {
    const pinnedWorkspace = workspaces.find((ws) => ws.id === pinnedOrgId);
    if (pinnedWorkspace) {
      // If pinned and not expired, redirect. If expired, we show the list so they can see the status.
      if (pinnedWorkspace.subscriptionStatus !== 'expired') {
        if (!pinnedWorkspace.subscriptionPlan) {
          redirect('/workspaces/onboarding');
        }
        redirect(`/w/${encodeURIComponent(pinnedWorkspace.slug)}`);
      }
    }
  }

  // If single valid workspace and NO expired ones, redirect to it
  const validWorkspaces = workspaces.filter(ws => ws.subscriptionStatus !== 'expired');
  const expiredWorkspaces = workspaces.filter(ws => ws.subscriptionStatus === 'expired');

  if (validWorkspaces.length === 1 && expiredWorkspaces.length === 0) {
    const singleWorkspace = validWorkspaces[0];
    if (!singleWorkspace.subscriptionPlan) {
      redirect('/workspaces/onboarding');
    }
    redirect(`/w/${encodeURIComponent(singleWorkspace.slug)}`);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" dir="rtl">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[520px] h-[520px] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[420px] h-[420px] bg-purple-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[520px] h-[520px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <div className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">Workspaces</div>
          <h1 className="text-3xl font-black text-slate-900 mt-2">בחר עסק להיכנס אליו</h1>
          <p className="text-sm text-slate-600 mt-2 italic">
            {expiredWorkspaces.length > 0 
              ? 'שים לב: חלק מהעסקים שלך דורשים חידוש מנוי.'
              : 'הדף הזה מופיע רק אם המערכת לא יודעת לאן להפנות אותך.'}
          </p>
        </div>

        {workspaces.length === 0 ? (
          <div className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
            <div className="font-black text-slate-900">לא נמצאו עסקים לחשבון הזה</div>
            <div className="text-sm text-slate-600 mt-2">אם זה משתמש חדש לגמרי, נסה להתחבר מחדש או ליצור עסק.</div>
            <div className="mt-6">
              <Link
                href="/workspaces/new"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-white font-black shadow-md hover:from-indigo-700 hover:to-purple-700 transition"
              >
                יצירת עסק חדש
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {workspaces.map((ws) => {
              const isExpired = ws.subscriptionStatus === 'expired';
              return (
                <Link
                  key={ws.id}
                  href={isExpired ? '/app/trial-expired' : `/w/${encodeURIComponent(ws.slug)}`}
                  className={`group relative rounded-3xl border border-white/70 backdrop-blur p-6 transition-all overflow-hidden shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] hover:shadow-[0_30px_80px_-35px_rgba(15,23,42,0.45)] ${
                    isExpired ? 'bg-slate-50/80' : 'bg-white/70'
                  }`}
                >
                  <div className="absolute inset-0 opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: isExpired ? 'none' : 'radial-gradient(600px circle at 30% 10%, rgba(99,102,241,0.18), transparent 40%)' }} />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl border border-white/70 shadow-lg flex items-center justify-center overflow-hidden ${isExpired ? 'bg-slate-100 grayscale' : 'bg-white/80'}`}>
                        {ws.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ws.logo} alt={ws.name} className="w-8 h-8 object-contain" />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-slate-200" />
                        )}
                      </div>
                      <div>
                        <div className={`font-black text-lg ${isExpired ? 'text-slate-500' : 'text-slate-900'}`}>{ws.name}</div>
                        <div className="text-xs text-slate-400 font-bold">{ws.slug}</div>
                        {isExpired && (
                          <div className="text-[10px] text-red-500 font-black mt-1 bg-red-50 px-2 py-0.5 rounded-full inline-block">
                            פג תוקף
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`transition text-sm font-black ${isExpired ? 'text-red-600 group-hover:text-red-700' : 'text-slate-500 group-hover:text-slate-900'}`}>
                      {isExpired ? 'חידוש' : 'כניסה'}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
