'use server';

import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { requireSuperAdmin } from '@/lib/auth';
import type { OSModuleKey } from '@/lib/os/modules/types';

/**
 * Get live KPIs for Overview & Pulse screen
 */
export async function getLiveKPIs(): Promise<{
  success: boolean;
  data?: {
    usersRegisteredToday: number;
    usersRegisteredThisWeek: number;
    activeClientsOnline: number;
    totalMRR: number;
    dailyAICost: number;
    criticalErrors: any[];
    securityAlerts: any[];
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    // Get users registered today and this week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get users from Clerk (we'll need to query via API or store in DB)
    // For now, we'll get from activity_logs or a users table if exists
    const { data: todayUsers } = await supabase
      .from('activity_logs')
      .select('user_id')
      .gte('created_at', today.toISOString())
      .eq('action', 'הרשמה');

    const { data: weekUsers } = await supabase
      .from('activity_logs')
      .select('user_id')
      .gte('created_at', weekAgo.toISOString())
      .eq('action', 'הרשמה');

    // Get active clients (online = last activity in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { data: activeClients } = await supabase
      .from('client_clients')
      .select('id, metadata');

    const activeClientsOnline = (activeClients || []).filter((c: any) => (c?.metadata?.status ?? '') === 'Active').length;

    // Get MRR
    const { data: clientsData } = await supabase
      .from('client_clients')
      .select('metadata');
    const totalMRR = (clientsData || []).reduce((sum: number, c: any) => sum + (Number(c?.metadata?.monthlyFee) || 0), 0);

    // Get daily AI cost (from gemini_token_usage or similar)
    const { data: metricsData } = await supabase
      .from('global_system_metrics')
      .select('gemini_token_usage')
      .order('created_at', { ascending: false })
      .limit(1);
    
    // Estimate daily cost (rough calculation: ~$0.00001 per token)
    const dailyAICost = (metricsData?.[0]?.gemini_token_usage || 0) * 0.00001;

    // Get critical errors (from logs)
    const { data: errors } = await supabase
      .from('activity_logs')
      .select('*')
      .or('action.ilike.%שגיאה%,action.ilike.%error%')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get security alerts (rate limiting, suspicious activity)
    const { data: securityAlerts } = await supabase
      .from('activity_logs')
      .select('*')
      .or('action.ilike.%פריצה%,action.ilike.%hack%,action.ilike.%suspicious%')
      .order('created_at', { ascending: false })
      .limit(10);

    return createSuccessResponse({
      usersRegisteredToday: todayUsers?.length || 0,
      usersRegisteredThisWeek: weekUsers?.length || 0,
      activeClientsOnline,
      totalMRR,
      dailyAICost,
      criticalErrors: errors || [],
      securityAlerts: securityAlerts || [],
    });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בקבלת KPIs חיים');
  }
}

/**
 * Get all system users (from Clerk and sync with DB)
 */
