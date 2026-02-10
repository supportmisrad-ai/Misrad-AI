'use server';

import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { AIService } from '@/lib/services/ai/AIService';
import { getSystemPipelineStagesForOrganizationId } from '@/lib/services/system/pipeline-stages';
import { createSystemPipelineStageForOrganizationId } from '@/lib/services/system/pipeline-stages';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import { getUnknownErrorMessageOrUnexpected } from '@/lib/shared/unknown';
import crypto from 'crypto';

export type SmartImportTargetField =
  | 'name'
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'status'
  | 'company'
  | 'source'
  | 'value'
  | 'productInterest'
  | 'installationAddress';

export type SmartImportMapping = Record<string, SmartImportTargetField | null>;

export type SmartImportRowIssue = {
  kind: 'invalid' | 'skipped';
  rowNumber: number | null;
  reason: string;
};

export type SmartImportPipelineStage = {
  key: string;
  label: string;
};

export type SmartImportCustomFieldSuggestion = {
  header: string;
  key: string;
  label: string;
};

const MAX_IMPORT_ROWS = 10000;
const MAX_ISSUES_RETURNED = 200;

type SystemLeadCreateManyRow = Prisma.SystemLeadCreateManyInput;

type SmartImportAiMappingResponse = {
  mapping: SmartImportMapping;
  suggestedCustomFields?: Array<{ header: string; label?: string }>;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function isSchemaMismatchError(error: unknown): boolean {
  const obj = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
  const code = typeof obj.code === 'string' ? String(obj.code).toUpperCase() : '';
  const message = String((obj as { message?: unknown })?.message || '').toLowerCase();
  return (
    code === 'P2021' ||
    code === 'P2022' ||
    code === '42P01' ||
    code === '42703' ||
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('column')
  );
}

function toSafeKeyFromHeader(input: string): string {
  const raw = String(input || '').trim();
  const base = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

  if (base) return base;

  const h = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 10);
  return `field_${h}`;
}

function toSafePipelineStageKeyFromValue(input: string): string {
  const raw = String(input || '').trim();
  const base = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

  if (base) return base;

  const h = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 10);
  return `stage_${h}`;
}

function normalizeStatus(value: unknown): string {
  const raw = String(value ?? '').trim();
  const v = raw.toLowerCase();

  if (!v) return 'incoming';

  if (v === 'incoming' || v === 'contacted' || v === 'meeting' || v === 'proposal' || v === 'negotiation' || v === 'won' || v === 'lost') {
    return v;
  }

  if (v.includes('won') || raw.includes('זכה') || raw.includes('סגור') || raw.includes('נסגר')) return 'won';
  if (v.includes('lost') || raw.includes('אבוד') || raw.includes('נפל')) return 'lost';
  if (raw.includes('פגישה')) return 'meeting';
  if (raw.includes('הצעה')) return 'proposal';
  if (raw.includes('מו"מ') || raw.includes('משא')) return 'negotiation';
  if (raw.includes('נוצר') || raw.includes('חדש') || raw.includes('נכנס')) return 'incoming';

  return 'incoming';
}

