 import { redirect } from 'next/navigation';
 
 export const dynamic = 'force-dynamic';
 
 export default async function SocialAdminRedirectPage({
   params,
 }: {
   params: Promise<{ orgSlug: string }>;
 }) {
   await params;
   redirect('/app/admin');
 }
