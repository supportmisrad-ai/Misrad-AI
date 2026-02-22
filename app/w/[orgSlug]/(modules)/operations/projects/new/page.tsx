// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

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
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
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
                className="mt-2 w-full h-11 rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 hover:shadow focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
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
                className="mt-2 appearance-none w-full h-11 rounded-xl bg-white bg-no-repeat border border-slate-200/80 pl-10 pr-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 hover:shadow focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundSize: '16px 16px', backgroundPosition: 'left 12px center' }}
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
                className="mt-2 w-full h-11 rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 hover:shadow focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
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
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-black bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-colors"
              >
                צור פרויקט
              </button>
            </div>
          </form>
      </section>
    </div>
  );
}
