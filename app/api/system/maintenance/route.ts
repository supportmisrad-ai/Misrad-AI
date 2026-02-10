import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { requireSuperAdmin } from '@/lib/auth';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler() {
  try {
    // Primary source of truth: system_settings.maintenance_mode (global)
    const sysRow = await prisma.system_settings.findFirst({
      where: { tenant_id: null },
      orderBy: { updated_at: 'desc' },
      select: { maintenance_mode: true },
    });

    if (sysRow && typeof sysRow.maintenance_mode === 'boolean') {
      return NextResponse.json({ maintenanceMode: Boolean(sysRow.maintenance_mode) }, { status: 200 });
    }

    // Fallback: legacy feature_flags in social_system_settings
    const row = await prisma.coreSystemSettings.findUnique({
      where: { key: 'feature_flags' },
      select: { value: true, maintenance_mode: true },
    });

    const rawValue = row?.value;
    let parsedValue: unknown = null;

    if (rawValue && typeof rawValue === 'string') {
      try {
        parsedValue = JSON.parse(rawValue);
      } catch {
        parsedValue = null;
      }
    } else if (rawValue && typeof rawValue === 'object') {
      parsedValue = rawValue;
    }

    const parsedObj = asObject(parsedValue) ?? {};
    const maintenanceMode = Boolean(parsedObj.maintenanceMode ?? row?.maintenance_mode ?? false);
    return NextResponse.json({ maintenanceMode }, { status: 200 });
  } catch {
    return NextResponse.json({ maintenanceMode: false }, { status: 200 });
  }
}

async function PATCHHandler(request: Request) {
  try {
    const bodyJson: unknown = await request.json().catch(() => null);
    const bodyObj = asObject(bodyJson);
    const maintenanceMode = Boolean(bodyObj?.maintenanceMode);

    const emergencyToken = String(process.env.MAINTENANCE_EMERGENCY_TOKEN || '').trim();
    const headerToken = String(request.headers.get('x-maintenance-emergency-token') || '').trim();
    const authHeader = String(request.headers.get('authorization') || '').trim();
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice('bearer '.length).trim()
      : '';

    const isEmergencyDisableRequest =
      emergencyToken.length > 0 &&
      maintenanceMode === false &&
      (headerToken === emergencyToken || bearerToken === emergencyToken);

    if (!isEmergencyDisableRequest) {
      await requireSuperAdmin();
    }

    const source = isEmergencyDisableRequest ? 'api_system_maintenance_emergency' : 'api_system_maintenance';
    const reason = isEmergencyDisableRequest ? 'PATCH_emergency_disable' : 'PATCH';

    const existing = await prisma.system_settings.findFirst({
      where: { tenant_id: null },
      orderBy: { updated_at: 'desc' },
      select: { id: true },
    });

    await withTenantIsolationContext(
      {
        source,
        reason,
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {
        if (existing?.id) {
          await prisma.system_settings.updateMany({
            where: { id: String(existing.id), tenant_id: null },
            data: {
              maintenance_mode: maintenanceMode,
              updated_at: new Date(),
            },
          });
        } else {
          await prisma.system_settings.create({
            data: {
              tenant_id: null,
              maintenance_mode: maintenanceMode,
              system_flags: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        }
      }
    );

    return NextResponse.json({ success: true, maintenanceMode }, { status: 200 });
  } catch (e: unknown) {
    const safeMsg = 'Forbidden';
    return NextResponse.json(
      { error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
      { status: 403 }
    );
  }
}

export const GET = shabbatGuard(GETHandler);
export const PATCH = shabbatGuard(PATCHHandler);
