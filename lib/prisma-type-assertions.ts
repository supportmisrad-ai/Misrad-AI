/**
 * Prisma Compile-Time Type Safety Assertions
 *
 * These types exist purely to fail at compile time if the generated Prisma Client
 * doesn't match the expected schema (e.g. missing organizationId on tenant-scoped models).
 *
 * If a type error appears here, run: npm run prisma:generate (and restart TS server).
 */

import { PrismaClient } from '@prisma/client';

type _PrismaClientSanity = {
  systemLead: PrismaClient['systemLead'];
  nexusTask: PrismaClient['nexusTask'];
  systemInvoice: PrismaClient['systemInvoice'];
  systemLeadActivity: PrismaClient['systemLeadActivity'];
  nexusClient: PrismaClient['nexusClient'];
  operationsProject: PrismaClient['operationsProject'];
  operationsWorkOrder: PrismaClient['operationsWorkOrder'];
  misradClient: PrismaClient['misradClient'];
  misradInvoice: PrismaClient['misradInvoice'];
  misradMeetingAnalysisResult: PrismaClient['misradMeetingAnalysisResult'];
  misradActivityLog: PrismaClient['misradActivityLog'];
};

type _Assert<T extends boolean> = T;
type _HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;
type _HasSomeKey<T, K extends PropertyKey> = [Extract<keyof T, K>] extends [never] ? false : true;

// ── SystemLead ──
type _SystemLeadWhere = Parameters<_PrismaClientSanity['systemLead']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _SystemLeadCreateData = Parameters<_PrismaClientSanity['systemLead']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertSystemLeadWhereHasOrgId = _Assert<_HasKey<NonNullable<_SystemLeadWhere>, 'organizationId'>>;
type _AssertSystemLeadCreateHasOrgId = _Assert<_HasKey<_SystemLeadCreateData, 'organizationId'>>;

// ── NexusTask ──
type _NexusTaskWhere = Parameters<_PrismaClientSanity['nexusTask']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _NexusTaskCreateData = Parameters<_PrismaClientSanity['nexusTask']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertNexusTaskWhereHasOrgId = _Assert<_HasKey<NonNullable<_NexusTaskWhere>, 'organizationId'>>;
type _AssertNexusTaskCreateHasOrgId = _Assert<_HasKey<_NexusTaskCreateData, 'organizationId'>>;

// ── SystemInvoice ──
// NOTE: SystemInvoice uses a nullable organizationId in the schema.
type _SystemInvoiceWhere = Parameters<_PrismaClientSanity['systemInvoice']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _SystemInvoiceCreateData = Parameters<_PrismaClientSanity['systemInvoice']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertSystemInvoiceWhereHasOrgId = _Assert<
  _HasSomeKey<NonNullable<_SystemInvoiceWhere>, 'organizationId' | 'organization_id'>
>;
type _AssertSystemInvoiceCreateHasOrgId = _Assert<
  _HasSomeKey<_SystemInvoiceCreateData, 'organizationId' | 'organization_id'>
>;

// ── SystemLeadActivity ──
type _SystemLeadActivityWhere = Parameters<_PrismaClientSanity['systemLeadActivity']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _SystemLeadActivityCreateData = Parameters<_PrismaClientSanity['systemLeadActivity']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertSystemLeadActivityWhereHasOrgId = _Assert<
  _HasSomeKey<NonNullable<_SystemLeadActivityWhere>, 'organizationId' | 'organization_id'>
>;
type _AssertSystemLeadActivityCreateHasOrgId = _Assert<
  _HasSomeKey<_SystemLeadActivityCreateData, 'organizationId' | 'organization_id'>
>;

// ── NexusClient ──
type _NexusClientWhere = Parameters<_PrismaClientSanity['nexusClient']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _NexusClientCreateData = Parameters<_PrismaClientSanity['nexusClient']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertNexusClientWhereHasOrgId = _Assert<_HasSomeKey<NonNullable<_NexusClientWhere>, 'organizationId' | 'organization_id'>>;
type _AssertNexusClientCreateHasOrgId = _Assert<_HasSomeKey<_NexusClientCreateData, 'organizationId' | 'organization_id'>>;

