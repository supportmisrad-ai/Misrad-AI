'use client';

import { useState } from 'react';
import { FileUp } from 'lucide-react';
import SmartImportProjectsDialog from './SmartImportProjectsDialog';

export default function ProjectsImportButton({ orgSlug }: { orgSlug: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-xl h-9 px-4 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all duration-150 gap-1.5"
      >
        <FileUp size={14} />
        ייבוא מקובץ
      </button>
      <SmartImportProjectsDialog
        orgSlug={orgSlug}
        open={open}
        onCloseAction={() => setOpen(false)}
      />
    </>
  );
}
