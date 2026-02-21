// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import Link from 'next/link';

import { getOperationsProjectsData } from '@/app/actions/operations';

function formatDate(dateIso: string): string {
  try {
    const date = new Date(dateIso);
    return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  } catch {
    return dateIso;
  }
}

function formatProjectStatus(status: string): { label: string; cls: string } {
  switch (status) {
    case 'ACTIVE': return { label: 'פעיל', cls: 'bg-sky-50 text-sky-700 border border-sky-100' };
    case 'COMPLETED': return { label: 'הושלם', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
    case 'ON_HOLD': return { label: 'מוקפא', cls: 'bg-amber-50 text-amber-700 border border-amber-100' };
    case 'CANCELLED': return { label: 'בוטל', cls: 'bg-slate-50 text-slate-500 border border-slate-200' };
    default: return { label: status, cls: 'bg-slate-50 text-slate-700 border border-slate-200' };
  }
}

export default async function OperationsProjectsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const res = await getOperationsProjectsData({ orgSlug });
  const projects = res.success ? res.data?.projects ?? [] : [];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-800">כל הפרויקטים</div>
                <div className="text-xs text-slate-400 mt-0.5">סך הכל {projects.length} פרויקטים</div>
              </div>

              <Link
                href={`${base}/projects/new`}
                className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150"
              >
                פרויקט חדש
              </Link>
            </div>
          </div>

          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-slate-500">
                    <th className="pb-3 font-bold">שם</th>
                    <th className="pb-3 font-bold">לקוח</th>
                    <th className="pb-3 font-bold">סטטוס</th>
                    <th className="pb-3 font-bold">תאריך יצירה</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length ? (
                    projects.map((p) => {
                      const ps = formatProjectStatus(p.status);
                      return (
                        <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3">
                            <Link href={`${base}/work-orders?projectId=${encodeURIComponent(p.id)}`} className="font-bold text-slate-900 hover:text-sky-700 transition-colors">
                              {p.title}
                            </Link>
                          </td>
                          <td className="py-3 text-slate-600">
                            {p.clientName ? p.clientName : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${ps.cls}`}>
                              {ps.label}
                            </span>
                          </td>
                          <td className="py-3 text-slate-600">{formatDate(p.createdAt)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="border-t border-slate-100">
                      <td className="py-6 text-sm text-slate-500" colSpan={4}>
                        אין עדיין פרויקטים להצגה
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!res.success ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {res.error || 'שגיאה בטעינת הפרויקטים'}
              </div>
            ) : null}
          </div>
      </section>
    </div>
  );
}
