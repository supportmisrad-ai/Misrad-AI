// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  createOperationsWorkOrder,
  getOperationsBuildings,
  getOperationsCallCategories,
  getOperationsDepartments,
  getOperationsProjectOptions,
  getOperationsTechnicianOptions,
} from '@/app/actions/operations';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { FormPendingButton } from '@/components/operations/FormPendingButton';
import TechnicianSelector from '@/components/operations/TechnicianSelector';

const labelCls = 'block text-xs font-semibold text-slate-500 mb-1.5';
const inputCls = 'mt-0';
const selectCls = 'mt-0';

export default async function OperationsNewWorkOrderPage({
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

  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const projectIdRaw = sp.projectId;
  const initialProjectId = Array.isArray(projectIdRaw) ? projectIdRaw[0] : projectIdRaw;
  const errorRaw = sp.error;
  const error = errorRaw ? String(Array.isArray(errorRaw) ? errorRaw[0] : errorRaw) : null;

  const [projectsRes, categoriesRes, buildingsRes, departmentsRes, techniciansRes] = await Promise.all([
    getOperationsProjectOptions({ orgSlug }),
    getOperationsCallCategories({ orgSlug }),
    getOperationsBuildings({ orgSlug }),
    getOperationsDepartments({ orgSlug }),
    getOperationsTechnicianOptions({ orgSlug }),
  ]);

  const projects = projectsRes.success ? projectsRes.data ?? [] : [];
  const categories = categoriesRes.success ? categoriesRes.data ?? [] : [];
  const buildings = buildingsRes.success ? buildingsRes.data ?? [] : [];
  const departments = departmentsRes.success ? departmentsRes.data ?? [] : [];
  const technicians = techniciansRes.success ? techniciansRes.data ?? [] : [];

  async function createAction(formData: FormData) {
    'use server';

    const title = String(formData.get('title') || '');
    const description = String(formData.get('description') || '');
    const projectId = String(formData.get('projectId') || '') || null;
    const scheduledStart = String(formData.get('scheduledStart') || '');
    const priority = String(formData.get('priority') || 'NORMAL');
    const categoryId = String(formData.get('categoryId') || '') || null;
    const departmentId = String(formData.get('departmentId') || '') || null;
    const buildingId = String(formData.get('buildingId') || '') || null;
    const floor = String(formData.get('floor') || '') || null;
    const unit = String(formData.get('unit') || '') || null;
    const reporterName = String(formData.get('reporterName') || '') || null;
    const reporterPhone = String(formData.get('reporterPhone') || '') || null;
    const assignedTechnicianId = String(formData.get('assignedTechnicianId') || '') || null;

    const res = await createOperationsWorkOrder({
      orgSlug,
      title,
      description,
      projectId,
      scheduledStart,
      priority,
      categoryId,
      departmentId,
      buildingId,
      floor,
      unit,
      reporterName,
      reporterPhone,
      assignedTechnicianId,
    });

    if (res.success && res.id) {
      redirect(`${base}/work-orders/${encodeURIComponent(res.id)}`);
    }

    const message = res.error ? encodeURIComponent(res.error) : encodeURIComponent('שגיאה ביצירת קריאה');
    redirect(`${base}/work-orders/new?error=${message}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">קריאה חדשה</div>
              <div className="text-[11px] text-slate-400 mt-0.5">פתיחת קריאת שירות חדשה</div>
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
          <div className="p-4 border-b border-rose-100 bg-rose-50 text-rose-800 text-sm font-bold">{decodeURIComponent(error)}</div>
        ) : null}

        <form action={createAction} className="p-5 space-y-5">
          {/* ──── פרטי הקריאה ──── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-px flex-1 bg-slate-100"></div>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wide">פרטי הקריאה</span>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>

            <div>
              <label htmlFor="title" className={labelCls}>כותרת *</label>
              <Input id="title" name="title" required className={inputCls} placeholder="לדוגמה: תקלה במזגן חדר 302" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className={labelCls}>דחיפות</label>
                <Select id="priority" name="priority" defaultValue="NORMAL">
                  <option value="NORMAL">רגיל</option>
                  <option value="HIGH">גבוה</option>
                  <option value="URGENT">דחוף</option>
                  <option value="CRITICAL">קריטי</option>
                </Select>
              </div>

              <div>
                <label htmlFor="categoryId" className={labelCls}>קטגוריה</label>
                <Select id="categoryId" name="categoryId" defaultValue="">
                  <option value="">ללא קטגוריה</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.maxResponseMinutes ? ` (SLA: ${c.maxResponseMinutes} דק׳)` : ''}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className={labelCls}>תיאור</label>
              <Textarea id="description" name="description" rows={3} className="mt-2 min-h-[90px] rounded-2xl bg-white/80" placeholder="פרטים נוספים שיעזרו לטכנאי בשטח" />
            </div>
          </div>

          {/* ──── מיקום ──── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-px flex-1 bg-slate-100"></div>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wide">מיקום</span>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="buildingId" className={labelCls}>מבנה</label>
                <Select id="buildingId" name="buildingId" defaultValue="">
                  <option value="">ללא מבנה</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="floor" className={labelCls}>קומה</label>
                <Input id="floor" name="floor" className={inputCls} placeholder="למשל: 3" />
              </div>
              <div>
                <label htmlFor="unit" className={labelCls}>יחידה / חדר</label>
                <Input id="unit" name="unit" className={inputCls} placeholder="למשל: 302" />
              </div>
            </div>
          </div>

          {/* ──── מדווח ──── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-px flex-1 bg-slate-100"></div>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wide">פרטי מדווח</span>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reporterName" className={labelCls}>שם מדווח</label>
                <Input id="reporterName" name="reporterName" className={inputCls} placeholder="שם מלא" />
              </div>
              <div>
                <label htmlFor="reporterPhone" className={labelCls}>טלפון מדווח</label>
                <Input id="reporterPhone" name="reporterPhone" type="tel" dir="ltr" className={inputCls} placeholder="050-1234567" />
              </div>
            </div>
          </div>

          {/* ──── שיוך ──── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-px flex-1 bg-slate-100"></div>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wide">שיוך</span>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="projectId" className={labelCls}>פרויקט</label>
                <Select id="projectId" name="projectId" defaultValue={initialProjectId ? String(initialProjectId) : ''}>
                  <option value="">ללא פרויקט</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label htmlFor="departmentId" className={labelCls}>מחלקה</label>
                <Select id="departmentId" name="departmentId" defaultValue="">
                  <option value="">ללא מחלקה</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TechnicianSelector orgSlug={orgSlug} technicians={technicians} />

              <div>
                <label htmlFor="scheduledStart" className={labelCls}>תאריך יעד</label>
                <Input id="scheduledStart" name="scheduledStart" type="datetime-local" className={inputCls} />
              </div>
            </div>
          </div>

          {/* ──── פעולות ──── */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href={`${base}/work-orders`}
              className="inline-flex items-center justify-center rounded-xl h-11 px-5 text-sm font-medium text-slate-600 bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all duration-150"
            >
              ביטול
            </Link>
            <FormPendingButton
              pendingText="פותח קריאה..."
              className="rounded-xl h-11 px-6 text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white shadow-sm transition-all duration-150 disabled:opacity-50 inline-flex items-center justify-center"
            >
              פתח קריאה
            </FormPendingButton>
          </div>
        </form>
      </section>
    </div>
  );
}
