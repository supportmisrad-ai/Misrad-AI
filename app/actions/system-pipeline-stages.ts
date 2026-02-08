'use server';

import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
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
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => await getSystemPipelineStagesForOrganizationId({ organizationId }),
    { source: 'server_actions_system_pipeline_stages', reason: 'getSystemPipelineStages' }
  );
}

export async function createSystemPipelineStage(params: {
  orgSlug: string;
  key: string;
  label: string;
  color?: string | null;
  accent?: string | null;
  order?: number | null;
}): Promise<{ ok: true; stage: SystemPipelineStageDTO } | { ok: false; message: string }> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) =>
      await createSystemPipelineStageForOrganizationId({
        organizationId,
        key: params.key,
        label: params.label,
        color: params.color,
        accent: params.accent,
        order: params.order,
      }),
    { source: 'server_actions_system_pipeline_stages', reason: 'createSystemPipelineStage' }
  );
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
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) =>
      await updateSystemPipelineStageForOrganizationId({
        organizationId,
        id: params.id,
        label: params.label,
        color: params.color,
        accent: params.accent,
        order: params.order,
        isActive: params.isActive,
      }),
    { source: 'server_actions_system_pipeline_stages', reason: 'updateSystemPipelineStage' }
  );
}

export async function deleteSystemPipelineStage(params: {
  orgSlug: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => await deleteSystemPipelineStageForOrganizationId({ organizationId, id: params.id }),
    { source: 'server_actions_system_pipeline_stages', reason: 'deleteSystemPipelineStage' }
  );
}

export async function assertSystemPipelineStageExists(params: {
  orgSlug: string;
  key: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => await assertSystemPipelineStageExistsForOrganizationId({ organizationId, key: params.key }),
    { source: 'server_actions_system_pipeline_stages', reason: 'assertSystemPipelineStageExists' }
  );
}
