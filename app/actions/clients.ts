'use server';

import crypto from 'crypto';
import { createClient as createSupabaseClient } from '@/lib/supabase';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import { Client, ClientStatus, PricingPlan } from '@/types/social';
import { sendInvitationEmail } from './email';
import { createClientSchema, validateWithSchema } from '@/lib/validation';
import { requireAuth, requireSupabase, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

function isMissingTableError(err: any) {
  const msg = String(err?.message || '').toLowerCase();
  const code = String((err as any)?.code || '').toUpperCase();
  return (
    msg.includes("could not find the table 'public.clients'") ||
    msg.includes('public.clients') ||
    msg.includes('does not exist') ||
    code === '42P01' ||
    code === 'PGRST205'
  );
}

/**
 * Server Action: Get all clients for the current user
 * Filters by organization - only shows clients from user's organization
 * Super admin sees all clients
 */
export async function getClients(
  clerkUserId?: string,
  orgId?: string
): Promise<{ success: boolean; data?: Client[]; error?: string }> {
  try {
    let supabase;
    try {
      supabase = createSupabaseClient();
      
      // Additional verification with better error messages
      if (!supabase) {
        console.error('[getClients] createSupabaseClient() returned null/undefined');
        throw new Error('createSupabaseClient() returned null/undefined. This usually means environment variables are missing.');
      }
      
      // More detailed check
      const hasFromMethod = typeof supabase.from === 'function';
      
      if (!hasFromMethod) {
        console.error('[getClients] Client structure issue - DETAILED:', {
          isNull: supabase === null,
          isUndefined: supabase === undefined,
          type: typeof supabase,
          isObject: typeof supabase === 'object',
          hasFrom: supabase && 'from' in supabase,
          fromType: supabase && typeof (supabase as any).from,
          fromValue: supabase && (supabase as any).from,
          constructor: supabase?.constructor?.name,
          prototype: Object.getPrototypeOf(supabase)?.constructor?.name,
          keys: supabase && typeof supabase === 'object' ? Object.keys(supabase).slice(0, 20) : 'N/A',
          stringified: supabase ? JSON.stringify(Object.keys(supabase).slice(0, 10)) : 'N/A',
        });
        throw new Error('Supabase client missing .from() method. The client was created but is invalid. This may indicate an environment variable issue or a need to restart the server.');
      }
    } catch (clientError: any) {
      console.error('[getClients] Failed to create/verify Supabase client:', clientError);
      console.error('[getClients] Error details:', {
        message: clientError.message,
        stack: clientError.stack,
        name: clientError.name,
      });
      return {
        success: false,
        error: `שגיאה בהתחברות למסד הנתונים: ${clientError.message}`,
      };
    }

    // Verify supabase is still valid before using it (double-check)
    if (!supabase || typeof supabase.from !== 'function') {
      console.error('[getClients] Supabase client became invalid before query!', {
        isNull: supabase === null,
        isUndefined: supabase === undefined,
        type: typeof supabase,
        hasFrom: supabase && 'from' in supabase,
        fromType: supabase && typeof (supabase as any).from,
      });
      return {
        success: false,
        error: 'שגיאה: לקוח Supabase הפך לא תקין לפני ביצוע השאילתה',
      };
    }

    // Get user info (role and organizationId)
    let userRole: string | undefined;
    let userOrganizationId: string | undefined;
    
    if (clerkUserId) {
      const { getCurrentUserInfo } = await import('@/app/actions/users');
      const userInfo = await getCurrentUserInfo();
      if (userInfo.success) {
        userRole = userInfo.role;
        userOrganizationId = userInfo.organizationId;
      }
    }

    // If orgId is provided (workspace route), enforce access and use it as source of truth
    // This enables true multi-workspace behavior.
    if (orgId) {
      const workspace = await requireWorkspaceAccessByOrgSlug(orgId);
      userOrganizationId = workspace?.id ? String(workspace.id) : undefined;
    }

    let query = supabase
      .from('clients')
      .select(`
        *,
        client_dna (*),
        platform_credentials (*),
        platform_quotas (*),
        business_metrics (*)
      `)
      .order('created_at', { ascending: false });

    // Filter by organization
    // If orgId is explicitly provided -> ALWAYS filter by it (prevents leakage and enables workspace switching)
    // Otherwise keep legacy behavior (super_admin sees all, others filtered by their organization)
    if (userOrganizationId) {
      query = query.eq('organization_id', userOrganizationId);
    } else {
      // Emergency isolation: do NOT allow any unscoped read, even for super_admin.
      // Fail closed to prevent cross-tenant leakage.
      return {
        success: false,
        error: 'חסר organization_id להקשר. (Tenant Isolation lockdown: קריאה ללא סינון חסומה)'
      };
    }

    // Final verification before executing query
    if (!supabase || typeof supabase.from !== 'function') {
      console.error('[getClients] Supabase client became invalid before executing query!');
      return {
        success: false,
        error: 'שגיאה: לקוח Supabase הפך לא תקין לפני ביצוע השאילתה',
      };
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        // Emergency isolation: do NOT fallback to legacy tables (social_clients / misrad_clients).
        // Fail closed to prevent cross-tenant leakage.
        return {
          success: false,
          error: 'טבלת clients לא קיימת במסד הנתונים. (מצב חירום: אין Fallback לטבלאות legacy)'
        };
      }

      console.error('Error fetching clients:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Transform Supabase data to Client type
    const clients: Client[] = (data || []).map((client: any) => ({
      id: client.id,
      name: client.name,
      companyName: client.company_name,
      businessId: client.business_id,
      phone: client.phone,
      email: client.email,
      avatar: client.avatar || '',
      brandVoice: client.brand_voice || '',
      dna: client.client_dna?.[0] ? {
        brandSummary: client.client_dna[0].brand_summary || '',
        voice: {
          formal: client.client_dna[0].voice_formal || 50,
          funny: client.client_dna[0].voice_funny || 50,
          length: client.client_dna[0].voice_length || 50,
        },
        vocabulary: {
          loved: client.client_dna[0].vocabulary_loved || [],
          forbidden: client.client_dna[0].vocabulary_forbidden || [],
        },
        colors: {
          primary: client.client_dna[0].color_primary || '#1e293b',
          secondary: client.client_dna[0].color_secondary || '#334155',
        },
        strategy: client.client_dna[0].strategy ? JSON.parse(client.client_dna[0].strategy) : undefined,
      } : {
        brandSummary: '',
        voice: { formal: 50, funny: 50, length: 50 },
        vocabulary: { loved: [], forbidden: [] },
        colors: { primary: '#1e293b', secondary: '#334155' },
      },
      credentials: (client.platform_credentials || []).map((cred: any) => ({
        platform: cred.platform,
        username: cred.username, // NO PASSWORD - we don't store passwords
        notes: cred.notes,
      })),
      postingRhythm: client.posting_rhythm || '3 פעמים בשבוע',
      status: (client.status as ClientStatus) || 'Active',
      activePlatforms: (client.active_platforms || []) as any[],
      quotas: (client.platform_quotas || []).map((q: any) => ({
        platform: q.platform,
        monthlyLimit: q.monthly_limit,
        currentUsage: q.current_usage,
      })),
      onboardingStatus: client.onboarding_status as any,
      invitationToken: client.invitation_token,
      portalToken: client.portal_token,
      color: client.color || '#1e293b',
      plan: client.plan as PricingPlan,
      monthlyFee: client.monthly_fee,
      nextPaymentDate: client.next_payment_date,
      nextPaymentAmount: client.next_payment_amount,
      paymentStatus: client.payment_status as any,
      autoRemindersEnabled: client.auto_reminders_enabled ?? true,
      savedCardThumbnail: client.saved_card_thumbnail,
      businessMetrics: client.business_metrics?.[0] ? {
        timeSpentMinutes: client.business_metrics[0].time_spent_minutes || 0,
        expectedHours: client.business_metrics[0].expected_hours || 0,
        punctualityScore: client.business_metrics[0].punctuality_score || 100,
        responsivenessScore: client.business_metrics[0].responsiveness_score || 100,
        revisionCount: client.business_metrics[0].revision_count || 0,
        lastAIBusinessAudit: client.business_metrics[0].last_ai_business_audit,
        daysOverdue: client.business_metrics[0].days_overdue,
      } : {
        timeSpentMinutes: 0,
        expectedHours: 0,
        punctualityScore: 100,
        responsivenessScore: 100,
        revisionCount: 0,
      },
      internalNotes: client.internal_notes,
      organizationId: client.organization_id, // Add organizationId
    }));

    return {
      success: true,
      data: clients,
    };
  } catch (error: any) {
    console.error('Error in getClients:', error);
    return {
      success: false,
      error: error.message || 'שגיאה בטעינת לקוחות',
    };
  }
}

export async function createClientInvitationLinkForWorkspace(params: {
  orgSlug: string;
  clientId: string;
  clerkUserId: string;
  expiresInDays?: number;
  source?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const resolvedOrgSlug = String(params.orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      return { success: false, error: 'orgSlug חסר' };
    }
    if (!params.clientId) {
      return { success: false, error: 'clientId חסר' };
    }
    if (!params.clerkUserId) {
      return { success: false, error: 'לא מחובר' };
    }

    const supabaseCheck = requireSupabase();
    if (!supabaseCheck.success) {
      return supabaseCheck as any;
    }

    // Enforce workspace access (orgSlug is the source of truth)
    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);
    if (!workspace?.id) {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    const userResult = await getOrCreateSupabaseUserAction(params.clerkUserId);
    if (!userResult.success || !userResult.userId) {
      return { success: false, error: userResult.error || 'שגיאה ביצירת משתמש' };
    }

    // Token generation: 32 hex chars (similar to existing generateInvitationToken, but without DB read dependency)
    const token = crypto.randomUUID().replace(/-/g, '').toUpperCase();

    const expiresInDays = typeof params.expiresInDays === 'number' ? params.expiresInDays : 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const supabase = createSupabaseClient();

    const { error } = await supabase
      .from('system_invitation_links')
      .insert({
        token,
        client_id: params.clientId,
        created_by: userResult.userId,
        expires_at: expiresAt.toISOString(),
        is_used: false,
        is_active: true,
        source: params.source || 'social',
        metadata: {
          ...(params.metadata || {}),
          orgSlug: resolvedOrgSlug,
          organizationId: String(workspace.id),
        },
      });

    if (error) {
      console.error('[createClientInvitationLinkForWorkspace] Error creating invitation link:', error);
      return { success: false, error: error.message || 'שגיאה ביצירת לינק הזמנה' };
    }

    return { success: true, token };
  } catch (error: any) {
    console.error('Error in createClientInvitationLinkForWorkspace:', error);
    return { success: false, error: error.message || 'שגיאה ביצירת לינק הזמנה' };
  }
}

export async function createClientForWorkspace(
  orgSlug: string,
  clientData: Partial<Client>,
  clerkUserId: string
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      return createErrorResponse(new Error('orgSlug is required'), 'שגיאה: ארגון חסר');
    }

    const validation = validateWithSchema(createClientSchema, clientData);
    if (!validation.success) {
      return validation;
    }

    const supabaseCheck = requireSupabase();
    if (!supabaseCheck.success) {
      return supabaseCheck;
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);
    const organizationId = workspace?.id ? String(workspace.id) : '';
    if (!organizationId) {
      return createErrorResponse(new Error('Organization not found'), 'שגיאה: ארגון לא נמצא');
    }

    const userResult = await getOrCreateSupabaseUserAction(clerkUserId);
    if (!userResult.success || !userResult.userId) {
      return createErrorResponse(new Error('שגיאה ביצירת משתמש'), userResult.error || 'שגיאה ביצירת משתמש');
    }

    const supabase = createSupabaseClient();

    const invitationToken = clientData.invitationToken || Math.random().toString(36).substring(2, 15);
    const portalToken = clientData.portalToken || Math.random().toString(36).substring(7);

    const clientsTable = 'clients';
    const dnaTable = 'client_dna';
    const metricsTable = 'business_metrics';

    const normalizedEmail = (clientData.email || '').trim().toLowerCase();
    let existingClientId: string | null = null;
    let existingPortalToken: string | null = null;
    if (normalizedEmail) {
      const { data: existing, error: existingError } = await supabase
        .from(clientsTable)
        .select('id, company_name, portal_token')
        .eq('organization_id', organizationId)
        .ilike('email', normalizedEmail)
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.warn('[createClientForWorkspace] Failed checking existing client by email:', existingError);
      }
      if (existing?.id) {
        existingClientId = String(existing.id);
        existingPortalToken = existing.portal_token ? String(existing.portal_token) : null;
      }
    }

    const cleanCompanyName = String(clientData.companyName || '').trim();
    const cleanName = String(clientData.name || '').trim();
    const shouldUpdateCompanyName = !!cleanCompanyName && cleanCompanyName !== 'ממתין להזנה';
    const shouldUpdateAvatar = typeof clientData.avatar === 'string' ? clientData.avatar.trim().length > 0 : !!clientData.avatar;
    const shouldUpdateBrandVoice = typeof clientData.brandVoice === 'string' ? clientData.brandVoice.trim().length > 0 : !!clientData.brandVoice;
    const shouldUpdatePostingRhythm = typeof clientData.postingRhythm === 'string' ? clientData.postingRhythm.trim().length > 0 : !!clientData.postingRhythm;

    const requiredName = cleanName || String(clientData.companyName || '').trim() || 'לקוח חדש';
    const requiredCompanyName = cleanCompanyName || requiredName;

    const patch: any = {
      // Always keep these stable on dedupe
      organization_id: organizationId,
      user_id: userResult.userId,
      email: normalizedEmail ? normalizedEmail : null,
      status: clientData.status || 'Onboarding',
      onboarding_status: clientData.onboardingStatus || 'invited',
      plan: clientData.plan,
      monthly_fee: clientData.monthlyFee,
      payment_status: clientData.paymentStatus || 'pending',
      auto_reminders_enabled: clientData.autoRemindersEnabled ?? true,
      internal_notes: clientData.internalNotes,
      business_id: clientData.businessId,
      phone: clientData.phone,
      color: clientData.color || '#1e293b',
    };

    if (!existingClientId) {
      patch.name = requiredName;
      patch.company_name = requiredCompanyName;
    } else {
      if (cleanName) patch.name = cleanName;
      if (shouldUpdateCompanyName) patch.company_name = cleanCompanyName;
    }
    if (shouldUpdateAvatar) patch.avatar = clientData.avatar;
    if (shouldUpdateBrandVoice) patch.brand_voice = clientData.brandVoice;
    if (shouldUpdatePostingRhythm) patch.posting_rhythm = clientData.postingRhythm;

    // Tokens should exist; don't rotate them on dedupe
    if (!existingClientId) {
      patch.invitation_token = invitationToken;
      patch.portal_token = portalToken;
    }

    const { data: client, error: clientError } = existingClientId
      ? await supabase
          .from(clientsTable)
          .update(patch)
          .eq('id', existingClientId)
          .eq('organization_id', organizationId)
          .select()
          .maybeSingle()
      : await supabase
          .from(clientsTable)
          .insert(patch)
          .select()
          .single();

    if (clientError) {
      if (isMissingTableError(clientError)) {
        return createErrorResponse(
          new Error('Canonical clients table is missing'),
          'שגיאה: טבלת clients לא קיימת במסד הנתונים. (מצב חירום: אין Fallback לטבלאות legacy)'
        );
      }

      return { success: false, error: clientError.message };
    }

    if (clientData.dna && client?.id) {
      try {
        await supabase
          .from(dnaTable)
          .upsert(
            {
              client_id: client.id,
              brand_summary: clientData.dna.brandSummary,
              voice_formal: clientData.dna.voice.formal,
              voice_funny: clientData.dna.voice.funny,
              voice_length: clientData.dna.voice.length,
              vocabulary_loved: clientData.dna.vocabulary.loved,
              vocabulary_forbidden: clientData.dna.vocabulary.forbidden,
              color_primary: clientData.dna.colors.primary,
              color_secondary: clientData.dna.colors.secondary,
              strategy: clientData.dna.strategy ? JSON.stringify(clientData.dna.strategy) : null,
            },
            {
              onConflict: 'client_id',
            }
          );
      } catch (e) {
        console.error('[createClientForWorkspace] Failed to upsert client DNA (non-blocking):', {
          table: dnaTable,
          clientId: client.id,
          error: e,
        });
      }
    }

    if (client?.id) {
      try {
        await supabase
          .from(metricsTable)
          .upsert(
            {
              client_id: client.id,
              time_spent_minutes: clientData.businessMetrics?.timeSpentMinutes || 0,
              expected_hours: clientData.businessMetrics?.expectedHours || 0,
              punctuality_score: clientData.businessMetrics?.punctualityScore || 100,
              responsiveness_score: clientData.businessMetrics?.responsivenessScore || 100,
              revision_count: clientData.businessMetrics?.revisionCount || 0,
              days_overdue: clientData.businessMetrics?.daysOverdue,
            },
            {
              onConflict: 'client_id',
            }
          );
      } catch (e) {
        console.error('[createClientForWorkspace] Failed to upsert business metrics (non-blocking):', {
          table: metricsTable,
          clientId: client.id,
          error: e,
        });
      }
    }

    const result = await getClients(undefined, resolvedOrgSlug);
    if (result.success && result.data) {
      const createdClient = result.data.find((c) => c.id === client.id);
      if (createdClient) {
        return { success: true, data: createdClient };
      }
    }

    return { success: false, error: 'הלקוח נוצר אך נכשל בטעינת הנתונים המלאים' };
  } catch (error: any) {
    console.error('Error in createClientForWorkspace:', error);
    return {
      success: false,
      error: error.message || 'שגיאה ביצירת לקוח',
    };
  }
}