export async function getAllUsers(): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const user = await currentUser();
    if (!user) {
      return createErrorResponse(null, 'לא מאומת');
    }

    // Get all users from Clerk
    const client = await clerkClient();
    let clerkUsers: any[] = [];
    try {
      const clerkUsersResponse = await client.users.getUserList({ limit: 500 });
      clerkUsers = clerkUsersResponse.data || [];
      console.log('[getAllUsers] Found', clerkUsers.length, 'users in Clerk');
    } catch (clerkError: any) {
      console.error('[getAllUsers] Error fetching users from Clerk:', clerkError);
      // Continue with Supabase users only
    }

    const supabase = createClient();
    
    // Get users from Supabase nexus_users
    const { data: teamMembers } = await supabase
      .from('nexus_users')
      .select('*')
      .order('created_at', { ascending: false });

    // Build a map of existing users by email for quick lookup
    const existingEmails = new Set((teamMembers || []).map(m => m.email?.toLowerCase()).filter(Boolean));
    console.log('[getAllUsers] Existing emails in Supabase:', Array.from(existingEmails));
    
    // Sync Clerk users with Supabase - create missing entries
    const { getOrCreateSupabaseUserAction } = await import('./users');
    let syncedCount = 0;
    
    for (const clerkUser of clerkUsers) {
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      if (!email) {
        console.log('[getAllUsers] Skipping user without email:', clerkUser.id);
        continue;
      }
      
      const emailLower = email.toLowerCase();
      const existsInSupabase = existingEmails.has(emailLower);
      
      console.log('[getAllUsers] Checking user:', {
        email,
        clerkId: clerkUser.id,
        existsInSupabase,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      });
      
      if (!existsInSupabase) {
        // User exists in Clerk but not in Supabase - create it
        try {
          console.log('[getAllUsers] 🔄 Syncing user from Clerk to Supabase:', email);
          const fullName = clerkUser.firstName && clerkUser.lastName 
            ? `${clerkUser.firstName} ${clerkUser.lastName}`
            : clerkUser.firstName || clerkUser.lastName || 'User';
          
          const supabaseResult = await getOrCreateSupabaseUserAction(
            clerkUser.id,
            email,
            fullName,
            clerkUser.imageUrl || undefined
          );
          
          console.log('[getAllUsers] getOrCreateSupabaseUserAction result:', {
            success: supabaseResult.success,
            userId: supabaseResult.userId,
            error: supabaseResult.error,
          });
          
          if (supabaseResult.success && supabaseResult.userId) {
            // Check if user already exists in nexus_users
            const { data: existingMember } = await supabase
              .from('nexus_users')
              .select('created_at')
              .eq('id', supabaseResult.userId)
              .single();

            // Initialize trial only for new users (not existing ones)
            const isNewUser = !existingMember;
            const now = new Date().toISOString();
            
            // Prepare user data
            const teamMemberData: any = {
              id: supabaseResult.userId,
              name: fullName,
              email: email,
              role: 'account_manager', // Default role
              avatar: clerkUser.imageUrl || `https://i.pravatar.cc/150?u=${email}`,
              created_at: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : now,
            };

            // Note: nexus_users does not store subscription fields; trial logic is handled elsewhere.
            // For existing users, preserve their trial/subscription status

            // Insert into nexus_users (id already set)
            const { error: insertError } = await supabase
              .from('nexus_users')
              .insert(teamMemberData);
            
            if (insertError) {
              console.error('[getAllUsers] ❌ Error inserting to nexus_users:', insertError);
            } else {
              console.log('[getAllUsers] ✅ Synced user to Supabase:', email);
              syncedCount++;
              // Add to set so we don't try to sync again in this run
              existingEmails.add(emailLower);
            }
          } else {
            console.error('[getAllUsers] ❌ Failed to create user in Supabase:', supabaseResult.error);
          }
        } catch (syncError: any) {
          console.error('[getAllUsers] ❌ Error syncing user:', email, syncError);
          console.error('[getAllUsers] Error details:', {
            message: syncError.message,
            stack: syncError.stack,
          });
          // Continue with other users
        }
      } else {
        console.log('[getAllUsers] ✓ User already exists in Supabase:', email);
      }
    }
    
    console.log('[getAllUsers] Synced', syncedCount, 'users from Clerk to Supabase');
    
    // Get updated team members after sync
    const { data: updatedTeamMembers } = await supabase
      .from('nexus_users')
      .select('*')
      .order('created_at', { ascending: false });

    // Get last activity for each user
    const usersWithActivity = await Promise.all(
      (updatedTeamMembers || []).map(async (member) => {
        const { data: lastActivity } = await supabase
          .from('activity_logs')
          .select('created_at')
          .eq('user_id', member.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          id: member.id,
          name: member.name,
          email: member.email || 'אין דוא"ל',
          role: member.role || 'user',
          plan: 'free',
          registeredAt: member.created_at,
          lastActivity: lastActivity?.created_at || member.created_at,
          isBanned: false,
        };
      })
    );

    return createSuccessResponse(usersWithActivity);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בקבלת משתמשים');
  }
}

/**
 * Ban/Suspend user
 */
export async function banUser(
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    // Log the action
    await supabase.from('activity_logs').insert({
      user_id: authCheck.userId,
      action: `חסימת משתמש: ${userId} - ${reason}`,
      created_at: new Date().toISOString(),
    });

    return createErrorResponse(null, 'פעולה לא נתמכת: אין שדה חסימה ב-nexus_users');
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בחסימת משתמש');
  }
}

/**
 * Grant PRO access to user
 */
