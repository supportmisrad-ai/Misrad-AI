export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createOperationsProject, getOperationsClientOptions } from '@/app/actions/operations';

export default async function OperationsNewProjectPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const clientOptionsRes = await getOperationsClientOptions({ orgSlug });
  const clientOptions = clientOptionsRes.success ? clientOptionsRes.data ?? [] : [];

  async function createAction(formData: FormData) {
    'use server';

    const title = String(formData.get('title') || '');
    const canonicalClientId = String(formData.get('canonicalClientId') || '');
    const installationAddress = String(formData.get('installationAddress') || '');

    const res = await createOperationsProject({
      orgSlug,
      title,
      canonicalClientId,
      installationAddress,
    });

    if (res.success) {
      redirect(`${base}/projects`);
    }

    const message = res.error ? encodeURIComponent(res.error) : encodeURIComponent('שגיאה ביצירת פרויקט');
    redirect(`${base}/projects/new?error=${message}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="bg-white/80 backdrop-blur rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-slate-900">פרטי פרויקט</div>
              <Link
                href={`${base}/projects`}
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-bold bg-white/80 border border-slate-200 hover:bg-white transition-colors"
              >
                חזרה
              </Link>
            </div>
          </div>

          <form action={createAction} className="p-5 space-y-4">
            <div>
              <label htmlFor="title" className="block text-xs font-black text-slate-700">
                שם פרויקט
              </label>
              <input
                id="title"
                name="title"
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="לדוגמה: התקנת מערכת בבית הלקוח"
              />
            </div>

            <div>
              <label htmlFor="canonicalClientId" className="block text-xs font-black text-slate-700">
                לקוח
              </label>
              <select
                id="canonicalClientId"
                name="canonicalClientId"
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
                defaultValue=""
              >
                <option value="" disabled>
                  {clientOptions.length ? 'בחר לקוח…' : 'אין לקוחות זמינים'}
                </option>
                {clientOptions.map((opt) => (
                  <option key={`${opt.source}:${opt.id}`} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {!clientOptionsRes.success ? (
                <div className="mt-2 text-xs font-bold text-rose-700">{clientOptionsRes.error}</div>
              ) : null}
            </div>

            <div>
              <label htmlFor="installationAddress" className="block text-xs font-black text-slate-700">
                כתובת
              </label>
              <input
                id="installationAddress"
                name="installationAddress"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="לדוגמה: דיזנגוף 99, תל אביב"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Link
                href={`${base}/projects`}
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold bg-white/80 border border-slate-200 hover:bg-white transition-colors"
              >
                ביטול
              </Link>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                צור פרויקט
              </button>
            </div>
          </form>
      </section>
    </div>
  );
}