/**
 * Server Action: Create a new client
 */
export async function createClient(
  clientData: Partial<Client>,
  clerkUserId: string
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    // Validate input
    const validation = validateWithSchema(createClientSchema, clientData);
    if (!validation.success) {
      return validation;
    }

    // Check Supabase configuration
    const supabaseCheck = requireSupabase();
    if (!supabaseCheck.success) {
      return supabaseCheck;
    }

    // Create Supabase client
    let supabase;
    try {
      supabase = createSupabaseClient();
      if (!supabase || typeof supabase.from !== 'function') {
        throw new Error('Invalid Supabase client returned');
      }
    } catch (clientError: any) {
      console.error('[createClient] Failed to create Supabase client:', clientError);
      return createErrorResponse(new Error('שגיאה בהתחברות למסד הנתונים'), clientError.message);
    }

    // Get or create Supabase user from Clerk user ID - use Server Action
    const userResult = await getOrCreateSupabaseUserAction(clerkUserId);
    if (!userResult.success || !userResult.userId) {
      console.error('[createClient] Failed to get or create user:', {
        clerkUserId,
        error: userResult.error,
        success: userResult.success,
        userId: userResult.userId,
      });
      
      // Provide more specific error message
      const errorMessage = userResult.error 
        ? (userResult.error.includes('organization') || userResult.error.includes('ארגון')
            ? 'שגיאה: משתמש לא שייך לארגון. נא ליצור קשר עם התמיכה.'
            : userResult.error.includes('Supabase') || userResult.error.includes('database')
            ? 'שגיאה בהתחברות למסד הנתונים. נא לנסות שוב.'
            : userResult.error)
        : 'שגיאה ביצירת משתמש';
      
      return createErrorResponse(new Error('שגיאה ביצירת משתמש'), errorMessage);
    }
    const supabaseUserId = userResult.userId;

    // Get user info (role and organizationId) to determine which organization this client belongs to
    const { getCurrentUserInfo } = await import('@/app/actions/users');
    const userInfo = await getCurrentUserInfo();
    if (!userInfo.success) {
      console.error('[createClient] Failed to get user info:', {
        error: userInfo.error,
        success: userInfo.success,
      });
      return createErrorResponse(
        new Error('שגיאה בקבלת פרטי משתמש'), 
        userInfo.error || 'שגיאה בקבלת פרטי משתמש. נא לנסות שוב או ליצור קשר עם התמיכה.'
      );
    }

    // Determine organizationId:
    // - If clientData has organizationId, use it (for super_admin creating clients for other orgs)
    // - Otherwise, use user's organizationId (for owner/team_member creating clients)
    // - Super admin can create clients without organizationId (legacy support)
    let organizationId = clientData.organizationId || userInfo.organizationId;
    
    // Super admin can create clients without organizationId, but owner/team_member must have one
    if (!organizationId && userInfo.role !== 'super_admin') {
      console.error('[createClient] User has no organizationId:', {
        role: userInfo.role,
        organizationId: userInfo.organizationId,
        userId: userInfo.userId,
      });
      return createErrorResponse(
        new Error('שגיאה: משתמש לא שייך לארגון'),
        'לא ניתן ליצור לקוח ללא ארגון. נא ליצור קשר עם התמיכה כדי להוסיף אותך לארגון.'
      );
    }

    // Generate tokens
    const invitationToken = clientData.invitationToken || Math.random().toString(36).substring(2, 15);
    const portalToken = clientData.portalToken || Math.random().toString(36).substring(7);

    // Insert client - email is now optional
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: supabaseUserId,
        organization_id: organizationId, // Add organizationId
        name: clientData.name || '',
        company_name: clientData.companyName || 'לקוח חדש',
        business_id: clientData.businessId,
        phone: clientData.phone,
        email: clientData.email || null, // Email is optional
        avatar: clientData.avatar,
        brand_voice: clientData.brandVoice || '',
        posting_rhythm: clientData.postingRhythm || '3 פעמים בשבוע',
        status: clientData.status || 'Onboarding',
        onboarding_status: clientData.onboardingStatus || 'invited',
        invitation_token: invitationToken,
        portal_token: portalToken,
        color: clientData.color || '#1e293b',
        plan: clientData.plan,
        monthly_fee: clientData.monthlyFee,
        payment_status: clientData.paymentStatus || 'pending',
        auto_reminders_enabled: clientData.autoRemindersEnabled ?? true,
        internal_notes: clientData.internalNotes,
      })
      .select()
      .single();

    if (clientError) {
      console.error('Error creating client:', clientError);
      return {
        success: false,
        error: clientError.message,
      };
    }

    // Insert DNA if provided
    if (clientData.dna && client.id) {
      await supabase.from('client_dna').insert({
        client_id: client.id,
        brand_summary: clientData.dna.brandSummary,
        voice_formal: clientData.dna.voice.formal,
        voice_funny: clientData.dna.voice.funny,
        voice_length: clientData.dna.voice.length,
        vocabulary_loved: clientData.dna.vocabulary.loved,
        vocabulary_forbidden: clientData.dna.vocabulary.forbidden,
        color_primary: clientData.dna.colors.primary,
        color_secondary: clientData.dna.colors.secondary,
        strategy: clientData.dna.strategy ? JSON.stringify(clientData.dna.strategy) : null,
      });
    }

    // Insert business metrics
    if (client.id) {
      await supabase.from('business_metrics').insert({
        client_id: client.id,
        time_spent_minutes: clientData.businessMetrics?.timeSpentMinutes || 0,
        expected_hours: clientData.businessMetrics?.expectedHours || 0,
        punctuality_score: clientData.businessMetrics?.punctualityScore || 100,
        responsiveness_score: clientData.businessMetrics?.responsivenessScore || 100,
        revision_count: clientData.businessMetrics?.revisionCount || 0,
        days_overdue: clientData.businessMetrics?.daysOverdue,
      });
    }

    // Fetch the complete client with relations
    const result = await getClients(clerkUserId);
    if (result.success && result.data) {
      const createdClient = result.data.find(c => c.id === client.id);
      if (createdClient) {
        return {
          success: true,
          data: createdClient,
        };
      }
    }

    return {
      success: false,
      error: 'הלקוח נוצר אך נכשל בטעינת הנתונים המלאים',
    };
  } catch (error: any) {
    console.error('Error in createClient:', error);
    return {
      success: false,
      error: error.message || 'שגיאה ביצירת לקוח',
    };
  }
}

