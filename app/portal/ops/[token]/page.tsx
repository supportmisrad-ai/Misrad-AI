export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

import {
  contractorAddWorkOrderAttachment,
  contractorAddWorkOrderCheckin,
  contractorResolveTokenForApi,
  contractorSetWorkOrderCompletionSignature,
  contractorValidateWorkOrderAccess,
  contractorGetWorkOrderAttachments,
  contractorGetWorkOrderCheckins,
  contractorMarkWorkOrderDone,
  getOperationsContractorPortalData,
} from '@/app/actions/operations';
import GeoCheckInButton from '@/components/operations/GeoCheckInButton';
import SignaturePad from '@/components/operations/SignaturePad';
import VisionIdentifyFillSearch from '@/components/operations/VisionIdentifyFillSearch';
import { createServiceRoleClientScoped } from '@/lib/supabase';

function formatStatus(status: string): { label: string; className: string } {
  switch (status) {
    case 'NEW':
      return { label: 'נפתח', className: 'bg-sky-50 text-sky-700 border border-sky-100' };
    case 'IN_PROGRESS':
      return { label: 'בטיפול', className: 'bg-amber-50 text-amber-700 border border-amber-100' };
    case 'DONE':
      return { label: 'הושלם', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
    default:
      return { label: status, className: 'bg-slate-50 text-slate-700 border border-slate-200' };
  }
}

export default async function OpsContractorPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = (await searchParams) ?? {};
  const errorRaw = sp.error;
  const error = errorRaw ? String(Array.isArray(errorRaw) ? errorRaw[0] : errorRaw) : null;

  const workOrderIdRaw = sp.workOrderId;
  const workOrderId = workOrderIdRaw ? String(Array.isArray(workOrderIdRaw) ? workOrderIdRaw[0] : workOrderIdRaw) : null;

  const qRaw = sp.q;
  const q = qRaw ? String(Array.isArray(qRaw) ? qRaw[0] : qRaw).trim() : '';

  const res = await getOperationsContractorPortalData({ token });
  if (!res.success || !res.data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
        <div className="mx-auto w-full max-w-lg px-4 py-10">
          <div className="rounded-[1.5rem] border border-rose-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-rose-100">
              <div className="text-lg font-black text-rose-800">גישה נדחתה</div>
              <div className="text-sm text-rose-700 mt-2">{res.error || 'הטוקן לא תקין או פג תוקף'}</div>
            </div>
            <div className="p-5">
              <div className="text-sm text-slate-600">אם זה אמור לעבוד—בקש טוקן חדש ממנהל המערכת.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const data = res.data;
  type PortalData = NonNullable<Awaited<ReturnType<typeof getOperationsContractorPortalData>>['data']>;
  type PortalWorkOrder = PortalData['workOrders'][number];

  const workOrdersAll: PortalWorkOrder[] = data.workOrders || [];
  const qLower = q.toLowerCase();
  const workOrders = qLower
    ? workOrdersAll.filter((w) => {
        const t = String(w.title || '').toLowerCase();
        const p = String(w.projectTitle || '').toLowerCase();
        const a = String(w.installationAddress || '').toLowerCase();
        return t.includes(qLower) || p.includes(qLower) || a.includes(qLower);
      })
    : workOrdersAll;

  const selectedWorkOrderId = workOrderId || (workOrders[0]?.id ? String(workOrders[0].id) : null);
  const selectedWorkOrder = selectedWorkOrderId ? workOrders.find((w) => String(w.id) === String(selectedWorkOrderId)) : null;

  type AttachmentsRes = Awaited<ReturnType<typeof contractorGetWorkOrderAttachments>>;
  type CheckinsRes = Awaited<ReturnType<typeof contractorGetWorkOrderCheckins>>;
  const emptyAttachmentsRes: AttachmentsRes = { success: true, data: [] };
  const emptyCheckinsRes: CheckinsRes = { success: true, data: [] };

  const [attachmentsRes, checkinsRes]: [AttachmentsRes, CheckinsRes] = selectedWorkOrderId
    ? await Promise.all([
        contractorGetWorkOrderAttachments({ token, workOrderId: selectedWorkOrderId }),
        contractorGetWorkOrderCheckins({ token, workOrderId: selectedWorkOrderId }),
      ])
    : [emptyAttachmentsRes, emptyCheckinsRes];

  const attachments = attachmentsRes.success ? (attachmentsRes.data ?? []) : [];
  const checkins = checkinsRes.success ? (checkinsRes.data ?? []) : [];

  async function markDoneAction(formData: FormData) {
    'use server';
    const workOrderId = String(formData.get('workOrderId') || '');

    if (!workOrderId) {
      redirect(`/portal/ops/${encodeURIComponent(token)}?error=${encodeURIComponent('חסר מזהה קריאה')}`);
    }

    const access = await contractorValidateWorkOrderAccess({ token, workOrderId });
    if (!access.success || !access.organizationId) {
      const msg = access.error ? String(access.error) : 'גישה נדחתה';
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(msg)}`);
    }

    const result = await contractorMarkWorkOrderDone({ token, workOrderId });

    if (result.success) {
      redirect(`/portal/ops/${encodeURIComponent(token)}`);
    }

    const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בעדכון סטטוס');
    redirect(`/portal/ops/${encodeURIComponent(token)}?error=${message}`);
  }

  async function completeWithSignatureAction(formData: FormData) {
    'use server';
    const workOrderId = String(formData.get('workOrderId') || '');
    const signatureDataUrl = String(formData.get('signatureDataUrl') || '').trim();

    if (!workOrderId) {
      redirect(`/portal/ops/${encodeURIComponent(token)}?error=${encodeURIComponent('חסר מזהה קריאה')}`);
    }

    if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/')) {
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent('חובה לצרף חתימה')}`);
    }

    const access = await contractorValidateWorkOrderAccess({ token, workOrderId });
    if (!access.success || !access.organizationId) {
      const msg = access.error ? String(access.error) : 'גישה נדחתה';
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(msg)}`);
    }

    const tokenResolved = await contractorResolveTokenForApi({ token });
    if (!tokenResolved.success || !tokenResolved.tokenHash) {
      const msg = tokenResolved.error ? String(tokenResolved.error) : 'גישה נדחתה';
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(msg)}`);
    }

    const supabase = createServiceRoleClientScoped({
      reason: 'ops_portal_signature_upload',
      scopeColumn: 'organization_id',
      scopeId: String(access.organizationId).trim(),
    });
    const bucket = 'operations-files';
    const filePath = `${String(access.organizationId).trim()}/ops/contractor/${String(tokenResolved.tokenHash)}/work-orders/${workOrderId}/signature.png`;

    const base64 = signatureDataUrl.includes('base64,') ? signatureDataUrl.split('base64,')[1] : '';
    if (!base64) {
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent('חתימה לא תקינה')}`);
    }

    const fileBuffer = Buffer.from(base64, 'base64');

    // Best effort: ensure bucket exists
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (!listError) {
        const exists = (buckets || []).some((b) => b.name === bucket);
        if (!exists) {
          await supabase.storage.createBucket(bucket, {
            public: false,
            fileSizeLimit: 50 * 1024 * 1024,
          });
        }
      }
    } catch {
      // ignore
    }

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, fileBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

    if (uploadError) {
      const msg = uploadError.message ? String(uploadError.message) : 'שגיאה בהעלאת חתימה';
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(msg)}`);
    }

    const ref = `sb://${bucket}/${filePath}`;

    const sig = await contractorSetWorkOrderCompletionSignature({ token, workOrderId, signatureUrl: ref });
    if (!sig.success) {
      const msg = sig.error ? String(sig.error) : 'שגיאה בשמירת חתימה';
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(msg)}`);
    }

    const done = await contractorMarkWorkOrderDone({ token, workOrderId });
    if (!done.success) {
      const msg = done.error ? String(done.error) : 'שגיאה בעדכון סטטוס';
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(msg)}`);
    }

    redirect(`/portal/ops/${encodeURIComponent(token)}`);
  }

  async function uploadAction(formData: FormData) {
    'use server';
    const workOrderId = String(formData.get('workOrderId') || '');
    const file = formData.get('file') as File | null;
    if (!workOrderId) {
      redirect(`/portal/ops/${encodeURIComponent(token)}?error=${encodeURIComponent('חסר מזהה קריאה')}`);
    }
    if (!file) {
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent('חסר קובץ')}`);
    }

    const access = await contractorValidateWorkOrderAccess({ token, workOrderId });
    if (!access.success || !access.organizationId) {
      const msg = access.error ? String(access.error) : 'גישה נדחתה';
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(msg)}`);
    }

    const tokenResolved = await contractorResolveTokenForApi({ token });
    if (!tokenResolved.success || !tokenResolved.tokenHash) {
      const msg = tokenResolved.error ? String(tokenResolved.error) : 'גישה נדחתה';
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(msg)}`);
    }

    const supabase = createServiceRoleClientScoped({
      reason: 'ops_portal_attachment_upload',
      scopeColumn: 'organization_id',
      scopeId: String(access.organizationId).trim(),
    });
    const bucket = 'operations-files';
    const safeName = String(file.name || 'upload').replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${String(access.organizationId).trim()}/ops/contractor/${String(tokenResolved.tokenHash)}/work-orders/${workOrderId}/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Best effort: ensure bucket exists
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (!listError) {
        const exists = (buckets || []).some((b) => b.name === bucket);
        if (!exists) {
          await supabase.storage.createBucket(bucket, {
            public: false,
            fileSizeLimit: 50 * 1024 * 1024,
          });
        }
      }
    } catch {
      // ignore
    }

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });

    if (uploadError) {
      const msg = uploadError.message ? String(uploadError.message) : 'שגיאה בהעלאת קובץ';
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(msg)}`);
    }

    const ref = `sb://${bucket}/${filePath}`;

    const save = await contractorAddWorkOrderAttachment({
      token,
      workOrderId,
      storageBucket: bucket,
      storagePath: filePath,
      url: ref,
      mimeType: file.type || null,
    });

    if (!save.success) {
      const msg = save.error ? String(save.error) : 'שגיאה בשמירת קובץ';
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(msg)}`);
    }

    redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}`);
  }

  async function checkinAction(formData: FormData) {
    'use server';
    const workOrderId = String(formData.get('workOrderId') || '');
    const lat = Number(formData.get('lat'));
    const lng = Number(formData.get('lng'));
    const accuracyRaw = formData.get('accuracy');
    const accuracy = accuracyRaw === null || accuracyRaw === undefined || accuracyRaw === '' ? null : Number(accuracyRaw);

    if (!workOrderId) {
      redirect(`/portal/ops/${encodeURIComponent(token)}?error=${encodeURIComponent('חסר מזהה קריאה')}`);
    }

    const access = await contractorValidateWorkOrderAccess({ token, workOrderId });
    if (!access.success || !access.organizationId) {
      const msg = access.error ? String(access.error) : 'גישה נדחתה';
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(msg)}`);
    }

    const result = await contractorAddWorkOrderCheckin({ token, workOrderId, lat, lng, accuracy });
    if (!result.success) {
      const msg = result.error ? String(result.error) : 'שגיאה בשמירת מיקום';
      redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(msg)}`);
    }
    redirect(`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(workOrderId)}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="text-xs font-black text-slate-500">פורטל קבלנים</div>
            <div className="text-xl font-black text-slate-900 mt-1">משימות בשטח</div>
            <div className="text-sm text-slate-600 mt-2">
              {data.contractorLabel ? `שלום ${data.contractorLabel}` : 'שלום'}
            </div>

            <form method="get" id="ops-portal-search-form" className="mt-4 flex items-center gap-2">
              {workOrderId ? <input type="hidden" name="workOrderId" value={workOrderId} /> : null}
              <input
                name="q"
                defaultValue={q}
                placeholder="חיפוש קריאות לפי שם/כתובת"
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
              />
              <VisionIdentifyFillSearch formId="ops-portal-search-form" inputName="q" token={token} />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                חפש
              </button>
            </form>
          </div>

          {error ? (
            <div className="p-4 border-b border-rose-100 bg-rose-50 text-rose-800 text-sm font-bold">{error}</div>
          ) : null}

          <div className="p-5 space-y-3">
            {selectedWorkOrder ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-black text-slate-600">פעולות מהירות</div>

                <form action={checkinAction} id="contractor-checkin-form" className="mt-3">
                  <input type="hidden" name="workOrderId" value={selectedWorkOrder.id} />
                  <input type="hidden" name="lat" value="" />
                  <input type="hidden" name="lng" value="" />
                  <input type="hidden" name="accuracy" value="" />
                  <GeoCheckInButton
                    formId="contractor-checkin-form"
                    label="הגעתי לאתר"
                    className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-4 text-base font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  />
                </form>

                <form action={uploadAction} className="mt-3 space-y-2">
                  <input type="hidden" name="workOrderId" value={selectedWorkOrder.id} />
                  <input
                    type="file"
                    name="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    className="block w-full text-sm"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    העלה תמונה/מסמך
                  </button>
                </form>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-black text-slate-700">סיום עם חתימה</div>
                  <div className="text-sm text-slate-600 mt-2">כדי לסיים קריאה—חתום/חתמי ושמור.</div>
                  <form action={completeWithSignatureAction} className="mt-3 space-y-3">
                    <input type="hidden" name="workOrderId" value={selectedWorkOrder.id} />
                    <SignaturePad inputName="signatureDataUrl" />
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-4 text-base font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    >
                      סמן כבוצע ושמור חתימה
                    </button>
                  </form>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  {attachments.length ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-black text-slate-700">קבצים</div>
                      <div className="mt-2 space-y-2">
                        {attachments.slice(0, 5).map((a) => (
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
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {checkins.length ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-black text-slate-700">דיווחי הגעה</div>
                      <div className="mt-2 space-y-2">
                        {checkins.slice(0, 5).map((c) => (
                          <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] font-black text-slate-600">{new Date(c.createdAt).toLocaleString('he-IL')}</div>
                            <div className="mt-1 text-xs text-slate-600">
                              דיוק: {c.accuracy ? `±${Math.round(Number(c.accuracy))}m` : '—'}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {Number(c.lat).toFixed(5)}, {Number(c.lng).toFixed(5)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {workOrders.length ? (
              workOrders.map((w) => {
                const badge = formatStatus(w.status);
                return (
                  <div key={w.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 truncate">{w.title}</div>
                        <div className="text-xs text-slate-500 mt-1">{w.projectTitle}</div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${badge.className}`}>{badge.label}</span>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] font-black text-slate-600">כתובת</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">
                          {w.installationAddress ? w.installationAddress : '—'}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] font-black text-slate-600">תאריך יעד</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">
                          {w.scheduledStart ? new Date(w.scheduledStart).toLocaleString('he-IL') : '—'}
                        </div>
                      </div>
                    </div>

                    <form action={markDoneAction} className="mt-4">
                      <input type="hidden" name="workOrderId" value={w.id} />
                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-4 text-base font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        סמן כבוצע
                      </button>
                    </form>

                    <div className="mt-3">
                      <a
                        href={`/portal/ops/${encodeURIComponent(token)}?workOrderId=${encodeURIComponent(w.id)}`}
                        className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors"
                      >
                        בחר למשימות/קבצים
                      </a>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-black text-slate-900">אין משימות פתוחות</div>
                <div className="text-sm text-slate-600 mt-2">הכל מסומן כמבוצע.</div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">הקישור הזה אישי—אל תשתף אותו.</div>
      </div>
    </div>
  );
}
