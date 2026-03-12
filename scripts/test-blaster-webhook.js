#!/usr/bin/env node
/**
 * Test script for WAAM-It Blaster webhook integration
 * Tests the connection to misrad-ai.com/api/webhooks/blaster
 * 
 * Usage: node test-blaster-webhook.js
 * Or with env vars: WEBHOOK_URL=... BLASTER_WEBHOOK_SECRET=... node test-blaster-webhook.js
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://misrad-ai.com/api/webhooks/blaster';
const WEBHOOK_SECRET = process.env.BLASTER_WEBHOOK_SECRET || 'test-secret';

const testPayloads = {
  lead: {
    phone: '972559296626',
    name: 'בדיקה אוטומטית',
    business: 'בדיקות בע"מ',
    industry: 'טכנולוגיה',
    org_size: '1-10',
    pain_point: 'ניהול לקוחות',
    selected_plan: 'nexus_solo',
    email: 'test@example.com',
    message: 'היי, אני רוצה לשמוע עוד על המערכת',
    rule_id: '1',
    type: 'lead'
  },
  signup: {
    phone: '972512345678',
    name: 'משתמש חדש',
    business: 'סטארטאפ ישראלי',
    email: 'new@startup.co.il',
    selected_plan: 'empire',
    message: 'אני רוצה להירשם למערכת',
    rule_id: '37',
    type: 'signup'
  },
  demo: {
    phone: '972523456789',
    name: 'לקוח פוטנציאלי',
    business: 'חברת ייעוץ',
    message: 'אני רוצה הדגמה של המערכת',
    rule_id: '43',
    type: 'demo'
  },
  support: {
    phone: '972534567890',
    name: 'לקוח קיים',
    message: 'יש לי בעיה עם החשבון שלי',
    rule_id: '63',
    type: 'support'
  }
};

async function testWebhook(type, payload) {
  console.log(`\n🧪 Testing ${type}...`);
  
  try {
    const response = await fetch(`${WEBHOOK_URL}?type=${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    
    if (response.ok) {
      console.log(`  ✅ ${type}: Success (HTTP ${response.status})`);
      console.log(`     Lead ID: ${data.leadId || 'N/A'}`);
      return true;
    } else {
      console.log(`  ❌ ${type}: Failed (HTTP ${response.status})`);
      console.log(`     Error: ${data.error || 'Unknown'}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ${type}: Error - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('═'.repeat(60));
  console.log('  WAAM-It Blaster Webhook Test Suite');
  console.log('═'.repeat(60));
  console.log(`\n🌐 URL: ${WEBHOOK_URL}`);
  console.log(`🔑 Secret: ${WEBHOOK_SECRET.substring(0, 10)}...`);

  const results = [];
  
  for (const [type, payload] of Object.entries(testPayloads)) {
    results.push(await testWebhook(type, payload));
  }

  console.log('\n' + '═'.repeat(60));
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`  Results: ${passed}/${total} tests passed`);
  console.log('═'.repeat(60));

  process.exit(passed === total ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { testWebhook, testPayloads };
