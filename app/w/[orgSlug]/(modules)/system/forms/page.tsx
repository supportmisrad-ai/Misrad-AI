import SystemFormsClient from './SystemFormsClient';
import { getSystemFormsAction } from '@/app/actions/system-forms';

export default async function SystemFormsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const { forms } = await getSystemFormsAction(orgSlug);

  return <SystemFormsClient orgSlug={orgSlug} initialForms={forms} />;
}
