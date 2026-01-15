'use server';

import { createClient as createSupabaseClient } from '@/lib/supabase';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import { sendInvitationEmail } from '@/app/actions/email';
import { createClientSchema, validateWithSchema } from '@/lib/validation';
import { requireSupabase, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import type { Client, ClientStatus, PricingPlan } from '@/types/social';
import { createClinicClient, updateClinicClient } from '@/app/actions/client-clinic';

type ClientClientsRow = {
  id: string;
  organization_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  metadata: any;
  created_at?: string;
  updated_at?: string;
};

export type ClientLite = {
  id: string;
  companyName: string;
  avatar: string;
  postingRhythm: string;
  onboardingStatus?: string;
  status?: string;
};

function safeString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export async function getClientsLite(
  clerkUserId?: string,
  orgId?: string
): Promise<{ success: boolean; data?: ClientLite[]; error?: string }> {
  try {
    const supabaseCheck = requireSupabase();
    if (!supabaseCheck.success) return supabaseCheck as any;

    const organizationId = await resolveOrganizationId(clerkUserId, orgId);
    if (!organizationId) return { success: true, data: [] };

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('client_clients')
      .select('id, full_name, metadata')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      return createErrorResponse(error, error.message) as any;
    }

    const list: ClientLite[] = (data || []).map((row: any) => {
      const md = row?.metadata ?? {};
      const companyName = safeString(md.companyName, safeString(md.name, safeString(row.full_name, '')));
      const avatar = safeString(md.avatar, `https://i.pravatar.cc/150?u=${encodeURIComponent(String(row.id))}`);
      const postingRhythm = safeString(md.postingRhythm, '3 פעמים בשבוע');
      const onboardingStatus = md.onboardingStatus ?? undefined;
      const status = md.status ?? undefined;
      return {
        id: String(row.id),
        companyName,
        avatar,
        postingRhythm,
        onboardingStatus,
        status,
      };
    });

    return { success: true, data: list };
  } catch (e: any) {
    return createErrorResponse(e, e?.message || 'שגיאה בטעינת לקוחות') as any;
  }
}

function safeNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function randomToken(len = 12): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

function mapClientClientsRowToSocialClient(row: ClientClientsRow): Client {
  const md = row.metadata ?? {};
  const name = safeString(md.name, row.full_name);
  const companyName = safeString(md.companyName, name || row.full_name);
  const avatar = safeString(md.avatar, `https://i.pravatar.cc/150?u=${encodeURIComponent(row.id)}`);

  const plan = (md.plan as PricingPlan | undefined) ?? undefined;
  const monthlyFee = md.monthlyFee != null ? safeNumber(md.monthlyFee) : undefined;

  return {
    id: row.id,
    name,
    companyName,
    businessId: md.businessId ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    avatar,
    brandVoice: safeString(md.brandVoice, ''),
    dna: md.dna ?? {
      brandSummary: '',
      voice: { formal: 50, funny: 50, length: 50 },
      vocabulary: { loved: [], forbidden: [] },
      colors: { primary: '#1e293b', secondary: '#334155' },
    },
    credentials: md.credentials ?? [],
    postingRhythm: safeString(md.postingRhythm, '3 פעמים בשבוע'),
    status: (md.status as ClientStatus) || 'Onboarding',
    activePlatforms: md.activePlatforms ?? [],
    quotas: md.quotas ?? [],
    onboardingStatus: md.onboardingStatus ?? undefined,
    invitationToken: md.invitationToken ?? undefined,
    portalToken: safeString(md.portalToken, ''),
    color: safeString(md.color, '#1e293b'),
    plan,
    monthlyFee,
    nextPaymentDate: md.nextPaymentDate ?? undefined,
    nextPaymentAmount: md.nextPaymentAmount ?? undefined,
    paymentStatus: md.paymentStatus ?? undefined,
    autoRemindersEnabled: md.autoRemindersEnabled ?? true,
    savedCardThumbnail: md.savedCardThumbnail ?? undefined,
    businessMetrics: md.businessMetrics ?? {
      timeSpentMinutes: 0,
      expectedHours: 0,
      punctualityScore: 100,
      responsivenessScore: 100,
      revisionCount: 0,
    },
    internalNotes: md.internalNotes ?? undefined,
    organizationId: row.organization_id,
  };
}

