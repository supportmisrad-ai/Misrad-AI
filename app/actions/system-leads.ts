'use server';

import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { createClient } from '@/lib/supabase';

export type SystemLeadDTO = {
  id: string;
  organization_id: string;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  source: string;
  status: string;
  value: number;
  last_contact: string;
  created_at: string;
  is_hot: boolean;
  score: number;
  assigned_agent_id: string | null;
};

function toDto(row: any): SystemLeadDTO {
  return {
    id: row.id,
    organization_id: row.organizationId,
    name: row.name,
    company: row.company ?? null,
    phone: row.phone,
    email: row.email ?? null,
    source: row.source,
    status: row.status,
    value: Number(row.value ?? 0),
    last_contact: new Date(row.lastContact).toISOString(),
    created_at: new Date(row.createdAt).toISOString(),
    is_hot: Boolean(row.isHot),
    score: Number(row.score ?? 0),
    assigned_agent_id: row.assignedAgentId ?? null,
  };
}

export async function getSystemLeads(orgSlug: string): Promise<SystemLeadDTO[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const rows = await prisma.systemLead.findMany({
    where: { organizationId: workspace.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return rows.map(toDto);
}

export async function createSystemLead(
  orgSlug: string,
  input: {
    name: string;
    company?: string;
    phone: string;
    email?: string;
    source?: string;
    value?: number;
    isHot?: boolean;
    productInterest?: string;
  }
): Promise<SystemLeadDTO> {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const name = String(input.name || '').trim();
  const phone = String(input.phone || '').trim();
  const email = String(input.email || '').trim();

  if (!name) throw new Error('Name is required');
  if (!phone) throw new Error('Phone is required');
  // Email is optional at lead creation time; it's required only when converting to client/portal.

  const now = new Date();

  const company = input.company?.trim() || null;
  const source = input.source?.trim() || 'manual';
  const value = input.value ?? 0;
  const isHot = Boolean(input.isHot);
  const productInterest = input.productInterest || null;

  const row = await prisma.systemLead.create({
    data: {
      organizationId: workspace.id,
      name,
      company,
      phone,
      email: email || '',
      source,
      status: 'incoming',
      value,
      lastContact: now,
      isHot,
      score: 50,
      productInterest,
    },
  });

  return toDto(row);
}

export type UpdateSystemLeadStatusResult =
  | { ok: true; lead: SystemLeadDTO; syncedClientId?: string | null }
  | { ok: false; reason: 'blocked_no_email'; message: string };

async function upsertClientClientByEmail(params: {
  organizationId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  metadata?: Record<string, any>;
}): Promise<{ clientId: string | null }> {
  const supabase = createClient();
  const organizationId = params.organizationId;
  const email = String(params.email || '').trim();

  const { data: existing, error: findError } = await supabase
    .from('client_clients')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('email', email)
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error('[system-leads] failed to find existing client_clients', {
      message: findError.message,
      code: (findError as any).code,
      details: (findError as any).details,
    });
    throw new Error('Failed to sync client (lookup failed)');
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('client_clients')
      .update({
        full_name: params.fullName,
        phone: params.phone ?? null,
        email,
        metadata: params.metadata ?? {},
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('[system-leads] failed to update client_clients', {
        message: updateError.message,
        code: (updateError as any).code,
        details: (updateError as any).details,
      });
      throw new Error('Failed to sync client (update failed)');
    }

    return { clientId: existing.id };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('client_clients')
    .insert({
      organization_id: organizationId,
      full_name: params.fullName,
      phone: params.phone ?? null,
      email,
      metadata: params.metadata ?? {},
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[system-leads] failed to insert client_clients', {
      message: insertError.message,
      code: (insertError as any).code,
      details: (insertError as any).details,
    });
    throw new Error('Failed to sync client (insert failed)');
  }

  return { clientId: inserted?.id ?? null };
}

export async function updateSystemLeadStatus(params: {
  orgSlug: string;
  leadId: string;
  status: string;
}): Promise<UpdateSystemLeadStatusResult> {
  const orgSlug = String(params.orgSlug || '').trim();
  const leadId = String(params.leadId || '').trim();
  const status = String(params.status || '').trim();

  if (!orgSlug) throw new Error('orgSlug is required');
  if (!leadId) throw new Error('leadId is required');
  if (!status) throw new Error('status is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const existing = await prisma.systemLead.findFirst({
    where: { id: leadId, organizationId: workspace.id },
  });

  if (!existing) {
    throw new Error('Lead not found');
  }

  const row = await prisma.systemLead.update({
    where: { id: leadId },
    data: {
      status,
      lastContact: new Date(),
    },
  });

  const lead = toDto(row);

  if (status !== 'won') {
    return { ok: true, lead, syncedClientId: null };
  }

  const email = String(lead.email || '').trim();
  if (!email) {
    return {
      ok: false,
      reason: 'blocked_no_email',
      message: 'לא ניתן לסגור ליד כ-לקוח כי אין לו אימייל. יש להוסיף אימייל לליד ואז לסגור מחדש.',
    };
  }

  const synced = await upsertClientClientByEmail({
    organizationId: workspace.id,
    fullName: lead.company?.trim() ? lead.company.trim() : lead.name,
    email,
    phone: lead.phone || null,
    metadata: {
      source: 'system_leads',
      systemLeadId: lead.id,
    },
  });

  return { ok: true, lead, syncedClientId: synced.clientId };
}