/**
 * Server Action: Update a client
 */
export async function updateClient(
  clientId: string,
  updates: Partial<Client>
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const supabase = createSupabaseClient();

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.companyName !== undefined) updateData.company_name = updates.companyName;
    if (updates.businessId !== undefined) updateData.business_id = updates.businessId;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.brandVoice !== undefined) updateData.brand_voice = updates.brandVoice;
    if (updates.postingRhythm !== undefined) updateData.posting_rhythm = updates.postingRhythm;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.onboardingStatus !== undefined) updateData.onboarding_status = updates.onboardingStatus;
    if (updates.plan !== undefined) updateData.plan = updates.plan;
    if (updates.monthlyFee !== undefined) updateData.monthly_fee = updates.monthlyFee;
    if (updates.nextPaymentDate !== undefined) updateData.next_payment_date = updates.nextPaymentDate;
    if (updates.nextPaymentAmount !== undefined) updateData.next_payment_amount = updates.nextPaymentAmount;
    if (updates.paymentStatus !== undefined) updateData.payment_status = updates.paymentStatus;
    if (updates.autoRemindersEnabled !== undefined) updateData.auto_reminders_enabled = updates.autoRemindersEnabled;
    if (updates.internalNotes !== undefined) updateData.internal_notes = updates.internalNotes;
    if (updates.organizationId !== undefined) updateData.organization_id = updates.organizationId;

    const { error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId);

    if (error) {
      console.error('Error updating client:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Update DNA if provided
    if (updates.dna) {
      const { error: dnaError } = await supabase
        .from('client_dna')
        .upsert({
          client_id: clientId,
          brand_summary: updates.dna.brandSummary,
          voice_formal: updates.dna.voice.formal,
          voice_funny: updates.dna.voice.funny,
          voice_length: updates.dna.voice.length,
          vocabulary_loved: updates.dna.vocabulary.loved,
          vocabulary_forbidden: updates.dna.vocabulary.forbidden,
          color_primary: updates.dna.colors.primary,
          color_secondary: updates.dna.colors.secondary,
          strategy: updates.dna.strategy ? JSON.stringify(updates.dna.strategy) : null,
        }, {
          onConflict: 'client_id',
        });

      if (dnaError) {
        console.error('Error updating client DNA:', dnaError);
      }
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error in updateClient:', error);
    return {
      success: false,
      error: error.message || 'שגיאה בעדכון לקוח',
    };
  }
}

export async function updateClientForWorkspace(
  orgSlug: string,
  clientId: string,
  updates: Partial<Client>
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      return { success: false, error: 'orgSlug חסר' };
    }
    if (!clientId) {
      return { success: false, error: 'clientId חסר' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);
    const organizationId = workspace?.id ? String(workspace.id) : '';
    if (!organizationId) {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    const supabase = createSupabaseClient();

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.companyName !== undefined) updateData.company_name = updates.companyName;
    if (updates.businessId !== undefined) updateData.business_id = updates.businessId;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.brandVoice !== undefined) updateData.brand_voice = updates.brandVoice;
    if (updates.postingRhythm !== undefined) updateData.posting_rhythm = updates.postingRhythm;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.onboardingStatus !== undefined) updateData.onboarding_status = updates.onboardingStatus;
    if (updates.plan !== undefined) updateData.plan = updates.plan;
    if (updates.monthlyFee !== undefined) updateData.monthly_fee = updates.monthlyFee;
    if (updates.nextPaymentDate !== undefined) updateData.next_payment_date = updates.nextPaymentDate;
    if (updates.nextPaymentAmount !== undefined) updateData.next_payment_amount = updates.nextPaymentAmount;
    if (updates.paymentStatus !== undefined) updateData.payment_status = updates.paymentStatus;
    if (updates.autoRemindersEnabled !== undefined) updateData.auto_reminders_enabled = updates.autoRemindersEnabled;
    if (updates.internalNotes !== undefined) updateData.internal_notes = updates.internalNotes;

    const { data: updated, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .eq('organization_id', organizationId)
      .select('id')
      .maybeSingle();

    if (error || !updated?.id) {
      return {
        success: false,
        error: error?.message || 'לקוח לא נמצא',
      };
    }

    if (updates.dna) {
      const { error: dnaError } = await supabase
        .from('client_dna')
        .upsert(
          {
            client_id: clientId,
            brand_summary: updates.dna.brandSummary,
            voice_formal: updates.dna.voice.formal,
            voice_funny: updates.dna.voice.funny,
            voice_length: updates.dna.voice.length,
            vocabulary_loved: updates.dna.vocabulary.loved,
            vocabulary_forbidden: updates.dna.vocabulary.forbidden,
            color_primary: updates.dna.colors.primary,
            color_secondary: updates.dna.colors.secondary,
            strategy: updates.dna.strategy ? JSON.stringify(updates.dna.strategy) : null,
          },
          {
            onConflict: 'client_id',
          }
        );

      if (dnaError) {
        console.error('Error updating client DNA:', dnaError);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateClientForWorkspace:', error);
    return {
      success: false,
      error: error.message || 'שגיאה בעדכון לקוח',
    };
  }
}

/**
 * Server Action: Delete a client
 */
export async function deleteClient(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseClient();

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      console.error('Error deleting client:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error in deleteClient:', error);
    return {
      success: false,
      error: error.message || 'שגיאה במחיקת לקוח',
    };
  }
}

