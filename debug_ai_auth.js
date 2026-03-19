const { PrismaClient } = require('@prisma/client');

// Load prod environment
require('dotenv').config({ path: '.env.prod_backup' });

const prisma = new PrismaClient();

async function debugAuth() {
  try {
    console.log('=== Debug AI Auth in PROD ===');
    
    // Your actual Clerk ID in PROD
    const clerkUserId = 'user_36taRKpH1VdyycRdg9POOD0trxH';
    
    // Find your organization user record
    const orgUser = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: clerkUserId },
      include: {
        Organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            subscription_status: true,
            balance: true,
            deleted_at: true
          }
        }
      }
    });
    
    if (!orgUser) {
      console.log('❌ No organization user found');
      return;
    }
    
    console.log('✅ Found your organization user:');
    console.log('  Clerk User ID:', orgUser.clerk_user_id);
    console.log('  Role:', orgUser.role);
    console.log('  Organization:', orgUser.Organization.name);
    console.log('  Subscription Status:', orgUser.Organization.subscription_status);
    
    // Check if role is 'super_admin' (this is what makes isSuperAdmin true)
    const isSuperAdmin = orgUser.role === 'super_admin';
    console.log('  Is Super Admin (by role):', isSuperAdmin);
    
    // Check what getAuthenticatedUser would return
    console.log('\n=== Simulating getAuthenticatedUser() ===');
    const simulatedUser = {
      id: orgUser.clerk_user_id,
      role: orgUser.role,
      isSuperAdmin: isSuperAdmin,
      organizationId: orgUser.Organization.id
    };
    
    console.log('User object:', JSON.stringify(simulatedUser, null, 2));
    
    // Simulate the AI access check
    console.log('\n=== Simulating AI Access Check ===');
    const checkAiAccess = (subscriptionStatus) => {
      const BLOCKED_STATUSES = {
        suspended: { reason: 'suspended', message: 'חשבון מושעה — יש להסדיר את החוב כדי להשתמש בתכונות AI' },
        cancelled: { reason: 'cancelled', message: 'המנוי בוטל — תכונות AI אינן זמינות' }
      };
      
      if (!subscriptionStatus) return { allowed: true };
      const normalized = subscriptionStatus.toLowerCase().trim();
      const blocked = BLOCKED_STATUSES[normalized];
      if (blocked) return { allowed: false, reason: blocked.reason, message: blocked.message };
      return { allowed: true };
    };
    
    const aiAccess = simulatedUser.isSuperAdmin ? 
      { allowed: true } : 
      checkAiAccess(orgUser.Organization.subscription_status);
    
    console.log('AI Access Result:', aiAccess);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();
