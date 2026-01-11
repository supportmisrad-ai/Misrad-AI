'use server';

import { createClient } from '@/lib/supabase';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

export type ClinicClient = {
  id: string;
  organizationId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
};

export type ClinicTask = {
  id: string;
  organizationId: string;
  clientId: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  dueAt?: string | null;
  assignedTo?: string | null;
  createdBy?: string | null;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
};

export type ClinicSession = {
  id: string;
  organizationId: string;
  clientId: string;
  startAt: string;
  endAt?: string | null;
  status: string;
  sessionType?: string | null;
  location?: string | null;
  summary?: string | null;
  createdBy?: string | null;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
};

export type ClinicPortalContent = {
  id: string;
  organizationId: string;
  clientId: string;
  kind: string;
  title: string;
  body?: string | null;
  data?: any;
  isPublished?: boolean | null;
  publishedAt?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ClinicFeedback = {
  id: string;
  organizationId: string;
  clientId: string;
  rating: number;
  comment?: string | null;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
};

function iso(d: unknown): string | undefined {
  if (!d) return undefined;
  if (d instanceof Date) return d.toISOString();
  return String(d);
}

export async function getClinicClients(orgId: string): Promise<ClinicClient[]> {
  if (!orgId) throw new Error('orgId is required');
  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();

  try {
    console.debug('[getClinicClients] fetching clients', {
      orgId,
      workspaceId: workspace.id,
    });

    const { data, error } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, phone, email, notes, metadata, created_at, updated_at')
      .eq('organization_id', workspace.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getClinicClients] supabase error', {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      });
      return [];
    }

    const clients = (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      fullName: r.full_name,
      phone: r.phone ?? null,
      email: r.email ?? null,
      notes: r.notes ?? null,
      metadata: r.metadata ?? undefined,
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    }));

    console.debug('[getClinicClients] clients fetched', {
      count: clients.length,
      clientIds: clients.slice(0, 5).map((c) => c.id),
      clientNames: clients.slice(0, 5).map((c) => c.fullName),
    });

    return clients;
  } catch (e: any) {
    console.error('[getClinicClients] unexpected error', {
      message: e?.message,
      stack: e?.stack,
    });
    return [];
  }
}

export async function getClinicClient(orgId: string, clientId: string): Promise<ClinicClient | null> {
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, phone, email, notes, metadata, created_at, updated_at')
      .eq('organization_id', workspace.id)
      .eq('id', clientId)
      .maybeSingle();

    if (error || !data?.id) return null;

    return {
      id: data.id,
      organizationId: data.organization_id,
      fullName: data.full_name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      notes: data.notes ?? null,
      metadata: data.metadata ?? undefined,
      createdAt: iso(data.created_at),
      updatedAt: iso(data.updated_at),
    };
  } catch {
    return null;
  }
}

export async function createClinicClient(params: {
  orgId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  metadata?: any;
}): Promise<{ id: string }> {
  const { orgId, fullName, phone, email, notes, metadata } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!fullName) throw new Error('fullName is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();
  const { data, error } = await supabase
    .from('client_clients')
    .insert({
      organization_id: workspace.id,
      full_name: fullName,
      phone: phone ?? null,
      email: email ?? null,
      notes: notes ?? null,
      metadata: metadata ?? {},
    })
    .select('id')
    .single();

  if (error || !data?.id) throw new Error(error?.message || 'Failed to create client');
  return { id: data.id };
}

