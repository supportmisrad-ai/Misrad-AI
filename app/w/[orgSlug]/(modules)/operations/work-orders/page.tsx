// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import Link from 'next/link';

import { Plus } from 'lucide-react';
import { ExportWorkOrdersCsvButton } from '@/components/operations/ExportButtons';
import { getOperationsDepartments, getOperationsProjectOptions, getOperationsWorkOrdersData, bulkUpdateOperationsWorkOrderStatus } from '@/app/actions/operations';
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

  // Parse search params first (no I/O, pure computation)
  const sp = searchParams ? await Promise.resolve(searchParams) : {};

  const statusParamRaw = sp.status;
  const projectIdRaw = sp.projectId;
  const onlyMineRaw = sp.onlyMine;
  const pageRaw = sp.page;
  const searchRaw = sp.q;
  const departmentIdRaw = sp.departmentId;
  const statusParam = Array.isArray(statusParamRaw) ? statusParamRaw[0] : statusParamRaw;
  const projectId = Array.isArray(projectIdRaw) ? projectIdRaw[0] : projectIdRaw;
  const departmentId = Array.isArray(departmentIdRaw) ? departmentIdRaw[0] : departmentIdRaw;
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

  // Fetch all data in parallel for maximum performance
  const [workspace, projectOptionsRes, departmentsRes] = await Promise.all([
    requireWorkspaceAccessByOrgSlug(orgSlug),
    getOperationsProjectOptions({ orgSlug }),
    getOperationsDepartments({ orgSlug }),
  ]);

  // Resolve user and work orders in parallel if onlyMine is false, or sequentially if user ID is needed first
  let user: Awaited<ReturnType<typeof resolveWorkspaceCurrentUserForUiWithWorkspaceId>>;
  let workOrdersRes: Awaited<ReturnType<typeof getOperationsWorkOrdersData>>;

  if (onlyMine) {
    user = await resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);
    workOrdersRes = await getOperationsWorkOrdersData({
      orgSlug,
      status,
      projectId: projectId ? String(projectId) : undefined,
      departmentId: departmentId ? String(departmentId) : undefined,
      assignedTechnicianId: user.id,
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    });
  } else {
    // Independent calls can run in parallel
    const [u, wo] = await Promise.all([
      resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id),
      getOperationsWorkOrdersData({
        orgSlug,
        status,
        projectId: projectId ? String(projectId) : undefined,
        departmentId: departmentId ? String(departmentId) : undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    ]);
    user = u;
    workOrdersRes = wo;
  }

  const workOrders = workOrdersRes.success ? workOrdersRes.data?.workOrders ?? [] : [];
  const totalCount = workOrdersRes.success ? workOrdersRes.data?.totalCount ?? 0 : 0;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const projectOptions = projectOptionsRes.success ? projectOptionsRes.data ?? [] : [];
  const departments = departmentsRes.success ? departmentsRes.data ?? [] : [];

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
    if (departmentId) params.set('departmentId', String(departmentId));
    if (onlyMine) params.set('onlyMine', '1');
    if (search) params.set('q', search);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `${base}/work-orders${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <section className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden animate-fade-in">
        <div className="px-8 py-6 border-b border-slate-100 bg-white/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">קריאות שירות</div>
              <div className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-pulse"></span>
                סך הכל {totalCount} קריאות במערכת
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ExportWorkOrdersCsvButton workOrders={workOrders} />
              <Link
                href={`${base}/work-orders/new`}
                className="group relative overflow-hidden inline-flex items-center justify-center rounded-2xl h-12 px-8 text-base font-black bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/25 active:scale-95 transition-all duration-200"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Plus size={18} strokeWidth={3} className="ml-2" />
                קריאה חדשה
              </Link>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-200/40 shadow-inner">
            <form method="get" className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-6 items-end">
              <div className="md:col-span-2 lg:col-span-2">
                <label htmlFor="q" className="block text-xs font-black text-slate-700 mb-2.5 uppercase tracking-widest mr-1">
                  חיפוש חופשי
                </label>
                <div className="relative group">
                  <input
                    id="q"
                    name="q"
                    defaultValue={search}
                    placeholder="לפי כותרת, מדווח או תוכן..."
                    className="h-12 w-full rounded-2xl border-2 border-slate-100 bg-white px-5 text-base font-bold text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="status" className="block text-xs font-black text-slate-700 mb-2.5 uppercase tracking-widest mr-1">
                  סטטוס
                </label>
                <Select
                  id="status"
                  name="status"
                  defaultValue={statusParam ? String(statusParam) : 'OPEN'}
                  className="h-12 rounded-2xl border-2 border-slate-100 bg-white px-4 text-base font-bold text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all"
                >
                  <option value="OPEN">פתוחות</option>
                  <option value="ALL">כל הקריאות</option>
                  <option value="NEW">חדש</option>
                  <option value="IN_PROGRESS">בטיפול</option>
                  <option value="DONE">הושלם</option>
                </Select>
              </div>

              <div>
                <label htmlFor="projectId" className="block text-xs font-black text-slate-700 mb-2.5 uppercase tracking-widest mr-1">
                  פרויקט
                </label>
                <Select
                  id="projectId"
                  name="projectId"
                  defaultValue={projectId ? String(projectId) : ''}
                  className="h-12 rounded-2xl border-2 border-slate-100 bg-white px-4 text-base font-bold text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all"
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
                <label htmlFor="departmentId" className="block text-xs font-black text-slate-700 mb-2.5 uppercase tracking-widest mr-1">
                  מחלקה
                </label>
                <Select
                  id="departmentId"
                  name="departmentId"
                  defaultValue={departmentId ? String(departmentId) : ''}
                  className="h-12 rounded-2xl border-2 border-slate-100 bg-white px-4 text-base font-bold text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all"
                >
                  <option value="">כל המחלקות</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label htmlFor="onlyMine" className="block text-xs font-black text-slate-700 mb-2.5 uppercase tracking-widest mr-1">
                  שיוך
                </label>
                <Select
                  id="onlyMine"
                  name="onlyMine"
                  defaultValue={onlyMine ? '1' : '0'}
                  className="h-12 rounded-2xl border-2 border-slate-100 bg-white px-4 text-base font-bold text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all"
                >
                  <option value="0">הכל</option>
                  <option value="1">רק שלי</option>
                </Select>
              </div>

              <button
                type="submit"
                className="h-12 inline-flex items-center justify-center rounded-2xl px-8 text-base font-black bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
              >
                סנן תוצאות
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <WorkOrdersSmartSortClient baseHref={base} workOrders={workOrders} />
            </div>
            
            <div className="rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/30 overflow-hidden">
              <WorkOrdersBulkActions
                workOrders={workOrders}
                bulkStatusAction={bulkStatusAction}
              />
            </div>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-4 pt-6">
              {page > 1 ? (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="inline-flex items-center justify-center rounded-2xl h-11 px-6 text-sm font-bold text-slate-700 bg-white border-2 border-slate-100 shadow-sm hover:border-slate-300 transition-all duration-150"
                >
                  הקודם
                </Link>
              ) : null}
              <div className="px-5 py-2 rounded-xl bg-slate-100 text-sm font-black text-slate-600 shadow-inner">
                עמוד {page} מתוך {totalPages}
              </div>
              {page < totalPages ? (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="inline-flex items-center justify-center rounded-2xl h-11 px-6 text-sm font-bold text-slate-700 bg-white border-2 border-slate-100 shadow-sm hover:border-slate-300 transition-all duration-150"
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
