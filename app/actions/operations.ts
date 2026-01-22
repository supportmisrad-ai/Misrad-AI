'use server';

import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

export type OperationsClientOption = {
  id: string;
  label: string;
  source: 'nexus' | 'misrad' | 'client';
};

type OperationsDashboardProjectRow = {
  id: string;
  title: string;
  status: string;
  canonicalClientId: string | null;
  updatedAt: Date;
};

export type OperationsDashboardData = {
  recentProjects: Array<{
    id: string;
    title: string;
    status: string;
    clientName: string | null;
    updatedAt: string;
  }>;
  inventorySummary: {
    ok: number;
    low: number;
    critical: number;
    total: number;
  };
};

export type OperationsProjectsData = {
  projects: Array<{
    id: string;
    title: string;
    status: string;
    clientName: string | null;
    createdAt: string;
  }>;
};

export type OperationsInventoryData = {
  items: Array<{
    id: string;
    itemName: string;
    sku: string | null;
    onHand: number;
    minLevel: number;
  }>;
};

export type OperationsProjectOption = {
  id: string;
  title: string;
};

export type OperationsWorkOrderStatus = 'NEW' | 'IN_PROGRESS' | 'DONE';

export type OperationsWorkOrderRow = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  status: OperationsWorkOrderStatus;
  technicianLabel: string | null;
  installationLat: number | null;
  installationLng: number | null;
};

export type OperationsTechnicianOption = {
  id: string;
  label: string;
};

export type OperationsWorkOrdersData = {
  workOrders: OperationsWorkOrderRow[];
};

export type OperationsInventoryOption = {
  inventoryId: string;
  itemId: string;
  label: string;
  onHand: number;
  unit: string | null;
};

export type OperationsWorkOrderAttachmentRow = {
  id: string;
  url: string;
  mimeType: string | null;
  createdAt: string;
};

export type OperationsWorkOrderCheckinRow = {
  id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  createdAt: string;
};

export type OperationsLocationRow = {
  id: string;
  name: string;
  createdAt: string;
};

export type OperationsWorkOrderTypeRow = {
  id: string;
  name: string;
  createdAt: string;
};

function toNumberSafe(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof (value as any).toNumber === 'function') {
    return (value as any).toNumber();
  }
  return Number(value);
}

function normalizeAddress(input: string): string {
  return String(input || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export async function getOperationsClientOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsClientOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const [nexusClients, misradClients, clientClients] = await Promise.all([
      prisma.nexusClient.findMany({
        where: { organizationId: workspace.id },
        select: { id: true, companyName: true, name: true },
        orderBy: { companyName: 'asc' },
      }),
      prisma.misradClient.findMany({
        where: { organizationId: workspace.id },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.clientClient.findMany({
        where: { organizationId: workspace.id },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    const options: OperationsClientOption[] = [];
    const seen = new Set<string>();

    for (const c of nexusClients as any[]) {
      const id = String(c.id);
      const label = String(c.companyName || c.name || '').trim();
      if (!id || !label || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, label, source: 'nexus' });
    }

    for (const c of misradClients as any[]) {
      const id = String(c.id);
      const label = String(c.name || '').trim();
      if (!id || !label || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, label, source: 'misrad' });
    }

    for (const c of clientClients as any[]) {
      const id = String(c.id);
      const label = String(c.fullName || '').trim();
      if (!id || !label || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, label, source: 'client' });
    }

    options.sort((a, b) => a.label.localeCompare(b.label, 'he'));

    return { success: true, data: options };
  } catch (e: any) {
    console.error('[operations] getOperationsClientOptions failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בטעינת רשימת הלקוחות',
    };
  }
}

async function setOperationsWorkOrderCompletionSignatureUnsafe(params: {
  organizationId: string;
  workOrderId: string;
  signatureUrl: string;
}) {
  await ensureOperationsWorkOrdersSignatureColumns(prisma);
  await prisma.$executeRawUnsafe(
    `
      UPDATE operations_work_orders
      SET completion_signature_url = $3::text
      WHERE organization_id = $1::uuid
        AND id = $2::uuid
    `,
    params.organizationId,
    params.workOrderId,
    params.signatureUrl
  );
}

export async function setOperationsWorkOrderCompletionSignature(params: {
  orgSlug: string;
  id: string;
  signatureUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    const signatureUrl = String(params.signatureUrl || '').trim();

    if (!id) return { success: false, error: 'חסר מזהה קריאה' };
    if (!signatureUrl) return { success: false, error: 'חסר URL חתימה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id, organizationId: workspace.id },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה או שאין הרשאה' };

    await setOperationsWorkOrderCompletionSignatureUnsafe({ organizationId: workspace.id, workOrderId: id, signatureUrl });
    return { success: true };
  } catch (e: any) {
    console.error('[operations] setOperationsWorkOrderCompletionSignature failed', e);
    return { success: false, error: e?.message || 'שגיאה בשמירת חתימה' };
  }
}

export async function contractorSetWorkOrderCompletionSignature(params: {
  token: string;
  workOrderId: string;
  signatureUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    const signatureUrl = String(params.signatureUrl || '').trim();

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!signatureUrl) return { success: false, error: 'חסר URL חתימה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    await setOperationsWorkOrderCompletionSignatureUnsafe({
      organizationId: tokenOut.organizationId,
      workOrderId,
      signatureUrl,
    });

    return { success: true };
  } catch (e: any) {
    console.error('[operations] contractorSetWorkOrderCompletionSignature failed', e);
    return { success: false, error: e?.message || 'שגיאה בשמירת חתימה' };
  }
}

export async function addOperationsWorkOrderAttachment(params: {
  orgSlug: string;
  workOrderId: string;
  storageBucket?: string;
  storagePath: string;
  url: string;
  mimeType?: string | null;
  createdByType?: 'INTERNAL' | 'CONTRACTOR';
  createdByRef?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    const storagePath = String(params.storagePath || '').trim();
    const url = String(params.url || '').trim();
    const storageBucket = params.storageBucket ? String(params.storageBucket).trim() : 'operations-files';
    const createdByType = params.createdByType ? String(params.createdByType) : 'INTERNAL';
    const createdByRef = params.createdByRef ? String(params.createdByRef) : null;
    const mimeType = params.mimeType === undefined ? null : params.mimeType === null ? null : String(params.mimeType);

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!storagePath) return { success: false, error: 'חסר נתיב קובץ' };
    if (!url) return { success: false, error: 'חסר URL' };

    await ensureOperationsWorkOrderAttachmentsTable(prisma);

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: workspace.id },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה או שאין הרשאה' };

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO operations_work_order_attachments (
          organization_id,
          work_order_id,
          storage_bucket,
          storage_path,
          url,
          mime_type,
          created_by_type,
          created_by_ref
        ) VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, $7::text, $8::text)
      `,
      workspace.id,
      workOrderId,
      storageBucket,
      storagePath,
      url,
      mimeType,
      createdByType,
      createdByRef
    );

    return { success: true };
  } catch (e: any) {
    console.error('[operations] addOperationsWorkOrderAttachment failed', e);
    return { success: false, error: e?.message || 'שגיאה בשמירת קובץ לקריאה' };
  }
}

async function ensureOperationsStockMovementsTable(client: typeof prisma) {
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS operations_stock_movements (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id uuid NOT NULL,
      item_id uuid NOT NULL,
      work_order_id uuid NULL,
      qty numeric(12,3) NOT NULL,
      direction text NOT NULL,
      created_by_type text NOT NULL DEFAULT 'INTERNAL',
      created_by_ref text NULL,
      note text NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_operations_stock_movements_org_id ON operations_stock_movements (organization_id)`
  );
  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_operations_stock_movements_work_order_id ON operations_stock_movements (work_order_id)`
  );
  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_operations_stock_movements_item_id ON operations_stock_movements (item_id)`
  );
}

