import { OSModuleKey } from '@/lib/os/modules/types';
import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import LobbyModulesGrid from '@/components/shared/LobbyModulesGrid';

export const dynamic = 'force-dynamic';


export default async function LobbyPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlugUi(orgSlug);

  return (
    <div className="min-h-screen bg-[#F8FAFC]" dir="rtl">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[520px] h-[520px] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[420px] h-[420px] bg-purple-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[520px] h-[520px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">Workspace</div>
            <h1 className="text-3xl font-black text-slate-900 mt-2">{workspace.name}</h1>
            <p className="text-sm text-slate-600 mt-2">בחר מודול להיכנס אליו</p>
          </div>
        </div>

        <div className="mt-10">
          <div className="text-sm font-black text-slate-700 mb-4">המודולים שלך</div>
          <LobbyModulesGrid orgSlug={orgSlug} entitlements={workspace.entitlements} />
        </div>
      </div>
    </div>
  );
}
