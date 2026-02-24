import Link from 'next/link';

import { Select } from '@/components/ui/select';
import { FormPendingButton } from '@/components/operations/FormPendingButton';
import GeoCheckInButton from '@/components/operations/GeoCheckInButton';
import SignaturePad from '@/components/operations/SignaturePad';
import WorkOrderAiSummary from '@/components/operations/WorkOrderAiSummary';
import WorkOrderGallery from '@/components/operations/WorkOrderGallery';
import type {
  OperationsTechnicianOption,
  OperationsWorkOrderAttachmentRow,
  OperationsWorkOrderCheckinRow,
} from '@/lib/services/operations/types';

type WorkOrderData = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  scheduledStart: string | null;
  installationAddress: string | null;
  project: { id: string; title: string } | null;
  assignedTechnicianId: string | null;
  technicianLabel: string | null;
  completionSignatureUrl: string | null;
  categoryName: string | null;
  departmentName: string | null;
  buildingName: string | null;
  floor: string | null;
  unit: string | null;
  reporterName: string | null;
  reporterPhone: string | null;
  slaDeadline: string | null;
  completedAt: string | null;
  aiSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function WorkOrderDetailsTab({
  orgSlug,
  w,
  technicianOptions,
  technicianOptionsError,
  attachments,
  checkins,
  assignTechnicianAction,
  checkinAction,
  uploadAction,
  completeWithSignatureAction,
}: {
  orgSlug: string;
  w: WorkOrderData;
  technicianOptions: OperationsTechnicianOption[];
  technicianOptionsError: string | null;
  attachments: OperationsWorkOrderAttachmentRow[];
  checkins: OperationsWorkOrderCheckinRow[];
  assignTechnicianAction: (formData: FormData) => Promise<void>;
  checkinAction: (formData: FormData) => Promise<void>;
  uploadAction: (formData: FormData) => Promise<void>;
  completeWithSignatureAction: (formData: FormData) => Promise<void>;
}) {
  return (
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
            {technicianOptionsError ? (
              <div className="mt-2 text-xs font-bold text-rose-700">{technicianOptionsError}</div>
            ) : null}
          </div>

          <div>
            <FormPendingButton
              pendingText="שומר..."
              className="w-full h-11 inline-flex items-center justify-center rounded-xl px-4 text-sm font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150 disabled:opacity-50"
            >
              שמור שיוך
            </FormPendingButton>
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
          <FormPendingButton
            pendingText="מעלה..."
            className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            העלה תמונה/מסמך
          </FormPendingButton>
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

      <div id="completion-signature" className="rounded-2xl border border-slate-200 bg-white/80 p-4">
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
          <FormPendingButton
            disabled={w.status === 'DONE'}
            pendingText="שומר חתימה..."
            className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            סיים עבודה ושמור חתימה
          </FormPendingButton>
        </form>
      </div>

      <WorkOrderAiSummary orgSlug={orgSlug} workOrderId={w.id} initialSummary={w.aiSummary} />
    </>
  );
}
