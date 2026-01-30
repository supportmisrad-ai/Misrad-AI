import { redirect } from 'next/navigation';

// Force dynamic rendering to prevent build-time Clerk errors
export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp || {})) {
    if (Array.isArray(value)) {
      if (value[0] != null) params.set(key, String(value[0]));
      continue;
    }
    if (value != null) params.set(key, String(value));
  }

  const qs = params.toString();
  redirect(qs ? `/login?${qs}` : '/login');
}