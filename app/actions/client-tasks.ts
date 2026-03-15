'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { MisradClientActionType } from '@prisma/client';

export async function createClientTask(params: {
  orgId: string;
  clientId: string;
  title: string;
  description: string;
  dueDate: string;
  type: 'APPROVAL' | 'UPLOAD' | 'SIGNATURE' | 'FORM' | 'FEEDBACK';
  isBlocking?: boolean;
  fileUrl?: string | null;
  fileName?: string | null;
}) {
  const { orgId, clientId, title, description, dueDate, type, isBlocking, fileUrl, fileName } = params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const task = await prisma.misradClientAction.create({
    data: {
      organization_id: workspace.id,
      client_id: clientId,
      title,
      description,
      dueDate,
      type: type as MisradClientActionType,
      status: 'PENDING',
      isBlocking: isBlocking ?? false,
      file_url: fileUrl,
      file_name: fileName,
    },
  });

  revalidatePath('/', 'layout');
  return task;
}

export async function getClientTasks(orgId: string, clientId: string) {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const tasks = await prisma.misradClientAction.findMany({
    where: {
      organization_id: workspace.id,
      client_id: clientId,
    },
    orderBy: { created_at: 'desc' },
  });

  return tasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    type: t.type,
    status: t.status,
    dueDate: t.dueDate,
    isBlocking: t.isBlocking,
    file_url: t.file_url,
    file_name: t.file_name
  }));
}
