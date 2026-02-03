'use server';

import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import {
  assertSystemPipelineStageExistsForOrganizationId,
  createSystemPipelineStageForOrganizationId,
  deleteSystemPipelineStageForOrganizationId,
  getSystemPipelineStagesForOrganizationId,
  updateSystemPipelineStageForOrganizationId,
} from '@/lib/services/system/pipeline-stages';

export type SystemPipelineStageDTO = {
  id: string;
  key: string;
  label: string;
  color: string | null;
  accent: string | null;
  order: number;
  isActive: boolean;
};

export async function getSystemPipelineStages(params: { orgSlug: string }): Promise<SystemPipelineStageDTO[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  return await getSystemPipelineStagesForOrganizationId({ organizationId: workspace.id });
}

export async function createSystemPipelineStage(params: {
  orgSlug: string;
  key: string;
  label: string;
  color?: string | null;
  accent?: string | null;
  order?: number | null;
}): Promise<{ ok: true; stage: SystemPipelineStageDTO } | { ok: false; message: string }> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  return await createSystemPipelineStageForOrganizationId({
    organizationId: workspace.id,
    key: params.key,
    label: params.label,
    color: params.color,
    accent: params.accent,
    order: params.order,
  });
}

export async function updateSystemPipelineStage(params: {
  orgSlug: string;
  id: string;
  label?: string;
  color?: string | null;
  accent?: string | null;
  order?: number | null;
  isActive?: boolean;
}): Promise<{ ok: true; stage: SystemPipelineStageDTO } | { ok: false; message: string }> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  return await updateSystemPipelineStageForOrganizationId({
    organizationId: workspace.id,
    id: params.id,
    label: params.label,
    color: params.color,
    accent: params.accent,
    order: params.order,
    isActive: params.isActive,
  });
}

export async function deleteSystemPipelineStage(params: {
  orgSlug: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  return await deleteSystemPipelineStageForOrganizationId({ organizationId: workspace.id, id: params.id });
}

export async function assertSystemPipelineStageExists(params: {
  orgSlug: string;
  key: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  return await assertSystemPipelineStageExistsForOrganizationId({ organizationId: workspace.id, key: params.key });
}
