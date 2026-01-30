import React from 'react';
import { SupportHomeClient } from './SupportHomeClient';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { modulesRegistry } from '@/lib/os/modules/registry';
import { getAllDocsArticles, getDocsCategoriesForModule, getDocsCategory, getDocsModules } from '@/config/docs';

export const dynamic = 'force-dynamic';

export default async function WorkspaceSupportIndexPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  await requireWorkspaceAccessByOrgSlug(orgSlug);

  const modules = getDocsModules().map((m) => {
    const def = modulesRegistry[m.moduleKey];
    const categories = getDocsCategoriesForModule(m.moduleKey).map((c) => ({ id: c.id, title: c.title }));
    return {
      moduleKey: m.moduleKey,
      title: def.label,
      titleHe: def.labelHe,
      accent: def.theme.accent,
      categories,
      href: `/w/${encodeURIComponent(orgSlug)}/support/${encodeURIComponent(m.moduleKey)}`,
    };
  });

  const articles = getAllDocsArticles().map((a) => {
    const def = modulesRegistry[a.moduleKey];
    const cat = getDocsCategory(a.moduleKey, a.categoryId);
    return {
      ...a,
      href: `/w/${encodeURIComponent(orgSlug)}/support/${encodeURIComponent(a.moduleKey)}/${encodeURIComponent(a.id)}`,
      moduleTitleHe: def.labelHe,
      categoryTitle: cat?.title,
    };
  });

  return (
    <SupportHomeClient orgSlug={orgSlug} modules={modules} articles={articles} />
  );
}
