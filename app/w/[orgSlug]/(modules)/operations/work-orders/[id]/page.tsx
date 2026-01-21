export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  consumeOperationsInventoryForWorkOrder,
  getOperationsInventoryOptions,
  getOperationsMaterialsForWorkOrder,
  getOperationsWorkOrderAttachments,
  getOperationsWorkOrderCheckins,
  addOperationsWorkOrderAttachment,
  addOperationsWorkOrderCheckin,
  getOperationsWorkOrderById,
  getOperationsTechnicianOptions,
  setOperationsWorkOrderAssignedTechnician,
  setOperationsWorkOrderCompletionSignature,
  setOperationsWorkOrderStatus,
} from '@/app/actions/operations';
import GeoCheckInButton from '@/components/operations/GeoCheckInButton';
import SignaturePad from '@/components/operations/SignaturePad';
import { createServiceRoleClient } from '@/lib/supabase';

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

export default async function OperationsWorkOrderDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug, id } = await params;
  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const sp = (await searchParams) ?? {};
  const tabRaw = sp.tab;
  const tab = (Array.isArray(tabRaw) ? tabRaw[0] : tabRaw) === 'materials' ? 'materials' : 'details';

  const emptyListRes = { success: true, data: [] as any[], error: undefined as string | undefined };

  const [res, technicianOptionsRes, inventoryOptionsRes, materialsRes, attachmentsRes, checkinsRes] = await Promise.all([
    getOperationsWorkOrderById({ orgSlug, id }),
    tab === 'details' ? getOperationsTechnicianOptions({ orgSlug }) : Promise.resolve({ success: true, data: [] as any[] }),
    tab === 'materials' ? getOperationsInventoryOptions({ orgSlug }) : Promise.resolve(emptyListRes),
    tab === 'materials' ? getOperationsMaterialsForWorkOrder({ orgSlug, workOrderId: id }) : Promise.resolve(emptyListRes),
    tab === 'details' ? getOperationsWorkOrderAttachments({ orgSlug, workOrderId: id }) : Promise.resolve(emptyListRes),
    tab === 'details' ? getOperationsWorkOrderCheckins({ orgSlug, workOrderId: id }) : Promise.resolve(emptyListRes),
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
  const statusBadge = formatStatus(w.status);
  const inventoryOptions = inventoryOptionsRes.success ? (inventoryOptionsRes.data ?? []) : [];
  const materials = materialsRes.success ? (materialsRes.data ?? []) : [];
  const attachments = attachmentsRes.success ? (attachmentsRes.data ?? []) : [];
  const checkins = checkinsRes.success ? (checkinsRes.data ?? []) : [];
  const technicianOptions = technicianOptionsRes && (technicianOptionsRes as any).success ? ((technicianOptionsRes as any).data ?? []) : [];

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

    const supabase = createServiceRoleClient();
    const bucket = 'operations-files';
    const timestamp = Date.now();
    const safeOrg = String(orgSlug || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `ops/internal/${safeOrg}/work-orders/${w.id}/signature-${timestamp}.png`;

    const base64 = signatureDataUrl.includes('base64,') ? signatureDataUrl.split('base64,')[1] : '';
    if (!base64) {
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent('חתימה לא תקינה')}`);
    }

    const fileBuffer = Buffer.from(base64, 'base64');

    // Best effort: ensure bucket exists (for local/dev setups)
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (!listError) {
        const exists = (buckets || []).some((b) => b.name === bucket);
        if (!exists) {
          await supabase.storage.createBucket(bucket, {
            public: true,
            fileSizeLimit: 50 * 1024 * 1024,
          });
        }
      }
    } catch {
      // ignore
    }

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, fileBuffer, {
      contentType: 'image/png',
      upsert: false,
    });

    if (uploadError) {
      const msg = uploadError.message ? String(uploadError.message) : 'שגיאה בהעלאת חתימה';
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent(msg)}`);
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl ? String(urlData.publicUrl) : '';
    if (!publicUrl) {
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent('לא הצלחנו ליצור URL לחתימה')}`);
    }

    const saveSig = await setOperationsWorkOrderCompletionSignature({ orgSlug, id: w.id, signatureUrl: publicUrl });
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

    const supabase = createServiceRoleClient();
    const bucket = 'operations-files';
    const timestamp = Date.now();
    const safeOrg = String(orgSlug || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = String(file.name || 'upload').replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `ops/internal/${safeOrg}/work-orders/${w.id}/${timestamp}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Best effort: ensure bucket exists (for local/dev setups)
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (!listError) {
        const exists = (buckets || []).some((b) => b.name === bucket);
        if (!exists) {
          await supabase.storage.createBucket(bucket, {
            public: true,
            fileSizeLimit: 50 * 1024 * 1024,
          });
        }
      }
    } catch {
      // ignore
    }

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

    if (uploadError) {
      const msg = uploadError.message ? String(uploadError.message) : 'שגיאה בהעלאת קובץ';
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent(msg)}`);
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl ? String(urlData.publicUrl) : '';
    if (!publicUrl) {
      redirect(`${base}/work-orders/${encodeURIComponent(w.id)}?error=${encodeURIComponent('לא הצלחנו ליצור URL לקובץ')}`);
    }

    const save = await addOperationsWorkOrderAttachment({
      orgSlug,
      workOrderId: w.id,
      storageBucket: bucket,
      storagePath: filePath,
      url: publicUrl,
      mimeType: file.type || null,
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
      <section className="bg-white/80 backdrop-blur rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 truncate">{w.title}</div>
              <div className="text-xs text-slate-500 mt-1">
                <span className="font-bold">פרויקט:</span> {w.project.title}
              </div>
            </div>
            <Link
              href={`${base}/work-orders`}
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-bold bg-white/80 border border-slate-200 hover:bg-white transition-colors"
            >
              חזרה
            </Link>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-xs font-black text-slate-700">סטטוס</div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
              <form action={startAction}>
                <button
                  type="submit"
                  disabled={w.status === 'IN_PROGRESS' || w.status === 'DONE'}
                  className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  התחל עבודה
                </button>
              </form>
              <a
                href="#completion-signature"
                className={
                  w.status === 'DONE'
                    ? 'w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-emerald-600 text-white opacity-50 cursor-not-allowed'
                    : 'w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-colors'
                }
                aria-disabled={w.status === 'DONE'}
              >
                סיום עם חתימה
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`${base}/work-orders/${encodeURIComponent(w.id)}`}
              className={
                tab === 'details'
                  ? 'inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white'
                  : 'inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-white/80 border border-slate-200 text-slate-800 hover:bg-white'
              }
            >
              פרטים
            </Link>
            <Link
              href={`${base}/work-orders/${encodeURIComponent(w.id)}?tab=materials`}
              className={
                tab === 'materials'
                  ? 'inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white'
                  : 'inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-white/80 border border-slate-200 text-slate-800 hover:bg-white'
              }
            >
              חומרים
            </Link>
          </div>

          {tab === 'details' ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="text-xs font-black text-slate-700">תיאור</div>
                <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                  {w.description ? w.description : <span className="text-slate-400">—</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="text-xs font-black text-slate-700">שיוך טכנאי</div>

                <form action={assignTechnicianAction} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <select
                      name="technicianId"
                      defaultValue={w.assignedTechnicianId ? String(w.assignedTechnicianId) : ''}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      <option value="">לא משויך</option>
                      {technicianOptions.map((t: any) => (
                        <option key={String(t.id)} value={String(t.id)}>
                          {String(t.label)}
                        </option>
                      ))}
                    </select>
                    {technicianOptionsRes && !(technicianOptionsRes as any).success ? (
                      <div className="mt-2 text-xs font-bold text-rose-700">{(technicianOptionsRes as any).error}</div>
                    ) : null}
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
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
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-black text-slate-700">קבצים</div>
                    <div className="mt-2 space-y-2">
                      {attachments.length ? (
                        attachments.slice(0, 10).map((a: any) => (
                          <a
                            key={a.id}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100"
                          >
                            <div className="flex items-center gap-3">
                              {String(a.mimeType || '').startsWith('image/') ? (
                                <img
                                  src={a.url}
                                  alt=""
                                  className="h-12 w-12 rounded-xl object-cover border border-slate-200 bg-white"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-[11px] font-black text-slate-500">
                                  PDF
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 truncate">{new Date(a.createdAt).toLocaleString('he-IL')}</div>
                                <div className="text-[11px] text-slate-500 truncate">{a.mimeType ? String(a.mimeType) : 'קובץ'}</div>
                              </div>
                            </div>
                          </a>
                        ))
                      ) : (
                        <div className="text-sm text-slate-500">אין עדיין קבצים</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-black text-slate-700">דיווחי הגעה</div>
                    <div className="mt-2 space-y-2">
                      {checkins.length ? (
                        checkins.slice(0, 10).map((c: any) => (
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
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="text-xs font-black text-slate-700">הוספת חומר לקריאה</div>

                <form action={addMaterialAction} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label htmlFor="inventoryId" className="block text-xs font-black text-slate-700">
                      פריט
                    </label>
                    <select
                      id="inventoryId"
                      name="inventoryId"
                      required
                      defaultValue=""
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      <option value="" disabled>
                        {inventoryOptions.length ? 'בחר פריט…' : 'אין פריטים זמינים'}
                      </option>
                      {inventoryOptions.map((opt: any) => (
                        <option key={opt.inventoryId} value={opt.inventoryId}>
                          {opt.label} — {opt.onHand}{opt.unit ? ` ${opt.unit}` : ''}
                        </option>
                      ))}
                    </select>
                    {!inventoryOptionsRes.success ? (
                      <div className="mt-2 text-xs font-bold text-rose-700">{inventoryOptionsRes.error}</div>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="qty" className="block text-xs font-black text-slate-700">
                      כמות
                    </label>
                    <input
                      id="qty"
                      name="qty"
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
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
                    materials.map((m: any) => (
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