// ── OperationsProject ──
type _OperationsProjectWhere = Parameters<_PrismaClientSanity['operationsProject']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _OperationsProjectCreateData = Parameters<_PrismaClientSanity['operationsProject']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertOperationsProjectWhereHasOrgId = _Assert<
  _HasSomeKey<NonNullable<_OperationsProjectWhere>, 'organizationId' | 'organization_id'>
>;
type _AssertOperationsProjectCreateHasOrgId = _Assert<_HasSomeKey<_OperationsProjectCreateData, 'organizationId' | 'organization_id'>>;

// ── OperationsWorkOrder ──
type _OperationsWorkOrderWhere = Parameters<_PrismaClientSanity['operationsWorkOrder']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _OperationsWorkOrderCreateData = Parameters<_PrismaClientSanity['operationsWorkOrder']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertOperationsWorkOrderWhereHasOrgId = _Assert<
  _HasSomeKey<NonNullable<_OperationsWorkOrderWhere>, 'organizationId' | 'organization_id'>
>;
type _AssertOperationsWorkOrderCreateHasOrgId = _Assert<
  _HasSomeKey<_OperationsWorkOrderCreateData, 'organizationId' | 'organization_id'>
>;

// ── MisradClient ──
type _MisradClientWhere = Parameters<_PrismaClientSanity['misradClient']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _MisradClientCreateData = Parameters<_PrismaClientSanity['misradClient']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertMisradClientWhereHasOrgId = _Assert<_HasSomeKey<NonNullable<_MisradClientWhere>, 'organizationId' | 'organization_id'>>;
type _AssertMisradClientCreateHasOrgId = _Assert<_HasSomeKey<_MisradClientCreateData, 'organizationId' | 'organization_id'>>;

// ── MisradInvoice ──
type _MisradInvoiceWhere = Parameters<_PrismaClientSanity['misradInvoice']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _MisradInvoiceCreateData = Parameters<_PrismaClientSanity['misradInvoice']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertMisradInvoiceWhereHasOrgId = _Assert<_HasSomeKey<NonNullable<_MisradInvoiceWhere>, 'organizationId' | 'organization_id'>>;
type _AssertMisradInvoiceCreateHasOrgId = _Assert<_HasSomeKey<_MisradInvoiceCreateData, 'organizationId' | 'organization_id'>>;

// ── MisradMeetingAnalysisResult ──
type _MisradMeetingAnalysisResultWhere = Parameters<_PrismaClientSanity['misradMeetingAnalysisResult']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _MisradMeetingAnalysisResultCreateData = Parameters<_PrismaClientSanity['misradMeetingAnalysisResult']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertMisradMeetingAnalysisResultWhereHasOrgId = _Assert<
  _HasSomeKey<NonNullable<_MisradMeetingAnalysisResultWhere>, 'organizationId' | 'organization_id'>
>;
type _AssertMisradMeetingAnalysisResultCreateHasOrgId = _Assert<
  _HasSomeKey<_MisradMeetingAnalysisResultCreateData, 'organizationId' | 'organization_id'>
>;

// ── MisradActivityLog ──
type _MisradActivityLogWhere = Parameters<_PrismaClientSanity['misradActivityLog']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _MisradActivityLogCreateData = Parameters<_PrismaClientSanity['misradActivityLog']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertMisradActivityLogWhereHasOrgId = _Assert<_HasSomeKey<NonNullable<_MisradActivityLogWhere>, 'organizationId' | 'organization_id'>>;
type _AssertMisradActivityLogCreateHasOrgId = _Assert<_HasSomeKey<_MisradActivityLogCreateData, 'organizationId' | 'organization_id'>>;