async function resolveOrganizationId(clerkUserId?: string, orgId?: string): Promise<string | null> {
  if (orgId) {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgId);
    return workspace?.id ? String(workspace.id) : null;
  }

  if (!clerkUserId) return null;

  const { getCurrentUserInfo } = await import('@/app/actions/users');
  const userInfo = await getCurrentUserInfo();
  if (!userInfo.success) return null;
  return userInfo.organizationId ? String(userInfo.organizationId) : null;
}

export async function getClients(
  clerkUserId?: string,
  orgId?: string
): Promise<{ success: boolean; data?: Client[]; error?: string }> {
  try {
    const supabaseCheck = requireSupabase();
    if (!supabaseCheck.success) return supabaseCheck;

    const organizationId = await resolveOrganizationId(clerkUserId, orgId);
    if (!organizationId) return { success: true, data: [] };

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, phone, email, notes, metadata, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      return createErrorResponse(error, error.message);
    }

    const clients = (data || []).map((row: any) => mapClientClientsRowToSocialClient(row as ClientClientsRow));
    return { success: true, data: clients };
  } catch (e: any) {
    return createErrorResponse(e, e?.message || 'שגיאה בטעינת לקוחות');
  }
}

export async function createClient(
  clientData: Partial<Client>,
  clerkUserId: string
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const validation = validateWithSchema(createClientSchema, clientData);
    if (!validation.success) return validation;

    const supabaseCheck = requireSupabase();
    if (!supabaseCheck.success) return supabaseCheck;

    const userResult = await getOrCreateSupabaseUserAction(clerkUserId);
    if (!userResult.success || !userResult.userId) {
      return createErrorResponse(new Error('שגיאה ביצירת משתמש'), userResult.error || 'שגיאה ביצירת משתמש');
    }

    const organizationId = await resolveOrganizationId(clerkUserId, clientData.organizationId);
    if (!organizationId) {
      return createErrorResponse(new Error('שגיאה: משתמש לא שייך לארגון'), 'לא ניתן ליצור לקוח ללא ארגון');
    }

    const invitationToken = clientData.invitationToken || randomToken(14);
    const portalToken = clientData.portalToken || randomToken(22);

    const name = safeString(clientData.name, '').trim();
    const companyName = safeString(clientData.companyName, name || 'לקוח חדש');

    const metadata = {
      name: name || companyName,
      companyName,
      businessId: clientData.businessId ?? null,
      avatar: clientData.avatar ?? '',
      brandVoice: clientData.brandVoice ?? '',
      postingRhythm: clientData.postingRhythm ?? '3 פעמים בשבוע',
      status: clientData.status ?? ('Onboarding' as ClientStatus),
      onboardingStatus: clientData.onboardingStatus ?? 'invited',
      invitationToken,
      portalToken,
      color: clientData.color ?? '#1e293b',
      plan: clientData.plan ?? null,
      monthlyFee: clientData.monthlyFee ?? null,
      nextPaymentDate: clientData.nextPaymentDate ?? null,
      nextPaymentAmount: clientData.nextPaymentAmount ?? null,
      paymentStatus: clientData.paymentStatus ?? 'pending',
      autoRemindersEnabled: clientData.autoRemindersEnabled ?? true,
      savedCardThumbnail: clientData.savedCardThumbnail ?? null,
      businessMetrics: clientData.businessMetrics ?? null,
      internalNotes: clientData.internalNotes ?? null,
      dna: clientData.dna ?? null,
      credentials: clientData.credentials ?? [],
      activePlatforms: clientData.activePlatforms ?? [],
      quotas: clientData.quotas ?? [],
      legacy: {
        source: 'social_os',
      },
    };

    const created = await createClinicClient({
      orgId: organizationId,
      fullName: companyName,
      phone: clientData.phone ?? null,
      email: clientData.email ?? null,
      notes: clientData.internalNotes ?? null,
      metadata,
    });

    const supabase = createSupabaseClient();
    const { data: row, error } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, phone, email, notes, metadata, created_at, updated_at')
      .eq('organization_id', organizationId)
      .eq('id', created.id)
      .maybeSingle();

    if (error || !row?.id) {
      return createErrorResponse(new Error('הלקוח נוצר אך נכשל בטעינת הנתונים המלאים'), error?.message || 'שגיאה בטעינת לקוח');
    }

    return { success: true, data: mapClientClientsRowToSocialClient(row as any) };
  } catch (e: any) {
    return createErrorResponse(e, e?.message || 'שגיאה ביצירת לקוח');
  }
}

