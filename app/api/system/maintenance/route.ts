import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { requireSuperAdmin } from '@/lib/auth';

async function GETHandler() {
  try {
    // Primary source of truth: system_settings.maintenance_mode (global)
    const sysRow = await prisma.system_settings.findFirst({
      where: { tenant_id: null },
      orderBy: { updated_at: 'desc' },
      select: { maintenance_mode: true },
    });

    if (sysRow && typeof (sysRow as any).maintenance_mode === 'boolean') {
      return NextResponse.json({ maintenanceMode: Boolean((sysRow as any).maintenance_mode) }, { status: 200 });
    }

    // Fallback: legacy feature_flags in social_system_settings
    const row = await prisma.social_system_settings.findUnique({
      where: { key: 'feature_flags' },
      select: { value: true, maintenance_mode: true },
    });

    const rawValue = (row as any)?.value;
    let parsedValue: any = null;

    if (rawValue && typeof rawValue === 'string') {
      parsedValue = JSON.parse(rawValue);
    } else if (rawValue && typeof rawValue === 'object') {
      parsedValue = rawValue;
    }

    const maintenanceMode = Boolean(parsedValue?.maintenanceMode ?? (row as any)?.maintenance_mode ?? false);
    return NextResponse.json({ maintenanceMode }, { status: 200 });
  } catch {
    return NextResponse.json({ maintenanceMode: false }, { status: 200 });
  }
}

async function PATCHHandler(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const maintenanceMode = Boolean(body?.maintenanceMode);

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

    const existing = await prisma.system_settings.findFirst({
      where: { tenant_id: null },
      orderBy: { updated_at: 'desc' },
      select: { id: true },
    });

    if (existing?.id) {
      await prisma.system_settings.update({
        where: { id: String(existing.id) },
        data: {
          maintenance_mode: maintenanceMode,
          updated_at: new Date(),
        },
      });
    } else {
      await prisma.system_settings.create({
        data: {
          maintenance_mode: maintenanceMode,
          system_flags: {},
          created_at: new Date(),
          updated_at: new Date(),
        } as any,
      });
    }

    return NextResponse.json({ success: true, maintenanceMode }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Forbidden' }, { status: 403 });
  }
}

export const GET = shabbatGuard(GETHandler);
export const PATCH = shabbatGuard(PATCHHandler);