export async function updateClinicClient(params: {
  orgId: string;
  clientId: string;
  updates: Partial<Pick<ClinicClient, 'fullName' | 'phone' | 'email' | 'notes' | 'metadata'>>;
}): Promise<{ ok: true }> {
  const { orgId, clientId, updates } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();
  const patch: any = {};
  if (updates.fullName !== undefined) patch.full_name = updates.fullName;
  if (updates.phone !== undefined) patch.phone = updates.phone;
  if (updates.email !== undefined) patch.email = updates.email;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  if (updates.metadata !== undefined) patch.metadata = updates.metadata;

  const { error } = await supabase
    .from('client_clients')
    .update(patch)
    .eq('organization_id', workspace.id)
    .eq('id', clientId);

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listClinicTasks(params: {
  orgId: string;
  clientId?: string;
  status?: string;
}): Promise<ClinicTask[]> {
  const { orgId, clientId, status } = params;
  if (!orgId) throw new Error('orgId is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();

  try {
    let query = supabase
      .from('client_tasks')
      .select(
        'id, organization_id, client_id, title, description, status, priority, due_at, assigned_to, created_by, metadata, created_at, updated_at'
      )
      .eq('organization_id', workspace.id);

    if (clientId) query = query.eq('client_id', clientId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('due_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });

    if (error) return [];

    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      clientId: r.client_id,
      title: r.title,
      description: r.description ?? null,
      status: r.status,
      priority: r.priority ?? null,
      dueAt: iso(r.due_at) ?? null,
      assignedTo: r.assigned_to ?? null,
      createdBy: r.created_by ?? null,
      metadata: r.metadata ?? undefined,
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    }));
  } catch {
    return [];
  }
}

export async function createClinicTask(params: {
  orgId: string;
  clientId: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string | null;
  dueAt?: string | null;
  assignedTo?: string | null;
  createdBy?: string | null;
  metadata?: any;
}): Promise<{ id: string }> {
  const { orgId, clientId, title, description, status, priority, dueAt, assignedTo, createdBy, metadata } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  if (!title) throw new Error('title is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();
  const { data, error } = await supabase
    .from('client_tasks')
    .insert({
      organization_id: workspace.id,
      client_id: clientId,
      title,
      description: description ?? null,
      status: status ?? 'todo',
      priority: priority ?? 'medium',
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      assigned_to: assignedTo ?? null,
      created_by: createdBy ?? null,
      metadata: metadata ?? {},
    })
    .select('id')
    .single();

  if (error || !data?.id) throw new Error(error?.message || 'Failed to create task');
  return { id: data.id };
}

export async function updateClinicTask(params: {
  orgId: string;
  taskId: string;
  updates: Partial<Pick<ClinicTask, 'title' | 'description' | 'status' | 'priority' | 'dueAt' | 'assignedTo' | 'metadata'>>;
}): Promise<{ ok: true }> {
  const { orgId, taskId, updates } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!taskId) throw new Error('taskId is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();
  const patch: any = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.priority !== undefined) patch.priority = updates.priority;
  if (updates.dueAt !== undefined) patch.due_at = updates.dueAt ? new Date(updates.dueAt).toISOString() : null;
  if (updates.assignedTo !== undefined) patch.assigned_to = updates.assignedTo;
  if (updates.metadata !== undefined) patch.metadata = updates.metadata;

  const { error } = await supabase
    .from('client_tasks')
    .update(patch)
    .eq('organization_id', workspace.id)
    .eq('id', taskId);

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listClinicSessions(params: {
  orgId: string;
  clientId?: string;
}): Promise<ClinicSession[]> {
  const { orgId, clientId } = params;
  if (!orgId) throw new Error('orgId is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();

  try {
    let query = supabase
      .from('client_sessions')
      .select(
        'id, organization_id, client_id, start_at, end_at, status, session_type, location, summary, created_by, metadata, created_at, updated_at'
      )
      .eq('organization_id', workspace.id);

    if (clientId) query = query.eq('client_id', clientId);

    const { data, error } = await query.order('start_at', { ascending: false });
    if (error) return [];

    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      clientId: r.client_id,
      startAt: iso(r.start_at) as string,
      endAt: iso(r.end_at) ?? null,
      status: r.status,
      sessionType: r.session_type ?? null,
      location: r.location ?? null,
      summary: r.summary ?? null,
      createdBy: r.created_by ?? null,
      metadata: r.metadata ?? undefined,
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    }));
  } catch {
    return [];
  }
}

