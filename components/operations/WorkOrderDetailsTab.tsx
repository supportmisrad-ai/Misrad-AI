import { FileText, Camera, MapPin, Building2, User, Calendar, CheckCircle2, Info, ArrowLeftRight } from 'lucide-react';

import { Select } from '@/components/ui/select';
import { FormPendingButton } from '@/components/operations/FormPendingButton';
import GeoCheckInButton from '@/components/operations/GeoCheckInButton';
import SignaturePad from '@/components/operations/SignaturePad';
import WorkOrderAiSummary from '@/components/operations/WorkOrderAiSummary';
import WorkOrderGallery from '@/components/operations/WorkOrderGallery';
import { SlotMachineNumber } from '@/components/operations/SlotMachineNumber';
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
  const hasCheckIn = checkins.length > 0;
  return (
    <div className="space-y-5 pb-10">
      {/* ──── Description Card ──── */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-xl shadow-black/5 transition-all">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-sky-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">תיאור התקלה / משימה</span>
        </div>
        <p className="text-[15px] font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
          {w.description ? w.description : <span className="text-slate-300 italic">לא הוזן תיאור</span>}
        </p>
      </div>

      {/* ──── Location & Reporter Info ──── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-xl shadow-black/5">
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">פרטי מיקום</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Building2 size={16} strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-[11px] font-black text-slate-400 uppercase">מיקום מדויק</div>
                <div className="text-sm font-black text-slate-800">
                  {[w.buildingName, w.floor ? `קומה ${w.floor}` : null, w.unit ? `חדר ${w.unit}` : null].filter(Boolean).join(' · ') || 'לא צוין'}
                </div>
              </div>
            </div>
            {w.departmentName && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <ArrowLeftRight size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[11px] font-black text-slate-400 uppercase">מחלקה / אגף</div>
                  <div className="text-sm font-black text-slate-800">{w.departmentName}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reporter Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-xl shadow-black/5">
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">גורם מדווח</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <User size={16} strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-[11px] font-black text-slate-400 uppercase">מדווח התקלה</div>
                <div className="text-sm font-black text-slate-800">{w.reporterName || 'מנהל מערכת'}</div>
                {w.reporterPhone && (
                  <a href={`tel:${w.reporterPhone}`} className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full bg-amber-500 text-white text-[11px] font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all" dir="ltr">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 015.08 2h3a2 2 0 012 1.72 12.81 12.81 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                    {w.reporterPhone}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Calendar size={16} strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-[11px] font-black text-slate-400 uppercase">זמני ביצוע</div>
                <div className="text-sm font-black text-slate-800">
                  {w.scheduledStart ? new Date(w.scheduledStart).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'מיידי'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ──── Technician Assignment ──── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-xl shadow-black/5">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-sky-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">שיוך טכנאי לביצוע</span>
        </div>

        <form action={assignTechnicianAction} className="flex flex-col gap-3">
          <div className="w-full">
            <Select
              name="technicianId"
              defaultValue={w.assignedTechnicianId ? String(w.assignedTechnicianId) : ''}
              className="h-14 text-base font-black"
            >
              <option value="">לא משויך - זמין לכולם</option>
              {technicianOptions.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {String(t.label)}
                </option>
              ))}
            </Select>
            {technicianOptionsError ? (
              <div className="mt-2 text-xs font-black text-rose-600">{technicianOptionsError}</div>
            ) : null}
          </div>

          <FormPendingButton
            pendingText="שומר שיוך..."
            className="w-full h-14 inline-flex items-center justify-center rounded-2xl px-6 text-base font-black bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/20 active:scale-95 transition-all duration-200 disabled:opacity-50"
          >
            עדכן טכנאי מבצע
          </FormPendingButton>
        </form>
      </div>

      {/* ──── Field Documentation ──── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-900 bg-slate-900 p-6 shadow-2xl">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/20 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <Camera size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-black text-white uppercase tracking-tight leading-tight">תיעוד ודיווח מהשטח</div>
            <div className="text-[11px] font-bold text-slate-400">חובה לדווח מיקום ותמונות</div>
          </div>
        </div>

        <div className="space-y-4">
          <form action={checkinAction} id="ops-internal-checkin-form">
            <input type="hidden" name="lat" value="" />
            <input type="hidden" name="lng" value="" />
            <input type="hidden" name="accuracy" value="" />
            <GeoCheckInButton
              formId="ops-internal-checkin-form"
              label="דווח הגעה לאתר (GPS)"
              checkedIn={hasCheckIn}
              className="w-full h-16 rounded-2xl text-base"
            />
          </form>

          <form action={uploadAction} className="space-y-3">
            <input type="file" name="file" id="file-input" accept="image/*,application/pdf" className="hidden" required />
            <div className="grid grid-cols-2 gap-4">
              <label 
                htmlFor="file-input" 
                className="flex flex-col items-center justify-center gap-3 bg-white/5 border-2 border-white/10 rounded-2xl p-6 cursor-pointer hover:border-sky-400 hover:bg-white/10 transition-all active:scale-95"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-sky-400">
                  <FileText size={28} />
                </div>
                <span className="text-xs font-black text-white">צרף מסמך</span>
              </label>
              <label 
                htmlFor="file-input"
                className="flex flex-col items-center justify-center gap-3 bg-white/5 border-2 border-white/10 rounded-2xl p-6 cursor-pointer hover:border-sky-400 hover:bg-white/10 transition-all active:scale-95"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-emerald-400">
                  <Camera size={28} />
                </div>
                <span className="text-xs font-black text-white">צלם תמונה</span>
              </label>
            </div>
            <FormPendingButton
              pendingText="מעלה קובץ..."
              className="w-full h-16 inline-flex items-center justify-center rounded-2xl px-6 text-base font-black bg-white text-slate-900 hover:bg-slate-100 shadow-xl active:scale-95 transition-all duration-200"
            >
              העלה תיעוד
            </FormPendingButton>
          </form>
        </div>

        {/* Live Gallery / Logs */}
        <div className="mt-8 space-y-4">
          <WorkOrderGallery attachments={attachments.map(a => ({ id: a.id, url: a.url, mimeType: a.mimeType ?? null, createdAt: a.createdAt }))} />

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">יומן דיווחי הגעה</div>
              <div className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-black">
                סה״כ <SlotMachineNumber value={checkins.length} />
              </div>
            </div>
            <div className="space-y-2.5">
              {checkins.length ? (
                checkins.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <div className="text-xs font-black text-white">{new Date(c.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">
                      דיוק: ±<SlotMachineNumber value={Math.round(Number(c.accuracy))} />m
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm font-bold text-slate-500 text-center py-4 italic">ממתין לדיווח ראשון</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ──── Completion & Signature ──── */}
      <div id="completion-signature" className="relative overflow-hidden rounded-3xl border border-emerald-900 bg-emerald-900 p-6 shadow-2xl">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full -ml-16 -mb-16 pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <CheckCircle2 size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-black text-white uppercase tracking-tight leading-tight">סיום עבודה וחתימה</div>
            <div className="text-[11px] font-bold text-emerald-300/60">אישור לקוח סופי</div>
          </div>
        </div>

        {w.completionSignatureUrl ? (
          <a
            href={w.completionSignatureUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block rounded-2xl border-4 border-white/20 bg-white p-2 shadow-2xl transition-transform active:scale-95"
          >
            <img src={w.completionSignatureUrl} alt="חתימת לקוח" className="w-full max-h-48 object-contain" />
          </a>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-xs font-bold text-emerald-100 leading-relaxed">בסיום העבודה, יש להחתים את הלקוח ישירות על המסך לאישור ביצוע תקין.</p>
            <form action={completeWithSignatureAction} className="space-y-4">
              <div className="bg-white/10 rounded-2xl p-2 border border-white/20">
                <SignaturePad inputName="signatureDataUrl" />
              </div>
              <FormPendingButton
                disabled={w.status === 'DONE'}
                pendingText="שומר חתימה ומסיים..."
                className="w-full h-16 inline-flex items-center justify-center rounded-2xl px-6 text-base font-black bg-white text-emerald-900 hover:bg-emerald-50 shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                אשר סיום עבודה וחתימה
              </FormPendingButton>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
