// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import Link from 'next/link';

import { ExportWorkOrdersCsvButton } from '@/components/operations/ExportButtons';
import { getOperationsProjectOptions, getOperationsWorkOrdersData, bulkUpdateOperationsWorkOrderStatus } from '@/app/actions/operations';
import { Select } from '@/components/ui/select';
import WorkOrdersSmartSortClient from '@/components/operations/WorkOrdersSmartSortClient';
import WorkOrdersBulkActions from '@/components/operations/WorkOrdersBulkActions';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';
import type { OperationsWorkOrderStatus } from '@/lib/services/operations/types';

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

  // Use lighter cached version — layout already verified full access
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  const user = await resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);

  const sp = searchParams ? await Promise.resolve(searchParams) : {};

  const statusParamRaw = sp.status;
  const projectIdRaw = sp.projectId;
  const onlyMineRaw = sp.onlyMine;
  const pageRaw = sp.page;
  const searchRaw = sp.q;
  const statusParam = Array.isArray(statusParamRaw) ? statusParamRaw[0] : statusParamRaw;
  const projectId = Array.isArray(projectIdRaw) ? projectIdRaw[0] : projectIdRaw;
  const onlyMine = String(Array.isArray(onlyMineRaw) ? onlyMineRaw[0] : onlyMineRaw) === '1';
  const page = Math.max(Number(Array.isArray(pageRaw) ? pageRaw[0] : pageRaw) || 1, 1);
  const search = searchRaw ? String(Array.isArray(searchRaw) ? searchRaw[0] : searchRaw).trim() : '';
  const PAGE_SIZE = 25;

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
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    getOperationsProjectOptions({ orgSlug }),
  ]);

  const workOrders = workOrdersRes.success ? workOrdersRes.data?.workOrders ?? [] : [];
  const totalCount = workOrdersRes.success ? workOrdersRes.data?.totalCount ?? 0 : 0;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const projectOptions = projectOptionsRes.success ? projectOptionsRes.data ?? [] : [];

  async function bulkStatusAction(ids: string[], newStatus: string) {
    'use server';
    return await bulkUpdateOperationsWorkOrderStatus({
      orgSlug,
      ids,
      status: newStatus as OperationsWorkOrderStatus,
    });
  }

  function buildPageUrl(p: number): string {
    const params = new URLSearchParams();
    if (statusParam) params.set('status', String(statusParam));
    if (projectId) params.set('projectId', String(projectId));
    if (onlyMine) params.set('onlyMine', '1');
    if (search) params.set('q', search);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `${base}/work-orders${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-800">קריאות שירות</div>
              <div className="text-xs text-slate-400 mt-0.5">סך הכל {totalCount} קריאות</div>
            </div>

            <div className="flex items-center gap-2">
              <ExportWorkOrdersCsvButton workOrders={workOrders} />
              <Link
                href={`${base}/work-orders/new`}
                className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150"
              >
                קריאה חדשה
              </Link>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <form method="get" className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <label htmlFor="q" className="block text-xs font-semibold text-slate-500 mb-1.5">
                חיפוש
              </label>
              <input
                id="q"
                name="q"
                defaultValue={search}
                placeholder="חיפוש לפי כותרת או מדווח..."
                className="h-11 w-full rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 hover:shadow focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
              />
            </div>
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

          <WorkOrdersBulkActions
            workOrders={workOrders}
            bulkStatusAction={bulkStatusAction}
          />

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              {page > 1 ? (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-medium text-slate-600 bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all duration-150"
                >
                  הקודם
                </Link>
              ) : null}
              <span className="text-xs font-bold text-slate-500">
                עמוד {page} מתוך {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-medium text-slate-600 bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all duration-150"
                >
                  הבא
                </Link>
              ) : null}
            </div>
          ) : null}

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
