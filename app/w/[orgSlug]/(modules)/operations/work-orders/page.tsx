// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import Link from 'next/link';

import { getOperationsProjectOptions, getOperationsWorkOrdersData } from '@/app/actions/operations';
import { Select } from '@/components/ui/select';
import WorkOrdersSmartSortClient from '@/components/operations/WorkOrdersSmartSortClient';
import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';
import type { OperationsWorkOrderStatus } from '@/lib/services/operations/types';

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
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug } = await params;
  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const workspace = await requireWorkspaceAccessByOrgSlugUi(orgSlug);
  const user = await resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);

  const sp = searchParams ? await Promise.resolve(searchParams) : {};

  const statusParamRaw = sp.status;
  const projectIdRaw = sp.projectId;
  const onlyMineRaw = sp.onlyMine;
  const statusParam = Array.isArray(statusParamRaw) ? statusParamRaw[0] : statusParamRaw;
  const projectId = Array.isArray(projectIdRaw) ? projectIdRaw[0] : projectIdRaw;
  const onlyMine = String(Array.isArray(onlyMineRaw) ? onlyMineRaw[0] : onlyMineRaw) === '1';

  function parseStatus(value: unknown): 'OPEN' | 'ALL' | OperationsWorkOrderStatus {
    const v = String(value || '').trim().toUpperCase();
    if (v === 'ALL') return 'ALL';
    if (v === 'NEW') return 'NEW';
    if (v === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (v === 'DONE') return 'DONE';
    return 'OPEN';
  }

  const status = parseStatus(statusParam);

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
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-800">קריאות שירות</div>
              <div className="text-xs text-slate-400 mt-0.5">סך הכל {workOrders.length} קריאות</div>
            </div>

            <Link
              href={`${base}/work-orders/new`}
              className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150"
            >
              קריאה חדשה
            </Link>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label htmlFor="status" className="block text-xs font-semibold text-slate-500 mb-1.5">
                סטטוס
              </label>
              <Select
                id="status"
                name="status"
                defaultValue={statusParam ? String(statusParam) : 'OPEN'}
              >
                <option value="OPEN">פתוחות</option>
                <option value="ALL">הכל</option>
                <option value="NEW">חדש</option>
                <option value="IN_PROGRESS">בטיפול</option>
                <option value="DONE">הושלם</option>
              </Select>
            </div>

            <div>
              <label htmlFor="projectId" className="block text-xs font-semibold text-slate-500 mb-1.5">
                פרויקט
              </label>
              <Select
                id="projectId"
                name="projectId"
                defaultValue={projectId ? String(projectId) : ''}
              >
                <option value="">כל הפרויקטים</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor="onlyMine" className="block text-xs font-semibold text-slate-500 mb-1.5">
                הקצאה
              </label>
              <Select
                id="onlyMine"
                name="onlyMine"
                defaultValue={onlyMine ? '1' : '0'}
              >
                <option value="0">הכל</option>
                <option value="1">רק שלי</option>
              </Select>
            </div>

            <div>
              <button
                type="submit"
                className="w-full h-11 inline-flex items-center justify-center rounded-xl px-4 text-sm font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150"
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
