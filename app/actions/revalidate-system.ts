'use server';

import { revalidatePath } from 'next/cache';

export async function forceRevalidateSystemLeads(orgSlug: string) {
  const paths = [
    `/w/${orgSlug}/system`,
    `/w/${orgSlug}/system/leads`,
    `/workspaces/${orgSlug}/system`,
    `/workspaces/${orgSlug}/system/leads`,
  ];
  
  for (const path of paths) {
    revalidatePath(path, 'page');
    revalidatePath(path, 'layout');
  }
  
  console.log('✅ Revalidated system leads paths for', orgSlug);
  return { success: true };
}
