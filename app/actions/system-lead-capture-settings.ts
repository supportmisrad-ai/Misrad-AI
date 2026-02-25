'use server';

import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import prisma from '@/lib/prisma';
import { asObject } from '@/lib/shared/unknown';

export type LeadCaptureSettings = {
  leadCaptureEnabled: boolean;
  leadCaptureEmailNotify: boolean;
};

const DEFAULTS: LeadCaptureSettings = {
  leadCaptureEnabled: true,
  leadCaptureEmailNotify: true,
};

function parseSettings(raw: unknown): LeadCaptureSettings {
  const obj = asObject(raw) ?? {};
  return {
    leadCaptureEnabled: typeof obj.leadCaptureEnabled === 'boolean' ? obj.leadCaptureEnabled : DEFAULTS.leadCaptureEnabled,
    leadCaptureEmailNotify: typeof obj.leadCaptureEmailNotify === 'boolean' ? obj.leadCaptureEmailNotify : DEFAULTS.leadCaptureEmailNotify,
  };
}

export async function getLeadCaptureSettings(params: {
  orgSlug: string;
}): Promise<LeadCaptureSettings> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {
      const row = await prisma.organization_settings.findUnique({
        where: { organization_id: organizationId },
        select: { ai_sales_context: true },
      });
      return parseSettings(row?.ai_sales_context);
    },
    { source: 'server_actions_lead_capture_settings', reason: 'getLeadCaptureSettings' }
  );
}

export async function updateLeadCaptureSettings(params: {
  orgSlug: string;
  leadCaptureEnabled?: boolean;
  leadCaptureEmailNotify?: boolean;
}): Promise<{ ok: true; settings: LeadCaptureSettings } | { ok: false; message: string }> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {
      try {
        const existing = await prisma.organization_settings.findUnique({
          where: { organization_id: organizationId },
          select: { ai_sales_context: true },
        });

        const current = parseSettings(existing?.ai_sales_context);
        const merged: LeadCaptureSettings = {
          leadCaptureEnabled: params.leadCaptureEnabled ?? current.leadCaptureEnabled,
          leadCaptureEmailNotify: params.leadCaptureEmailNotify ?? current.leadCaptureEmailNotify,
        };

        const existingContext = asObject(existing?.ai_sales_context) ?? {};
        const nextContext = { ...existingContext, ...merged };

        await prisma.organization_settings.upsert({
          where: { organization_id: organizationId },
          create: {
            organization_id: organizationId,
            ai_sales_context: nextContext,
          },
          update: {
            ai_sales_context: nextContext,
            updated_at: new Date(),
          },
        });

        return { ok: true as const, settings: merged };
      } catch {
        return { ok: false as const, message: 'שגיאה בעדכון הגדרות' };
      }
    },
    { source: 'server_actions_lead_capture_settings', reason: 'updateLeadCaptureSettings' }
  );
}