function coerceString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function coerceNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value).trim().replace(/,/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function getRowNumber(row: Record<string, unknown>, fallbackIndex: number): number | null {
  const v = row.__rowNumber;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string') {
    const n = Number(String(v).trim());
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return fallbackIndex + 2;
}

function normalizePhoneForDedupe(value: string): string {
  const s = String(value || '').trim();
  if (!s) return '';
  const withPlus = s.startsWith('+');
  const digits = s.replace(/[^0-9]/g, '');
  return withPlus ? `+${digits}` : digits;
}

function getPhoneVariantsForDb(phoneKey: string): string[] {
  const key = String(phoneKey || '').trim();
  if (!key) return [];
  const withPlus = key.startsWith('+');
  const digits = withPlus ? key.slice(1) : key;

  const variants = new Set<string>();
  variants.add(key);
  variants.add(digits);
  variants.add(`+${digits}`);

  if (digits.startsWith('972') && digits.length >= 11) {
    variants.add(`0${digits.slice(3)}`);
  }
  if (digits.startsWith('0') && digits.length >= 9) {
    variants.add(`972${digits.slice(1)}`);
    variants.add(`+972${digits.slice(1)}`);
  }

  return Array.from(variants).filter(Boolean);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export async function suggestSystemLeadImportMapping(params: {
  orgSlug: string;
  headers: string[];
}): Promise<
  | {
      ok: true;
      mapping: SmartImportMapping;
      provider?: string;
      model?: string;
      stages: SmartImportPipelineStage[];
      suggestedCustomFields: SmartImportCustomFieldSuggestion[];
    }
  | { ok: false; message: string }
> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    if (!orgSlug) return { ok: false, message: 'orgSlug חסר' };

    const headers = Array.isArray(params.headers)
      ? params.headers.map((h) => normalizeHeader(h)).filter(Boolean).slice(0, 200)
      : [];

    if (!headers.length) {
      return { ok: false, message: 'לא נמצאו כותרות בקובץ' };
    }

    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        const ai = AIService.getInstance();

        const stagesRaw = await getSystemPipelineStagesForOrganizationId({ organizationId });
        const stages: SmartImportPipelineStage[] = Array.isArray(stagesRaw)
          ? stagesRaw
              .map((s) => ({ key: String(s.key || '').trim(), label: String(s.label || '').trim() }))
              .filter((s) => s.key)
              .slice(0, 50)
          : [];

        const prompt = `
אתה מקבל רשימת כותרות (Headers) מקובץ CSV/Excel של לידים.
חשוב: אין לך שום נתונים מהשורות, רק שמות עמודות.

מטרתך: למפות כל כותרת לשדה יעד במערכת.

שדות יעד אפשריים:
- name
- firstName
- lastName
- phone
- email
- status
- company
- source
- value
- productInterest
- installationAddress

כללים:
- החזר JSON בלבד.
- הפלט חייב להיות אובייקט עם:
  - mapping: אובייקט שבו המפתחות הם בדיוק הכותרות כפי שהתקבלו.
    הערך לכל כותרת הוא שם שדה יעד (מהרשימה) או null אם לא ידוע.
  - suggestedCustomFields: רשימה אופציונלית של הצעות לשדות חדשים במערכת.
    השתמש בזה כאשר יש כותרות שלא ניתן למפות לשדות הקיימים.
    לכל הצעה: { "header": "<כותרת קיימת>", "label": "<שם קצר לשדה>" }
- אל תמציא כותרות שלא קיימות.

סטטוסים (Pipeline Stages) קיימים בארגון (key: label):
${stages.length ? stages.map((s) => `- ${s.key}: ${s.label || s.key}`).join('\n') : '- (לא ידוע)'}

כותרות:
${headers.map((h) => `- ${h}`).join('\n')}
`;

        const out = await ai.generateJson<SmartImportAiMappingResponse>({
          featureKey: 'system.leads.import.mapping',
          organizationId,
          prompt,
          responseSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              mapping: {
                type: 'object',
                additionalProperties: {
                  anyOf: [{ type: 'string' }, { type: 'null' }],
                },
              },
              suggestedCustomFields: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    header: { type: 'string' },
                    label: { type: 'string' },
                  },
                  required: ['header'],
                },
              },
            },
            required: ['mapping'],
          },
          meta: {
            module: 'system',
            kind: 'smart_import_mapping',
            headersCount: headers.length,
          },
        });

        const mappingRaw = (out?.result?.mapping ?? {}) as SmartImportMapping;
        const mapping: SmartImportMapping = {};
        for (const h of headers) {
          const v = mappingRaw?.[h];
          mapping[h] =
            v === 'name' ||
            v === 'firstName' ||
            v === 'lastName' ||
            v === 'phone' ||
            v === 'email' ||
            v === 'status' ||
            v === 'company' ||
            v === 'source' ||
            v === 'value' ||
            v === 'productInterest' ||
            v === 'installationAddress'
              ? v
              : null;
        }

        const suggestedRaw = Array.isArray(out?.result?.suggestedCustomFields) ? out.result.suggestedCustomFields : [];
        const suggestedByHeader = new Map<string, SmartImportCustomFieldSuggestion>();
        for (const item of suggestedRaw.slice(0, 100)) {
          const header = normalizeHeader((item as { header?: unknown })?.header);
          if (!header) continue;
          if (!headers.includes(header)) continue;
          if (mapping[header] !== null) continue;

          const label = normalizeHeader((item as { label?: unknown })?.label) || header;
          const key = toSafeKeyFromHeader(header);
          suggestedByHeader.set(header, { header, key, label });
        }

        for (const h of headers) {
          if (mapping[h] !== null) continue;
          if (suggestedByHeader.has(h)) continue;
          const key = toSafeKeyFromHeader(h);
          suggestedByHeader.set(h, { header: h, key, label: h });
        }

        const suggestedCustomFields = Array.from(suggestedByHeader.values()).slice(0, 30);

        return { ok: true, mapping, provider: out.provider, model: out.model, stages, suggestedCustomFields };
      },
      { source: 'server_actions_system_leads_import', reason: 'suggestSystemLeadImportMapping' }
    );
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessageOrUnexpected(e) };
  }
}

