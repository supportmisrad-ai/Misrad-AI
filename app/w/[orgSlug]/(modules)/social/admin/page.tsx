 export const dynamic = 'force-dynamic';
 
 import AdminPanel from '@/components/social/AdminPanel';
 
 export default async function SocialAdminRedirectPage({
   params,
 }: {
   params: Promise<{ orgSlug: string }>;
 }) {
   await params;
   return <AdminPanel />;
 }
