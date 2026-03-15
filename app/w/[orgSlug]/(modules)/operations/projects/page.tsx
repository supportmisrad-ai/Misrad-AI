// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import Link from 'next/link';
import { Briefcase } from 'lucide-react';

import { getOperationsProjectsData } from '@/app/actions/operations';
import { formatProjectStatus } from '@/lib/services/operations/format';
import ProjectsImportButton from '@/components/operations/ProjectsImportButton';

function formatDate(dateIso: string): string {
  try {
    const date = new Date(dateIso);
    return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  } catch {
    return dateIso;
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

              <div className="flex items-center gap-2">
                <ProjectsImportButton orgSlug={orgSlug} />
                <Link
                  href={`${base}/projects/new`}
                  className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150"
                >
                  פרויקט חדש
                </Link>
              </div>
            </div>
          </div>

          <div className="p-5">
            {/* ──── Mobile Cards ──── */}
            <div className="md:hidden space-y-3">
              {projects.length ? (
                projects.map((p) => {
                  const ps = formatProjectStatus(p.status);
                  return (
                    <Link
                      key={p.id}
                      href={`${base}/projects/${encodeURIComponent(p.id)}`}
                      className="block rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black text-slate-900 truncate">{p.title}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${ps.cls}`}>{ps.label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        {p.clientName ? <span>לקוח: <b>{p.clientName}</b></span> : <span className="text-slate-400">ללא לקוח</span>}
                        <span className="text-slate-400">{formatDate(p.createdAt)}</span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">אין עדיין פרויקטים להצגה</div>
              )}
            </div>

            {/* ──── Desktop Table ──── */}
            <div className="hidden md:block overflow-x-auto">
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
                            <Link href={`${base}/projects/${encodeURIComponent(p.id)}`} className="font-bold text-slate-900 hover:text-sky-700 transition-colors">
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
