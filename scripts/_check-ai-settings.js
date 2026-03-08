const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAISettings() {
  try {
    console.log('🔍 Checking AI feature settings...\n');
    
    const settings = await prisma.aI_feature_settings.findMany({
      where: {
        OR: [
          { feature_key: 'social.post_variations' },
          { feature_key: { contains: 'image' } },
        ]
      },
      orderBy: { feature_key: 'asc' }
    });

    if (settings.length === 0) {
      console.log('❌ No AI feature settings found');
      return;
    }

    settings.forEach(s => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Feature: ${s.feature_key}`);
      console.log(`Enabled: ${s.enabled}`);
      console.log(`Primary: ${s.primary_provider} → ${s.primary_model}`);
      if (s.fallback_provider) {
        console.log(`Fallback: ${s.fallback_provider} → ${s.fallback_model}`);
      }
      console.log(`Cost: ${s.reserve_cost_cents} cents`);
      console.log(`Timeout: ${s.timeout_ms}ms`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAISettings();
