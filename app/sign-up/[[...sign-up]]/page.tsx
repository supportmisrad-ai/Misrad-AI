import { redirect } from 'next/navigation';

// Force dynamic rendering to prevent build-time Clerk errors
// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const qs = new URLSearchParams();

  const resolvedSearchParams = await Promise.resolve(searchParams);

  for (const [key, value] of Object.entries(resolvedSearchParams || {})) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, String(v));
      continue;
    }
    qs.set(key, String(value));
  }

  const redirectParam = qs.get('redirect') || qs.get('redirect_url') || qs.get('redirectUrl');
  if (redirectParam && !qs.get('redirect')) {
    qs.set('redirect', redirectParam);
  }

  qs.set('mode', 'sign-up');

  const queryString = qs.toString();
  redirect(queryString ? `/login?${queryString}` : '/login?mode=sign-up');
}