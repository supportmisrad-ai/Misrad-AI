'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileUp, Loader2, Sparkles, X } from 'lucide-react';
import { CustomSelect } from '@/components/CustomSelect';
import {
  suggestSystemLeadImportMapping,
  importSystemLeadsFromFile,
  type SmartImportCustomFieldSuggestion,
  type SmartImportMapping,
  type SmartImportPipelineStage,
  type SmartImportTargetField,
} from '@/app/actions/system-leads-import';
import { getErrorMessage } from '@/lib/shared/unknown';

type Step = 'upload' | 'analyzing' | 'review' | 'importing' | 'done';

const MAX_IMPORT_ROWS = 10000;

const TARGET_FIELDS: Array<{ id: SmartImportTargetField; label: string }> = [
  { id: 'name', label: 'Name (שם מלא)' },
  { id: 'firstName', label: 'First Name' },
  { id: 'lastName', label: 'Last Name' },
  { id: 'phone', label: 'Phone' },
  { id: 'email', label: 'Email' },
  { id: 'status', label: 'Status' },
  { id: 'company', label: 'Company' },
  { id: 'source', label: 'Source' },
  { id: 'value', label: 'Value' },
  { id: 'productInterest', label: 'Product Interest' },
  { id: 'installationAddress', label: 'Installation Address' },
];

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function sanitizeCell(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : value.toISOString();
  }
  return String(value);
}