async function ensureOperationsLocationsTable(client: typeof prisma) {
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS operations_locations (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id uuid NOT NULL,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_operations_locations_org_id ON operations_locations (organization_id)`
  );
  await client.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_operations_locations_org_name ON operations_locations (organization_id, lower(name))`
  );
}

async function ensureOperationsWorkOrderTypesTable(client: typeof prisma) {
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS operations_work_order_types (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id uuid NOT NULL,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_operations_work_order_types_org_id ON operations_work_order_types (organization_id)`
  );
  await client.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_operations_work_order_types_org_name ON operations_work_order_types (organization_id, lower(name))`
  );
}

export async function getOperationsLocations(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsLocationRow[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    await ensureOperationsLocationsTable(prisma);

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT id::text as id, name, created_at
        FROM operations_locations
        WHERE organization_id = $1::uuid
        ORDER BY created_at DESC
      `,
      workspace.id
    )) as any[];

    return {
      success: true,
      data: rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  } catch (e: any) {
    console.error('[operations] getOperationsLocations failed', e);
    return { success: false, error: e?.message || 'שגיאה בטעינת מחסנים' };
  }
}

export async function createOperationsLocation(params: {
  orgSlug: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const name = String(params.name || '').trim();
    if (!name) return { success: false, error: 'חובה להזין שם מחסן' };

    await ensureOperationsLocationsTable(prisma);

    await prisma.$executeRawUnsafe(
      `INSERT INTO operations_locations (organization_id, name) VALUES ($1::uuid, $2::text)`
      ,
      workspace.id,
      name
    );

    return { success: true };
  } catch (e: any) {
    console.error('[operations] createOperationsLocation failed', e);
    const msg = String(e?.message || '');
    if (msg.toLowerCase().includes('uq_operations_locations_org_name')) {
      return { success: false, error: 'מחסן בשם הזה כבר קיים' };
    }
    return { success: false, error: e?.message || 'שגיאה ביצירת מחסן' };
  }
}

export async function deleteOperationsLocation(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה מחסן' };

    await ensureOperationsLocationsTable(prisma);

    await prisma.$executeRawUnsafe(
      `DELETE FROM operations_locations WHERE organization_id = $1::uuid AND id = $2::uuid`,
      workspace.id,
      id
    );

    return { success: true };
  } catch (e: any) {
    console.error('[operations] deleteOperationsLocation failed', e);
    return { success: false, error: e?.message || 'שגיאה במחיקת מחסן' };
  }
}

export async function getOperationsWorkOrderTypes(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderTypeRow[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    await ensureOperationsWorkOrderTypesTable(prisma);

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT id::text as id, name, created_at
        FROM operations_work_order_types
        WHERE organization_id = $1::uuid
        ORDER BY created_at DESC
      `,
      workspace.id
    )) as any[];

    return {
      success: true,
      data: rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  } catch (e: any) {
    console.error('[operations] getOperationsWorkOrderTypes failed', e);
    return { success: false, error: e?.message || 'שגיאה בטעינת סוגי קריאות' };
  }
}

export async function createOperationsWorkOrderType(params: {
  orgSlug: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const name = String(params.name || '').trim();
    if (!name) return { success: false, error: 'חובה להזין שם סוג קריאה' };

    await ensureOperationsWorkOrderTypesTable(prisma);

    await prisma.$executeRawUnsafe(
      `INSERT INTO operations_work_order_types (organization_id, name) VALUES ($1::uuid, $2::text)`,
      workspace.id,
      name
    );

    return { success: true };
  } catch (e: any) {
    console.error('[operations] createOperationsWorkOrderType failed', e);
    const msg = String(e?.message || '');
    if (msg.toLowerCase().includes('uq_operations_work_order_types_org_name')) {
      return { success: false, error: 'סוג קריאה בשם הזה כבר קיים' };
    }
    return { success: false, error: e?.message || 'שגיאה ביצירת סוג קריאה' };
  }
}

export async function deleteOperationsWorkOrderType(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה סוג קריאה' };

    await ensureOperationsWorkOrderTypesTable(prisma);

    await prisma.$executeRawUnsafe(
      `DELETE FROM operations_work_order_types WHERE organization_id = $1::uuid AND id = $2::uuid`,
      workspace.id,
      id
    );

    return { success: true };
  } catch (e: any) {
    console.error('[operations] deleteOperationsWorkOrderType failed', e);
    return { success: false, error: e?.message || 'שגיאה במחיקת סוג קריאה' };
  }
}

async function ensureOperationsContractorTokensTable(client: typeof prisma) {
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS operations_contractor_tokens (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id uuid NOT NULL,
      token_hash text NOT NULL,
      contractor_label text NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz NULL,
      created_by_ref text NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_operations_contractor_tokens_token_hash ON operations_contractor_tokens (token_hash)`
  );
  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_operations_contractor_tokens_org_id ON operations_contractor_tokens (organization_id)`
  );
}

