// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import Link from 'next/link';

import {
  getOperationsInventoryOptions,
  getOperationsInventoryOptionsForHolder,
  getOperationsMaterialsForWorkOrder,
  getOperationsWorkOrderAttachments,
  getOperationsWorkOrderCheckins,
  getOperationsWorkOrderById,
  getOperationsTechnicianOptions,
  getOperationsStockSourceOptions,
  getOperationsCallMessages,
  createOperationsCallMessage,
  updateOperationsCallMessage,
  deleteOperationsCallMessage,
} from '@/app/actions/operations';
import WorkOrderChat from '@/components/operations/WorkOrderChat';
import WorkOrderDetailsTab from '@/components/operations/WorkOrderDetailsTab';
import WorkOrderEditButton from '@/components/operations/WorkOrderEditButton';
import WorkOrderMaterialsTab from '@/components/operations/WorkOrderMaterialsTab';
import { auth } from '@clerk/nextjs/server';
import type {
  OperationsInventoryOption,
  OperationsStockSourceOption,
  OperationsTechnicianOption,
  OperationsWorkOrderAttachmentRow,
  OperationsWorkOrderCheckinRow,
} from '@/lib/services/operations/types';
import { formatWorkOrderStatus } from '@/lib/services/operations/format';
import {
  startAction,
  assignTechnicianAction,
  completeWithSignatureAction,
  uploadAction,
  checkinAction,
  addMaterialAction,
  setStockSourceAction,
  useMyActiveVehicleSourceAction,
} from './actions';