export async function updateClient(
  clientId: string,
  updates: Partial<Client>
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const supabase = createSupabaseClient();

    const { data: existing, error: existingError } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, phone, email, notes, metadata')
      .eq('id', clientId)
      .maybeSingle();

    if (existingError || !existing?.id) {
      return createErrorResponse(new Error('לקוח לא נמצא'), existingError?.message || 'לקוח לא נמצא');
    }

    const orgId = String((existing as any).organization_id);

    const nextMetadata = {
      ...(existing as any).metadata,
      ...(updates as any),
    };

    // Keep expected metadata keys stable
    if (updates.companyName !== undefined) nextMetadata.companyName = updates.companyName;
    if (updates.name !== undefined) nextMetadata.name = updates.name;
    if (updates.brandVoice !== undefined) nextMetadata.brandVoice = updates.brandVoice;
    if (updates.postingRhythm !== undefined) nextMetadata.postingRhythm = updates.postingRhythm;
    if (updates.status !== undefined) nextMetadata.status = updates.status;
    if (updates.onboardingStatus !== undefined) nextMetadata.onboardingStatus = updates.onboardingStatus;
    if (updates.plan !== undefined) nextMetadata.plan = updates.plan;
    if (updates.monthlyFee !== undefined) nextMetadata.monthlyFee = updates.monthlyFee;
    if (updates.nextPaymentDate !== undefined) nextMetadata.nextPaymentDate = updates.nextPaymentDate;
    if (updates.nextPaymentAmount !== undefined) nextMetadata.nextPaymentAmount = updates.nextPaymentAmount;
    if (updates.paymentStatus !== undefined) nextMetadata.paymentStatus = updates.paymentStatus;
    if (updates.autoRemindersEnabled !== undefined) nextMetadata.autoRemindersEnabled = updates.autoRemindersEnabled;
    if (updates.internalNotes !== undefined) nextMetadata.internalNotes = updates.internalNotes;
    if (updates.businessId !== undefined) nextMetadata.businessId = updates.businessId;
    if (updates.avatar !== undefined) nextMetadata.avatar = updates.avatar;
    if (updates.dna !== undefined) nextMetadata.dna = updates.dna;
    if (updates.credentials !== undefined) nextMetadata.credentials = updates.credentials;
    if (updates.activePlatforms !== undefined) nextMetadata.activePlatforms = updates.activePlatforms;
    if (updates.quotas !== undefined) nextMetadata.quotas = updates.quotas;

    await updateClinicClient({
      orgId,
      clientId,
      updates: {
        fullName: updates.companyName ?? updates.name ?? undefined,
        phone: updates.phone ?? undefined,
        email: updates.email ?? undefined,
        notes: updates.internalNotes ?? undefined,
        metadata: nextMetadata,
      },
    });

    const { data: after, error: afterError } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, phone, email, notes, metadata, created_at, updated_at')
      .eq('id', clientId)
      .maybeSingle();

    if (afterError || !after?.id) {
      return createSuccessResponse(true) as any;
    }

    return { success: true, data: mapClientClientsRowToSocialClient(after as any) };
  } catch (e: any) {
    return createErrorResponse(e, e?.message || 'שגיאה בעדכון לקוח');
  }
}

