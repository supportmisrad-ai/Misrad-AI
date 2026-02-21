import React from 'react';
import { redirect } from 'next/navigation';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function AdminGlobalKbVideosPage() {
  redirect('/app/admin/global/help-videos');
}
