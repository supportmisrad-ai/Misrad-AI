'use client';

import { useState, useTransition } from 'react';
import { CustomSelect } from '@/components/CustomSelect';

type WorkOrderRow = {
  id: string;
  title: string;
  projectTitle: string | null;
  status: string;
  priority: string;
  technicianLabel: string | null;
  categoryName: string | null;
  buildingName: string | null;
  floor: string | null;
  unit: string | null;
  reporterName: string | null;
  slaDeadline: string | null;
  createdAt: string;
};

function formatStatus(status: string): string {
  switch (status) {
    case 'NEW': return 'נפתח';
    case 'OPEN': return 'פתוח';
    case 'IN_PROGRESS': return 'בטיפול';
    case 'DONE': return 'הושלם';
    default: return status;
  }
}

function formatPriority(priority: string): string {
  switch (priority) {
    case 'NORMAL': return 'רגיל';
    case 'HIGH': return 'גבוה';
    case 'URGENT': return 'דחוף';
    case 'CRITICAL': return 'קריטי';
    default: return priority;
  }
}

function formatDate(dateIso: string): string {
  try {
    return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateIso));
  } catch {
    return dateIso;
  }
}

function toCsvCell(value: string | null | undefined): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(filename: string, rows: WorkOrderRow[]) {
  const BOM = '\uFEFF';
  const headers = ['מזהה', 'כותרת', 'פרויקט', 'סטטוס', 'דחיפות', 'טכנאי', 'קטגוריה', 'מיקום', 'מדווח', 'SLA', 'תאריך יצירה'];
  const csvRows = [
    headers.join(','),
    ...rows.map((r) => {
      const location = [r.buildingName, r.floor ? `קומה ${r.floor}` : null, r.unit ? `חדר ${r.unit}` : null].filter(Boolean).join(' · ');
      return [
        toCsvCell(r.id),
        toCsvCell(r.title),
        toCsvCell(r.projectTitle),
        toCsvCell(formatStatus(r.status)),
        toCsvCell(formatPriority(r.priority)),
        toCsvCell(r.technicianLabel),
        toCsvCell(r.categoryName),
        toCsvCell(location || null),
        toCsvCell(r.reporterName),
        toCsvCell(r.slaDeadline ? formatDate(r.slaDeadline) : null),
        toCsvCell(formatDate(r.createdAt)),
      ].join(',');
    }),
  ];

  const blob = new Blob([BOM + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function WorkOrdersBulkActions({
  workOrders,
  bulkStatusAction,
}: {
  workOrders: WorkOrderRow[];
  bulkStatusAction: (ids: string[], status: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const allSelected = workOrders.length > 0 && selected.size === workOrders.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(workOrders.map((w) => w.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleBulkStatus(status: string) {
    if (selected.size === 0) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await bulkStatusAction(Array.from(selected), status);
      if (result.success) {
        setSuccess(`${selected.size} קריאות עודכנו בהצלחה`);
        setSelected(new Set());
      } else {
        setError(result.error ?? 'שגיאה בעדכון');
      }
    });
  }

  function handleExportAll() {
    downloadCsv('work-orders-all.csv', workOrders);
  }

  function handleExportSelected() {
    const rows = workOrders.filter((w) => selected.has(w.id));
    if (rows.length === 0) return;
    downloadCsv('work-orders-selected.csv', rows);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="rounded border-slate-300 text-sky-500 focus:ring-sky-200"
          />
          בחר הכל ({workOrders.length})
        </label>

        {selected.size > 0 ? (
          <span className="text-xs font-bold text-sky-600">{selected.size} נבחרו</span>
        ) : null}

        <div className="flex-1" />

        <button
          type="button"
          onClick={handleExportAll}
          className="inline-flex items-center justify-center rounded-xl h-8 px-3 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          ייצוא CSV
        </button>

        {selected.size > 0 ? (
          <>
            <button
              type="button"
              onClick={handleExportSelected}
              className="inline-flex items-center justify-center rounded-xl h-8 px-3 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              ייצוא נבחרים
            </button>
            <CustomSelect
              disabled={isPending}
              value=""
              onChange={(val) => {
                if (val) handleBulkStatus(val);
              }}
              placeholder="שנה סטטוס..."
              options={[
                { value: 'NEW', label: 'נפתח' },
                { value: 'IN_PROGRESS', label: 'בטיפול' },
                { value: 'DONE', label: 'הושלם' },
              ]}
            />
          </>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-800">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">{success}</div>
      ) : null}

      <div className="space-y-1">
        {workOrders.map((w) => (
          <label
            key={w.id}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer transition-colors ${
              selected.has(w.id) ? 'bg-sky-50 border border-sky-100' : 'hover:bg-slate-50'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(w.id)}
              onChange={() => toggle(w.id)}
              className="rounded border-slate-300 text-sky-500 focus:ring-sky-200"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-900 truncate">{w.title}</div>
              <div className="text-[11px] text-slate-500 truncate">
                {w.projectTitle ? `${w.projectTitle} · ` : ''}{formatStatus(w.status)} · {formatPriority(w.priority)}
                {w.technicianLabel ? ` · ${w.technicianLabel}` : ''}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
