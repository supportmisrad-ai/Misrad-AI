import React from 'react';
import ModulesAdminPageClient from './ModulesAdminPageClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function AdminModulesPage() {
  return <ModulesAdminPageClient />;
}