async function ensureOperationsWorkOrderAttachmentsTable(client: typeof prisma) {
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS operations_work_order_attachments (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id uuid NOT NULL,
      work_order_id uuid NOT NULL,
      storage_bucket text NOT NULL DEFAULT 'operations-files',
      storage_path text NOT NULL,
      url text NOT NULL,
      mime_type text NULL,
      created_by_type text NOT NULL DEFAULT 'INTERNAL',
      created_by_ref text NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_ops_wo_attachments_org_id ON operations_work_order_attachments (organization_id)`
  );
  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_ops_wo_attachments_work_order_id ON operations_work_order_attachments (work_order_id)`
  );
}

async function ensureOperationsWorkOrderCheckinsTable(client: typeof prisma) {
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS operations_work_order_checkins (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id uuid NOT NULL,
      work_order_id uuid NOT NULL,
      lat double precision NOT NULL,
      lng double precision NOT NULL,
      accuracy double precision NULL,
      created_by_type text NOT NULL DEFAULT 'INTERNAL',
      created_by_ref text NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_ops_wo_checkins_org_id ON operations_work_order_checkins (organization_id)`
  );
  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_ops_wo_checkins_work_order_id ON operations_work_order_checkins (work_order_id)`
  );
}

async function ensureOperationsWorkOrdersDispatchColumns(client: typeof prisma) {
  await client.$executeRawUnsafe(`
    ALTER TABLE operations_work_orders
    ADD COLUMN IF NOT EXISTS assigned_technician_id uuid NULL;
  `);

  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_operations_work_orders_assigned_technician_id ON operations_work_orders (assigned_technician_id)`
  );
}

async function ensureOperationsWorkOrdersSignatureColumns(client: typeof prisma) {
  await client.$executeRawUnsafe(`
    ALTER TABLE operations_work_orders
    ADD COLUMN IF NOT EXISTS completion_signature_url text NULL;
  `);

  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_operations_work_orders_completion_signature_url ON operations_work_orders (completion_signature_url)`
  );
}

async function ensureOperationsWorkOrdersLocationColumns(client: typeof prisma) {
  await client.$executeRawUnsafe(`
    ALTER TABLE operations_work_orders
    ADD COLUMN IF NOT EXISTS installation_lat double precision NULL;
  `);
  await client.$executeRawUnsafe(`
    ALTER TABLE operations_work_orders
    ADD COLUMN IF NOT EXISTS installation_lng double precision NULL;
  `);
  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_operations_work_orders_installation_lat ON operations_work_orders (installation_lat)`
  );
  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_operations_work_orders_installation_lng ON operations_work_orders (installation_lng)`
  );
}

async function geocodeAddressNominatim(address: string): Promise<{ lat: number; lng: number } | null> {
  const q = String(address || '').trim();
  if (!q) return null;

  const userAgent =
    (process.env.NOMINATIM_USER_AGENT && String(process.env.NOMINATIM_USER_AGENT).trim()) ||
    'MisradCRM/1.0';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'he-IL,he,en-US,en',
        'User-Agent': userAgent,
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const first = Array.isArray(data) ? data[0] : null;
    const lat = first?.lat ? Number(first.lat) : NaN;
    const lng = first?.lon ? Number(first.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getOperationsTechnicianOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsTechnicianOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const profiles = await prisma.profile.findMany({
      where: { organizationId: workspace.id },
      select: { id: true, email: true, fullName: true },
      orderBy: [{ fullName: 'asc' }, { createdAt: 'asc' }],
      take: 2000,
    });

    const options: OperationsTechnicianOption[] = (profiles || [])
      .map((p) => {
        const id = String(p.id || '').trim();
        const name = p.fullName ? String(p.fullName).trim() : '';
        const email = p.email ? String(p.email).trim().toLowerCase() : '';
        const label = name || email || id;
        if (!id || !label) return null;
        return { id, label };
      })
      .filter(Boolean) as OperationsTechnicianOption[];

    options.sort((a, b) => a.label.localeCompare(b.label, 'he'));
    return { success: true, data: options };
  } catch (e: any) {
    console.error('[operations] getOperationsTechnicianOptions failed', e);
    return { success: false, error: e?.message || 'שגיאה בטעינת רשימת הטכנאים' };
  }
}

