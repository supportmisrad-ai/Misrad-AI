export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

import { createOperationsContractorToken } from '@/app/actions/operations';

export default async function OperationsContractorsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  async function createTokenAction(formData: FormData) {
    'use server';

    const contractorLabel = String(formData.get('contractorLabel') || '');
    const ttlHours = Number(formData.get('ttlHours') || 72);

    const res = await createOperationsContractorToken({
      orgSlug,
      contractorLabel,
      ttlHours,
    });

    if (res.success && res.token) {
      redirect(`${base}/contractors?token=${encodeURIComponent(res.token)}`);
    }

    const message = res.error ? encodeURIComponent(res.error) : encodeURIComponent('שגיאה ביצירת טוקן');
    redirect(`${base}/contractors?error=${message}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="bg-white/80 backdrop-blur rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="text-sm font-black text-slate-900">פורטל קבלנים</div>
          <div className="text-xs text-slate-500 mt-1">הפקת קישור חיצוני לקבלן (ללא התחברות)</div>
        </div>

        <div className="p-5 space-y-4">
          <form action={createTokenAction} className="space-y-3">
            <div>
              <label htmlFor="contractorLabel" className="block text-xs font-black text-slate-700">
                שם קבלן / תווית
              </label>
              <input
                id="contractorLabel"
                name="contractorLabel"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="לדוגמה: צוות חשמל - יוסי"
              />
            </div>

            <div>
              <label htmlFor="ttlHours" className="block text-xs font-black text-slate-700">
                תוקף (שעות)
              </label>
              <input
                id="ttlHours"
                name="ttlHours"
                type="number"
                min={1}
                defaultValue={72}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-4 text-base font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              צור טוקן
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-black text-slate-700">איך זה עובד</div>
            <div className="text-sm text-slate-600 mt-2">
              אחרי יצירת טוקן, תוכל להדביק לקבלן את הקישור:
            </div>
            <div className="mt-2 text-xs font-black text-slate-900 break-all">
              {`/portal/ops/<token>`}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
