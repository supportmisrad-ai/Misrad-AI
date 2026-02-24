// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createOperationsProject, getOperationsClientOptions } from '@/app/actions/operations';
import { FormCustomSelect } from '@/components/FormCustomSelect';
import { FormPendingButton } from '@/components/operations/FormPendingButton';

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
                לקוח <span className="text-slate-400 font-medium">(אופציונלי)</span>
              </label>
              <div className="mt-2">
                <FormCustomSelect
                  name="canonicalClientId"
                  id="canonicalClientId"
                  defaultValue=""
                  placeholder={clientOptions.length ? 'ללא לקוח (אופציונלי)' : 'אין לקוחות זמינים'}
                  options={clientOptions.map((opt) => ({ value: opt.id, label: opt.label }))}
                />
              </div>
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
              <FormPendingButton
                pendingText="יוצר פרויקט..."
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-black bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-colors disabled:opacity-50"
              >
                צור פרויקט
              </FormPendingButton>
            </div>
          </form>
      </section>
    </div>
  );
}
