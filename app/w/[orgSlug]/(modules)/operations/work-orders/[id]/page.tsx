// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  consumeOperationsInventoryForWorkOrder,
  getOperationsInventoryOptions,
  getOperationsInventoryOptionsForHolder,
  getOperationsMaterialsForWorkOrder,
  getOperationsWorkOrderAttachments,
  getOperationsWorkOrderCheckins,
  addOperationsWorkOrderAttachment,
  addOperationsWorkOrderCheckin,
  getOperationsWorkOrderById,
  getOperationsTechnicianOptions,
  getOperationsStockSourceOptions,
  setOperationsWorkOrderAssignedTechnician,
  setOperationsWorkOrderCompletionSignature,
  setOperationsWorkOrderStockSourceToMyActiveVehicle,
  setOperationsWorkOrderStockSource,
  setOperationsWorkOrderStatus,
  getOperationsCallMessages,
  createOperationsCallMessage,
  updateOperationsCallMessage,
  deleteOperationsCallMessage,
} from '@/app/actions/operations';
import { Select } from '@/components/ui/select';
import GeoCheckInButton from '@/components/operations/GeoCheckInButton';
import SignaturePad from '@/components/operations/SignaturePad';
import WorkOrderChat from '@/components/operations/WorkOrderChat';
import WorkOrderAiSummary from '@/components/operations/WorkOrderAiSummary';
import WorkOrderGallery from '@/components/operations/WorkOrderGallery';
import { auth } from '@clerk/nextjs/server';
import {
  uploadOpsWorkOrderAttachmentInternal,
  uploadOpsWorkOrderSignatureInternal,
} from '@/lib/services/operations/uploads';
import type {
  OperationsInventoryOption,
  OperationsStockSourceOption,
  OperationsTechnicianOption,
  OperationsWorkOrderAttachmentRow,
  OperationsWorkOrderCheckinRow,
} from '@/lib/services/operations/types';
import { formatWorkOrderStatus } from '@/lib/services/operations/format';

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

  const res = await getOperationsWorkOrderById({ orgSlug, id });
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

  const [technicianOptionsRes, materialsRes, attachmentsRes, checkinsRes, stockSourcesRes, inventoryOptionsRes, messagesRes] = await Promise.all([
    tab === 'details' ? getOperationsTechnicianOptions({ orgSlug }) : Promise.resolve(emptyTechnicianOptionsRes),
    tab === 'materials' ? getOperationsMaterialsForWorkOrder({ orgSlug, workOrderId: id }) : Promise.resolve(emptyMaterialsRes),
    tab === 'details' ? getOperationsWorkOrderAttachments({ orgSlug, workOrderId: id }) : Promise.resolve(emptyAttachmentsRes),
    tab === 'details' ? getOperationsWorkOrderCheckins({ orgSlug, workOrderId: id }) : Promise.resolve(emptyCheckinsRes),
    tab === 'materials' ? getOperationsStockSourceOptions({ orgSlug }) : Promise.resolve(emptyStockSourcesRes),
    tab === 'materials'
      ? w.stockSourceHolderId
        ? getOperationsInventoryOptionsForHolder({ orgSlug, holderId: w.stockSourceHolderId })
        : getOperationsInventoryOptions({ orgSlug })
      : Promise.resolve(emptyInventoryOptionsRes),
    tab === 'chat' ? getOperationsCallMessages({ orgSlug, workOrderId: id }) : Promise.resolve({ success: true, data: [] as Awaited<ReturnType<typeof getOperationsCallMessages>>['data'] }),
  ]);

  const { userId: clerkUserId } = await auth();
  const chatMessages = messagesRes.success ? (messagesRes.data ?? []) : [];

  const statusBadge = formatWorkOrderStatus(w.status);
  const inventoryOptions: OperationsInventoryOption[] = inventoryOptionsRes.success ? (inventoryOptionsRes.data ?? []) : [];
  const materials = materialsRes.success ? (materialsRes.data ?? []) : [];
  const attachments: OperationsWorkOrderAttachmentRow[] = attachmentsRes.success ? (attachmentsRes.data ?? []) : [];
  const checkins: OperationsWorkOrderCheckinRow[] = checkinsRes.success ? (checkinsRes.data ?? []) : [];
  const technicianOptions: OperationsTechnicianOption[] = technicianOptionsRes.success ? (technicianOptionsRes.data ?? []) : [];
  const stockSourceOptions: OperationsStockSourceOption[] = stockSourcesRes.success ? (stockSourcesRes.data ?? []) : [];
  const stockAvailable = inventoryOptions.filter((o) => o.onHand > 0);

  async function startAction() {
    'use server';
    const result = await setOperationsWorkOrderStatus({ orgSlug, id: w.id, status: 'IN_PROGRESS' });
    if (result.success) {
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}`);
    }
    const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בעדכון סטטוס');
    redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${message}`);
  }

  async function addMaterialAction(formData: FormData) {
    'use server';
    const inventoryId = String(formData.get('inventoryId') || '');
    const qty = Number(formData.get('qty'));

    const result = await consumeOperationsInventoryForWorkOrder({
      orgSlug,
      workOrderId: w.id,
      inventoryId,
      qty,
    });

    if (result.success) {
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?tab=materials`);
    }

    const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בהוספת חומר');
    redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?tab=materials&error=${message}`);
  }

  async function setStockSourceAction(formData: FormData) {
    'use server';
    const holderId = String(formData.get('holderId') || '').trim();
    const result = await setOperationsWorkOrderStockSource({ orgSlug, workOrderId: w.id, holderId });
    if (result.success) {
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?tab=materials`);
    }
    const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בשמירת מקור מלאי');
    redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?tab=materials&error=${message}`);
  }

  async function useMyActiveVehicleSourceAction() {
    'use server';
    const result = await setOperationsWorkOrderStockSourceToMyActiveVehicle({ orgSlug, workOrderId: w.id });
    if (result.success) {
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?tab=materials`);
    }
    const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בקביעת מקור מלאי');
    redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?tab=materials&error=${message}`);
  }

  async function doneAction() {
    'use server';
    const result = await setOperationsWorkOrderStatus({ orgSlug, id: w.id, status: 'DONE' });
    if (result.success) {
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}`);
    }
    const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בעדכון סטטוס');
    redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${message}`);
  }

  async function completeWithSignatureAction(formData: FormData) {
    'use server';
    const signatureDataUrl = String(formData.get('signatureDataUrl') || '').trim();
    if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/')) {
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent('חובה לצרף חתימה')}`);
    }

    const uploaded = await uploadOpsWorkOrderSignatureInternal({
      orgSlug,
      workOrderId: w.id,
      signatureDataUrl,
    });
    if (!uploaded.success || !uploaded.ref) {
      const msg = uploaded.error ? String(uploaded.error) : 'שגיאה בהעלאת חתימה';
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent(msg)}`);
    }

    const ref = uploaded.ref;

    const saveSig = await setOperationsWorkOrderCompletionSignature({ orgSlug, id: w.id, signatureUrl: ref });
    if (!saveSig.success) {
      const msg = saveSig.error ? String(saveSig.error) : 'שגיאה בשמירת חתימה';
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent(msg)}`);
    }

    const done = await setOperationsWorkOrderStatus({ orgSlug, id: w.id, status: 'DONE' });
    if (!done.success) {
      const msg = done.error ? String(done.error) : 'שגיאה בעדכון סטטוס';
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent(msg)}`);
    }

    redirect(`${base}/work-orders/${encodeURIComponent(w.id)}`);
  }

  async function assignTechnicianAction(formData: FormData) {
    'use server';
    const technicianIdRaw = formData.get('technicianId');
    const technicianId = technicianIdRaw === null || technicianIdRaw === undefined || technicianIdRaw === '' ? null : String(technicianIdRaw);

    const result = await setOperationsWorkOrderAssignedTechnician({ orgSlug, id: w.id, technicianId });
    if (result.success) {
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}`);
    }
    const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בשיוך טכנאי');
    redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${message}`);
  }

  async function uploadAction(formData: FormData) {
    'use server';
    const file = formData.get('file') as File | null;
    if (!file) {
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent('חסר קובץ')}`);
    }

    const uploaded = await uploadOpsWorkOrderAttachmentInternal({
      orgSlug,
      workOrderId: w.id,
      file,
    });

    if (!uploaded.success || !uploaded.ref || !uploaded.path) {
      const msg = uploaded.error ? String(uploaded.error) : 'שגיאה בהעלאת קובץ';
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent(msg)}`);
    }

    const ref = uploaded.ref;

    const save = await addOperationsWorkOrderAttachment({
      orgSlug,
      workOrderId: w.id,
      storageBucket: uploaded.bucket,
      storagePath: uploaded.path,
      url: ref,
      mimeType: uploaded.mimeType || null,
    });

    if (!save.success) {
      const msg = save.error ? String(save.error) : 'שגיאה בשמירת קובץ';
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent(msg)}`);
    }

    redirect(`${base}/work-orders/${encodeURIComponent(w.id)}`);
  }

  async function checkinAction(formData: FormData) {
    'use server';
    const lat = Number(formData.get('lat'));
    const lng = Number(formData.get('lng'));
    const accuracyRaw = formData.get('accuracy');
    const accuracy = accuracyRaw === null || accuracyRaw === undefined || accuracyRaw === '' ? null : Number(accuracyRaw);

    const result = await addOperationsWorkOrderCheckin({ orgSlug, workOrderId: w.id, lat, lng, accuracy });
    if (!result.success) {
      const msg = result.error ? String(result.error) : 'שגיאה בשמירת מיקום';
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent(msg)}`);
    }
    redirect(`${base}/work-orders/${encodeURIComponent(w.id)}`);
  }

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
            <Link
              href={`${base}/work-orders`}
              className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-medium text-slate-600 bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all duration-150"
            >
              חזרה
            </Link>
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
              <form action={startAction}>
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
            <>
              <div className="rounded-xl border border-slate-200/60 bg-white p-4">
                <div className="text-xs font-semibold text-slate-500">תיאור</div>
                <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                  {w.description ? w.description : <span className="text-slate-400">—</span>}
                </div>
              </div>

              {/* ──── פרטים נוספים ──── */}
              <div className="rounded-xl border border-slate-200/60 bg-white p-4">
                <div className="text-xs font-semibold text-slate-500 mb-3">פרטים נוספים</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {w.buildingName || w.floor || w.unit ? (
                    <div>
                      <div className="text-[11px] font-bold text-slate-500">מיקום</div>
                      <div className="mt-0.5 font-bold text-slate-900">
                        {[w.buildingName, w.floor ? `קומה ${w.floor}` : null, w.unit ? `חדר ${w.unit}` : null].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  ) : null}
                  {w.departmentName ? (
                    <div>
                      <div className="text-[11px] font-bold text-slate-500">מחלקה</div>
                      <div className="mt-0.5 font-bold text-slate-900">{w.departmentName}</div>
                    </div>
                  ) : null}
                  {w.reporterName ? (
                    <div>
                      <div className="text-[11px] font-bold text-slate-500">מדווח</div>
                      <div className="mt-0.5 font-bold text-slate-900">{w.reporterName}</div>
                      {w.reporterPhone ? (
                        <a href={`tel:${w.reporterPhone}`} className="text-xs text-sky-600 hover:underline" dir="ltr">{w.reporterPhone}</a>
                      ) : null}
                    </div>
                  ) : null}
                  {w.scheduledStart ? (
                    <div>
                      <div className="text-[11px] font-bold text-slate-500">תאריך יעד</div>
                      <div className="mt-0.5 font-bold text-slate-900">{new Date(w.scheduledStart).toLocaleString('he-IL')}</div>
                    </div>
                  ) : null}
                  {w.completedAt ? (
                    <div>
                      <div className="text-[11px] font-bold text-slate-500">הושלם</div>
                      <div className="mt-0.5 font-bold text-emerald-700">{new Date(w.completedAt).toLocaleString('he-IL')}</div>
                    </div>
                  ) : null}
                  <div>
                    <div className="text-[11px] font-bold text-slate-500">נוצר</div>
                    <div className="mt-0.5 text-slate-700">{new Date(w.createdAt).toLocaleString('he-IL')}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/60 bg-white p-4">
                <div className="text-xs font-semibold text-slate-500">שיוך טכנאי</div>

                <form action={assignTechnicianAction} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <Select
                      name="technicianId"
                      defaultValue={w.assignedTechnicianId ? String(w.assignedTechnicianId) : ''}
                    >
                      <option value="">לא משויך</option>
                      {technicianOptions.map((t) => (
                        <option key={String(t.id)} value={String(t.id)}>
                          {String(t.label)}
                        </option>
                      ))}
                    </Select>
                    {!technicianOptionsRes.success ? (
                      <div className="mt-2 text-xs font-bold text-rose-700">{technicianOptionsRes.error}</div>
                    ) : null}
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="w-full h-11 inline-flex items-center justify-center rounded-xl px-4 text-sm font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150"
                    >
                      שמור שיוך
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-black text-slate-700">תיעוד מהשטח</div>

                <form action={checkinAction} id="ops-internal-checkin-form" className="mt-3">
                  <input type="hidden" name="lat" value="" />
                  <input type="hidden" name="lng" value="" />
                  <input type="hidden" name="accuracy" value="" />
                  <GeoCheckInButton
                    formId="ops-internal-checkin-form"
                    label="הגעתי לאתר"
                    className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  />
                </form>

                <form action={uploadAction} className="mt-3 space-y-2">
                  <input type="file" name="file" accept="image/*,application/pdf" capture="environment" className="block w-full text-sm" required />
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    העלה תמונה/מסמך
                  </button>
                </form>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <WorkOrderGallery attachments={attachments.map(a => ({ id: a.id, url: a.url, mimeType: a.mimeType ?? null, createdAt: a.createdAt }))} />

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-black text-slate-700">דיווחי הגעה</div>
                    <div className="mt-2 space-y-2">
                      {checkins.length ? (
                        checkins.slice(0, 10).map((c) => (
                          <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] font-black text-slate-600">{new Date(c.createdAt).toLocaleString('he-IL')}</div>
                            <div className="mt-1 text-xs text-slate-600">
                              דיוק: {c.accuracy ? `±${Math.round(Number(c.accuracy))}m` : '—'}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {Number(c.lat).toFixed(5)}, {Number(c.lng).toFixed(5)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-slate-500">אין עדיין דיווחי הגעה</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div id="completion-signature" className="rounded-2xl border border-slate-200 bg-white/80 p-4 md:col-span-2">
                  <div className="text-xs font-black text-slate-700">חתימה דיגיטלית</div>
                  <div className="mt-2 text-sm text-slate-600">בסיום עבודה יש לצרף חתימה. זה נשמר כחלק מהקריאה.</div>

                  {w.completionSignatureUrl ? (
                    <a
                      href={w.completionSignatureUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <img src={w.completionSignatureUrl} alt="" className="w-full max-h-48 object-contain" />
                    </a>
                  ) : null}

                  <form action={completeWithSignatureAction} className="mt-3 space-y-3">
                    <SignaturePad inputName="signatureDataUrl" />
                    <button
                      type="submit"
                      disabled={w.status === 'DONE'}
                      className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      סיים עבודה ושמור חתימה
                    </button>
                  </form>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="text-xs font-black text-slate-700">כתובת</div>
                  <div className="mt-2 text-sm text-slate-700">
                    {w.installationAddress ? w.installationAddress : <span className="text-slate-400">—</span>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="text-xs font-black text-slate-700">תאריך יעד</div>
                  <div className="mt-2 text-sm text-slate-700">
                    {w.scheduledStart ? new Date(w.scheduledStart).toLocaleString('he-IL') : <span className="text-slate-400">—</span>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="text-xs font-black text-slate-700">טכנאי</div>
                  <div className="mt-2 text-sm text-slate-700">
                    {w.technicianLabel ? w.technicianLabel : <span className="text-slate-400">—</span>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="text-xs font-black text-slate-700">עודכן לאחרונה</div>
                  <div className="mt-2 text-sm text-slate-700">
                    {new Date(w.updatedAt).toLocaleString('he-IL')}
                  </div>
                </div>
              </div>

              <WorkOrderAiSummary orgSlug={orgSlug} workOrderId={w.id} initialSummary={w.aiSummary} />
            </>
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
            <>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="text-xs font-semibold text-slate-500">מקור מלאי לקריאה</div>
                <div className="mt-2 text-sm text-slate-700">
                  {w.stockSourceLabel ? w.stockSourceLabel : <span className="text-slate-400">—</span>}
                </div>

                <form action={setStockSourceAction} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <Select
                      name="holderId"
                      required
                      defaultValue={w.stockSourceHolderId ? String(w.stockSourceHolderId) : ''}
                    >
                      <option value="" disabled>
                        {stockSourceOptions.length ? 'בחר מקור מלאי…' : 'אין מקורות מלאי זמינים'}
                      </option>
                      <optgroup label="מחסן">
                        {stockSourceOptions
                          .filter((o) => o.group === 'WAREHOUSE')
                          .map((o) => (
                            <option key={String(o.holderId)} value={String(o.holderId)}>
                              {String(o.label)}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="רכבים">
                        {stockSourceOptions
                          .filter((o) => o.group === 'VEHICLE')
                          .map((o) => (
                            <option key={String(o.holderId)} value={String(o.holderId)}>
                              {String(o.label)}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="אצל טכנאי אחר">
                        {stockSourceOptions
                          .filter((o) => o.group === 'TECHNICIAN')
                          .map((o) => (
                            <option key={String(o.holderId)} value={String(o.holderId)}>
                              {String(o.label)}
                            </option>
                          ))}
                      </optgroup>
                    </Select>
                    {!stockSourcesRes.success ? (
                      <div className="mt-2 text-xs font-bold text-rose-700">{stockSourcesRes.error}</div>
                    ) : null}
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="w-full h-11 inline-flex items-center justify-center rounded-xl px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all duration-150"
                    >
                      שמור מקור
                    </button>
                  </div>
                </form>

                <form action={useMyActiveVehicleSourceAction} className="mt-3">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    השתמש ברכב הפעיל שלי
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="text-xs font-semibold text-slate-500">הוספת חומר לקריאה</div>

                <div className="mt-2 text-xs text-slate-600">
                  מקור מלאי: {w.stockSourceLabel ? w.stockSourceLabel : '—'}
                </div>

                <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs font-black text-slate-700">מלאי זמין במקור</div>
                  <div className="mt-2 text-xs text-slate-600">
                    {stockAvailable.length
                      ? stockAvailable
                          .slice(0, 8)
                          .map((o) => `${String(o.label)}: ${String(o.onHand)}${o.unit ? ` ${String(o.unit)}` : ''}`)
                          .join(' · ')
                      : 'אין כרגע מלאי זמין במקור הזה'}
                  </div>
                </div>

                <form action={addMaterialAction} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label htmlFor="inventoryId" className="block text-xs font-semibold text-slate-500 mb-1.5">
                      פריט
                    </label>
                    <Select
                      id="inventoryId"
                      name="inventoryId"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        {inventoryOptions.length ? 'בחר פריט…' : 'אין פריטים זמינים'}
                      </option>
                      {inventoryOptions.map((opt) => (
                        <option key={opt.inventoryId} value={opt.inventoryId}>
                          {opt.label} — {opt.onHand}{opt.unit ? ` ${opt.unit}` : ''}
                        </option>
                      ))}
                    </Select>
                    {!inventoryOptionsRes.success ? (
                      <div className="mt-2 text-xs font-bold text-rose-700">{inventoryOptionsRes.error}</div>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="qty" className="block text-xs font-semibold text-slate-500 mb-1.5">
                      כמות
                    </label>
                    <input
                      id="qty"
                      name="qty"
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      className="h-11 w-full rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 hover:shadow focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
                      placeholder="1"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                    >
                      הוסף חומר והורד מהמלאי
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="text-xs font-black text-slate-700">חומרים שנמשכו</div>

                <div className="mt-3 space-y-2">
                  {materials.length ? (
                    materials.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-900 truncate">{m.itemLabel}</div>
                          <div className="text-xs text-slate-500 mt-1">{new Date(m.createdAt).toLocaleString('he-IL')}</div>
                        </div>
                        <div className="text-sm font-black text-slate-900">{m.qty}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">אין עדיין חומרים לקריאה הזו</div>
                  )}
                </div>

                {!materialsRes.success ? (
                  <div className="mt-3 text-sm text-rose-800">{materialsRes.error}</div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
