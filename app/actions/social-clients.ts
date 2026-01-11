'use server';

import { createClient as createSupabaseClient } from '@/lib/supabase';
import { Client } from '@/types';
import { createClientSchema, validateWithSchema } from '@/lib/validation';
import { createErrorResponse, requireSupabase } from '@/lib/errorHandler';
import { getOrCreateSocialSupabaseUserAction } from '@/app/actions/social-users';

export async function createSocialClient(
  clientData: Partial<Client>,
  clerkUserId: string,
): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const validation = validateWithSchema(createClientSchema, clientData);
    if (!validation.success) {
      return validation;
    }

    const supabaseCheck = requireSupabase();
    if (!supabaseCheck.success) {
      return supabaseCheck;
    }

    let supabase;
    try {
      supabase = createSupabaseClient();
      if (!supabase || typeof supabase.from !== 'function') {
        throw new Error('Invalid Supabase client returned');
      }
    } catch (clientError: any) {
      console.error('[createSocialClient] Failed to create Supabase client:', clientError);
      return createErrorResponse(new Error('שגיאה בהתחברות למסד הנתונים'), clientError.message);
    }

    const userResult = await getOrCreateSocialSupabaseUserAction(clerkUserId);
    if (!userResult.success || !userResult.userId) {
      console.error('[createSocialClient] Failed to get or create social user:', {
        clerkUserId,
        error: userResult.error,
        success: userResult.success,
        userId: userResult.userId,
      });
      return createErrorResponse(
        new Error(userResult.error || 'שגיאה ביצירת משתמש'),
        userResult.error || 'שגיאה ביצירת משתמש'
      );
    }

    const supabaseUserId = userResult.userId;

    const { data: socialUser, error: socialUserError } = await supabase
      .from('social_users')
      .select('role, organization_id')
      .eq('id', supabaseUserId)
      .single();

    if (socialUserError) {
      console.error('[createSocialClient] Failed to fetch social user info:', socialUserError);
      return createErrorResponse(new Error('שגיאה בקבלת פרטי משתמש'), socialUserError.message);
    }

    const role = socialUser?.role;
    let resolvedOrganizationId = clientData.organizationId || socialUser?.organization_id;

    // Ensure organization_id exists for inserting into social_clients.
    // If missing, find or create a default organization for this user.
    if (!resolvedOrganizationId) {
      const { data: existingOrg, error: existingOrgError } = await supabase
        .from('social_organizations')
        .select('id')
        .eq('owner_id', supabaseUserId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingOrgError) {
        console.error('[createSocialClient] Failed to lookup social_organizations:', existingOrgError);
      }

      if (existingOrg?.id) {
        resolvedOrganizationId = existingOrg.id;
      } else {
        const { data: createdOrg, error: createOrgError } = await supabase
          .from('social_organizations')
          .insert({
            name: 'Default Organization',
            owner_id: supabaseUserId,
            trial_days: 14,
            subscription_status: 'trial',
            subscription_plan: 'pro',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (createOrgError || !createdOrg?.id) {
          console.error('[createSocialClient] Failed to create default social_organization:', createOrgError);
          return createErrorResponse(
            new Error('שגיאה: לא ניתן ליצור ארגון'),
            createOrgError?.message || 'לא ניתן ליצור לקוח ללא ארגון. נא ליצור קשר עם התמיכה.'
          );
        }

        resolvedOrganizationId = createdOrg.id;

        // Best effort: attach organization_id to the social user for future actions
        const { error: updateUserOrgError } = await supabase
          .from('social_users')
          .update({ organization_id: resolvedOrganizationId, updated_at: new Date().toISOString() })
          .eq('id', supabaseUserId);
        if (updateUserOrgError) {
          console.warn('[createSocialClient] Failed to update social_users.organization_id:', updateUserOrgError);
        }
      }
    }

    if (!resolvedOrganizationId && role !== 'super_admin') {
      return createErrorResponse(
        new Error('שגיאה: משתמש לא שייך לארגון'),
        'לא ניתן ליצור לקוח ללא ארגון. נא ליצור קשר עם התמיכה כדי להוסיף אותך לארגון.',
      );
    }

    const invitationToken = clientData.invitationToken || Math.random().toString(36).substring(2, 15);
    const portalToken = clientData.portalToken || Math.random().toString(36).substring(7);

    const { data: clientRow, error: clientError } = await supabase
      .from('social_clients')
      .insert({
        user_id: supabaseUserId,
        organization_id: resolvedOrganizationId,
        name: clientData.name || '',
        company_name: clientData.companyName || 'לקוח חדש',
        business_id: clientData.businessId,
        phone: clientData.phone,
        email: clientData.email || null,
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
        next_payment_date: clientData.nextPaymentDate,
        next_payment_amount: clientData.nextPaymentAmount,
        payment_status: clientData.paymentStatus || 'pending',
        auto_reminders_enabled: clientData.autoRemindersEnabled ?? true,
        internal_notes: clientData.internalNotes,
      })
      .select()
      .single();

    if (clientError || !clientRow) {
      console.error('[createSocialClient] Error creating social client:', clientError);
      return { success: false, error: clientError?.message || 'שגיאה ביצירת לקוח' };
    }

    if (clientData.dna && clientRow.id) {
      await supabase.from('social_client_dna').insert({
        client_id: clientRow.id,
        brand_summary: clientData.dna.brandSummary,
        voice_formal: clientData.dna.voice.formal,
        voice_funny: clientData.dna.voice.funny,
        voice_length: clientData.dna.voice.length,
        vocabulary_loved: clientData.dna.vocabulary.loved,
        vocabulary_forbidden: clientData.dna.vocabulary.forbidden,
        color_primary: clientData.dna.colors.primary,
        color_secondary: clientData.dna.colors.secondary,
        target_audience: clientData.dna.strategy?.targetAudience,
        pain_points: clientData.dna.strategy?.painPoints,
        unique_value: clientData.dna.strategy?.uniqueValue,
        competitors: clientData.dna.strategy?.competitors,
        main_goal: clientData.dna.strategy?.mainGoal,
        ai_strategy_summary: clientData.dna.strategy?.aiStrategySummary,
      });
    }

    if (clientRow.id) {
      await supabase.from('social_business_metrics').insert({
        client_id: clientRow.id,
        time_spent_minutes: clientData.businessMetrics?.timeSpentMinutes || 0,
        expected_hours: clientData.businessMetrics?.expectedHours || 0,
        punctuality_score: clientData.businessMetrics?.punctualityScore || 100,
        responsiveness_score: clientData.businessMetrics?.responsivenessScore || 100,
        revision_count: clientData.businessMetrics?.revisionCount || 0,
        days_overdue: clientData.businessMetrics?.daysOverdue,
      });
    }

    const createdClient: Client = {
      id: clientRow.id,
      name: clientRow.name,
      companyName: clientRow.company_name,
      businessId: clientRow.business_id,
      phone: clientRow.phone,
      email: clientRow.email,
      avatar: clientRow.avatar || 'https://i.pravatar.cc/150?u=' + clientRow.id,
      brandVoice: clientRow.brand_voice || '',
      dna: clientData.dna || {
        brandSummary: '',
        voice: { formal: 50, funny: 50, length: 50 },
        vocabulary: { loved: [], forbidden: [] },
        colors: { primary: '#1e293b', secondary: '#334155' },
      },
      credentials: clientData.credentials || [],
      postingRhythm: clientRow.posting_rhythm || '3 פעמים בשבוע',
      status: clientRow.status,
      activePlatforms: clientData.activePlatforms || [],
      quotas: clientData.quotas || [],
      onboardingStatus: clientRow.onboarding_status,
      invitationToken: clientRow.invitation_token,
      portalToken: clientRow.portal_token,
      color: clientRow.color || '#1e293b',
      plan: clientRow.plan,
      monthlyFee: clientRow.monthly_fee,
      nextPaymentDate: clientRow.next_payment_date,
      nextPaymentAmount: clientRow.next_payment_amount,
      paymentStatus: clientRow.payment_status,
      autoRemindersEnabled: clientRow.auto_reminders_enabled ?? true,
      savedCardThumbnail: clientRow.saved_card_thumbnail,
      businessMetrics: clientData.businessMetrics || {
        timeSpentMinutes: 0,
        expectedHours: 0,
        punctualityScore: 100,
        responsivenessScore: 100,
        revisionCount: 0,
      },
      internalNotes: clientRow.internal_notes,
      organizationId: clientRow.organization_id,
    };

    return { success: true, data: createdClient };
  } catch (error: any) {
    console.error('[createSocialClient] Error:', error);
    return { success: false, error: error?.message || 'שגיאה ביצירת לקוח' };
  }
}
