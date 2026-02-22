import Link from 'next/link';

import { getOperationsProjectById, getOperationsClientOptions, updateOperationsProject } from '@/app/actions/operations';
import ProjectDetailClient from '@/components/operations/ProjectDetailClient';

export default async function OperationsProjectDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }> | { orgSlug: string; id: string };
}) {
  const { orgSlug, id } = await params;
  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;

  const [projectRes, clientOptionsRes] = await Promise.all([
    getOperationsProjectById({ orgSlug, id }),
    getOperationsClientOptions({ orgSlug }),
  ]);

  if (!projectRes.success || !projectRes.data) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <section className="bg-white/80 backdrop-blur rounded-[1.5rem] border border-rose-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-rose-100">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-rose-800">שגיאה</div>
              <Link
                href={`${base}/projects`}
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-bold bg-white/80 border border-rose-200 hover:bg-white transition-colors"
              >
                חזרה
              </Link>
            </div>
          </div>
          <div className="p-5 text-sm text-rose-800">{projectRes.error || 'פרויקט לא נמצא'}</div>
        </section>
      </div>
    );
  }

  const clientOptions = clientOptionsRes.success
    ? (clientOptionsRes.data ?? []).map((c) => ({ id: c.id, label: c.label }))
    : [];

  async function handleUpdate(updateParams: {
    title?: string;
    status?: string;
    canonicalClientId?: string | null;
    installationAddress?: string | null;
  }) {
    'use server';
    return await updateOperationsProject({
      orgSlug,
      id,
      ...updateParams,
    });
  }

  return (
    <ProjectDetailClient
      base={base}
      project={projectRes.data}
      clientOptions={clientOptions}
      updateAction={handleUpdate}
    />
  );
}
