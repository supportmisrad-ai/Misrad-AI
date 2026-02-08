export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createOperationsWorkOrder, getOperationsProjectOptions } from '@/app/actions/operations';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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
            <Input
              id="title"
              name="title"
              required
              className="mt-2 h-12 rounded-2xl bg-white/80"
              placeholder="לדוגמה: בדיקת תקלה במזגן"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-black text-slate-700">
              תיאור
            </label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              className="mt-2 min-h-[120px] rounded-2xl bg-white/80"
              placeholder="פרטים נוספים שיעזרו לטכנאי בשטח"
            />
          </div>

          <div>
            <label htmlFor="projectId" className="block text-xs font-black text-slate-700">
              פרויקט (חובה)
            </label>
            <Select
              id="projectId"
              name="projectId"
              required
              defaultValue={initialProjectId ? String(initialProjectId) : ''}
              className="mt-2 h-12 rounded-2xl bg-white/80"
            >
              <option value="" disabled>
                {projects.length ? 'בחר פרויקט…' : 'אין פרויקטים פעילים'}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
            {!projectsRes.success ? (
              <div className="mt-2 text-xs font-bold text-rose-700">{projectsRes.error}</div>
            ) : null}
          </div>

          <div>
            <label htmlFor="scheduledStart" className="block text-xs font-black text-slate-700">
              תאריך יעד
            </label>
            <Input
              id="scheduledStart"
              name="scheduledStart"
              type="datetime-local"
              className="mt-2 h-12 rounded-2xl bg-white/80"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Link
              href={`${base}/work-orders`}
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold bg-white/80 border border-slate-200 hover:bg-white transition-colors"
            >
              ביטול
            </Link>
            <Button
              type="submit"
              variant="secondary"
              className="rounded-2xl"
            >
              צור קריאה
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
