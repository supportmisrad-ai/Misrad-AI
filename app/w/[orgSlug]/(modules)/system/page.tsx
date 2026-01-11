import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SystemModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/w/${orgSlug}/system/workspace`);
}
