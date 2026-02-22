'use client';

import { Download, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function arrayToCsv(headers: string[], rows: string[][]): string {
  const bom = '\uFEFF';
  const headerLine = headers.map(escapeCsvField).join(',');
  const bodyLines = rows.map((row) => row.map(escapeCsvField).join(','));
  return bom + [headerLine, ...bodyLines].join('\n');
}

// ──── Work Orders Export ────

type WorkOrderRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectTitle: string | null;
  technicianLabel: string | null;
  categoryName: string | null;
  buildingName: string | null;
  createdAt: string;
  completedAt: string | null;
};

export function ExportWorkOrdersCsvButton({
  workOrders,
  filename,
}: {
  workOrders: WorkOrderRow[];
  filename?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(() => {
    setLoading(true);
    try {
      const statusLabel = (s: string) =>
        s === 'NEW' ? 'חדשה' : s === 'OPEN' ? 'פתוחה' : s === 'IN_PROGRESS' ? 'בטיפול' : s === 'DONE' ? 'הושלמה' : s;
      const priorityLabel = (p: string) =>
        p === 'NORMAL' ? 'רגיל' : p === 'HIGH' ? 'גבוה' : p === 'URGENT' ? 'דחוף' : p === 'CRITICAL' ? 'קריטי' : p;

      const headers = ['מזהה', 'כותרת', 'סטטוס', 'עדיפות', 'פרויקט', 'טכנאי', 'קטגוריה', 'מבנה', 'נוצר', 'הושלם'];
      const rows = workOrders.map((wo) => [
        wo.id,
        wo.title,
        statusLabel(wo.status),
        priorityLabel(wo.priority),
        wo.projectTitle || '',
        wo.technicianLabel || '',
        wo.categoryName || '',
        wo.buildingName || '',
        wo.createdAt ? new Date(wo.createdAt).toLocaleDateString('he-IL') : '',
        wo.completedAt ? new Date(wo.completedAt).toLocaleDateString('he-IL') : '',
      ]);

      const csv = arrayToCsv(headers, rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, filename || `work-orders-${new Date().toISOString().split('T')[0]}.csv`);
    } finally {
      setLoading(false);
    }
  }, [workOrders, filename]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading || !workOrders.length}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      ייצוא CSV
    </button>
  );
}

// ──── Inventory Export ────

type InventoryRow = {
  id: string;
  itemName: string;
  sku: string | null;
  onHand: number;
  minLevel: number;
};

export function ExportInventoryCsvButton({
  items,
  filename,
}: {
  items: InventoryRow[];
  filename?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(() => {
    setLoading(true);
    try {
      const headers = ['מזהה', 'שם פריט', 'מק"ט', 'כמות במלאי', 'כמות מינימום', 'מלאי נמוך'];
      const rows = items.map((i) => [
        i.id,
        i.itemName,
        i.sku || '',
        String(i.onHand),
        String(i.minLevel),
        i.minLevel > 0 && i.onHand < i.minLevel ? 'כן' : 'לא',
      ]);

      const csv = arrayToCsv(headers, rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, filename || `inventory-${new Date().toISOString().split('T')[0]}.csv`);
    } finally {
      setLoading(false);
    }
  }, [items, filename]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading || !items.length}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      ייצוא CSV
    </button>
  );
}
