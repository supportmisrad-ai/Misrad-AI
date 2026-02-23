'use server';

import prisma from '@/lib/prisma';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import { getUnknownErrorMessageOrUnexpected } from '@/lib/shared/unknown';
import crypto from 'crypto';

const MAX_IMPORT_ROWS = 10000;

export type SmartImportTaskTargetField =
  | 'title'
  | 'description'
  | 'status'
  | 'priority'
  | 'assignee'
  | 'dueDate'
  | 'tags';

export type SmartImportTaskMapping = Record<string, SmartImportTaskTargetField | null>;

export type SmartImportTaskCustomFieldSuggestion = {
  header: string;
  key: string;
  label: string;
};

function toSafeKeyFromHeader(input: string): string {
  const raw = String(input || '').trim();
  const base = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  if (base) return base;
  const h = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 10);
  return `field_${h}`;
}

function coerceString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export async function suggestTaskImportMapping(params: {
  orgSlug: string;
  headers: string[];
}): Promise<
  | {
      ok: true;
      mapping: SmartImportTaskMapping;
      suggestedCustomFields: SmartImportTaskCustomFieldSuggestion[];
      provider?: string;
      model?: string;
    }
  | { ok: false; message: string }
> {
  return withWorkspaceTenantContext(params.orgSlug, async () => {
    try {
      const { headers } = params;

      const mapping: SmartImportTaskMapping = {};
      const suggestedCustomFields: SmartImportTaskCustomFieldSuggestion[] = [];

      const normalizeHeaderLocal = (h: string) => h.toLowerCase().trim();

      for (const header of headers) {
        const normalized = normalizeHeaderLocal(header);

        if (normalized.includes('כותרת') || normalized.includes('שם משימה') || normalized === 'title' || normalized === 'task name' || normalized === 'name') {
          mapping[header] = 'title';
        } else if (normalized.includes('תיאור') || normalized === 'description' || normalized === 'desc') {
          mapping[header] = 'description';
        } else if (normalized.includes('סטטוס') || normalized === 'status') {
          mapping[header] = 'status';
        } else if (normalized.includes('עדיפות') || normalized === 'priority') {
          mapping[header] = 'priority';
        } else if (normalized.includes('אחראי') || normalized === 'assignee' || normalized === 'assigned to') {
          mapping[header] = 'assignee';
        } else if (normalized.includes('תאריך יעד') || normalized.includes('דדליין') || normalized === 'due date' || normalized === 'deadline') {
          mapping[header] = 'dueDate';
        } else if (normalized.includes('תגיות') || normalized === 'tags' || normalized === 'labels') {
          mapping[header] = 'tags';
        } else {
          const key = toSafeKeyFromHeader(header);
          if (key && key.length > 0 && key.length < 50) {
            suggestedCustomFields.push({
              header,
              key,
              label: header,
            });
          }
        }
      }

      return {
        ok: true,
        mapping,
        suggestedCustomFields,
        provider: 'rule-based',
        model: 'heuristic',
      };
    } catch (err: unknown) {
      return { ok: false, message: getUnknownErrorMessageOrUnexpected(err) };
    }
  });
}

export async function importTasksFromFile(params: {
  orgSlug: string;
  mapping: SmartImportTaskMapping;
  rows: Array<Record<string, unknown>>;
  originalRowCount: number;
  enabledCustomFieldKeys: string[];
  createCustomFields: Array<{ header: string; key: string; label: string }>;
}): Promise<
  | {
      ok: true;
      created: number;
      skipped: number;
      invalid: number;
      receivedRows: number;
      consideredRows: number;
      truncated: boolean;
      issues: Array<{ kind: 'invalid' | 'skipped'; rowNumber: number | null; reason: string }>;
    }
  | { ok: false; message: string }
> {
  return withWorkspaceTenantContext(params.orgSlug, async ({ organizationId }) => {
    try {
      const { mapping, rows, originalRowCount } = params;

      const headerFor = (target: SmartImportTaskTargetField) => {
        for (const [h, t] of Object.entries(mapping)) {
          if (t === target) return h;
        }
        return null;
      };

      const headerTitle = headerFor('title');
      const headerDescription = headerFor('description');
      const headerStatus = headerFor('status');
      const headerPriority = headerFor('priority');
      const headerAssignee = headerFor('assignee');
      const headerDueDate = headerFor('dueDate');
      const headerTags = headerFor('tags');

      let created = 0;
      let skipped = 0;
      let invalid = 0;
      const issues: Array<{ kind: 'invalid' | 'skipped'; rowNumber: number | null; reason: string }> = [];

      for (const row of rows) {
        const rowNumber = typeof row.__rowNumber === 'number' ? row.__rowNumber : null;

        const get = (h: string | null) => (h ? row[h] : null);
        const getString = (h: string | null) => {
          const v = get(h);
          if (v == null) return '';
          return String(v).trim();
        };

        const title = getString(headerTitle);
        if (!title) {
          invalid++;
          issues.push({
            kind: 'invalid',
            rowNumber,
            reason: 'חסר כותרת משימה',
          });
          continue;
        }

        const description = getString(headerDescription);
        const status = getString(headerStatus) || 'todo';
        const priority = getString(headerPriority) || 'medium';
        const assigneeName = getString(headerAssignee);
        const dueDateStr = getString(headerDueDate);
        const tagsStr = getString(headerTags);

        const existing = await prisma.nexusTask.findFirst({
          where: {
            organizationId,
            title,
          },
        });

        if (existing) {
          skipped++;
          issues.push({
            kind: 'skipped',
            rowNumber,
            reason: `משימה כבר קיימת: ${title}`,
          });
          continue;
        }

        let dueDate: Date | null = null;
        if (dueDateStr) {
          const parsed = new Date(dueDateStr);
          if (!isNaN(parsed.getTime())) {
            dueDate = parsed;
          }
        }

        const tags = tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [];

        await prisma.nexusTask.create({
          data: {
            organizationId,
            title,
            description: description || null,
            status,
            priority: priority || null,
            dueDate: dueDate,
            tags,
          },
        });

        created++;
      }

      return {
        ok: true,
        created,
        skipped,
        invalid,
        receivedRows: originalRowCount,
        consideredRows: rows.length,
        truncated: originalRowCount > rows.length,
        issues,
      };
    } catch (err: unknown) {
      return { ok: false, message: getUnknownErrorMessageOrUnexpected(err) };
    }
  });
}