export async function deleteClientForWorkspace(
  orgSlug: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      return { success: false, error: 'orgSlug חסר' };
    }
    if (!clientId) {
      return { success: false, error: 'clientId חסר' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);
    const organizationId = workspace?.id ? String(workspace.id) : '';
    if (!organizationId) {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('organization_id', organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteClientForWorkspace:', error);
    return {
      success: false,
      error: error.message || 'שגיאה במחיקת לקוח',
    };
  }
}

/**
 * Server Action: Send invitation email to client
 */
export async function inviteClient(
  clientId: string,
  invitationLink: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseClient();

    // Get client data
    const { data: client, error } = await supabase
      .from('clients')
      .select('name, email, plan, monthly_fee')
      .eq('id', clientId)
      .single();

    if (error || !client) {
      return {
        success: false,
        error: 'לקוח לא נמצא',
      };
    }

    if (!client.email) {
      return {
        success: false,
        error: 'אימייל הלקוח לא הוגדר',
      };
    }

    const planNames: Record<string, string> = {
      starter: 'Starter',
      pro: 'Professional',
      agency: 'Agency',
      custom: 'Custom',
    };

    const planName = planNames[client.plan || 'pro'] || 'Professional';
    const planPrice = client.monthly_fee || 2990;

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      clientName: client.name,
      clientEmail: client.email,
      invitationLink,
      planName,
      planPrice,
    });

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.error || 'שגיאה בשליחת מייל הזמנה',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error in inviteClient:', error);
    return {
      success: false,
      error: error.message || 'שגיאה בהזמנת לקוח',
    };
  }
}

