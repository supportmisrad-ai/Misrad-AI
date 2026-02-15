import 'server-only';

import { orgExec, prisma } from '@/lib/services/operations/db';
import {
  ALLOW_SCHEMA_FALLBACKS,
  asObject,
  getUnknownErrorMessage,
  isSchemaMismatchError,
  logOperationsError,
} from '@/lib/services/operations/shared';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';

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
    const data: unknown = await res.json();
    const first = Array.isArray(data) ? asObject(data[0]) : null;
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

export async function createOperationsWorkOrderForOrganizationId(params: {
  organizationId: string;
  projectId?: string | null;
  title: string;
  description?: string;
  scheduledStart?: string;
  priority?: string;
  categoryId?: string | null;
  departmentId?: string | null;
  buildingId?: string | null;
  floor?: string | null;
  unit?: string | null;
  reporterName?: string | null;
  reporterPhone?: string | null;
  assignedTechnicianId?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const projectId = String(params.projectId || '').trim() || null;
    const title = String(params.title || '').trim();
    const description = String(params.description || '').trim();
    const scheduledStartRaw = String(params.scheduledStart || '').trim();
    const priority = (['NORMAL', 'HIGH', 'URGENT', 'CRITICAL'].includes(String(params.priority || '').toUpperCase()))
      ? String(params.priority).toUpperCase()
      : 'NORMAL';

    if (!title) return { success: false, error: 'חובה להזין כותרת' };

    let projectAddress: string | null = null;
    let projectAddressNormalized: string | null = null;

    if (projectId) {
      const project = await prisma.operationsProject.findFirst({
        where: { id: projectId, organizationId: params.organizationId },
        select: { id: true, installationAddress: true, addressNormalized: true },
      });

      if (!project?.id) return { success: false, error: 'פרויקט לא נמצא או שאין הרשאה' };
      projectAddress = project.installationAddress;
      projectAddressNormalized = project.addressNormalized;
    }

    let scheduledStart: Date | null = null;
    if (scheduledStartRaw) {
      const d = new Date(scheduledStartRaw);
      if (!Number.isNaN(d.getTime())) {
        scheduledStart = d;
      }
    }

    let slaDeadline: Date | null = null;
    const categoryId = String(params.categoryId || '').trim() || null;
    if (categoryId) {
      const category = await prisma.operationsCallCategory.findFirst({
        where: { id: categoryId, organizationId: params.organizationId },
        select: { maxResponseMinutes: true },
      });
      if (category?.maxResponseMinutes && category.maxResponseMinutes > 0) {
        slaDeadline = new Date(Date.now() + category.maxResponseMinutes * 60 * 1000);
      }
    }

    const departmentId = String(params.departmentId || '').trim() || null;
    const buildingId = String(params.buildingId || '').trim() || null;

    const created = await prisma.operationsWorkOrder.create({
      data: {
        organizationId: params.organizationId,
        projectId,
        title,
        description: description || null,
        status: 'NEW',
        priority,
        categoryId,
        departmentId,
        buildingId,
        floor: params.floor ? String(params.floor).trim() : null,
        unit: params.unit ? String(params.unit).trim() : null,
        reporterName: params.reporterName ? String(params.reporterName).trim() : null,
        reporterPhone: params.reporterPhone ? String(params.reporterPhone).trim() : null,
        assignedTechnicianId: params.assignedTechnicianId ? String(params.assignedTechnicianId).trim() : null,
        slaDeadline,
        scheduledStart,
        installationAddress: projectAddress,
        addressNormalized: projectAddressNormalized,
      },
      select: { id: true },
    });

    const address = projectAddress ? String(projectAddress) : '';
    if (address) {
      const coords = await geocodeAddressNominatim(address);
      if (coords) {
        await orgExec(
          prisma,
          params.organizationId,
          `
            UPDATE operations_work_orders
            SET installation_lat = $1::double precision,
                installation_lng = $2::double precision
            WHERE organization_id = $3::uuid
              AND id = $4::uuid
          `,
          [coords.lat, coords.lng, params.organizationId, created.id]
        );
      }
    }

    return { success: true, id: created.id };
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] operations_work_orders missing table/column (${getUnknownErrorMessage(e) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'lib/services/operations/work-orders/create.createOperationsWorkOrderForOrganizationId',
        reason: 'operations_work_orders schema mismatch (fallback to error response)',
        error: e,
        extras: { organizationId: String(params.organizationId), projectId: String(params.projectId || '') },
      });
    }
    logOperationsError('[operations] createOperationsWorkOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת קריאה' };
  }
}