export async function inviteClient(
  clientId: string,
  invitationLink: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseClient();

    const { data: row, error } = await supabase
      .from('client_clients')
      .select('id, full_name, email, metadata')
      .eq('id', clientId)
      .maybeSingle();

    if (error || !row?.id) {
      return createErrorResponse(new Error('לקוח לא נמצא'), 'לקוח לא נמצא');
    }

    const email = (row as any).email as string | null;
    if (!email) {
      return createErrorResponse(new Error('אימייל הלקוח לא הוגדר'), 'אימייל הלקוח לא הוגדר');
    }

    const md = (row as any).metadata ?? {};

    const planNames: Record<string, string> = {
      starter: 'Starter',
      pro: 'Professional',
      agency: 'Agency',
      custom: 'Custom',
    };

    const planName = planNames[md.plan || 'pro'] || 'Professional';
    const planPrice = md.monthlyFee || 2990;

    const emailResult = await sendInvitationEmail({
      clientName: md.name || (row as any).full_name,
      clientEmail: email,
      invitationLink,
      planName,
      planPrice,
    });

    if (!emailResult.success) {
      return createErrorResponse(new Error(emailResult.error || 'שגיאה בשליחת מייל הזמנה'), emailResult.error || 'שגיאה בשליחת מייל הזמנה');
    }

    return { success: true };
  } catch (e: any) {
    return createErrorResponse(e, e?.message || 'שגיאה בהזמנת לקוח');
  }
}

export async function getClientByInvitationToken(
  invitationToken: string
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    if (!invitationToken) {
      return createErrorResponse(new Error('טוקן הזמנה חסר'), 'טוקן הזמנה חסר');
    }

    const supabase = createSupabaseClient();
    const { data: row, error } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, phone, email, notes, metadata, created_at, updated_at')
      .contains('metadata', { invitationToken })
      .maybeSingle();

    if (error || !row?.id) {
      return createErrorResponse(new Error('טוקן הזמנה לא תקין או שהלקוח לא נמצא'), 'טוקן הזמנה לא תקין או שהלקוח לא נמצא');
    }

    const md = (row as any).metadata ?? {};
    if (md.onboardingStatus && String(md.onboardingStatus) !== 'invited') {
      return createErrorResponse(new Error('ההזמנה כבר הושלמה או לא תקינה'), 'ההזמנה כבר הושלמה או לא תקינה');
    }

    return { success: true, data: mapClientClientsRowToSocialClient(row as any) };
  } catch (e: any) {
    return createErrorResponse(e, e?.message || 'שגיאה בטעינת לקוח');
  }
}

export async function linkPortalClientToCanonical(params: {
  orgSlug: string;
  portalClientId: string;
  canonicalClientId: string;
}): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    if (!orgSlug) return createErrorResponse(new Error('orgSlug חסר'), 'orgSlug חסר');
    if (!params.portalClientId) return createErrorResponse(new Error('portalClientId חסר'), 'portalClientId חסר');
    if (!params.canonicalClientId) return createErrorResponse(new Error('canonicalClientId חסר'), 'canonicalClientId חסר');

    const supabaseCheck = requireSupabase();
    if (!supabaseCheck.success) return supabaseCheck as any;

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = workspace?.id ? String(workspace.id) : null;
    if (!organizationId) return createErrorResponse(new Error('ארגון לא נמצא'), 'ארגון לא נמצא');

    const supabase = createSupabaseClient();
    const { data: existing, error: existingError } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, phone, email, notes, metadata, created_at, updated_at')
      .eq('organization_id', organizationId)
      .eq('id', params.portalClientId)
      .maybeSingle();

    if (existingError || !existing?.id) {
      return createErrorResponse(new Error('לקוח לא נמצא'), existingError?.message || 'לקוח לא נמצא');
    }

    const nextMetadata = {
      ...((existing as any).metadata ?? {}),
      canonicalClientId: params.canonicalClientId,
    };

    await updateClinicClient({
      orgId: organizationId,
      clientId: params.portalClientId,
      updates: {
        metadata: nextMetadata,
      },
    });

    const { data: after, error: afterError } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, phone, email, notes, metadata, created_at, updated_at')
      .eq('organization_id', organizationId)
      .eq('id', params.portalClientId)
      .maybeSingle();

    if (afterError || !after?.id) {
      return createSuccessResponse(true) as any;
    }

    return { success: true, data: mapClientClientsRowToSocialClient(after as any) };
  } catch (e: any) {
    return createErrorResponse(e, e?.message || 'שגיאה בקישור לקוח');
  }
}