export async function inviteClientForWorkspace(
  orgSlug: string,
  clientId: string,
  invitationLink: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      return { success: false, error: 'orgSlug חסר' };
    }
    if (!clientId) {
      return { success: false, error: 'clientId חסר' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);
    const organizationId = workspace?.id ? String(workspace.id) : '';
    if (!organizationId) {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    const supabase = createSupabaseClient();

    const { data: client, error } = await supabase
      .from('clients')
      .select('name, email, plan, monthly_fee')
      .eq('id', clientId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error || !client) {
      return {
        success: false,
        error: 'לקוח לא נמצא',
      };
    }

    if (!client.email) {
      return {
        success: false,
        error: 'אימייל הלקוח לא הוגדר',
      };
    }

    const planNames: Record<string, string> = {
      starter: 'Starter',
      pro: 'Professional',
      agency: 'Agency',
      custom: 'Custom',
    };

    const planName = planNames[(client as any).plan || 'pro'] || 'Professional';
    const planPrice = (client as any).monthly_fee || 2990;

    const emailResult = await sendInvitationEmail({
      clientName: (client as any).name,
      clientEmail: (client as any).email,
      invitationLink,
      planName,
      planPrice,
    });

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.error || 'שגיאה בשליחת מייל הזמנה',
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in inviteClientForWorkspace:', error);
    return {
      success: false,
      error: error.message || 'שגיאה בהזמנת לקוח',
    };
  }
}

