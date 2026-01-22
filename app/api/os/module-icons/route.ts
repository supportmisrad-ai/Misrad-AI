import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function GETHandler() {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('social_system_settings')
      .select('value')
      .eq('key', 'module_icons')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ moduleIcons: {} });
    }

    const rawValue = (data as any)?.value;
    let parsedValue: any = null;
    if (rawValue && typeof rawValue === 'string') {
      parsedValue = JSON.parse(rawValue);
    } else if (rawValue && typeof rawValue === 'object') {
      parsedValue = rawValue;
    }

    const moduleIcons = parsedValue && typeof parsedValue === 'object' ? parsedValue : {};

    return NextResponse.json({ moduleIcons });
  } catch {
    return NextResponse.json({ moduleIcons: {} });
  }
}

export const GET = shabbatGuard(GETHandler);