export async function importSystemLeadsFromFile(params: {
  orgSlug: string;
  mapping: SmartImportMapping;
  rows: Array<Record<string, unknown>>;
  originalRowCount?: number;
  createPipelineStages?: string[];
  createCustomFields?: Array<{ header: string; key: string; label?: string }>;
  enabledCustomFieldKeys?: string[];
  defaults?: {
    source?: string;
    status?: string;
  };
}): Promise<
  | {
      ok: true;
      created: number;
      skipped: number;
      invalid: number;
      issues: SmartImportRowIssue[];
      receivedRows: number;
      consideredRows: number;
      truncated: boolean;
    }
  | { ok: false; message: string }
> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    if (!orgSlug) return { ok: false, message: 'orgSlug חסר' };

    const rows = Array.isArray(params.rows) ? params.rows : [];
    if (!rows.length) return { ok: false, message: 'לא נמצאו שורות לייבוא' };

    const originalRowCountRaw = params.originalRowCount;
    const originalRowCount =
      typeof originalRowCountRaw === 'number' && Number.isFinite(originalRowCountRaw) && originalRowCountRaw > 0
        ? Math.trunc(originalRowCountRaw)
        : null;

    const receivedRows = originalRowCount && originalRowCount >= rows.length ? originalRowCount : rows.length;
    const effectiveRows = rows.slice(0, MAX_IMPORT_ROWS);
    const consideredRows = effectiveRows.length;
    const truncated = receivedRows > MAX_IMPORT_ROWS;

    const mapping = params.mapping && typeof params.mapping === 'object' ? params.mapping : {};

    const defaultSource = String(params.defaults?.source || 'import').trim() || 'import';
    const defaultStatus = normalizeStatus(params.defaults?.status || 'incoming');

    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        const now = new Date();

        const enabledCustomFieldKeys = Array.isArray(params.enabledCustomFieldKeys)
          ? params.enabledCustomFieldKeys.map((k) => String(k || '').trim()).filter(Boolean).slice(0, 50)
          : [];

        const createCustomFields = Array.isArray(params.createCustomFields)
          ? params.createCustomFields
              .map((f) => ({
                header: normalizeHeader(f?.header),
                key: String(f?.key || '').trim(),
                label: f?.label != null ? String(f.label).trim() : undefined,
              }))
              .filter((f) => f.header && f.key)
              .slice(0, 50)
          : [];

        const stagesRaw = await getSystemPipelineStagesForOrganizationId({ organizationId });
        let pipelineStages = Array.isArray(stagesRaw) ? stagesRaw : [];

        const createPipelineStages = Array.isArray(params.createPipelineStages)
          ? params.createPipelineStages
              .map((v) => String(v || '').trim())
              .filter(Boolean)
              .slice(0, 50)
          : [];

        if (createPipelineStages.length) {
          const existingKeys = new Set(pipelineStages.map((s) => String(s.key || '').trim()).filter(Boolean));
          const existingLabelToKey = new Map<string, string>();
          for (const s of pipelineStages) {
            const label = String(s.label || '').trim().toLowerCase();
            const key = String(s.key || '').trim();
            if (label && key) existingLabelToKey.set(label, key);
          }

          const maxOrder = pipelineStages.reduce((m, s) => Math.max(m, Number(s.order || 0)), 0);
          let nextOrder = maxOrder + 10;

          for (const rawValue of createPipelineStages) {
            const normalizedLabel = rawValue.toLowerCase();
            const alreadyKey = existingKeys.has(rawValue);
            const alreadyByLabel = existingLabelToKey.has(normalizedLabel);
            if (alreadyKey || alreadyByLabel) continue;

            const key = toSafePipelineStageKeyFromValue(rawValue);
            await createSystemPipelineStageForOrganizationId({
              organizationId,
              key,
              label: rawValue,
              order: nextOrder,
            });
            nextOrder += 10;
          }

          const refreshed = await getSystemPipelineStagesForOrganizationId({ organizationId });
          pipelineStages = Array.isArray(refreshed) ? refreshed : pipelineStages;
        }

        const stageKeys = new Set(pipelineStages.map((s) => String(s.key || '').trim()).filter(Boolean));
        const stageLabelToKey = new Map<string, string>();
        for (const s of pipelineStages) {
          const label = String(s.label || '').trim().toLowerCase();
          const key = String(s.key || '').trim();
          if (label && key) stageLabelToKey.set(label, key);
        }

        let invalid = 0;
        let skipped = 0;

        const issues: SmartImportRowIssue[] = [];
        let issuesTruncated = false;

        const pushIssue = (issue: SmartImportRowIssue) => {
          if (issues.length < MAX_ISSUES_RETURNED) {
            issues.push(issue);
          } else {
            issuesTruncated = true;
          }
        };

        const unshiftIssue = (issue: SmartImportRowIssue) => {
          issues.unshift(issue);
          if (issues.length > MAX_ISSUES_RETURNED) {
            issues.length = MAX_ISSUES_RETURNED;
            issuesTruncated = true;
          }
        };

        const phonesSeenInFile = new Set<string>();

        if (createCustomFields.length) {
          try {
            await prisma.systemLeadCustomFieldDefinition.createMany({
              data: createCustomFields.map((f) => ({
                organizationId,
                key: f.key,
                label: f.label ? String(f.label) : f.header,
                kind: 'string',
              })),
              skipDuplicates: true,
            });
          } catch (e: unknown) {
            if (isSchemaMismatchError(e)) {
              return { ok: false, message: 'נדרש עדכון סכמה כדי להוסיף שדות מותאמים (Custom Fields). הרץ מיגרציה ואז נסה שוב.' };
            }
            throw e;
          }
        }

        const prepared: Array<{ phoneRaw: string; phoneKey: string; phoneToStore: string; rowNumber: number | null; data: SystemLeadCreateManyRow }> = [];

        for (let i = 0; i < effectiveRows.length; i++) {
          const row = effectiveRows[i];
          const src = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          const rowNumber = getRowNumber(src, i);

          let name = '';
          let firstName = '';
          let lastName = '';
          let phone = '';
          let email = '';
          let status = '';
          let company = '';
          let source = '';
          let value: number | null = null;
          let productInterest = '';
          let installationAddress = '';

          for (const [col, target] of Object.entries(mapping)) {
            if (!target) continue;
            const cell = src[col];

            if (target === 'name') name = coerceString(cell).trim();
            if (target === 'firstName') firstName = coerceString(cell).trim();
            if (target === 'lastName') lastName = coerceString(cell).trim();
            if (target === 'phone') phone = coerceString(cell).trim();
            if (target === 'email') email = coerceString(cell).trim();
            if (target === 'status') status = coerceString(cell).trim();
            if (target === 'company') company = coerceString(cell).trim();
            if (target === 'source') source = coerceString(cell).trim();
            if (target === 'value') value = coerceNumber(cell);
            if (target === 'productInterest') productInterest = coerceString(cell).trim();
            if (target === 'installationAddress') installationAddress = coerceString(cell).trim();
          }

          const fullName = name || `${firstName} ${lastName}`.trim();

          const phoneRaw = phone.trim();
          const phoneKey = normalizePhoneForDedupe(phoneRaw);
          const phoneToStore = phoneRaw;

          if (!fullName || !phoneRaw) {
            invalid++;
            pushIssue({
              kind: 'invalid',
              rowNumber,
              reason: !fullName && !phoneRaw ? 'חסר שם וטלפון' : !fullName ? 'חסר שם' : 'חסר טלפון',
            });
            continue;
          }

          if (!phoneKey) {
            invalid++;
            pushIssue({ kind: 'invalid', rowNumber, reason: 'טלפון לא תקין' });
            continue;
          }

          if (phonesSeenInFile.has(phoneKey)) {
            skipped++;
            pushIssue({ kind: 'skipped', rowNumber, reason: 'כפילות בתוך הקובץ (טלפון חוזר)' });
            continue;
          }

          phonesSeenInFile.add(phoneKey);

          const statusRaw = String(status || '').trim();
          let normalizedStatus = '';
          let statusWasUnknown = false;
          if (!statusRaw) {
            normalizedStatus = defaultStatus;
          } else if (stageKeys.has(statusRaw)) {
            normalizedStatus = statusRaw;
          } else {
            const byLabel = stageLabelToKey.get(statusRaw.toLowerCase());
            if (byLabel) {
              normalizedStatus = byLabel;
            } else {
              const fallback = normalizeStatus(statusRaw);
              if (stageKeys.has(fallback)) normalizedStatus = fallback;
              else {
                normalizedStatus = defaultStatus;
                statusWasUnknown = true;
              }
            }
          }
          const finalSource = source || defaultSource;

          if (statusWasUnknown) {
            pushIssue({ kind: 'skipped', rowNumber, reason: `סטטוס לא מוכר: "${statusRaw}". הוגדר כ-${normalizedStatus}` });
          }

          const customFields: Record<string, Prisma.InputJsonValue> = {};
          if (enabledCustomFieldKeys.length) {
            for (const f of createCustomFields) {
              if (!enabledCustomFieldKeys.includes(f.key)) continue;
              const v = src[f.header];
              if (v == null) continue;
              const s = typeof v === 'string' ? v.trim() : v;
              if (s === '') continue;
              customFields[f.key] = s as Prisma.InputJsonValue;
            }
          }

          prepared.push({
            phoneRaw,
            phoneKey,
            phoneToStore,
            rowNumber,
            data: {
              organizationId,
              name: fullName,
              phone: phoneToStore,
              email: email || '',
              company: company || null,
              source: finalSource,
              status: normalizedStatus,
              value: value == null ? 0 : value,
              lastContact: now,
              isHot: false,
              score: 50,
              productInterest: productInterest || null,
              installationAddress: installationAddress || null,
              ...(Object.keys(customFields).length ? { customFields: customFields as Prisma.InputJsonValue } : {}),
            },
          });
        }

        if (!prepared.length) {
          if (truncated) {
            unshiftIssue({ kind: 'skipped', rowNumber: null, reason: `הייבוא הוגבל ל-${MAX_IMPORT_ROWS.toLocaleString()} שורות (נמצאו ${receivedRows.toLocaleString()})` });
          }

          if (issuesTruncated) {
            unshiftIssue({ kind: 'skipped', rowNumber: null, reason: `פירוט שורות מוגבל ל-${MAX_ISSUES_RETURNED.toLocaleString()} פריטים` });
          }

          return { ok: true, created: 0, skipped, invalid, issues, receivedRows, consideredRows, truncated };
        }

        const createdCount = await prisma.$transaction(async (tx) => {
          const candidates = new Set<string>();
          for (const p of prepared) {
            for (const v of getPhoneVariantsForDb(p.phoneKey)) {
              candidates.add(v);
            }
            if (p.phoneRaw) candidates.add(p.phoneRaw);
          }

          const uniquePhones = Array.from(candidates).filter(Boolean);
          const existingPhones = new Set<string>();

          for (const chunk of chunkArray(uniquePhones, 500)) {
            const found = await tx.systemLead.findMany({
              where: {
                organizationId,
                phone: { in: chunk },
              },
              select: { phone: true },
            });
            for (const f of found) existingPhones.add(String(f.phone));
          }

          const dataToCreate: SystemLeadCreateManyRow[] = [];
          for (const p of prepared) {
            const rowVariants = new Set<string>([p.phoneRaw, p.phoneToStore, ...getPhoneVariantsForDb(p.phoneKey)].filter(Boolean));
            let isDup = false;
            for (const v of rowVariants) {
              if (existingPhones.has(v)) {
                isDup = true;
                break;
              }
            }

            if (isDup) {
              skipped++;
              pushIssue({ kind: 'skipped', rowNumber: p.rowNumber, reason: 'כפילות מול מערכת קיימת (טלפון כבר קיים)' });
              continue;
            }
            dataToCreate.push(p.data);
          }

          if (!dataToCreate.length) return 0;

          const created = await tx.systemLead.createMany({
            data: dataToCreate,
            skipDuplicates: true,
          });
          return created.count;
        });

        if (truncated) {
          unshiftIssue({ kind: 'skipped', rowNumber: null, reason: `הייבוא הוגבל ל-${MAX_IMPORT_ROWS.toLocaleString()} שורות (נמצאו ${receivedRows.toLocaleString()})` });
        }

        if (issuesTruncated) {
          unshiftIssue({ kind: 'skipped', rowNumber: null, reason: `פירוט שורות מוגבל ל-${MAX_ISSUES_RETURNED.toLocaleString()} פריטים` });
        }

        return {
          ok: true,
          created: createdCount,
          skipped,
          invalid,
          issues,
          receivedRows,
          consideredRows,
          truncated,
        };
      },
      { source: 'server_actions_system_leads_import', reason: 'importSystemLeadsFromFile' }
    );
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessageOrUnexpected(e) };
  }
}