export async function grantProAccess(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    // Log the action
    await supabase.from('activity_logs').insert({
      user_id: authCheck.userId,
      action: `שדרוג משתמש ל-PRO: ${userId}`,
      created_at: new Date().toISOString(),
    });

    return createErrorResponse(null, 'פעולה לא נתמכת: אין שדה plan ב-nexus_users');
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשדרוג משתמש');
  }
}

/**
 * Get deleted items (soft deletes) for Recycle Bin
 */
export async function getDeletedItems(): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    // Get deleted posts
    const { data: deletedPosts } = await supabase
      .from('posts')
      .select('*, clients(company_name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    // Get deleted clients
    const { data: deletedClients } = await supabase
      .from('client_clients')
      .select('id, full_name, metadata, deleted_at, deleted_by')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    // Combine and format
    const deletedItems = [
      ...(deletedPosts || []).map((p: any) => ({
        id: p.id,
        type: 'post',
        name: p.content?.substring(0, 50) || 'פוסט',
        clientName: p.clients?.company_name || 'לא ידוע',
        deletedAt: p.deleted_at,
        deletedBy: p.deleted_by || 'מערכת',
      })),
      ...(deletedClients || []).map((c: any) => ({
        id: c.id,
        type: 'client',
        name: c?.metadata?.companyName || c?.metadata?.name || c.full_name,
        clientName: c?.metadata?.companyName || c?.metadata?.name || c.full_name,
        deletedAt: c.deleted_at,
        deletedBy: c.deleted_by || 'מערכת',
      })),
    ].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

    return createSuccessResponse(deletedItems);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בקבלת פריטים שנמחקו');
  }
}

/**
 * Restore deleted item
 */
export async function restoreDeletedItem(
  itemId: string,
  itemType: 'post' | 'client'
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();
    const tableName = itemType === 'post' ? 'posts' : 'client_clients';

    // Restore by setting deleted_at to null
    const { error } = await supabase
      .from(tableName)
      .update({ deleted_at: null })
      .eq('id', itemId);

    if (error) {
      return createErrorResponse(error, 'שגיאה בהחזרת פריט');
    }

    // Log the action
    await supabase.from('activity_logs').insert({
      user_id: authCheck.userId,
      action: `החזרת ${itemType === 'post' ? 'פוסט' : 'לקוח'}: ${itemId}`,
      created_at: new Date().toISOString(),
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בהחזרת פריט');
  }
}

/**
 * Hard delete item (permanent)
 */
export async function hardDeleteItem(
  itemId: string,
  itemType: 'post' | 'client'
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();
    const tableName = itemType === 'post' ? 'posts' : 'client_clients';

    // Permanently delete
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', itemId);

    if (error) {
      return createErrorResponse(error, 'שגיאה במחיקה קבועה');
    }

    // Log the action
    await supabase.from('activity_logs').insert({
      user_id: authCheck.userId,
      action: `מחיקה קבועה של ${itemType === 'post' ? 'פוסט' : 'לקוח'}: ${itemId}`,
      created_at: new Date().toISOString(),
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה במחיקה קבועה');
  }
}

/**
 * Get feature usage analytics
 */
export async function getFeatureUsageAnalytics(): Promise<{
  success: boolean;
  data?: {
    buttonClicks: any[];
    aiSatisfaction: {
      copied: number;
      retried: number;
      satisfactionRate: number;
    };
    feedback: any[];
    churnedUsers: any[];
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    // Get button clicks from activity_logs
    const { data: buttonClicks } = await supabase
      .from('activity_logs')
      .select('action, created_at')
      .or('action.ilike.%לחץ%,action.ilike.%click%')
      .order('created_at', { ascending: false })
      .limit(100);

    // Count AI actions (copied vs retried)
    const { data: aiActions } = await supabase
      .from('activity_logs')
      .select('action')
      .or('action.ilike.%AI%,action.ilike.%בינה%');

    const copied = aiActions?.filter(a => a.action.includes('העתק') || a.action.includes('copied')).length || 0;
    const retried = aiActions?.filter(a => a.action.includes('נסה שוב') || a.action.includes('retry')).length || 0;
    const total = copied + retried;
    const satisfactionRate = total > 0 ? (copied / total) * 100 : 0;

    // Get feedback (from contact form or feedback table)
    const { data: feedback } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // Get churned users (no activity for 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { data: allUsers } = await supabase
      .from('nexus_users')
      .select('id, name, email, created_at');

    const churnedUsers = await Promise.all(
      (allUsers || []).map(async (user) => {
        const { data: lastActivity } = await supabase
          .from('activity_logs')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastActive = lastActivity?.created_at 
          ? new Date(lastActivity.created_at)
          : new Date(user.created_at);

        if (lastActive < weekAgo) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            lastActive: lastActive.toISOString(),
            daysSinceActive: Math.floor((Date.now() - lastActive.getTime()) / (24 * 60 * 60 * 1000)),
          };
        }
        return null;
      })
    );

    return createSuccessResponse({
      buttonClicks: buttonClicks || [],
      aiSatisfaction: {
        copied,
        retried,
        satisfactionRate,
      },
      feedback: feedback || [],
      churnedUsers: churnedUsers.filter(u => u !== null),
    });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בקבלת ניתוח שימוש');
  }
}

