import 'server-only';

import { orgExec, prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage } from '@/lib/services/operations/shared';

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
  projectId: string;
  title: string;
  description?: string;
  scheduledStart?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const projectId = String(params.projectId || '').trim();
    const title = String(params.title || '').trim();
    const description = String(params.description || '').trim();
    const scheduledStartRaw = String(params.scheduledStart || '').trim();

    if (!title) return { success: false, error: 'חובה להזין כותרת' };
    if (!projectId) return { success: false, error: 'חובה לשייך פרויקט' };

    const project = await prisma.operationsProject.findFirst({
      where: { id: projectId, organizationId: params.organizationId },
      select: { id: true, installationAddress: true, addressNormalized: true },
    });

    if (!project?.id) return { success: false, error: 'פרויקט לא נמצא או שאין הרשאה' };

    let scheduledStart: Date | null = null;
    if (scheduledStartRaw) {
      const d = new Date(scheduledStartRaw);
      if (!Number.isNaN(d.getTime())) {
        scheduledStart = d;
      }
    }

    const created = await prisma.operationsWorkOrder.create({
      data: {
        organizationId: params.organizationId,
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
    console.error('[operations] createOperationsWorkOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת קריאה' };
  }
}