function coerceString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export default function SmartImportLeadsDialog(props: {
  orgSlug: string;
  open: boolean;
  onCloseAction: () => void;
  onImportedAction?: (result: { created: number; skipped: number; invalid: number }) => void;
}) {
  const { orgSlug, open, onCloseAction, onImportedAction } = props;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>('upload');
  const [isDragging, setIsDragging] = useState(false);

  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [totalRowsInFile, setTotalRowsInFile] = useState<number>(0);

  const [mapping, setMapping] = useState<SmartImportMapping>({});
  const [aiMeta, setAiMeta] = useState<{ provider?: string; model?: string } | null>(null);

  const [existingStages, setExistingStages] = useState<SmartImportPipelineStage[]>([]);

  const [suggestedCustomFields, setSuggestedCustomFields] = useState<SmartImportCustomFieldSuggestion[]>([]);
  const [enabledCustomFieldKeys, setEnabledCustomFieldKeys] = useState<string[]>([]);
  const [selectedNewStatuses, setSelectedNewStatuses] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number; invalid: number } | null>(null);
  const [issues, setIssues] = useState<Array<{ kind: 'invalid' | 'skipped'; rowNumber: number | null; reason: string }>>([]);
  const [truncationMeta, setTruncationMeta] = useState<{ receivedRows: number; consideredRows: number; truncated: boolean } | null>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setIsDragging(false);
    setFileName('');
    setHeaders([]);
    setRows([]);
    setTotalRowsInFile(0);
    setMapping({});
    setAiMeta(null);
    setExistingStages([]);
    setSuggestedCustomFields([]);
    setEnabledCustomFieldKeys([]);
    setSelectedNewStatuses([]);
    setError(null);
    setResult(null);
    setIssues([]);
    setTruncationMeta(null);
  }, []);

  const closeAndReset = useCallback(() => {
    reset();
    onCloseAction();
  }, [onCloseAction, reset]);

  const mappingIsValid = useMemo(() => {
    const targets = new Set(Object.values(mapping).filter(Boolean));
    const hasPhone = targets.has('phone');
    const hasName = targets.has('name') || targets.has('firstName') || targets.has('lastName');
    return hasPhone && hasName;
  }, [mapping]);

  const rowsPreview = useMemo(() => {
    if (!rows.length) return {} as Record<string, string>;
    const first = rows[0] || {};
    const out: Record<string, string> = {};
    for (const h of headers) {
      const v = first[h];
      const s = v == null ? '' : String(v);
      out[h] = s.length > 48 ? `${s.slice(0, 48)}…` : s;
    }
    return out;
  }, [rows, headers]);

  const mappedPreviewRows = useMemo(() => {
    const effectiveRows = Array.isArray(rows) ? rows : [];
    const effectiveHeaders = Array.isArray(headers) ? headers : [];

    const headerFor = (target: SmartImportTargetField) => {
      for (const h of effectiveHeaders) {
        if (mapping[h] === target) return h;
      }
      return null;
    };

    const headerName = headerFor('name');
    const headerFirstName = headerFor('firstName');
    const headerLastName = headerFor('lastName');
    const headerPhone = headerFor('phone');
    const headerStatus = headerFor('status');
    const headerCompany = headerFor('company');
    const headerValue = headerFor('value');

    const preview: Array<{ idx: number; name: string; phone: string; status: string; company: string; value: string }> = [];
    for (let i = 0; i < Math.min(6, effectiveRows.length); i++) {
      const r = effectiveRows[i] || {};
      const get = (h: string | null) => (h ? r?.[h] : null);

      const name = headerName
        ? coerceString(get(headerName)).trim()
        : `${coerceString(get(headerFirstName)).trim()} ${coerceString(get(headerLastName)).trim()}`.trim();
      const phone = coerceString(get(headerPhone)).trim();
      const status = coerceString(get(headerStatus)).trim();
      const company = coerceString(get(headerCompany)).trim();
      const valueRaw = get(headerValue);
      const value = valueRaw == null || String(valueRaw).trim() === '' ? '' : String(valueRaw);

      preview.push({ idx: i + 1, name, phone, status, company, value });
    }

    return preview;
  }, [rows, headers, mapping]);

  const statusCandidatesToCreate = useMemo(() => {
    const statusHeaders = Object.entries(mapping)
      .filter(([, target]) => target === 'status')
      .map(([h]) => h)
      .filter(Boolean);

    if (!statusHeaders.length || !rows.length) return [] as string[];

    const stageKeySet = new Set(existingStages.map((s) => String(s.key || '').trim().toLowerCase()).filter(Boolean));
    const stageLabelSet = new Set(existingStages.map((s) => String(s.label || '').trim().toLowerCase()).filter(Boolean));

    const uniq = new Map<string, string>();
    for (const row of rows) {
      for (const h of statusHeaders) {
        const raw = row?.[h];
        const v = String(raw ?? '').trim();
        if (!v) continue;
        const k = v.toLowerCase();
        if (uniq.has(k)) continue;
        uniq.set(k, v);
      }
      if (uniq.size >= 50) break;
    }

    const candidates: string[] = [];
    for (const v of uniq.values()) {
      const k = v.toLowerCase();
      if (stageKeySet.has(k) || stageLabelSet.has(k)) continue;
      candidates.push(v);
    }
    return candidates.slice(0, 30);
  }, [rows, mapping, existingStages]);

  useEffect(() => {
    setSelectedNewStatuses((prev) => {
      const prevSet = new Set(prev);
      const next: string[] = [];
      for (const v of statusCandidatesToCreate) {
        if (prevSet.size === 0) {
          next.push(v);
        } else if (prevSet.has(v)) {
          next.push(v);
        } else {
          next.push(v);
        }
      }
      if (prevSet.size === 0) return next;
      const currentCandidateSet = new Set(statusCandidatesToCreate);
      const kept = prev.filter((v) => currentCandidateSet.has(v));
      const keptSet = new Set(kept);
      for (const v of statusCandidatesToCreate) {
        if (!keptSet.has(v)) kept.push(v);
      }
      return kept;
    });
  }, [statusCandidatesToCreate]);

  const parseFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setStep('analyzing');

    const ext = String(file.name.split('.').pop() || '').toLowerCase();

    const xlsx = await import('xlsx');

    const wb =
      ext === 'csv'
        ? xlsx.read(await file.text(), { type: 'string' })
        : xlsx.read(await file.arrayBuffer(), { type: 'array' });

    const sheetName = wb.SheetNames?.[0];
    if (!sheetName) {
      throw new Error('לא נמצא גיליון בקובץ');
    }

    const sheet = wb.Sheets[sheetName];
    const matrix = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    }) as unknown[][];

    const rawHeaders = Array.isArray(matrix?.[0]) ? matrix[0] : [];
    const normalizedHeaders = rawHeaders.map(normalizeHeader);
    const validHeaderIndices = normalizedHeaders.reduce<number[]>((acc, h, i) => { if (h) acc.push(i); return acc; }, []);
    const filteredHeaders = validHeaderIndices.map((i) => normalizedHeaders[i]);

    if (!filteredHeaders.length) {
      throw new Error('לא נמצאו כותרות בשורה הראשונה');
    }

    const body = matrix.slice(1);
    const parsedRows: Array<Record<string, unknown>> = [];

    for (let i = 0; i < body.length; i++) {
      const r = body[i];
      if (!Array.isArray(r)) continue;
      const obj: Record<string, unknown> = {};
      let any = false;
      for (const j of validHeaderIndices) {
        const header = normalizedHeaders[j];
        const cell = sanitizeCell(r[j]);
        if (cell != null && String(cell).trim() !== '') any = true;
        obj[header] = cell;
      }

      obj.__rowNumber = i + 2;
      if (any) parsedRows.push(obj);
    }

    setTotalRowsInFile(parsedRows.length);
    const limitedRows = parsedRows.slice(0, MAX_IMPORT_ROWS);

    setHeaders(filteredHeaders);
    setRows(limitedRows);

    const suggested = await suggestSystemLeadImportMapping({
      orgSlug,
      headers: filteredHeaders,
    });

    if (!suggested.ok) {
      throw new Error(suggested.message || 'שגיאה במיפוי כותרות');
    }

    setAiMeta({ provider: suggested.provider, model: suggested.model });
    setMapping(suggested.mapping);
    setExistingStages(Array.isArray(suggested.stages) ? suggested.stages : []);
    setSuggestedCustomFields(Array.isArray(suggested.suggestedCustomFields) ? suggested.suggestedCustomFields : []);
    setEnabledCustomFieldKeys(
      Array.isArray(suggested.suggestedCustomFields)
        ? suggested.suggestedCustomFields.map((f) => String(f.key || '').trim()).filter(Boolean)
        : []
    );
    setStep('review');
  }, [orgSlug]);

  const handlePickFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await parseFile(file);
      } catch (err: unknown) {
        setStep('upload');
        setError(getErrorMessage(err) || 'שגיאה בקריאת הקובץ');
      } finally {
        e.target.value = '';
      }
    },
    [parseFile]
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      try {
        await parseFile(file);
      } catch (err: unknown) {
        setStep('upload');
        setError(getErrorMessage(err) || 'שגיאה בקריאת הקובץ');
      }
    },
    [parseFile]
  );

  const handleConfirmImport = useCallback(async () => {
    if (!mappingIsValid) {
      setError('חובה למפות לפחות שם + טלפון');
      return;
    }
    if (!rows.length) {
      setError('אין שורות לייבוא');
      return;
    }

    setError(null);
    setStep('importing');

    try {
      const approvedCustomFields = suggestedCustomFields.filter((f) => enabledCustomFieldKeys.includes(f.key));
      const approvedStatusValues = statusCandidatesToCreate.filter((v) => selectedNewStatuses.includes(v));

      const res = await importSystemLeadsFromFile({
        orgSlug,
        mapping,
        rows,
        originalRowCount: totalRowsInFile,
        createPipelineStages: approvedStatusValues,
        createCustomFields: approvedCustomFields.map((f) => ({ header: f.header, key: f.key, label: f.label })),
        enabledCustomFieldKeys: approvedCustomFields.map((f) => f.key),
        defaults: {
          source: 'import',
          status: 'חדש',
        },
      });

      if (!res.ok) {
        throw new Error(res.message || 'שגיאה בייבוא');
      }

      setResult({ created: res.created, skipped: res.skipped, invalid: res.invalid });
      setIssues(res.issues || []);
      setTruncationMeta({
        receivedRows: res.receivedRows,
        consideredRows: res.consideredRows,
        truncated: res.truncated,
      });
      setStep('done');
      onImportedAction?.({ created: res.created, skipped: res.skipped, invalid: res.invalid });
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'שגיאה בייבוא');
      setStep('review');
    }
  }, [mappingIsValid, rows.length, orgSlug, mapping, rows, onImportedAction, suggestedCustomFields, enabledCustomFieldKeys, statusCandidatesToCreate, selectedNewStatuses, totalRowsInFile]);

  const handleChangeMapping = useCallback((header: string, value: string) => {
    const next = value === '' ? null : (value as SmartImportTargetField);
    setMapping((prev) => ({ ...prev, [header]: next }));
  }, []);

  const toggleCustomFieldKey = useCallback((key: string) => {
    setEnabledCustomFieldKeys((prev) => {
      const k = String(key || '').trim();
      if (!k) return prev;
      return prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
    });
  }, []);

  const toggleNewStatus = useCallback((value: string) => {
    setSelectedNewStatuses((prev) => {
      const v = String(value || '').trim();
      if (!v) return prev;
      return prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v];
    });
  }, []);

  const stop = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" dir="rtl" onClick={closeAndReset}>
      <div
        className="w-full max-w-4xl max-h-[90dvh] bg-white rounded-t-3xl md:rounded-3xl border border-slate-200 shadow-2xl overflow-y-auto"
        onClick={stop}
      >
        <div className="sticky top-0 z-10 p-6 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50 rounded-t-3xl">
          <div className="min-w-0">
            <div className="text-xl font-black text-slate-900">ייבוא חכם: לידים</div>
            <div className="text-xs text-slate-500 font-bold mt-1">
              ל-AI נשלחות רק הכותרות. נתוני השורות נשארים בדפדפן עד האישור.
            </div>
          </div>
          <button
            type="button"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            onClick={closeAndReset}
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="px-6 pt-5">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm font-bold">
              {error}
            </div>
          </div>
        ) : null}

        {step === 'analyzing' ? (
          <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin" />
            </div>
            <div className="text-lg font-black text-slate-900">מנתח את הקובץ...</div>
            <div className="text-sm font-bold text-slate-500">קורא את הנתונים ומתאים שדות אוטומטית</div>
            {fileName ? <div className="text-xs font-mono text-slate-400">{fileName}</div> : null}
          </div>
        ) : null}

        {step === 'upload' ? (
          <div className="p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileInputChange}
            />

            <div
              className={`rounded-3xl border-2 border-dashed p-10 text-center transition-colors ${
                isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
            >
              <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                <FileUp size={26} />
              </div>
              <div className="mt-5 text-lg font-black text-slate-900">גרור קובץ CSV/Excel לכאן</div>
              <div className="mt-2 text-sm font-bold text-slate-500">או לחץ לבחירה ידנית</div>
              <button
                type="button"
                onClick={handlePickFile}
                className="mt-6 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl text-sm font-black"
              >
                <FileUp size={16} /> בחר קובץ
              </button>
            </div>
          </div>
        ) : null}

        {step === 'review' ? (
          <div className="p-6 space-y-5">
            <div className="rounded-3xl border border-indigo-200 bg-indigo-50 px-5 py-4">
              <div className="text-sm font-black text-indigo-900">ה-AI שלנו ניתח את הקובץ והתאים את השדות למערכת.</div>
              <div className="mt-1 text-xs font-bold text-indigo-900/80">אנא אשר את הדיוק לפני הייבוא. ניתן לערוך מיפוי ידנית.</div>
              {(suggestedCustomFields.length || statusCandidatesToCreate.length) ? (
                <div className="mt-2 text-xs font-bold text-indigo-900/80">אם זוהו שדות/סטטוסים שלא קיימים בארגון, תוכל ליצור אותם כאן לפני הייבוא.</div>
              ) : null}
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm font-black text-slate-700">
                קובץ: <span className="font-mono">{fileName || '—'}</span>
                <span className="text-slate-400"> · </span>
                {rows.length.toLocaleString()} שורות{totalRowsInFile > rows.length ? ` מתוך ${totalRowsInFile.toLocaleString()}` : ''}
                <span className="text-slate-400"> · </span>
                {headers.length} עמודות
              </div>
              <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-600" />
                {aiMeta?.provider ? `AI: ${aiMeta.provider}` : 'AI'}
                {aiMeta?.model ? ` (${aiMeta.model})` : ''}
              </div>
            </div>

            {totalRowsInFile > MAX_IMPORT_ROWS ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm font-black">
                הקובץ מכיל {totalRowsInFile.toLocaleString()} שורות. בגרסה הנוכחית נייבא רק את
                {` ${MAX_IMPORT_ROWS.toLocaleString()}`} הראשונות.
              </div>
            ) : null}

            <div className="rounded-3xl border border-slate-200 overflow-hidden">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900 text-white">
                    <tr>
                      <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider">עמודה בקובץ</th>
                      <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider">מיפוי לשדה במערכת</th>
                      <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider">דוגמה (שורה 1)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {headers.map((h) => (
                      <tr key={h} className="bg-white hover:bg-slate-50">
                        <td className="px-4 py-3 font-black text-slate-800">{h}</td>
                        <td className="px-4 py-3">
                          <CustomSelect
                            value={mapping[h] ?? ''}
                            onChange={(val) => handleChangeMapping(h, val)}
                            placeholder="התעלם"
                            options={TARGET_FIELDS.map((f) => ({ value: f.id, label: f.label }))}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-bold" dir="ltr">
                          {rowsPreview[h] != null && rowsPreview[h] !== '' ? rowsPreview[h] : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {mappedPreviewRows.length ? (
              <div className="rounded-3xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="text-sm font-black text-slate-900">תצוגה מקדימה (לפי המיפוי הנוכחי)</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">מציג עד 6 שורות ראשונות</div>
                </div>
                <div className="max-h-[260px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-900 text-white">
                      <tr>
                        <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider">#</th>
                        <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider">שם</th>
                        <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider">טלפון</th>
                        <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider">סטטוס</th>
                        <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider">חברה</th>
                        <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider">שווי</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mappedPreviewRows.map((r) => (
                        <tr key={r.idx} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">{r.idx}</td>
                          <td className="px-4 py-3 font-black text-slate-800">{r.name || '—'}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-600" dir="ltr">{r.phone || '—'}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-600">{r.status || '—'}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-600">{r.company || '—'}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-600">{r.value || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {suggestedCustomFields.length || statusCandidatesToCreate.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestedCustomFields.length ? (
                  <div className="rounded-3xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-900">שדות חדשים (Custom Fields)</div>
                          <div className="mt-1 text-xs font-bold text-slate-500">סמן מה תרצה ליצור ולהכניס מהקובץ</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black"
                            onClick={() => setEnabledCustomFieldKeys(suggestedCustomFields.map((f) => f.key))}
                          >
                            בחר הכל
                          </button>
                          <button
                            type="button"
                            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black"
                            onClick={() => setEnabledCustomFieldKeys([])}
                          >
                            נקה
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {suggestedCustomFields.map((f) => (
                        <label
                          key={f.key}
                          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={enabledCustomFieldKeys.includes(f.key)}
                            onChange={() => toggleCustomFieldKey(f.key)}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-black text-slate-900">{f.label || f.header}</div>
                            <div className="mt-1 text-xs font-bold text-slate-500">
                              מקור: <span className="font-mono">{f.header}</span>
                            </div>
                            <div className="mt-1 text-[11px] font-bold text-slate-400">
                              key: <span className="font-mono">{f.key}</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="text-sm font-black text-slate-900">שדות חדשים (Custom Fields)</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">לא נמצאו הצעות</div>
                  </div>
                )}

                {statusCandidatesToCreate.length ? (
                  <div className="rounded-3xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-900">סטטוסים חדשים</div>
                          <div className="mt-1 text-xs font-bold text-slate-500">זוהו ערכים בקובץ שאינם קיימים ב-Pipeline</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black"
                            onClick={() => setSelectedNewStatuses(statusCandidatesToCreate)}
                          >
                            בחר הכל
                          </button>
                          <button
                            type="button"
                            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black"
                            onClick={() => setSelectedNewStatuses([])}
                          >
                            נקה
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {statusCandidatesToCreate.map((v) => (
                        <label
                          key={v}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={selectedNewStatuses.includes(v)}
                            onChange={() => toggleNewStatus(v)}
                          />
                          <div className="text-sm font-black text-slate-900">{v}</div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="text-sm font-black text-slate-900">סטטוסים חדשים</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">לא נמצאו הצעות</div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-xs font-bold text-slate-500">
                {mappingIsValid ? 'מוכן לייבוא' : 'חסר מיפוי חובה: שם + טלפון'}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-slate-50"
                  onClick={reset}
                >
                  בחר קובץ אחר
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 ${
                    mappingIsValid ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  onClick={() => void handleConfirmImport()}
                  disabled={!mappingIsValid}
                >
                  אשר וייבא
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 'importing' ? (
          <div className="p-10 flex items-center justify-center gap-3 text-slate-700 font-black">
            <Loader2 className="animate-spin" size={22} />
            מייבא נתונים...
          </div>
        ) : null}

        {step === 'done' ? (
          <div className="p-6 space-y-5">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <div className="text-lg font-black text-emerald-900">הייבוא הושלם</div>
              <div className="mt-2 text-sm font-black text-emerald-800">
                נוצרו: {result?.created ?? 0} · נפסלו: {result?.invalid ?? 0} · דולגו: {result?.skipped ?? 0}
              </div>
              {truncationMeta?.truncated ? (
                <div className="mt-2 text-xs font-black text-emerald-900/80">
                  יובאו {truncationMeta.consideredRows.toLocaleString()} מתוך {truncationMeta.receivedRows.toLocaleString()} שורות (מגבלת {MAX_IMPORT_ROWS.toLocaleString()}).
                </div>
              ) : null}
            </div>

            {issues.length ? (
              <div className="rounded-3xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="text-sm font-black text-slate-900">פירוט שורות שנפסלו/דולגו</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">מציג עד 200 פריטים ראשונים</div>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-900 text-white">
                      <tr>
                        <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider">סוג</th>
                        <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider">שורה</th>
                        <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider">סיבה</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {issues.slice(0, 200).map((it, idx) => (
                        <tr key={`${it.kind}-${it.rowNumber ?? 'na'}-${idx}`} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-3 font-black text-slate-800">{it.kind === 'invalid' ? 'נפסל' : 'דולג'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{it.rowNumber ?? '—'}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-600">{it.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-black"
                onClick={closeAndReset}
              >
                סגור
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