/**
 * Server Action: Get client by invitation token (public, no auth required)
 */
export async function getClientByInvitationToken(
  invitationToken: string
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    if (!invitationToken) {
      return {
        success: false,
        error: 'טוקן הזמנה חסר',
      };
    }

    const supabase = createSupabaseClient();
    if (!supabase || typeof supabase.from !== 'function') {
      return {
        success: false,
        error: 'שגיאה בהתחברות למסד הנתונים',
      };
    }

    // Get client by invitation token
    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        client_dna (*),
        platform_credentials (*),
        platform_quotas (*),
        business_metrics (*)
      `)
      .eq('invitation_token', invitationToken)
      .is('deleted_at', null)
      .single();

    if (error || !client) {
      return {
        success: false,
        error: 'טוקן הזמנה לא תקין או שהלקוח לא נמצא',
      };
    }

    // Check if client is in invited status
    if (client.onboarding_status !== 'invited') {
      return {
        success: false,
        error: 'ההזמנה כבר הושלמה או לא תקינה',
      };
    }

    // Transform to Client type (matching getClients transformation)
    const transformedClient: Client = {
      id: client.id,
      name: client.name,
      companyName: client.company_name,
      businessId: client.business_id,
      phone: client.phone,
      email: client.email,
      avatar: client.avatar || '',
      brandVoice: client.brand_voice || '',
      dna: client.client_dna?.[0] ? {
        brandSummary: client.client_dna[0].brand_summary || '',
        voice: {
          formal: client.client_dna[0].voice_formal || 50,
          funny: client.client_dna[0].voice_funny || 50,
          length: client.client_dna[0].voice_length || 50,
        },
        vocabulary: {
          loved: client.client_dna[0].vocabulary_loved || [],
          forbidden: client.client_dna[0].vocabulary_forbidden || [],
        },
        colors: {
          primary: client.client_dna[0].color_primary || '#1e293b',
          secondary: client.client_dna[0].color_secondary || '#334155',
        },
        strategy: client.client_dna[0].strategy ? JSON.parse(client.client_dna[0].strategy) : undefined,
      } : {
        brandSummary: '',
        voice: { formal: 50, funny: 50, length: 50 },
        vocabulary: { loved: [], forbidden: [] },
        colors: { primary: '#1e293b', secondary: '#334155' },
      },
      credentials: (client.platform_credentials || []).map((cred: any) => ({
        platform: cred.platform,
        username: cred.username, // NO PASSWORD - we don't store passwords
        notes: cred.notes,
      })),
      postingRhythm: client.posting_rhythm || '3 פעמים בשבוע',
      status: (client.status as ClientStatus) || 'Active',
      activePlatforms: (client.active_platforms || []) as any[],
      quotas: (client.platform_quotas || []).map((q: any) => ({
        platform: q.platform,
        monthlyLimit: q.monthly_limit,
        currentUsage: q.current_usage,
      })),
      onboardingStatus: client.onboarding_status as any,
      invitationToken: client.invitation_token,
      portalToken: client.portal_token,
      color: client.color || '#1e293b',
      plan: client.plan as PricingPlan,
      monthlyFee: client.monthly_fee,
      nextPaymentDate: client.next_payment_date,
      nextPaymentAmount: client.next_payment_amount,
      paymentStatus: client.payment_status as any,
      autoRemindersEnabled: client.auto_reminders_enabled ?? true,
      savedCardThumbnail: client.saved_card_thumbnail,
      businessMetrics: client.business_metrics?.[0] ? {
        timeSpentMinutes: client.business_metrics[0].time_spent_minutes || 0,
        expectedHours: client.business_metrics[0].expected_hours || 0,
        punctualityScore: client.business_metrics[0].punctuality_score || 100,
        responsivenessScore: client.business_metrics[0].responsiveness_score || 100,
        revisionCount: client.business_metrics[0].revision_count || 0,
        lastAIBusinessAudit: client.business_metrics[0].last_ai_business_audit,
        daysOverdue: client.business_metrics[0].days_overdue,
      } : {
        timeSpentMinutes: 0,
        expectedHours: 0,
        punctualityScore: 100,
        responsivenessScore: 100,
        revisionCount: 0,
      },
      internalNotes: client.internal_notes,
      organizationId: client.organization_id, // Add organizationId
    };

    return {
      success: true,
      data: transformedClient,
    };
  } catch (error: any) {
    console.error('Error in getClientByInvitationToken:', error);
    return {
      success: false,
      error: error.message || 'שגיאה בטעינת לקוח',
    };
  }
}

