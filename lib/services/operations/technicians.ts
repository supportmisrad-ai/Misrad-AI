import 'server-only';

import type { Prisma } from '@prisma/client';

import { orgExec, orgQuery, prisma, prismaForInteractiveTransaction } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError } from '@/lib/services/operations/shared';
import { ensureOperationsVehicleHolderIdTx } from '@/lib/services/operations/stock-holders';
import type { OperationsTechnicianOption } from '@/lib/services/operations/types';

export async function getOperationsTechnicianOptionsForOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsTechnicianOption[]; error?: string }> {
  try {
    // Fetch profiles and nexus users in parallel — nexus_users is the fallback for members
    // whose Profile hasn't been lazily created yet (race condition on first visit)
    const [profiles, nexusUsers] = await Promise.all([
      prisma.profile.findMany({
        where: { organizationId: params.organizationId },
        select: { id: true, email: true, fullName: true },
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
        take: 500,
      }),
      prisma.nexusUser.findMany({
        where: { organizationId: params.organizationId },
        select: { id: true, email: true, name: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: 500,
      }),
    ]);

    const seen = new Set<string>();
    const options: OperationsTechnicianOption[] = [];

    for (const p of profiles || []) {
      const id = String(p.id || '').trim();
      const name = p.fullName ? String(p.fullName).trim() : '';
      const email = p.email ? String(p.email).trim().toLowerCase() : '';
      const label = name || email || id;
      if (!id || !label) continue;
      seen.add(email || id);
      options.push({ id, label });
    }

    // Add nexus users not already covered by profiles (match by email)
    for (const n of nexusUsers || []) {
      const id = String(n.id || '').trim();
      const name = n.name ? String(n.name).trim() : '';
      const email = n.email ? String(n.email).trim().toLowerCase() : '';
      const label = name || email || id;
      if (!id || !label) continue;
      if (seen.has(email || id)) continue;
      seen.add(email || id);
      options.push({ id, label });
    }

    options.sort((a, b) => a.label.localeCompare(b.label, 'he'));
    return { success: true, data: options };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsTechnicianOptions failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת הטכנאים' };
  }
}

export async function setOperationsTechnicianActiveVehicleForOrganizationId(params: {
  organizationId: string;
  technicianId: string;
  vehicleId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const technicianId = String(params.technicianId || '').trim();
    const vehicleIdRaw = params.vehicleId === null ? null : String(params.vehicleId || '').trim();
    const vehicleId = vehicleIdRaw ? vehicleIdRaw : null;

    if (!technicianId) return { success: false, error: 'חסר טכנאי' };

    const tech = await prisma.profile.findFirst({
      where: { id: technicianId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!tech?.id) return { success: false, error: 'טכנאי לא תקין או שאין הרשאה' };

    let vehicleName: string | null = null;
    if (vehicleId) {
      const vRows = await orgQuery<unknown[]>(
        prisma,
        params.organizationId,
        `SELECT id::text as id, name FROM operations_vehicles WHERE organization_id = $1::uuid AND id = $2::uuid LIMIT 1`,
        [params.organizationId, vehicleId]
      );
      const first = (vRows || [])[0];
      const obj = asObject(first);
      if (!obj?.id) return { success: false, error: 'רכב לא תקין או שאין הרשאה' };
      vehicleName = obj.name ? String(obj.name) : 'רכב';
    }

    await prismaForInteractiveTransaction().$transaction(async (tx: Prisma.TransactionClient) => {
      await orgExec(
        tx,
        params.organizationId,
        `
          UPDATE operations_technician_vehicle_assignments
          SET active = false,
              ended_at = now()
          WHERE organization_id = $1::uuid
            AND technician_id = $2::uuid
            AND active = true
        `,
        [params.organizationId, technicianId]
      );

      if (vehicleId) {
        await orgExec(
          tx,
          params.organizationId,
          `
            INSERT INTO operations_technician_vehicle_assignments (organization_id, technician_id, vehicle_id, active)
            VALUES ($1::uuid, $2::uuid, $3::uuid, true)
          `,
          [params.organizationId, technicianId, vehicleId]
        );

        await ensureOperationsVehicleHolderIdTx(tx, {
          organizationId: params.organizationId,
          vehicleId,
          label: vehicleName || 'רכב',
        });
      }
    });

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] setOperationsTechnicianActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת רכב פעיל' };
  }
}
