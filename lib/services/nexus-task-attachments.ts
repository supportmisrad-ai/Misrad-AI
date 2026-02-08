import 'server-only';

import { Prisma } from '@prisma/client';

import { createStorageClient } from '@/lib/supabase';
import { resolveStorageUrlsMaybeBatchedWithClient } from '@/lib/services/operations/storage';
import type { Task } from '@/types';
import { asObject } from '@/lib/shared/unknown';

type StorageScope = {
  organizationId: string;
  orgSlug?: string | null;
};

export function normalizeNexusTaskMessagesForStorage(messages: unknown): Prisma.InputJsonValue {
  const list: unknown[] = Array.isArray(messages) ? messages : [];
  if (!Array.isArray(messages)) return messages as Prisma.InputJsonValue;
  return list.map((m) => {
    const msgObj = asObject(m);
    if (!msgObj) return m;

    const attachmentObj = asObject(msgObj.attachment);
    if (!attachmentObj) return m;

    const ref = typeof attachmentObj.ref === 'string' ? String(attachmentObj.ref).trim() : '';
    const url = typeof attachmentObj.url === 'string' ? String(attachmentObj.url).trim() : '';
    const stable = ref || url;
    if (!stable) return m;

    return {
      ...msgObj,
      attachment: {
        name: attachmentObj.name,
        type: attachmentObj.type,
        url: stable,
      },
    };
  }) as Prisma.InputJsonValue;
}

export async function resolveNexusTasksAttachmentsForResponse(tasks: Task[], scope: StorageScope): Promise<Task[]> {
  const list = Array.isArray(tasks) ? tasks : [];
  if (!list.length) return [];

  const ttlSeconds = 60 * 60;
  const messagesByTask: Task['messages'][] = [];
  const refIndexByTaskMessage: number[][] = [];
  const flatRefs: Array<string | null> = [];

  for (const task of list) {
    const messages = task.messages;
    messagesByTask.push(messages);

    const indices: number[] = [];
    for (const m of messages) {
      const attachment = m.attachment;
      const urlRaw = attachment?.url ? String(attachment.url).trim() : '';
      const ref =
        urlRaw && urlRaw.startsWith('sb://')
          ? urlRaw
          : attachment?.ref
            ? String(attachment.ref).trim()
            : null;

      if (!ref || !ref.startsWith('sb://')) {
        indices.push(-1);
        continue;
      }

      flatRefs.push(ref);
      indices.push(flatRefs.length - 1);
    }

    refIndexByTaskMessage.push(indices);
  }

  if (!flatRefs.length) return list;

  let signedFlat: (string | null)[] = flatRefs.map(() => null);
  try {
    const supabase = createStorageClient();
    signedFlat = await resolveStorageUrlsMaybeBatchedWithClient(supabase, flatRefs, ttlSeconds, scope);
  } catch {
    // ignore
  }

  return list.map((task, taskIdx) => {
    const messages = messagesByTask[taskIdx] || [];
    const indices = refIndexByTaskMessage[taskIdx] || [];

    const resolvedMessages: Task['messages'] = messages.map((m, msgIdx) => {
      const attachment = m.attachment;
      if (!attachment) return m;

      const urlRaw = attachment.url ? String(attachment.url).trim() : '';
      const ref =
        urlRaw && urlRaw.startsWith('sb://')
          ? urlRaw
          : attachment.ref
            ? String(attachment.ref).trim()
            : null;

      if (!ref || !ref.startsWith('sb://')) return m;

      const refIndex = indices[msgIdx] ?? -1;
      const signed = refIndex >= 0 ? signedFlat[refIndex] : null;

      const name = typeof attachment.name === 'string' ? attachment.name : String(attachment.name ?? '');
      const type = attachment.type === 'image' || attachment.type === 'video' || attachment.type === 'file' ? attachment.type : 'file';

      return {
        ...m,
        attachment: {
          name,
          type,
          ref,
          url: signed || ref,
        },
      };
    });

    return {
      ...task,
      messages: resolvedMessages,
    };
  });
}

export async function resolveNexusTaskAttachmentsForResponse(task: Task, scope: StorageScope): Promise<Task> {
  const out = await resolveNexusTasksAttachmentsForResponse([task], scope);
  return out[0] ?? task;
}
