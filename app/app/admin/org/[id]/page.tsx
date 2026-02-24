import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrgDetailPage(props: PageProps) {
  const { id } = await props.params;
  redirect(`/app/admin/organizations/${id}`);
}