/**
 * Get system feature flags
 */
export async function getFeatureFlags(): Promise<{
  success: boolean;
  data?: {
    maintenanceMode: boolean;
    aiEnabled: boolean;
    bannerMessage: string | null;
    fullOfficeRequiresFinance: boolean;
    enable_payment_manual: boolean;
    enable_payment_credit_card: boolean;
    launch_scope_modules: Record<OSModuleKey, boolean>;
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    // Get from feature_flags table or system_settings
    const { data: flags } = await supabase
      .from('social_system_settings')
      .select('*')
      .eq('key', 'feature_flags')
      .single();

    const rawValue = (flags as any)?.value;
    let parsedValue: any = null;
    if (rawValue && typeof rawValue === 'string') {
      parsedValue = JSON.parse(rawValue);
    } else if (rawValue && typeof rawValue === 'object') {
      parsedValue = rawValue;
    }

    return createSuccessResponse({
      maintenanceMode: Boolean(parsedValue?.maintenanceMode ?? flags?.maintenance_mode ?? false),
      aiEnabled: Boolean(parsedValue?.aiEnabled ?? (flags?.ai_enabled !== false)),
      bannerMessage: (parsedValue?.bannerMessage ?? flags?.banner_message ?? null) as any,
      fullOfficeRequiresFinance: Boolean(parsedValue?.fullOfficeRequiresFinance ?? false),
      enable_payment_manual: Boolean(parsedValue?.enable_payment_manual ?? parsedValue?.enablePaymentManual ?? true),
      enable_payment_credit_card: Boolean(parsedValue?.enable_payment_credit_card ?? parsedValue?.enablePaymentCreditCard ?? false),
      launch_scope_modules: (() => {
        const defaults: Record<OSModuleKey, boolean> = {
          nexus: true,
          system: true,
          social: true,
          finance: true,
          client: true,
          operations: true,
        };
        const raw = parsedValue?.launch_scope_modules ?? parsedValue?.launchScopeModules;
        if (!raw || typeof raw !== 'object') return defaults;
        return {
          nexus: Boolean((raw as any).nexus ?? defaults.nexus),
          system: Boolean((raw as any).system ?? defaults.system),
          social: Boolean((raw as any).social ?? defaults.social),
          finance: Boolean((raw as any).finance ?? defaults.finance),
          client: Boolean((raw as any).client ?? defaults.client),
          operations: Boolean((raw as any).operations ?? defaults.operations),
        };
      })(),
    });
  } catch (error) {
    // If table doesn't exist, return defaults
    return createSuccessResponse({
      maintenanceMode: false,
      aiEnabled: true,
      bannerMessage: null,
      fullOfficeRequiresFinance: false,
      enable_payment_manual: true,
      enable_payment_credit_card: false,
      launch_scope_modules: {
        nexus: true,
        system: true,
        social: true,
        finance: true,
        client: true,
        operations: true,
      },
    });
  }
}

/**
 * Update feature flags
 */
