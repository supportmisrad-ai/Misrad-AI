import React from 'react';
import { getOrganizations } from '@/app/actions/admin-organizations';
import AdminCustomersClient from './AdminCustomersClient';
import type { CustomerOwnerGroup } from './AdminCustomersClient';

export const dynamic = 'force-dynamic';

function getOwnerLabel(group: CustomerOwnerGroup): string {
  const owner = group.owner;
  const fullName = owner?.full_name ? String(owner.full_name).trim() : '';
  if (fullName) return fullName;

  const email = owner?.email ? String(owner.email).trim() : '';
  if (email) return email;

  return group.ownerId;
}

export default async function AdminCustomersPage() {
  const res = await getOrganizations({ limit: 500 });
  if (!res.success) {
    return (
      <div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-slate-900 font-black">שגיאה בטעינה</div>
          <div className="text-sm text-slate-600 mt-2">{res.error || 'שגיאה לא ידועה'}</div>
        </div>
      </div>
    );
  }

  const orgs = res.data ?? [];
  const map = new Map<string, CustomerOwnerGroup>();

  for (const org of orgs) {
    const ownerId = String(org.owner_id || '').trim();
    if (!ownerId) continue;

    const existing = map.get(ownerId);
    if (!existing) {
      map.set(ownerId, {
        ownerId,
        owner: org.owner ?? null,
        organizations: [org],
      });
      continue;
    }

    existing.organizations.push(org);
    if (!existing.owner && org.owner) {
      existing.owner = org.owner;
    }
  }

  const groups = Array.from(map.values()).sort((a, b) => {
    const la = getOwnerLabel(a).toLowerCase();
    const lb = getOwnerLabel(b).toLowerCase();
    return la.localeCompare(lb);
  });

  return <AdminCustomersClient groups={groups} />;
}
