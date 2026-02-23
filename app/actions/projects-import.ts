'use server';

import prisma from '@/lib/prisma';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import { getUnknownErrorMessageOrUnexpected } from '@/lib/shared/unknown';
import type { Prisma } from '@prisma/client';
import crypto from 'crypto';

const MAX_IMPORT_ROWS = 10000;

export type SmartImportProjectTargetField =
  | 'title'
  | 'status'
  | 'clientName'
  | 'installationAddress'
  | 'source'
  | 'notes';

export type SmartImportProjectMapping = Record<string, SmartImportProjectTargetField | null>;

export type SmartImportProjectCustomFieldSuggestion = {
  header: string;
  key: string;
  label: string;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

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

export async function suggestProjectImportMapping(params: {
  orgSlug: string;
  headers: string[];
}): Promise<
  | {
      ok: true;
      mapping: SmartImportProjectMapping;
      suggestedCustomFields: SmartImportProjectCustomFieldSuggestion[];
      provider?: string;
      model?: string;
    }
  | { ok: false; message: string }
> {
  return withWorkspaceTenantContext(params.orgSlug, async () => {
    try {
      const { headers } = params;

      const mapping: SmartImportProjectMapping = {};
      const suggestedCustomFields: SmartImportProjectCustomFieldSuggestion[] = [];

      const normalizeHeaderLocal = (h: string) => h.toLowerCase().trim();

      for (const header of headers) {
        const normalized = normalizeHeaderLocal(header);

        if (normalized.includes('כותרת') || normalized.includes('שם פרויקט') || normalized === 'title' || normalized === 'project name' || normalized === 'name') {
          mapping[header] = 'title';
        } else if (normalized.includes('סטטוס') || normalized === 'status') {
          mapping[header] = 'status';
        } else if (normalized.includes('לקוח') || normalized === 'client' || normalized === 'customer') {
          mapping[header] = 'clientName';
        } else if (normalized.includes('כתובת') || normalized === 'address' || normalized.includes('התקנה')) {
          mapping[header] = 'installationAddress';
        } else if (normalized.includes('מקור') || normalized === 'source') {
          mapping[header] = 'source';
        } else if (normalized.includes('הערות') || normalized === 'notes' || normalized === 'comments') {
          mapping[header] = 'notes';
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

export async function importProjectsFromFile(params: {
  orgSlug: string;
  mapping: SmartImportProjectMapping;
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

      const headerFor = (target: SmartImportProjectTargetField) => {
        for (const [h, t] of Object.entries(mapping)) {
          if (t === target) return h;
        }
        return null;
      };

      const headerTitle = headerFor('title');
      const headerStatus = headerFor('status');
      const headerClientName = headerFor('clientName');
      const headerAddress = headerFor('installationAddress');
      const headerSource = headerFor('source');
      const headerNotes = headerFor('notes');

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
            reason: 'חסר כותרת פרויקט',
          });
          continue;
        }

        const status = getString(headerStatus) || 'ACTIVE';
        const clientName = getString(headerClientName);
        const address = getString(headerAddress);
        const source = getString(headerSource) || 'import';
        const notes = getString(headerNotes);

        const existing = await prisma.operationsProject.findFirst({
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
            reason: `פרויקט כבר קיים: ${title}`,
          });
          continue;
        }

        let canonicalClientId: string | null = null;
        if (clientName) {
          const client = await prisma.clients.findFirst({
            where: {
              organization_id: organizationId,
              name: clientName,
            },
          });
          if (client) {
            canonicalClientId = client.id;
          }
        }

        await prisma.operationsProject.create({
          data: {
            organizationId,
            title,
            status,
            canonicalClientId,
            installationAddress: address || null,
            source,
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