export async function updateFeatureFlags(
  flags: {
    maintenanceMode?: boolean;
    aiEnabled?: boolean;
    bannerMessage?: string | null;
    fullOfficeRequiresFinance?: boolean;
    enable_payment_manual?: boolean;
    enable_payment_credit_card?: boolean;
    launch_scope_modules?: Partial<Record<OSModuleKey, boolean>> | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    const { data: existing } = await supabase
      .from('social_system_settings')
      .select('*')
      .eq('key', 'feature_flags')
      .maybeSingle();

    const existingRaw = (existing as any)?.value;
    let existingValue: any = null;
    if (existingRaw && typeof existingRaw === 'string') {
      existingValue = JSON.parse(existingRaw);
    } else if (existingRaw && typeof existingRaw === 'object') {
      existingValue = existingRaw;
    }

    const defaultScope: Record<OSModuleKey, boolean> = {
      nexus: true,
      system: true,
      social: true,
      finance: true,
      client: true,
      operations: true,
    };

    const existingScopeRaw = existingValue?.launch_scope_modules ?? existingValue?.launchScopeModules;
    const existingScope = !existingScopeRaw || typeof existingScopeRaw !== 'object'
      ? defaultScope
      : {
          nexus: Boolean((existingScopeRaw as any).nexus ?? defaultScope.nexus),
          system: Boolean((existingScopeRaw as any).system ?? defaultScope.system),
          social: Boolean((existingScopeRaw as any).social ?? defaultScope.social),
          finance: Boolean((existingScopeRaw as any).finance ?? defaultScope.finance),
          client: Boolean((existingScopeRaw as any).client ?? defaultScope.client),
          operations: Boolean((existingScopeRaw as any).operations ?? defaultScope.operations),
        };

    const requestedScopeRaw = flags.launch_scope_modules;
    const requestedScope = !requestedScopeRaw || typeof requestedScopeRaw !== 'object'
      ? null
      : {
          nexus: Boolean((requestedScopeRaw as any).nexus ?? existingScope.nexus),
          system: Boolean((requestedScopeRaw as any).system ?? existingScope.system),
          social: Boolean((requestedScopeRaw as any).social ?? existingScope.social),
          finance: Boolean((requestedScopeRaw as any).finance ?? existingScope.finance),
          client: Boolean((requestedScopeRaw as any).client ?? existingScope.client),
          operations: Boolean((requestedScopeRaw as any).operations ?? existingScope.operations),
        };

    const nextFlags = {
      maintenanceMode: Boolean(flags.maintenanceMode ?? existingValue?.maintenanceMode ?? (existing as any)?.maintenance_mode ?? false),
      aiEnabled: Boolean(flags.aiEnabled ?? existingValue?.aiEnabled ?? ((existing as any)?.ai_enabled !== false)),
      bannerMessage: (flags.bannerMessage ?? existingValue?.bannerMessage ?? (existing as any)?.banner_message ?? null) as string | null,
      fullOfficeRequiresFinance: Boolean(flags.fullOfficeRequiresFinance ?? existingValue?.fullOfficeRequiresFinance ?? false),
      enable_payment_manual: Boolean(flags.enable_payment_manual ?? existingValue?.enable_payment_manual ?? existingValue?.enablePaymentManual ?? true),
      enable_payment_credit_card: Boolean(flags.enable_payment_credit_card ?? existingValue?.enable_payment_credit_card ?? existingValue?.enablePaymentCreditCard ?? false),
      launch_scope_modules: requestedScope ?? existingScope,
    };

    // Upsert system settings
    await supabase
      .from('social_system_settings')
      .upsert({
        key: 'feature_flags',
        maintenance_mode: nextFlags.maintenanceMode,
        ai_enabled: nextFlags.aiEnabled,
        banner_message: nextFlags.bannerMessage,
        value: nextFlags as any,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      });

    // Log the action
    await supabase.from('activity_logs').insert({
      user_id: authCheck.userId,
      action: `עדכון הגדרות מערכת: ${JSON.stringify(nextFlags)}`,
      created_at: new Date().toISOString(),
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון הגדרות');
  }
}

/**
 * Send "we miss you" email to churned users
 */
export async function sendChurnEmail(
  userIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    // In production, integrate with email service (Resend, SendGrid, etc.)
    // For now, just log the action
    const supabase = createClient();
    await supabase.from('activity_logs').insert({
      user_id: authCheck.userId,
      action: `שליחת מייל "מתגעגעים" ל-${userIds.length} משתמשים`,
      created_at: new Date().toISOString(),
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשליחת מיילים');
  }
}

