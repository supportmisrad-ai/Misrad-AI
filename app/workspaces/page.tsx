import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getCurrentUserId } from '@/lib/server/authHelper';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type WorkspaceItem = {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
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

  const ownedOrgs = await prisma.organization.findMany({
    where: { owner_id: socialUser.id },
    select: { id: true },
  });
  for (const org of ownedOrgs) {
    if (org?.id) orgIds.add(String(org.id));
  }

  const membershipRows = await prisma.teamMember.findMany({
    where: { user_id: socialUser.id },
    select: { organization_id: true },
  });
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
    },
  });

  return orgs.map((o) => ({
    id: String(o.id),
    slug: String(o.slug || o.id),
    name: String(o.name || 'Workspace'),
    logo: o.logo ?? null,
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
      redirect(`/w/${encodeURIComponent(pinnedWorkspace.slug)}`);
    }
  }

  if (workspaces.length === 1) {
    redirect(`/w/${encodeURIComponent(workspaces[0].slug)}`);
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
          <p className="text-sm text-slate-600 mt-2">הדף הזה מופיע רק אם המערכת לא יודעת לאן להפנות אותך.</p>
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
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/w/${encodeURIComponent(ws.slug)}`}
                className="group relative rounded-3xl border border-white/70 bg-white/70 backdrop-blur p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] hover:shadow-[0_30px_80px_-35px_rgba(15,23,42,0.45)] transition-all overflow-hidden"
              >
                <div className="absolute inset-0 opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(600px circle at 30% 10%, rgba(99,102,241,0.18), transparent 40%)' }} />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/80 border border-white/70 shadow-lg flex items-center justify-center overflow-hidden">
                      {ws.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ws.logo} alt={ws.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-slate-200" />
                      )}
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-lg">{ws.name}</div>
                      <div className="text-xs text-slate-600 font-bold">{ws.slug}</div>
                    </div>
                  </div>
                  <div className="text-slate-500 group-hover:text-slate-900 transition text-sm font-black">כניסה</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