export async function ensurePortalClientForCanonical(params: {
  orgSlug: string;
  canonicalClientId: string;
}): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    if (!orgSlug) return createErrorResponse(new Error('orgSlug חסר'), 'orgSlug חסר');
    if (!params.canonicalClientId) return createErrorResponse(new Error('canonicalClientId חסר'), 'canonicalClientId חסר');

    const supabaseCheck = requireSupabase();
    if (!supabaseCheck.success) return supabaseCheck as any;

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = workspace?.id ? String(workspace.id) : null;
    if (!organizationId) return createErrorResponse(new Error('ארגון לא נמצא'), 'ארגון לא נמצא');

    const supabase = createSupabaseClient();

    const { data: existing, error: existingError } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, phone, email, notes, metadata, created_at, updated_at')
      .eq('organization_id', organizationId)
      .contains('metadata', { canonicalClientId: params.canonicalClientId })
      .maybeSingle();

    if (!existingError && existing?.id) {
      return { success: true, data: mapClientClientsRowToSocialClient(existing as any) };
    }

    const { data: canonical, error: canonicalError } = await supabase
      .from('clients')
      .select('id, name, company_name, phone, email, avatar, status, onboarding_status, portal_token, invitation_token, color, plan, monthly_fee, payment_status')
      .eq('organization_id', organizationId)
      .eq('id', params.canonicalClientId)
      .maybeSingle();

    if (canonicalError || !canonical?.id) {
      return createErrorResponse(new Error('לקוח קנוני לא נמצא'), canonicalError?.message || 'לקוח קנוני לא נמצא');
    }

    const md = {
      canonicalClientId: canonical.id,
      name: canonical.name ?? '',
      companyName: canonical.company_name ?? canonical.name ?? '',
      avatar: canonical.avatar ?? '',
      postingRhythm: '3 פעמים בשבוע',
      status: canonical.status ?? ('Onboarding' as ClientStatus),
      onboardingStatus: canonical.onboarding_status ?? undefined,
      invitationToken: canonical.invitation_token ?? undefined,
      portalToken: canonical.portal_token ?? '',
      color: canonical.color ?? '#1e293b',
      plan: canonical.plan ?? undefined,
      monthlyFee: canonical.monthly_fee ?? undefined,
      paymentStatus: canonical.payment_status ?? undefined,
    };

    const created = await createClinicClient({
      orgId: organizationId,
      fullName: String(canonical.company_name ?? canonical.name ?? 'לקוח חדש'),
      phone: canonical.phone ?? null,
      email: canonical.email ?? null,
      notes: null,
      metadata: md,
    });

    const { data: row, error } = await supabase
      .from('client_clients')
      .select('id, organization_id, full_name, phone, email, notes, metadata, created_at, updated_at')
      .eq('organization_id', organizationId)
      .eq('id', created.id)
      .maybeSingle();

    if (error || !row?.id) {
      return createErrorResponse(new Error('נכשל ביצירת לקוח פורטל'), error?.message || 'נכשל ביצירת לקוח פורטל');
    }

    return { success: true, data: mapClientClientsRowToSocialClient(row as any) };
  } catch (e: any) {
    return createErrorResponse(e, e?.message || 'שגיאה ביצירת לקוח פורטל');
  }
}
