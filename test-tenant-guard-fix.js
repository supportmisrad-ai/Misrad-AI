// Test script to verify the tenant guard fix
// This script tests that the getSocialTeam function properly scopes queries by organization

const { getSocialTeam } = require('./app/actions/admin-social');

async function testTenantGuardFix() {
  console.log('Testing tenant guard fix...');
  
  try {
    // This should work now - the query is properly scoped by organization_id
    const result = await getSocialTeam('test-tenant-id');
    
    if (result.success) {
      console.log('✅ SUCCESS: getSocialTeam executed without tenant guard violation');
      console.log(`Returned ${result.data?.length || 0} team members`);
    } else {
      console.log('❌ FAILED: getSocialTeam returned an error:', result.error);
    }
  } catch (error) {
    if (error.message.includes('Tenant Guard Violation')) {
      console.log('❌ FAILED: Tenant guard violation still occurs:', error.message);
    } else {
      console.log('❌ FAILED: Unexpected error:', error.message);
    }
  }
}

// Export for use in other scripts or direct testing
module.exports = { testTenantGuardFix };

// Run test if called directly
if (require.main === module) {
  testTenantGuardFix();
}
