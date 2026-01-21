export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createOperationsWorkOrder, getOperationsProjectOptions } from '@/app/actions/operations';

export default async function OperationsNewWorkOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug } = await params;
  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const sp = (await searchParams) ?? {};
  const projectIdRaw = sp.projectId;
  const initialProjectId = Array.isArray(projectIdRaw) ? projectIdRaw[0] : projectIdRaw;

  const projectsRes = await getOperationsProjectOptions({ orgSlug });
  const projects = projectsRes.success ? projectsRes.data ?? [] : [];

  async function createAction(formData: FormData) {
    'use server';

    const title = String(formData.get('title') || '');
    const description = String(formData.get('description') || '');
    const projectId = String(formData.get('projectId') || '');
    const scheduledStart = String(formData.get('scheduledStart') || '');

    const res = await createOperationsWorkOrder({
      orgSlug,
      title,
      description,
      projectId,
      scheduledStart,
    });

    if (res.success && res.id) {
      redirect(`${base}/work-orders/${encodeURIComponent(res.id)}`);
    }

    const message = res.error ? encodeURIComponent(res.error) : encodeURIComponent('שגיאה ביצירת קריאה');
    redirect(`${base}/work-orders/new?error=${message}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="bg-white/80 backdrop-blur rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-slate-900">יצירת קריאה</div>
            <Link
              href={`${base}/work-orders`}
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-bold bg-white/80 border border-slate-200 hover:bg-white transition-colors"
            >
              חזרה
            </Link>
          </div>
        </div>

        <form action={createAction} className="p-5 space-y-4">
          <div>
            <label htmlFor="title" className="block text-xs font-black text-slate-700">
              כותרת
            </label>
            <input
              id="title"
              name="title"
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="לדוגמה: בדיקת תקלה במזגן"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-black text-slate-700">
              תיאור
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="פרטים נוספים שיעזרו לטכנאי בשטח"
            />
          </div>

          <div>
            <label htmlFor="projectId" className="block text-xs font-black text-slate-700">
              פרויקט (חובה)
            </label>
            <select
              id="projectId"
              name="projectId"
              required
              defaultValue={initialProjectId ? String(initialProjectId) : ''}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="" disabled>
                {projects.length ? 'בחר פרויקט…' : 'אין פרויקטים פעילים'}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {!projectsRes.success ? (
              <div className="mt-2 text-xs font-bold text-rose-700">{projectsRes.error}</div>
            ) : null}
          </div>

          <div>
            <label htmlFor="scheduledStart" className="block text-xs font-black text-slate-700">
              תאריך יעד
            </label>
            <input
              id="scheduledStart"
              name="scheduledStart"
              type="datetime-local"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Link
              href={`${base}/work-orders`}
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold bg-white/80 border border-slate-200 hover:bg-white transition-colors"
            >
              ביטול
            </Link>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              צור קריאה
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