export async function createClinicSession(params: {
  orgId: string;
  clientId: string;
  startAt: string;
  endAt?: string | null;
  status?: string;
  sessionType?: string | null;
  location?: string | null;
  summary?: string | null;
  createdBy?: string | null;
  metadata?: any;
}): Promise<{ id: string }> {
  const { orgId, clientId, startAt, endAt, status, sessionType, location, summary, createdBy, metadata } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  if (!startAt) throw new Error('startAt is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();
  const { data, error } = await supabase
    .from('client_sessions')
    .insert({
      organization_id: workspace.id,
      client_id: clientId,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      status: status ?? 'scheduled',
      session_type: sessionType ?? null,
      location: location ?? null,
      summary: summary ?? null,
      created_by: createdBy ?? null,
      metadata: metadata ?? {},
    })
    .select('id')
    .single();

  if (error || !data?.id) throw new Error(error?.message || 'Failed to create session');
  return { id: data.id };
}

export async function listClinicPortalContent(params: {
  orgId: string;
  clientId?: string;
  kind?: string;
  onlyPublished?: boolean;
}): Promise<ClinicPortalContent[]> {
  const { orgId, clientId, kind, onlyPublished } = params;
  if (!orgId) throw new Error('orgId is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();

  try {
    let query = supabase
      .from('client_portal_content')
      .select(
        'id, organization_id, client_id, kind, title, body, data, is_published, published_at, created_by, created_at, updated_at'
      )
      .eq('organization_id', workspace.id);

    if (clientId) query = query.eq('client_id', clientId);
    if (kind) query = query.eq('kind', kind);
    if (onlyPublished) query = query.eq('is_published', true);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];

    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      clientId: r.client_id,
      kind: r.kind,
      title: r.title,
      body: r.body ?? null,
      data: r.data ?? undefined,
      isPublished: r.is_published ?? null,
      publishedAt: iso(r.published_at) ?? null,
      createdBy: r.created_by ?? null,
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    }));
  } catch {
    return [];
  }
}

export async function createClinicPortalContent(params: {
  orgId: string;
  clientId: string;
  kind: string;
  title: string;
  body?: string | null;
  data?: any;
  isPublished?: boolean;
  publishedAt?: string | null;
  createdBy?: string | null;
}): Promise<{ id: string }> {
  const { orgId, clientId, kind, title, body, data, isPublished, publishedAt, createdBy } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  if (!kind) throw new Error('kind is required');
  if (!title) throw new Error('title is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();
  const { data: row, error } = await supabase
    .from('client_portal_content')
    .insert({
      organization_id: workspace.id,
      client_id: clientId,
      kind,
      title,
      body: body ?? null,
      data: data ?? {},
      is_published: isPublished ?? false,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
      created_by: createdBy ?? null,
    })
    .select('id')
    .single();

  if (error || !row?.id) throw new Error(error?.message || 'Failed to create portal content');
  return { id: row.id };
}

export async function listClinicFeedbacks(params: {
  orgId: string;
  clientId?: string;
}): Promise<ClinicFeedback[]> {
  const { orgId, clientId } = params;
  if (!orgId) throw new Error('orgId is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();

  try {
    let query = supabase
      .from('client_feedbacks')
      .select('id, organization_id, client_id, rating, comment, metadata, created_at, updated_at')
      .eq('organization_id', workspace.id);

    if (clientId) query = query.eq('client_id', clientId);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[listClinicFeedbacks] supabase error', {
        message: error.message,
        code: (error as any).code,
      });
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      clientId: r.client_id,
      rating: r.rating,
      comment: r.comment ?? null,
      metadata: r.metadata ?? undefined,
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    }));
  } catch (e: any) {
    console.error('[listClinicFeedbacks] unexpected error', {
      message: e?.message,
    });
    return [];
  }
}

export async function createClinicFeedback(params: {
  orgId: string;
  clientId: string;
  rating: number;
  comment?: string | null;
  metadata?: any;
}): Promise<{ id: string }> {
  const { orgId, clientId, rating, comment, metadata } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  if (!rating || rating < 1 || rating > 10) throw new Error('rating must be between 1 and 10');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const supabase = createClient();
  const { data, error } = await supabase
    .from('client_feedbacks')
    .insert({
      organization_id: workspace.id,
      client_id: clientId,
      rating,
      comment: comment ?? null,
      metadata: metadata ?? {},
    })
    .select('id')
    .single();

  if (error || !data?.id) throw new Error(error?.message || 'Failed to create feedback');
  return { id: data.id };
}
