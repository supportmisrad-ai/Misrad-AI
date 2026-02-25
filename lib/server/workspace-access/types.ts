import 'server-only';

import type { OSModuleKey } from '@/lib/os/modules/types';

export type PackageType = import('@/lib/billing/pricing').PackageType;

export type WorkspaceEntitlements = Record<OSModuleKey, boolean>;

export type WorkspaceInfo = {
  id: string;
  slug?: string | null;
  name: string;
  logo?: string | null;
  seatsAllowed: number | null;
  isShabbatProtected: boolean;
  subscriptionStatus: string | null;
  entitlements: WorkspaceEntitlements;
};

export type WorkspaceInfoWithPackage = WorkspaceInfo & {
  packageType: PackageType;
};

export type LastLocation = {
  orgSlug: string | null;
  module: OSModuleKey | null;
};

export type OrganizationModuleFlags = {
  has_nexus: boolean | null;
  has_system: boolean | null;
  has_social: boolean | null;
  has_finance: boolean | null;
  has_client: boolean | null;
  has_operations: boolean | null;
};

export type SocialUserRow = { id: string; organization_id: string | null; role?: string | null };

export type OrganizationRow = {
  id: string;
  name: string | null;
  owner_id: string | null;
  slug: string | null;
  logo: string | null;
  seats_allowed: unknown;
  is_shabbat_protected: boolean | null;
  subscription_status: string | null;
} & OrganizationModuleFlags;