export default async function OperationsWorkOrderDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string }> | { orgSlug: string; id: string };
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug, id } = await params;
  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const tabRaw = sp.tab;
  const tabVal = Array.isArray(tabRaw) ? tabRaw[0] : tabRaw;
  const tab = tabVal === 'materials' ? 'materials' : tabVal === 'chat' ? 'chat' : 'details';
  const errorRaw = sp.error;
  const error = errorRaw ? String(Array.isArray(errorRaw) ? errorRaw[0] : errorRaw) : null;

  type MaterialsRes = Awaited<ReturnType<typeof getOperationsMaterialsForWorkOrder>>;
  type AttachmentsRes = Awaited<ReturnType<typeof getOperationsWorkOrderAttachments>>;
  type CheckinsRes = Awaited<ReturnType<typeof getOperationsWorkOrderCheckins>>;
  type TechnicianOptionsRes = Awaited<ReturnType<typeof getOperationsTechnicianOptions>>;
  type StockSourcesRes = Awaited<ReturnType<typeof getOperationsStockSourceOptions>>;
  type InventoryOptionsRes = Awaited<ReturnType<typeof getOperationsInventoryOptions>>;

  const emptyMaterialsRes: MaterialsRes = { success: true, data: [] };
  const emptyAttachmentsRes: AttachmentsRes = { success: true, data: [] };
  const emptyCheckinsRes: CheckinsRes = { success: true, data: [] };
  const emptyTechnicianOptionsRes: TechnicianOptionsRes = { success: true, data: [] };
  const emptyStockSourcesRes: StockSourcesRes = { success: true, data: [] };
  const emptyInventoryOptionsRes: InventoryOptionsRes = { success: true, data: [] };

  // Phase 1: Fire work order fetch, auth, and all non-w-dependent tab data in parallel
  // (Previously these were 3 sequential phases — now 1 parallel batch)
  const [res, authResult, technicianOptionsRes, materialsRes, attachmentsRes, checkinsRes, stockSourcesRes, messagesRes] = await Promise.all([
    getOperationsWorkOrderById({ orgSlug, id }),
    auth(),
    tab === 'details' ? getOperationsTechnicianOptions({ orgSlug }) : Promise.resolve(emptyTechnicianOptionsRes),
    tab === 'materials' ? getOperationsMaterialsForWorkOrder({ orgSlug, workOrderId: id }) : Promise.resolve(emptyMaterialsRes),
    tab === 'details' ? getOperationsWorkOrderAttachments({ orgSlug, workOrderId: id }) : Promise.resolve(emptyAttachmentsRes),
    tab === 'details' ? getOperationsWorkOrderCheckins({ orgSlug, workOrderId: id }) : Promise.resolve(emptyCheckinsRes),
    tab === 'materials' ? getOperationsStockSourceOptions({ orgSlug }) : Promise.resolve(emptyStockSourcesRes),
    tab === 'chat' ? getOperationsCallMessages({ orgSlug, workOrderId: id }) : Promise.resolve({ success: true, data: [] as Awaited<ReturnType<typeof getOperationsCallMessages>>['data'] }),
  ]);

  if (!res.success || !res.data) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <section className="bg-white/80 backdrop-blur rounded-[1.5rem] border border-rose-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-rose-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-rose-800">שגיאה</div>
              <Link
                href={`${base}/work-orders`}
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-bold bg-white/80 border border-rose-200 hover:bg-white transition-colors"
              >
                חזרה
              </Link>
            </div>
          </div>
          <div className="p-5 text-sm text-rose-800">{res.error || 'קריאה לא נמצאה'}</div>
        </section>
      </div>
    );
  }

  const w = res.data;
  const { userId: clerkUserId } = authResult;

  // Phase 2: Only the inventory options fetch depends on w.stockSourceHolderId
  const inventoryOptionsRes: InventoryOptionsRes = tab === 'materials'
    ? w.stockSourceHolderId
      ? await getOperationsInventoryOptionsForHolder({ orgSlug, holderId: w.stockSourceHolderId })
      : await getOperationsInventoryOptions({ orgSlug })
    : emptyInventoryOptionsRes;
  const chatMessages = messagesRes.success ? (messagesRes.data ?? []) : [];

  const statusBadge = formatWorkOrderStatus(w.status);
  const inventoryOptions: OperationsInventoryOption[] = inventoryOptionsRes.success ? (inventoryOptionsRes.data ?? []) : [];
  const materials = materialsRes.success ? (materialsRes.data ?? []) : [];
  const attachments: OperationsWorkOrderAttachmentRow[] = attachmentsRes.success ? (attachmentsRes.data ?? []) : [];
  const checkins: OperationsWorkOrderCheckinRow[] = checkinsRes.success ? (checkinsRes.data ?? []) : [];
  const technicianOptions: OperationsTechnicianOption[] = technicianOptionsRes.success ? (technicianOptionsRes.data ?? []) : [];
  const stockSourceOptions: OperationsStockSourceOption[] = stockSourcesRes.success ? (stockSourcesRes.data ?? []) : [];

  const boundStartAction = startAction.bind(null, base, w.id, orgSlug);
  const boundAssignTechnicianAction = assignTechnicianAction.bind(null, base, w.id, orgSlug);
  const boundCompleteWithSignatureAction = completeWithSignatureAction.bind(null, base, w.id, orgSlug);
  const boundUploadAction = uploadAction.bind(null, base, w.id, orgSlug);
  const boundCheckinAction = checkinAction.bind(null, base, w.id, orgSlug);
  const boundAddMaterialAction = addMaterialAction.bind(null, base, w.id, orgSlug);
  const boundSetStockSourceAction = setStockSourceAction.bind(null, base, w.id, orgSlug);
  const boundUseMyActiveVehicleSourceAction = useMyActiveVehicleSourceAction.bind(null, base, w.id, orgSlug);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate">{w.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                <span className="font-medium">פרויקט:</span> {w.project?.title ?? 'ללא פרויקט'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <WorkOrderEditButton
                orgSlug={orgSlug}
                workOrder={{ id: w.id, title: w.title, description: w.description, priority: w.priority }}
              />
              <Link
                href={`${base}/work-orders`}
                className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-medium text-slate-600 bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all duration-150"
              >
                חזרה
              </Link>
            </div>
          </div>
        </div>

        {error ? (
          <div className="p-4 border-b border-rose-100 bg-rose-50 text-rose-800 text-sm font-bold">{error}</div>
        ) : null}

        <div className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
              {w.priority && w.priority !== 'NORMAL' ? (
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${
                  w.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-200' :
                  w.priority === 'URGENT' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                  'bg-orange-50 text-orange-700 border border-orange-100'
                }`}>
                  {w.priority === 'CRITICAL' ? 'קריטי' : w.priority === 'URGENT' ? 'דחוף' : 'גבוה'}
                </span>
              ) : null}
              {w.categoryName ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black bg-violet-50 text-violet-700 border border-violet-100">
                  {w.categoryName}
                </span>
              ) : null}
              {w.slaDeadline ? (() => {
                const diff = new Date(w.slaDeadline).getTime() - Date.now();
                if (diff <= 0) return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black bg-red-100 text-red-800 border border-red-200">חריגה מ-SLA</span>;
                const mins = Math.floor(diff / 60000);
                if (mins < 60) return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black bg-orange-50 text-orange-700 border border-orange-100">{mins} דק׳ ל-SLA</span>;
                const hrs = Math.floor(mins / 60);
                return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200">{hrs} שעות ל-SLA</span>;
              })() : null}
            </div>

            <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
              <form action={boundStartAction}>
                <button
                  type="submit"
                  disabled={w.status === 'IN_PROGRESS' || w.status === 'DONE'}
                  className="w-full h-10 inline-flex items-center justify-center rounded-xl px-4 text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  התחל עבודה
                </button>
              </form>
              <a
                href="#completion-signature"
                className={
                  w.status === 'DONE'
                    ? 'w-full h-10 inline-flex items-center justify-center rounded-xl px-4 text-sm font-bold bg-emerald-500 text-white shadow-sm opacity-40 cursor-not-allowed'
                    : 'w-full h-10 inline-flex items-center justify-center rounded-xl px-4 text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm transition-all duration-150'
                }
                aria-disabled={w.status === 'DONE'}
              >
                סיום עם חתימה
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100/60 p-1">
            <Link
              href={`${base}/work-orders/${encodeURIComponent(w.id)}`}
              className={
                tab === 'details'
                  ? 'inline-flex items-center justify-center rounded-lg h-9 text-sm font-bold bg-white text-slate-900 shadow-sm'
                  : 'inline-flex items-center justify-center rounded-lg h-9 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors'
              }
            >
              פרטים
            </Link>
            <Link
              href={`${base}/work-orders/${encodeURIComponent(w.id)}?tab=chat`}
              className={
                tab === 'chat'
                  ? 'inline-flex items-center justify-center rounded-lg h-9 text-sm font-bold bg-white text-slate-900 shadow-sm'
                  : 'inline-flex items-center justify-center rounded-lg h-9 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors'
              }
            >
              שיחה
            </Link>
            <Link
              href={`${base}/work-orders/${encodeURIComponent(w.id)}?tab=materials`}
              className={
                tab === 'materials'
                  ? 'inline-flex items-center justify-center rounded-lg h-9 text-sm font-bold bg-white text-slate-900 shadow-sm'
                  : 'inline-flex items-center justify-center rounded-lg h-9 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors'
              }
            >
              חומרים
            </Link>
          </div>

          {tab === 'details' ? (
            <WorkOrderDetailsTab
              orgSlug={orgSlug}
              w={w}
              technicianOptions={technicianOptions}
              technicianOptionsError={technicianOptionsRes.success ? null : (technicianOptionsRes.error ?? null)}
              attachments={attachments}
              checkins={checkins}
              assignTechnicianAction={boundAssignTechnicianAction}
              checkinAction={boundCheckinAction}
              uploadAction={boundUploadAction}
              completeWithSignatureAction={boundCompleteWithSignatureAction}
            />
          ) : tab === 'chat' ? (
            <WorkOrderChat
              orgSlug={orgSlug}
              workOrderId={w.id}
              currentUserId={clerkUserId || ''}
              currentUserName={w.technicianLabel || 'משתמש'}
              initialMessages={chatMessages.map((m) => ({
                id: m.id,
                authorId: m.authorId,
                authorName: m.authorName,
                content: m.content,
                attachmentUrl: m.attachmentUrl ?? null,
                attachmentType: m.attachmentType ?? null,
                createdAt: m.createdAt,
              }))}
              sendMessageAction={createOperationsCallMessage}
              updateMessageAction={updateOperationsCallMessage}
              deleteMessageAction={deleteOperationsCallMessage}
            />
          ) : (
            <WorkOrderMaterialsTab
              stockSourceLabel={w.stockSourceLabel}
              stockSourceHolderId={w.stockSourceHolderId}
              stockSourceOptions={stockSourceOptions}
              stockSourcesError={stockSourcesRes.success ? null : (stockSourcesRes.error ?? null)}
              inventoryOptions={inventoryOptions}
              inventoryOptionsError={inventoryOptionsRes.success ? null : (inventoryOptionsRes.error ?? null)}
              materials={materials}
              materialsError={materialsRes.success ? null : (materialsRes.error ?? null)}
              setStockSourceAction={boundSetStockSourceAction}
              useMyActiveVehicleSourceAction={boundUseMyActiveVehicleSourceAction}
              addMaterialAction={boundAddMaterialAction}
            />
          )}
        </div>
      </section>
    </div>
  );
}
