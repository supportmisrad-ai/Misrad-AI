import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function GETHandler() {
  try {
    const supabase = createClient();
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

export const GET = shabbatGuard(GETHandler);
