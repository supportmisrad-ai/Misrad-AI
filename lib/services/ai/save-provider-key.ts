import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import type { AIProviderName } from './types';

/**
 * Save an AI provider API key — always encrypted at rest.
 * If a key already exists for this provider+org, it will be updated.
 */
export async function saveProviderKey(params: {
  provider: AIProviderName;
  apiKey: string;
  organizationId: string | null;
}): Promise<{ id: string }> {
  const encryptedKey = await encrypt(params.apiKey);

  const existing = await prisma.ai_provider_keys.findFirst({
    where: {
      provider: params.provider,
      organization_id: params.organizationId,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.ai_provider_keys.update({
      where: { id: existing.id },
      data: {
        api_key: encryptedKey,
        enabled: true,
        updated_at: new Date(),
      },
    });
    return { id: existing.id };
  }

  const created = await prisma.ai_provider_keys.create({
    data: {
      provider: params.provider,
      organization_id: params.organizationId,
      api_key: encryptedKey,
      enabled: true,
    },
    select: { id: true },
  });

  return { id: created.id };
}
