'use client';

import React, { useState, useRef, useTransition } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { importInventoryFromCsv } from '@/app/actions/operations';
import { useRouter } from 'next/navigation';

interface ParsedRow {
  name: string;
  sku?: string;
  unit?: string;
  minLevel?: number;
  onHand?: number;
}

function parseCsvText(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase();
  const sep = headerLine.includes('\t') ? '\t' : ',';
  const headers = headerLine.split(sep).map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'שם' || h === 'שם פריט');
  const skuIdx = headers.findIndex((h) => h === 'sku' || h === 'מקט' || h === 'מק"ט');
  const unitIdx = headers.findIndex((h) => h === 'unit' || h === 'יחידה');
  const minIdx = headers.findIndex((h) => h === 'minlevel' || h === 'min' || h === 'מינימום' || h === 'כמות מינימום');
  const onHandIdx = headers.findIndex((h) => h === 'onhand' || h === 'qty' || h === 'כמות' || h === 'כמות במלאי');

  if (nameIdx === -1) return [];

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const name = cols[nameIdx] || '';
    if (!name) continue;
    rows.push({
      name,
      sku: skuIdx >= 0 ? cols[skuIdx] || undefined : undefined,
      unit: unitIdx >= 0 ? cols[unitIdx] || undefined : undefined,
      minLevel: minIdx >= 0 ? Number(cols[minIdx]) || undefined : undefined,
      onHand: onHandIdx >= 0 ? Number(cols[onHandIdx]) || undefined : undefined,
    });
  }
  return rows;
}

export function InventoryCsvImport({ orgSlug }: { orgSlug: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<{ imported?: number; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        const rows = parseCsvText(text);
        setParsed(rows);
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleImport() {
    if (!parsed.length) return;
    startTransition(async () => {
      const res = await importInventoryFromCsv({ orgSlug, rows: parsed });
      if (res.success) {
        setResult({ imported: res.imported });
        setParsed([]);
        setFileName('');
        router.refresh();
      } else {
        setResult({ error: res.error || 'שגיאה בייבוא' });
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl h-9 px-4 text-xs font-bold text-slate-600 bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all duration-150"
      >
        <Upload size={14} />
        ייבוא CSV
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-sky-600" />
          <div className="text-sm font-black text-slate-900">ייבוא מלאי מקובץ CSV</div>
        </div>
        <button type="button" onClick={() => { setIsOpen(false); setParsed([]); setResult(null); }} className="text-xs text-slate-500 hover:text-slate-700">
          סגור
        </button>
      </div>

      <div className="text-xs text-slate-500 leading-relaxed">
        הקובץ חייב לכלול עמודת <strong>name</strong> (או &quot;שם פריט&quot;). עמודות אופציונליות: <strong>sku</strong>, <strong>unit</strong>, <strong>minLevel</strong>, <strong>onHand</strong>.
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.tsv,.txt"
        onChange={handleFile}
        className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 file:transition-colors file:cursor-pointer"
      />

      {fileName && parsed.length > 0 ? (
        <div className="space-y-3">
          <div className="text-xs font-bold text-emerald-700">
            נמצאו {parsed.length} פריטים בקובץ &quot;{fileName}&quot;
          </div>
          <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1">
            {parsed.slice(0, 10).map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="font-bold text-slate-800">{r.name}</span>
                {r.sku ? <span className="text-slate-500">מק&quot;ט: {r.sku}</span> : null}
                {r.onHand !== undefined ? <span className="text-slate-500">כמות: {r.onHand}</span> : null}
              </div>
            ))}
            {parsed.length > 10 ? <div className="text-slate-400">...ועוד {parsed.length - 10} פריטים</div> : null}
          </div>
          <button
            type="button"
            onClick={handleImport}
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isPending ? 'מייבא...' : `ייבא ${parsed.length} פריטים`}
          </button>
        </div>
      ) : fileName && parsed.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-amber-700">
          <AlertTriangle size={14} />
          <span>לא נמצאו פריטים. ודא שהקובץ כולל עמודת &quot;name&quot; או &quot;שם פריט&quot; בשורה הראשונה.</span>
        </div>
      ) : null}

      {result?.imported ? (
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
          <CheckCircle2 size={16} />
          <span>יובאו {result.imported} פריטים בהצלחה!</span>
        </div>
      ) : null}

      {result?.error ? (
        <div className="text-sm text-rose-700 font-bold">{result.error}</div>
      ) : null}
    </div>
  );
}
