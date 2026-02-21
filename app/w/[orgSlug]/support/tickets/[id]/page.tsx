import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { SupportTicketDetailClient } from './SupportTicketDetailClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }> | { orgSlug: string; id: string };
}) {
  const resolvedParams = await params;
  const { orgSlug, id } = resolvedParams;

  await requireWorkspaceAccessByOrgSlug(orgSlug);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link
            href={`/w/${encodeURIComponent(orgSlug)}/support#my-tickets`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/70 border border-white/60 text-slate-700 font-black hover:bg-white transition-all"
          >
            <ArrowRight size={16} />
            חזרה לתמיכה
          </Link>
        </div>

        <SupportTicketDetailClient orgSlug={orgSlug} ticketId={id} />
      </div>
    </div>
  );
}
