import { generateOrgSlug } from '@/lib/shared/orgSlug';

export { generateOrgSlug };

export async function generateUniqueOrgSlug(baseInput: string, opts?: { excludeOrgId?: string }): Promise<string> {
  const { default: prisma } = await import('@/lib/prisma');

  const base = generateOrgSlug(baseInput);
  if (!base) return '';

  const excludeOrgId = opts?.excludeOrgId ? String(opts.excludeOrgId).trim() : '';

  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await prisma.social_organizations.findFirst({
      where: {
        slug: candidate,
        ...(excludeOrgId ? { id: { not: excludeOrgId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return candidate;
  }

  // Extremely unlikely, but keep a stable fallback.
  return `${base}-${Date.now()}`.slice(0, 64);
}
