 export const dynamic = 'force-dynamic';
 
 import { redirect } from 'next/navigation';
 
 export default async function SocialAdminRedirectPage({
   params,
 }: {
   params: Promise<{ orgSlug: string }> | { orgSlug: string };
 }) {
   await params;
   redirect('/app/admin/social');
 }
