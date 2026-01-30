import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { requireSuperAdmin } from '@/lib/auth';

async function GETHandler() {
  try {
    const supabase = createClient();

    // Primary source of truth: system_settings.maintenance_mode (global)
    const { data: sysRow, error: sysErr } = await supabase
      .from('system_settings')
      .select('maintenance_mode')
      .is('tenant_id', null)
      .maybeSingle();

    if (!sysErr && sysRow && typeof (sysRow as any).maintenance_mode === 'boolean') {
      return NextResponse.json({ maintenanceMode: Boolean((sysRow as any).maintenance_mode) }, { status: 200 });
    }

    // Fallback: legacy feature_flags in social_system_settings
    const { data: row, error } = await supabase
      .from('social_system_settings')
      .select('*')
      .eq('key', 'feature_flags')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ maintenanceMode: false }, { status: 200 });
    }

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

    const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'system_maintenance_mode_update' });
    const { error } = await supabase
      .from('system_settings')
      .upsert(
        {
          tenant_id: null,
          maintenance_mode: maintenanceMode,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'tenant_id' }
      );

    if (error) {
      return NextResponse.json({ error: 'Failed to update maintenance mode' }, { status: 500 });
    }

    return NextResponse.json({ success: true, maintenanceMode }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Forbidden' }, { status: 403 });
  }
}

export const GET = shabbatGuard(GETHandler);
export const PATCH = shabbatGuard(PATCHHandler);
