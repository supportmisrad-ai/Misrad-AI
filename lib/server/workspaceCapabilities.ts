import 'server-only';

import type { WorkspaceEntitlements } from '@/lib/server/workspace';

export type WorkspaceCapabilities = {
  isFullOffice: boolean;
  isTeamManagementEnabled: boolean;
  seatsAllowed: number;
};

export function computeWorkspaceCapabilities(params: {
  entitlements: WorkspaceEntitlements | null | undefined;
  fullOfficeRequiresFinance: boolean;
  seatsAllowedOverride?: number | null;
}): WorkspaceCapabilities {
  const ent = params.entitlements;
  const baseFullOffice = Boolean(ent?.nexus && ent?.system && ent?.social && ent?.client);
  const isFullOffice = params.fullOfficeRequiresFinance ? Boolean(baseFullOffice && ent?.finance) : baseFullOffice;

  const overrideRaw = params.seatsAllowedOverride;
  const overrideNormalized = Number.isFinite(Number(overrideRaw)) ? Math.floor(Number(overrideRaw)) : null;
  const override = overrideNormalized && overrideNormalized > 0 ? overrideNormalized : null;

  return {
    isFullOffice,
    isTeamManagementEnabled: isFullOffice,
    seatsAllowed: isFullOffice ? (override ?? 5) : 1,
  };
}