export async function setOperationsWorkOrderAssignedTechnician(params: {
  orgSlug: string;
  id: string;
  technicianId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    const technicianIdRaw = params.technicianId === null ? null : String(params.technicianId || '').trim();
    const technicianId = technicianIdRaw ? technicianIdRaw : null;

    if (!id) return { success: false, error: 'חסר מזהה קריאה' };

    await ensureOperationsWorkOrdersDispatchColumns(prisma);
    await ensureOperationsWorkOrdersLocationColumns(prisma);
    await ensureOperationsWorkOrdersSignatureColumns(prisma);

    if (technicianId) {
      const tech = await prisma.profile.findFirst({
        where: { id: technicianId, organizationId: workspace.id },
        select: { id: true },
      });
      if (!tech?.id) {
        return { success: false, error: 'טכנאי לא תקין או שאין הרשאה' };
      }

      await prisma.$executeRawUnsafe(
        `UPDATE operations_work_orders SET assigned_technician_id = $1::uuid WHERE id = $2::uuid AND organization_id = $3::uuid`,
        technicianId,
        id,
        workspace.id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE operations_work_orders SET assigned_technician_id = NULL WHERE id = $1::uuid AND organization_id = $2::uuid`,
        id,
        workspace.id
      );
    }

    return { success: true };
  } catch (e: any) {
    console.error('[operations] setOperationsWorkOrderAssignedTechnician failed', e);
    return { success: false, error: e?.message || 'שגיאה בשיוך טכנאי לקריאה' };
  }
}

export async function getOperationsWorkOrderAttachments(params: {
  orgSlug: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderAttachmentRow[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    await ensureOperationsWorkOrderAttachmentsTable(prisma);

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT id::text as id, url, mime_type, created_at
        FROM operations_work_order_attachments
        WHERE organization_id = $1::uuid
          AND work_order_id = $2::uuid
        ORDER BY created_at DESC
      `,
      workspace.id,
      workOrderId
    )) as any[];

    return {
      success: true,
      data: rows.map((r) => ({
        id: String(r.id),
        url: String(r.url),
        mimeType: r.mime_type ? String(r.mime_type) : null,
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  } catch (e: any) {
    console.error('[operations] getOperationsWorkOrderAttachments failed', e);
    return { success: false, error: e?.message || 'שגיאה בטעינת קבצים לקריאה' };
  }
}

export async function getOperationsWorkOrderCheckins(params: {
  orgSlug: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderCheckinRow[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    await ensureOperationsWorkOrderCheckinsTable(prisma);

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT id::text as id, lat, lng, accuracy, created_at
        FROM operations_work_order_checkins
        WHERE organization_id = $1::uuid
          AND work_order_id = $2::uuid
        ORDER BY created_at DESC
        LIMIT 20
      `,
      workspace.id,
      workOrderId
    )) as any[];

    return {
      success: true,
      data: rows.map((r) => ({
        id: String(r.id),
        lat: Number(r.lat),
        lng: Number(r.lng),
        accuracy: r.accuracy === null || r.accuracy === undefined ? null : Number(r.accuracy),
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  } catch (e: any) {
    console.error('[operations] getOperationsWorkOrderCheckins failed', e);
    return { success: false, error: e?.message || 'שגיאה בטעינת Check-In לקריאה' };
  }
}

export async function addOperationsWorkOrderCheckin(params: {
  orgSlug: string;
  workOrderId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  createdByType?: 'INTERNAL' | 'CONTRACTOR';
  createdByRef?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    const lat = Number(params.lat);
    const lng = Number(params.lng);
    const accuracy = params.accuracy === undefined ? null : params.accuracy === null ? null : Number(params.accuracy);
    const createdByType = params.createdByType ? String(params.createdByType) : 'INTERNAL';
    const createdByRef = params.createdByRef ? String(params.createdByRef) : null;

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { success: false, error: 'מיקום לא תקין' };

    await ensureOperationsWorkOrderCheckinsTable(prisma);

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: workspace.id },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה או שאין הרשאה' };

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO operations_work_order_checkins (organization_id, work_order_id, lat, lng, accuracy, created_by_type, created_by_ref)
        VALUES ($1::uuid, $2::uuid, $3::double precision, $4::double precision, $5::double precision, $6::text, $7::text)
      `,
      workspace.id,
      workOrderId,
      lat,
      lng,
      accuracy,
      createdByType,
      createdByRef
    );

    return { success: true };
  } catch (e: any) {
    console.error('[operations] addOperationsWorkOrderCheckin failed', e);
    return { success: false, error: e?.message || 'שגיאה בשמירת Check-In' };
  }
}

async function resolveOperationsContractorToken(token: string): Promise<{
  ok: boolean;
  organizationId?: string;
  contractorLabel?: string | null;
  tokenHash?: string;
  error?: string;
}> {
  const t = String(token || '').trim();
  if (!t) return { ok: false, error: 'טוקן חסר' };

  await ensureOperationsContractorTokensTable(prisma);
  const tokenHash = hashPortalToken(t);

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT organization_id::text as organization_id, contractor_label, expires_at, revoked_at
      FROM operations_contractor_tokens
      WHERE token_hash = $1::text
      LIMIT 1
    `,
    tokenHash
  )) as any[];

  const row = rows?.[0];
  if (!row?.organization_id) return { ok: false, error: 'טוקן לא תקין' };
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const revokedAt = row.revoked_at ? new Date(row.revoked_at) : null;
  if (revokedAt) return { ok: false, error: 'טוקן בוטל' };
  if (!expiresAt || expiresAt.getTime() < Date.now()) return { ok: false, error: 'טוקן פג תוקף' };

  return {
    ok: true,
    organizationId: String(row.organization_id),
    contractorLabel: row.contractor_label ? String(row.contractor_label) : null,
    tokenHash,
  };
}

export async function contractorResolveTokenForApi(params: {
  token: string;
}): Promise<{ success: boolean; organizationId?: string; tokenHash?: string; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) {
      return { success: false, error: tokenOut.error || 'גישה נדחתה' };
    }
    return { success: true, organizationId: tokenOut.organizationId, tokenHash: tokenOut.tokenHash };
  } catch (e: any) {
    console.error('[operations] contractorResolveTokenForApi failed', e);
    return { success: false, error: e?.message || 'שגיאה באימות טוקן' };
  }
}

export async function contractorValidateWorkOrderAccess(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) {
      return { success: false, error: tokenOut.error || 'גישה נדחתה' };
    }

    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    return { success: true, organizationId: tokenOut.organizationId };
  } catch (e: any) {
    console.error('[operations] contractorValidateWorkOrderAccess failed', e);
    return { success: false, error: e?.message || 'שגיאה באימות גישה' };
  }
}

export async function contractorGetWorkOrderAttachments(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderAttachmentRow[]; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    await ensureOperationsWorkOrderAttachmentsTable(prisma);

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT id::text as id, url, mime_type, created_at
        FROM operations_work_order_attachments
        WHERE organization_id = $1::uuid
          AND work_order_id = $2::uuid
        ORDER BY created_at DESC
      `,
      tokenOut.organizationId,
      workOrderId
    )) as any[];

    return {
      success: true,
      data: rows.map((r) => ({
        id: String(r.id),
        url: String(r.url),
        mimeType: r.mime_type ? String(r.mime_type) : null,
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  } catch (e: any) {
    console.error('[operations] contractorGetWorkOrderAttachments failed', e);
    return { success: false, error: e?.message || 'שגיאה בטעינת קבצים' };
  }
}

export async function contractorAddWorkOrderAttachment(params: {
  token: string;
  workOrderId: string;
  storageBucket?: string;
  storagePath: string;
  url: string;
  mimeType?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    const storagePath = String(params.storagePath || '').trim();
    const url = String(params.url || '').trim();
    const storageBucket = params.storageBucket ? String(params.storageBucket).trim() : 'operations-files';
    const mimeType = params.mimeType === undefined ? null : params.mimeType === null ? null : String(params.mimeType);

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!storagePath) return { success: false, error: 'חסר נתיב קובץ' };
    if (!url) return { success: false, error: 'חסר URL' };

    await ensureOperationsWorkOrderAttachmentsTable(prisma);

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO operations_work_order_attachments (
          organization_id,
          work_order_id,
          storage_bucket,
          storage_path,
          url,
          mime_type,
          created_by_type,
          created_by_ref
        ) VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, 'CONTRACTOR', $7::text)
      `,
      tokenOut.organizationId,
      workOrderId,
      storageBucket,
      storagePath,
      url,
      mimeType,
      tokenOut.tokenHash ? String(tokenOut.tokenHash) : null
    );

    return { success: true };
  } catch (e: any) {
    console.error('[operations] contractorAddWorkOrderAttachment failed', e);
    return { success: false, error: e?.message || 'שגיאה בשמירת קובץ' };
  }
}

export async function contractorGetWorkOrderCheckins(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderCheckinRow[]; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    await ensureOperationsWorkOrderCheckinsTable(prisma);

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT id::text as id, lat, lng, accuracy, created_at
        FROM operations_work_order_checkins
        WHERE organization_id = $1::uuid
          AND work_order_id = $2::uuid
        ORDER BY created_at DESC
        LIMIT 20
      `,
      tokenOut.organizationId,
      workOrderId
    )) as any[];

    return {
      success: true,
      data: rows.map((r) => ({
        id: String(r.id),
        lat: Number(r.lat),
        lng: Number(r.lng),
        accuracy: r.accuracy === null || r.accuracy === undefined ? null : Number(r.accuracy),
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  } catch (e: any) {
    console.error('[operations] contractorGetWorkOrderCheckins failed', e);
    return { success: false, error: e?.message || 'שגיאה בטעינת Check-Ins' };
  }
}

export async function contractorAddWorkOrderCheckin(params: {
  token: string;
  workOrderId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    const lat = Number(params.lat);
    const lng = Number(params.lng);
    const accuracy = params.accuracy === undefined ? null : params.accuracy === null ? null : Number(params.accuracy);

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { success: false, error: 'מיקום לא תקין' };

    await ensureOperationsWorkOrderCheckinsTable(prisma);

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO operations_work_order_checkins (organization_id, work_order_id, lat, lng, accuracy, created_by_type, created_by_ref)
        VALUES ($1::uuid, $2::uuid, $3::double precision, $4::double precision, $5::double precision, 'CONTRACTOR', $6::text)
      `,
      tokenOut.organizationId,
      workOrderId,
      lat,
      lng,
      accuracy,
      tokenOut.tokenHash ? String(tokenOut.tokenHash) : null
    );

    return { success: true };
  } catch (e: any) {
    console.error('[operations] contractorAddWorkOrderCheckin failed', e);
    return { success: false, error: e?.message || 'שגיאה בשמירת Check-In' };
  }
}

export async function getOperationsInventoryOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsInventoryOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const rows = await prisma.operationsInventory.findMany({
      where: { organizationId: workspace.id },
      orderBy: { item: { name: 'asc' } },
      select: {
        id: true,
        onHand: true,
        item: { select: { id: true, name: true, unit: true, sku: true } },
      },
    });

    const data: OperationsInventoryOption[] = rows.map((r) => {
      const sku = r.item.sku ? String(r.item.sku) : '';
      const label = sku ? `${r.item.name} (${sku})` : r.item.name;
      return {
        inventoryId: r.id,
        itemId: r.item.id,
        label,
        onHand: toNumberSafe(r.onHand),
        unit: r.item.unit ? String(r.item.unit) : null,
      };
    });

    return { success: true, data };
  } catch (e: any) {
    console.error('[operations] getOperationsInventoryOptions failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בטעינת רשימת המלאי',
    };
  }
}

export async function consumeOperationsInventoryForWorkOrder(params: {
  orgSlug: string;
  workOrderId: string;
  inventoryId: string;
  qty: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    const inventoryId = String(params.inventoryId || '').trim();
    const qty = Number(params.qty);

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!inventoryId) return { success: false, error: 'חובה לבחור פריט' };
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'כמות לא תקינה' };

    await ensureOperationsStockMovementsTable(prisma);

    await prisma.$transaction(async (tx) => {
      const wo = await tx.operationsWorkOrder.findFirst({
        where: { id: workOrderId, organizationId: workspace.id },
        select: { id: true },
      });
      if (!wo?.id) {
        throw new Error('קריאה לא נמצאה או שאין הרשאה');
      }

      const inv = await tx.operationsInventory.findFirst({
        where: { id: inventoryId, organizationId: workspace.id },
        select: { id: true, itemId: true },
      });
      if (!inv?.id) {
        throw new Error('פריט מלאי לא נמצא או שאין הרשאה');
      }

      const updated = await tx.operationsInventory.updateMany({
        where: { id: inv.id, organizationId: workspace.id, onHand: { gte: qty } },
        data: { onHand: { decrement: qty } },
      });
      if (updated.count !== 1) {
        throw new Error('אין מספיק מלאי');
      }

      await tx.$executeRawUnsafe(
        `INSERT INTO operations_stock_movements (organization_id, item_id, work_order_id, qty, direction, created_by_type) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::numeric, 'OUT', 'INTERNAL')`,
        workspace.id,
        inv.itemId,
        workOrderId,
        qty
      );
    });

    return { success: true };
  } catch (e: any) {
    console.error('[operations] consumeOperationsInventoryForWorkOrder failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בהורדת מלאי',
    };
  }
}

export async function getOperationsMaterialsForWorkOrder(params: {
  orgSlug: string;
  workOrderId: string;
}): Promise<{
  success: boolean;
  data?: Array<{ id: string; itemLabel: string; qty: number; createdAt: string }>;
  error?: string;
}> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    await ensureOperationsStockMovementsTable(prisma);

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          m.id::text as id,
          m.qty::numeric as qty,
          m.created_at as created_at,
          i.name as item_name,
          i.sku as item_sku
        FROM operations_stock_movements m
        JOIN operations_items i ON i.id = m.item_id
        WHERE m.organization_id = $1::uuid
          AND m.work_order_id = $2::uuid
        ORDER BY m.created_at DESC
      `,
      workspace.id,
      workOrderId
    )) as any[];

    return {
      success: true,
      data: rows.map((r) => {
        const sku = r.item_sku ? String(r.item_sku) : '';
        const label = sku ? `${String(r.item_name)} (${sku})` : String(r.item_name);
        return {
          id: String(r.id),
          itemLabel: label,
          qty: Number(r.qty),
          createdAt: new Date(r.created_at).toISOString(),
        };
      }),
    };
  } catch (e: any) {
    console.error('[operations] getOperationsMaterialsForWorkOrder failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בטעינת חומרים לקריאה',
    };
  }
}

function generatePortalToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function hashPortalToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createOperationsContractorToken(params: {
  orgSlug: string;
  contractorLabel?: string;
  ttlHours?: number;
}): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    await ensureOperationsContractorTokensTable(prisma);

    const token = generatePortalToken();
    const tokenHash = hashPortalToken(token);
    const ttlHours = Number.isFinite(Number(params.ttlHours)) ? Math.max(1, Number(params.ttlHours)) : 72;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    const contractorLabel = params.contractorLabel ? String(params.contractorLabel).trim() : null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO operations_contractor_tokens (organization_id, token_hash, contractor_label, expires_at) VALUES ($1::uuid, $2::text, $3::text, $4::timestamptz)`,
      workspace.id,
      tokenHash,
      contractorLabel,
      expiresAt.toISOString()
    );

    return { success: true, token };
  } catch (e: any) {
    console.error('[operations] createOperationsContractorToken failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה ביצירת טוקן קבלן',
    };
  }
}

export async function getOperationsContractorPortalData(params: {
  token: string;
}): Promise<{
  success: boolean;
  data?: {
    organizationId: string | null;
    orgSlug: string | null;
    contractorLabel: string | null;
    workOrders: Array<{
      id: string;
      title: string;
      status: OperationsWorkOrderStatus;
      projectTitle: string;
      installationAddress: string | null;
      scheduledStart: string | null;
    }>;
  };
  error?: string;
}> {
  try {
    const token = String(params.token || '').trim();
    if (!token) return { success: false, error: 'טוקן חסר' };

    await ensureOperationsContractorTokensTable(prisma);

    const tokenHash = hashPortalToken(token);
    const tokenRow = (await prisma.$queryRawUnsafe(
      `
        SELECT organization_id::text as organization_id, contractor_label, expires_at, revoked_at
        FROM operations_contractor_tokens
        WHERE token_hash = $1::text
        LIMIT 1
      `,
      tokenHash
    )) as any[];

    const row = tokenRow?.[0];
    if (!row?.organization_id) {
      return { success: false, error: 'טוקן לא תקין' };
    }

    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    const revokedAt = row.revoked_at ? new Date(row.revoked_at) : null;
    if (revokedAt) return { success: false, error: 'טוקן בוטל' };
    if (!expiresAt || expiresAt.getTime() < Date.now()) return { success: false, error: 'טוקן פג תוקף' };

    const organizationId = String(row.organization_id);

    const org = await prisma.social_organizations.findFirst({
      where: { id: organizationId },
      select: { slug: true },
    });

    const workOrders = await prisma.operationsWorkOrder.findMany({
      where: { organizationId, status: { not: 'DONE' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        installationAddress: true,
        scheduledStart: true,
        project: { select: { title: true } },
      },
    });

    return {
      success: true,
      data: {
        organizationId,
        orgSlug: org?.slug ? String(org.slug) : null,
        contractorLabel: row.contractor_label ? String(row.contractor_label) : null,
        workOrders: workOrders.map((w) => ({
          id: w.id,
          title: w.title,
          status: String(w.status) as OperationsWorkOrderStatus,
          projectTitle: w.project.title,
          installationAddress: w.installationAddress ? String(w.installationAddress) : null,
          scheduledStart: w.scheduledStart ? w.scheduledStart.toISOString() : null,
        })),
      },
    };
  } catch (e: any) {
    console.error('[operations] getOperationsContractorPortalData failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בטעינת פורטל קבלן',
    };
  }
}

export async function contractorMarkWorkOrderDone(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const token = String(params.token || '').trim();
    const workOrderId = String(params.workOrderId || '').trim();
    if (!token) return { success: false, error: 'טוקן חסר' };
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    await ensureOperationsContractorTokensTable(prisma);

    const tokenHash = hashPortalToken(token);
    const tokenRow = (await prisma.$queryRawUnsafe(
      `
        SELECT organization_id::text as organization_id, expires_at, revoked_at
        FROM operations_contractor_tokens
        WHERE token_hash = $1::text
        LIMIT 1
      `,
      tokenHash
    )) as any[];

    const row = tokenRow?.[0];
    if (!row?.organization_id) {
      return { success: false, error: 'טוקן לא תקין' };
    }

    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    const revokedAt = row.revoked_at ? new Date(row.revoked_at) : null;
    if (revokedAt) return { success: false, error: 'טוקן בוטל' };
    if (!expiresAt || expiresAt.getTime() < Date.now()) return { success: false, error: 'טוקן פג תוקף' };

    const organizationId = String(row.organization_id);

    await prisma.operationsWorkOrder.updateMany({
      where: { id: workOrderId, organizationId },
      data: { status: 'DONE' },
    });

    return { success: true };
  } catch (e: any) {
    console.error('[operations] contractorMarkWorkOrderDone failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בעדכון סטטוס',
    };
  }
}

async function resolveClientNamesByCanonicalId(canonicalClientIds: string[]): Promise<Map<string, string>> {
  const [nexusClients, misradClients, clientClients] = await Promise.all([
    canonicalClientIds.length
      ? prisma.nexusClient.findMany({
          where: { id: { in: canonicalClientIds } },
          select: { id: true, companyName: true, name: true },
        })
      : Promise.resolve([]),
    canonicalClientIds.length
      ? prisma.misradClient.findMany({
          where: { id: { in: canonicalClientIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    canonicalClientIds.length
      ? prisma.clientClient.findMany({
          where: { id: { in: canonicalClientIds } },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([]),
  ]);

  const clientNameById = new Map<string, string>();

  for (const c of nexusClients as any[]) {
    const label = String(c.companyName || c.name || '').trim();
    if (label) clientNameById.set(String(c.id), label);
  }

  for (const c of misradClients as any[]) {
    const label = String(c.name || '').trim();
    if (label && !clientNameById.has(String(c.id))) clientNameById.set(String(c.id), label);
  }

  for (const c of clientClients as any[]) {
    const label = String(c.fullName || '').trim();
    if (label && !clientNameById.has(String(c.id))) clientNameById.set(String(c.id), label);
  }

  return clientNameById;
}

export async function getOperationsDashboardData(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsDashboardData; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const recentProjects = (await prisma.operationsProject.findMany({
      where: { organizationId: workspace.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        canonicalClientId: true,
        updatedAt: true,
      },
    })) as unknown as OperationsDashboardProjectRow[];

    const canonicalClientIds = Array.from(
      new Set(recentProjects.map((p) => p.canonicalClientId).filter(Boolean))
    ) as string[];

    const clientNameById = await resolveClientNamesByCanonicalId(canonicalClientIds);

    const inventoryRows = await prisma.operationsInventory.findMany({
      where: { organizationId: workspace.id },
      select: { onHand: true, minLevel: true },
    });

    let ok = 0;
    let low = 0;
    let critical = 0;

    for (const row of inventoryRows as any[]) {
      const onHand = toNumberSafe(row.onHand);
      const minLevel = toNumberSafe(row.minLevel);

      if (onHand <= 0) {
        critical += 1;
        continue;
      }

      if (minLevel > 0 && onHand < minLevel) {
        low += 1;
        continue;
      }

      ok += 1;
    }

    const data: OperationsDashboardData = {
      recentProjects: recentProjects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        clientName: p.canonicalClientId ? clientNameById.get(p.canonicalClientId) ?? null : null,
        updatedAt: p.updatedAt.toISOString(),
      })),
      inventorySummary: {
        ok,
        low,
        critical,
        total: inventoryRows.length,
      },
    };

    return { success: true, data };
  } catch (e: any) {
    console.error('[operations] getOperationsDashboardData failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בטעינת נתוני הדשבורד',
    };
  }
}

export async function getOperationsProjectsData(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsProjectsData; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const projects = await prisma.operationsProject.findMany({
      where: { organizationId: workspace.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        canonicalClientId: true,
        createdAt: true,
      },
    });

    const canonicalClientIds = Array.from(
      new Set(projects.map((p) => p.canonicalClientId).filter(Boolean))
    ) as string[];

    const clientNameById = await resolveClientNamesByCanonicalId(canonicalClientIds);

    const data: OperationsProjectsData = {
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        clientName: p.canonicalClientId ? clientNameById.get(p.canonicalClientId) ?? null : null,
        createdAt: p.createdAt.toISOString(),
      })),
    };

    return { success: true, data };
  } catch (e: any) {
    console.error('[operations] getOperationsProjectsData failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בטעינת הפרויקטים',
    };
  }
}

export async function getOperationsInventoryData(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsInventoryData; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const rows = await prisma.operationsInventory.findMany({
      where: { organizationId: workspace.id },
      orderBy: { item: { name: 'asc' } },
      select: {
        id: true,
        onHand: true,
        minLevel: true,
        item: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
    });

    const data: OperationsInventoryData = {
      items: rows.map((r) => ({
        id: r.id,
        itemName: r.item.name,
        sku: r.item.sku,
        onHand: toNumberSafe(r.onHand),
        minLevel: toNumberSafe(r.minLevel),
      })),
    };

    return { success: true, data };
  } catch (e: any) {
    console.error('[operations] getOperationsInventoryData failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בטעינת המלאי',
    };
  }
}

export async function getOperationsProjectOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsProjectOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const rows = await prisma.operationsProject.findMany({
      where: { organizationId: workspace.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true },
    });

    return {
      success: true,
      data: rows.map((p) => ({ id: p.id, title: p.title })),
    };
  } catch (e: any) {
    console.error('[operations] getOperationsProjectOptions failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בטעינת רשימת הפרויקטים',
    };
  }
}

export async function getOperationsWorkOrdersData(params: {
  orgSlug: string;
  status?: 'OPEN' | 'ALL' | OperationsWorkOrderStatus;
  projectId?: string;
  assignedTechnicianId?: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrdersData; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const status = params.status || 'OPEN';
    const projectId = params.projectId ? String(params.projectId).trim() : '';
    const assignedTechnicianId = params.assignedTechnicianId ? String(params.assignedTechnicianId).trim() : '';

    await ensureOperationsWorkOrdersDispatchColumns(prisma);

    const values: any[] = [workspace.id];
    let idx = values.length;

    let whereSql = `wo.organization_id = $1::uuid`;

    if (projectId) {
      idx += 1;
      values.push(projectId);
      whereSql += ` AND wo.project_id = $${idx}::uuid`;
    }

    if (status === 'OPEN') {
      whereSql += ` AND wo.status <> 'DONE'`;
    } else if (status !== 'ALL') {
      idx += 1;
      values.push(status);
      whereSql += ` AND wo.status = $${idx}::text`;
    }

    if (assignedTechnicianId) {
      idx += 1;
      values.push(assignedTechnicianId);
      whereSql += ` AND wo.assigned_technician_id = $${idx}::uuid`;
    }

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          wo.id::text as id,
          wo.title as title,
          wo.status as status,
          wo.project_id::text as project_id,
          p.title as project_title,
          wo.assigned_technician_id::text as assigned_technician_id,
          wo.installation_lat as installation_lat,
          wo.installation_lng as installation_lng,
          wo.created_at as created_at
        FROM operations_work_orders wo
        JOIN operations_projects p
          ON p.id = wo.project_id
        WHERE ${whereSql}
        ORDER BY wo.created_at DESC
      `,
      ...values
    )) as any[];

    const technicianIds = Array.from(
      new Set(rows.map((r) => (r as any).assigned_technician_id).filter(Boolean).map((v) => String(v)))
    ) as string[];

    const technicians = technicianIds.length
      ? await prisma.profile.findMany({
          where: { organizationId: workspace.id, id: { in: technicianIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];

    const techById = new Map<string, string>();
    for (const t of technicians) {
      techById.set(String(t.id), String(t.fullName || t.email || t.id));
    }

    const data: OperationsWorkOrdersData = {
      workOrders: rows.map((r) => ({
        id: String((r as any).id),
        title: String((r as any).title),
        projectId: String((r as any).project_id),
        projectTitle: String((r as any).project_title),
        status: String((r as any).status) as OperationsWorkOrderStatus,
        technicianLabel: (r as any).assigned_technician_id ? techById.get(String((r as any).assigned_technician_id)) ?? null : null,
        installationLat:
          (r as any).installation_lat === null || (r as any).installation_lat === undefined
            ? null
            : Number((r as any).installation_lat),
        installationLng:
          (r as any).installation_lng === null || (r as any).installation_lng === undefined
            ? null
            : Number((r as any).installation_lng),
      })),
    };

    return { success: true, data };
  } catch (e: any) {
    console.error('[operations] getOperationsWorkOrdersData failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בטעינת הקריאות',
    };
  }
}

export async function createOperationsWorkOrder(params: {
  orgSlug: string;
  projectId: string;
  title: string;
  description?: string;
  scheduledStart?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const projectId = String(params.projectId || '').trim();
    const title = String(params.title || '').trim();
    const description = String(params.description || '').trim();
    const scheduledStartRaw = String(params.scheduledStart || '').trim();

    if (!title) {
      return { success: false, error: 'חובה להזין כותרת' };
    }

    if (!projectId) {
      return { success: false, error: 'חובה לשייך פרויקט' };
    }

    const project = await prisma.operationsProject.findFirst({
      where: { id: projectId, organizationId: workspace.id },
      select: {
        id: true,
        installationAddress: true,
        addressNormalized: true,
      },
    });

    if (!project?.id) {
      return { success: false, error: 'פרויקט לא נמצא או שאין הרשאה' };
    }

    let scheduledStart: Date | null = null;
    if (scheduledStartRaw) {
      const d = new Date(scheduledStartRaw);
      if (!Number.isNaN(d.getTime())) {
        scheduledStart = d;
      }
    }

    await ensureOperationsWorkOrdersLocationColumns(prisma);

    const created = await prisma.operationsWorkOrder.create({
      data: {
        organizationId: workspace.id,
        projectId: project.id,
        title,
        description: description ? description : null,
        status: 'NEW',
        scheduledStart,
        installationAddress: project.installationAddress,
        addressNormalized: project.addressNormalized,
      },
      select: { id: true },
    });

    const address = project.installationAddress ? String(project.installationAddress) : '';
    if (address) {
      const coords = await geocodeAddressNominatim(address);
      if (coords) {
        await prisma.$executeRawUnsafe(
          `
            UPDATE operations_work_orders
            SET installation_lat = $1::double precision,
                installation_lng = $2::double precision
            WHERE organization_id = $3::uuid
              AND id = $4::uuid
          `,
          coords.lat,
          coords.lng,
          workspace.id,
          created.id
        );
      }
    }

    return { success: true, id: created.id };
  } catch (e: any) {
    console.error('[operations] createOperationsWorkOrder failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה ביצירת קריאה',
    };
  }
}

export async function getOperationsWorkOrderById(params: {
  orgSlug: string;
  id: string;
}): Promise<{
  success: boolean;
  data?: {
    id: string;
    title: string;
    description: string | null;
    status: OperationsWorkOrderStatus;
    scheduledStart: string | null;
    installationAddress: string | null;
    project: { id: string; title: string };
    assignedTechnicianId: string | null;
    technicianLabel: string | null;
    completionSignatureUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    if (!id) {
      return { success: false, error: 'חסר מזהה קריאה' };
    }

    await ensureOperationsWorkOrdersDispatchColumns(prisma);

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          wo.id::text as id,
          wo.title as title,
          wo.description as description,
          wo.status as status,
          wo.scheduled_start as scheduled_start,
          wo.installation_address as installation_address,
          wo.completion_signature_url as completion_signature_url,
          wo.created_at as created_at,
          wo.updated_at as updated_at,
          wo.project_id::text as project_id,
          p.title as project_title,
          wo.assigned_technician_id::text as assigned_technician_id
        FROM operations_work_orders wo
        JOIN operations_projects p
          ON p.id = wo.project_id
        WHERE wo.organization_id = $1::uuid
          AND wo.id = $2::uuid
        LIMIT 1
      `,
      workspace.id,
      id
    )) as any[];

    const row = rows?.[0];
    if (!row?.id) {
      return { success: false, error: 'קריאה לא נמצאה' };
    }

    const assignedTechnicianId = row.assigned_technician_id ? String(row.assigned_technician_id) : null;
    let technicianLabel: string | null = null;
    if (assignedTechnicianId) {
      const tech = await prisma.profile.findFirst({
        where: { id: assignedTechnicianId, organizationId: workspace.id },
        select: { id: true, fullName: true, email: true },
      });
      technicianLabel = tech?.id ? String(tech.fullName || tech.email || tech.id) : null;
    }

    return {
      success: true,
      data: {
        id: String(row.id),
        title: String(row.title),
        description: row.description === null || row.description === undefined ? null : String(row.description),
        status: String(row.status) as OperationsWorkOrderStatus,
        scheduledStart: row.scheduled_start ? new Date(row.scheduled_start).toISOString() : null,
        installationAddress: row.installation_address ? String(row.installation_address) : null,
        project: { id: String(row.project_id), title: String(row.project_title) },
        assignedTechnicianId,
        technicianLabel,
        completionSignatureUrl: row.completion_signature_url ? String(row.completion_signature_url) : null,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
      },
    };
  } catch (e: any) {
    console.error('[operations] getOperationsWorkOrderById failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בטעינת הקריאה',
    };
  }
}

export async function setOperationsWorkOrderStatus(params: {
  orgSlug: string;
  id: string;
  status: OperationsWorkOrderStatus;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    const status = String(params.status || '').trim() as OperationsWorkOrderStatus;

    if (!id) {
      return { success: false, error: 'חסר מזהה קריאה' };
    }

    if (status !== 'NEW' && status !== 'IN_PROGRESS' && status !== 'DONE') {
      return { success: false, error: 'סטטוס לא חוקי' };
    }

    await prisma.operationsWorkOrder.updateMany({
      where: { id, organizationId: workspace.id },
      data: { status },
    });

    return { success: true };
  } catch (e: any) {
    console.error('[operations] setOperationsWorkOrderStatus failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה בעדכון סטטוס קריאה',
    };
  }
}

export async function createOperationsProject(params: {
  orgSlug: string;
  title: string;
  canonicalClientId: string;
  installationAddress?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const title = String(params.title || '').trim();
    const canonicalClientId = String(params.canonicalClientId || '').trim();
    const installationAddress = String(params.installationAddress || '').trim();

    if (!title) {
      return { success: false, error: 'חובה להזין שם פרויקט' };
    }

    if (!canonicalClientId) {
      return { success: false, error: 'חובה לבחור לקוח' };
    }

    const created = await prisma.operationsProject.create({
      data: {
        organizationId: workspace.id,
        canonicalClientId,
        title,
        status: 'ACTIVE',
        installationAddress: installationAddress ? installationAddress : null,
        addressNormalized: installationAddress ? normalizeAddress(installationAddress) : null,
      },
      select: { id: true },
    });

    return { success: true, id: created.id };
  } catch (e: any) {
    console.error('[operations] createOperationsProject failed', e);
    return {
      success: false,
      error: e?.message || 'שגיאה ביצירת פרויקט',
    };
  }
}
