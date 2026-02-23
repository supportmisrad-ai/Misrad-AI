'use server';

import prisma from '@/lib/prisma';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import { getUnknownErrorMessageOrUnexpected } from '@/lib/shared/unknown';
import type { Prisma } from '@prisma/client';
import crypto from 'crypto';

const MAX_IMPORT_ROWS = 10000;
const MAX_ISSUES_RETURNED = 200;

export type SmartImportClientTargetField =
  | 'fullName'
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'company'
  | 'address'
  | 'city'
  | 'notes'
  | 'tags';

export type SmartImportClientMapping = Record<string, SmartImportClientTargetField | null>;

export type SmartImportClientCustomFieldSuggestion = {
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

function normalizePhoneForDedupe(value: string): string {
  const s = String(value || '').trim();
  if (!s) return '';
  const withPlus = s.startsWith('+');
  const digits = s.replace(/[^0-9]/g, '');
  return withPlus ? `+${digits}` : digits;
}

export async function suggestClientImportMapping(params: {
  orgSlug: string;
  headers: string[];
}): Promise<
  | {
      ok: true;
      mapping: SmartImportClientMapping;
      suggestedCustomFields: SmartImportClientCustomFieldSuggestion[];
      provider?: string;
      model?: string;
    }
  | { ok: false; message: string }
> {
  return withWorkspaceTenantContext(params.orgSlug, async () => {
    try {
      const { headers } = params;
      const mapping: SmartImportClientMapping = {};
      const suggestedCustomFields: SmartImportClientCustomFieldSuggestion[] = [];
      const norm = (h: string) => h.toLowerCase().trim();

      for (const header of headers) {
        const n = norm(header);
        if (n.includes('שם מלא') || n === 'name' || n === 'full name' || n === 'fullname') {
          mapping[header] = 'fullName';
        } else if (n.includes('שם פרטי') || n === 'first name' || n === 'firstname') {
          mapping[header] = 'firstName';
        } else if (n.includes('שם משפחה') || n === 'last name' || n === 'lastname') {
          mapping[header] = 'lastName';
        } else if (n.includes('טלפון') || n === 'phone' || n === 'mobile' || n === 'cell') {
          mapping[header] = 'phone';
        } else if (n.includes('אימייל') || n === 'email' || n === 'mail') {
          mapping[header] = 'email';
        } else if (n.includes('חברה') || n === 'company' || n === 'business') {
          mapping[header] = 'company';
        } else if (n.includes('כתובת') || n === 'address') {
          mapping[header] = 'address';
        } else if (n.includes('עיר') || n === 'city') {
          mapping[header] = 'city';
        } else if (n.includes('הערות') || n === 'notes' || n === 'comments') {
          mapping[header] = 'notes';
        } else if (n.includes('תגיות') || n === 'tags') {
          mapping[header] = 'tags';
        } else {
          const key = header
            .toLowerCase()
            .replace(/[^a-z0-9\u0590-\u05FF]+/g, '_')
            .replace(/^_|_$/g, '');
          if (key && key.length > 0 && key.length < 50) {
            suggestedCustomFields.push({ header, key, label: header });
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

export async function importClientsFromFile(params: {
  orgSlug: string;
  mapping: SmartImportClientMapping;
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
      const { mapping, rows, originalRowCount, enabledCustomFieldKeys, createCustomFields } = params;

      const headerFor = (target: SmartImportClientTargetField) => {
        for (const [h, t] of Object.entries(mapping)) {
          if (t === target) return h;
        }
        return null;
      };

      const headerFullName = headerFor('fullName');
      const headerFirstName = headerFor('firstName');
      const headerLastName = headerFor('lastName');
      const headerPhone = headerFor('phone');
      const headerEmail = headerFor('email');
      const headerCompany = headerFor('company');
      const headerAddress = headerFor('address');
      const headerCity = headerFor('city');
      const headerNotes = headerFor('notes');
      const headerTags = headerFor('tags');

      const customFieldsMap = new Map(
        createCustomFields.map((f) => [f.key, { header: f.header, label: f.label }])
      );

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

        let fullName = getString(headerFullName);
        if (!fullName && (headerFirstName || headerLastName)) {
          const first = getString(headerFirstName);
          const last = getString(headerLastName);
          fullName = `${first} ${last}`.trim();
        }

        const phone = getString(headerPhone);
        const email = getString(headerEmail);

        if (!fullName && !phone && !email) {
          invalid++;
          issues.push({ kind: 'invalid', rowNumber, reason: 'חסר שם או טלפון או אימייל' });
          continue;
        }

        if (!fullName) {
          fullName = phone || email || 'לקוח ללא שם';
        }

        const existingByPhone = phone
          ? await prisma.clientClient.findFirst({ where: { organizationId, phone } })
          : null;
        const existingByEmail = !existingByPhone && email
          ? await prisma.clientClient.findFirst({ where: { organizationId, email } })
          : null;

        if (existingByPhone || existingByEmail) {
          skipped++;
          issues.push({ kind: 'skipped', rowNumber, reason: `לקוח כבר קיים: ${fullName}` });
          continue;
        }

        const metadata: Record<string, unknown> = {};
        const company = getString(headerCompany);
        const address = getString(headerAddress);
        const city = getString(headerCity);
        const notes = getString(headerNotes);
        const tags = getString(headerTags);

        if (company) metadata.company = company;
        if (address) metadata.address = address;
        if (city) metadata.city = city;
        if (tags) metadata.tags = tags.split(',').map((t) => t.trim()).filter(Boolean);

        for (const key of enabledCustomFieldKeys) {
          const cf = customFieldsMap.get(key);
          if (!cf) continue;
          const value = getString(cf.header);
          if (value) metadata[key] = value;
        }

        await prisma.clientClient.create({
          data: {
            organizationId,
            fullName,
            phone: phone || null,
            email: email || null,
            notes: notes || null,
            metadata: Object.keys(metadata).length > 0 ? (metadata as Prisma.InputJsonValue) : {},
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
