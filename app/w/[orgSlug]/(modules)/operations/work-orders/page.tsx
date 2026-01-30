export const dynamic = 'force-dynamic';

import Link from 'next/link';

import { getOperationsProjectOptions, getOperationsWorkOrdersData } from '@/app/actions/operations';
import WorkOrdersSmartSortClient from '@/components/operations/WorkOrdersSmartSortClient';
import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';

function formatStatus(status: string): { label: string; className: string } {
  switch (status) {
    case 'NEW':
      return {
        label: 'נפתח',
        className: 'bg-sky-50 text-sky-700 border border-sky-100',
      };
    case 'IN_PROGRESS':
      return {
        label: 'בטיפול',
        className: 'bg-amber-50 text-amber-700 border border-amber-100',
      };
    case 'DONE':
      return {
        label: 'הושלם',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      };
    default:
      return {
        label: status,
        className: 'bg-slate-50 text-slate-700 border border-slate-200',
      };
  }
}

export default async function OperationsWorkOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug } = await params;
  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const workspace = await requireWorkspaceAccessByOrgSlugUi(orgSlug);
  const user = await resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);

  const sp = (await searchParams) ?? {};

  const statusParamRaw = sp.status;
  const projectIdRaw = sp.projectId;
  const onlyMineRaw = sp.onlyMine;
  const statusParam = Array.isArray(statusParamRaw) ? statusParamRaw[0] : statusParamRaw;
  const projectId = Array.isArray(projectIdRaw) ? projectIdRaw[0] : projectIdRaw;
  const onlyMine = String(Array.isArray(onlyMineRaw) ? onlyMineRaw[0] : onlyMineRaw) === '1';

  const status = statusParam
    ? (String(statusParam) as any)
    : ('OPEN' as const);

  const [workOrdersRes, projectOptionsRes] = await Promise.all([
    getOperationsWorkOrdersData({
      orgSlug,
      status,
      projectId: projectId ? String(projectId) : undefined,
      assignedTechnicianId: onlyMine ? user.id : undefined,
    }),
    getOperationsProjectOptions({ orgSlug }),
  ]);

  const workOrders = workOrdersRes.success ? workOrdersRes.data?.workOrders ?? [] : [];
  const projectOptions = projectOptionsRes.success ? projectOptionsRes.data ?? [] : [];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <section className="bg-white/80 backdrop-blur rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-slate-900">קריאות שירות</div>
              <div className="text-xs text-slate-500 mt-1">סך הכל {workOrders.length} קריאות</div>
            </div>

            <Link
              href={`${base}/work-orders/new`}
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              קריאה חדשה
            </Link>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label htmlFor="status" className="block text-xs font-black text-slate-700">
                סטטוס
              </label>
              <select
                id="status"
                name="status"
                defaultValue={statusParam ? String(statusParam) : 'OPEN'}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="OPEN">פתוחות</option>
                <option value="ALL">הכל</option>
                <option value="NEW">חדש</option>
                <option value="IN_PROGRESS">בטיפול</option>
                <option value="DONE">הושלם</option>
              </select>
            </div>

            <div>
              <label htmlFor="projectId" className="block text-xs font-black text-slate-700">
                פרויקט
              </label>
              <select
                id="projectId"
                name="projectId"
                defaultValue={projectId ? String(projectId) : ''}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="">כל הפרויקטים</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="onlyMine" className="block text-xs font-black text-slate-700">
                הקצאה
              </label>
              <select
                id="onlyMine"
                name="onlyMine"
                defaultValue={onlyMine ? '1' : '0'}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="0">הכל</option>
                <option value="1">רק שלי</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                סנן
              </button>
            </div>
          </form>

          <WorkOrdersSmartSortClient baseHref={base} workOrders={workOrders} />

          {!workOrdersRes.success ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {workOrdersRes.error || 'שגיאה בטעינת הקריאות'}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
