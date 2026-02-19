#!/usr/bin/env node
/**
 * Diagnose Clerk instance configuration.
 * Shows required sign-up fields, bot protection status, allowed auth methods.
 * 
 * Usage: npx dotenv -e .env.local -- node scripts/diagnose-clerk.js
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';
const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY is not set');
  process.exit(1);
}

// Clerk Backend API base
const API_BASE = 'https://api.clerk.com/v1';

async function fetchClerk(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, ok: res.ok, data: json, text };
}

async function main() {
  console.log('=== Clerk Instance Diagnostics ===\n');
  console.log(`Publishable Key: ${CLERK_PUBLISHABLE_KEY.slice(0, 20)}...`);
  console.log(`Secret Key: ${CLERK_SECRET_KEY.slice(0, 12)}...`);
  console.log(`Environment: ${CLERK_SECRET_KEY.startsWith('sk_live_') ? '🔴 PRODUCTION' : '🟡 DEVELOPMENT'}\n`);

  // 1. List users to verify API key works
  console.log('--- API Key Verification ---');
  const usersRes = await fetchClerk('/users?limit=1');
  if (usersRes.ok) {
    const count = Array.isArray(usersRes.data) ? usersRes.data.length : 0;
    console.log(`  ✅ API key is valid. Users found: ${count >= 1 ? 'yes' : 'none yet'}`);
    if (count > 0) {
      const u = usersRes.data[0];
      console.log(`  First user: ${u.email_addresses?.[0]?.email_address || 'N/A'} (${u.id})`);
    }
  } else {
    console.log(`  ❌ API key check failed: ${usersRes.status} ${usersRes.text?.slice(0, 200)}`);
  }
  console.log('');

  // 2. Get instance info
  console.log('--- Instance Info ---');
  const instanceRes = await fetchClerk('/instance');
  if (instanceRes.ok && instanceRes.data) {
    const d = instanceRes.data;
    console.log(`  Environment: ${d.environment_type || 'unknown'}`);
    console.log(`  Allowed Origins: ${JSON.stringify(d.allowed_origins || [])}`);
    // Log all keys for discovery
    console.log(`  All keys: ${Object.keys(d).join(', ')}`);
  } else {
    console.log(`  Status ${instanceRes.status}: ${instanceRes.text?.slice(0, 300)}`);
  }
  console.log('');

  // 3. Check FAPI (Frontend API) client config — this reveals sign-up requirements
  // The publishable key contains the FAPI domain
  const fapiMatch = CLERK_PUBLISHABLE_KEY.match(/pk_(?:test|live)_([A-Za-z0-9+/=]+)/);
  let fapiDomain = null;
  if (fapiMatch) {
    try {
      fapiDomain = Buffer.from(fapiMatch[1], 'base64').toString('utf-8').replace(/\$+$/, '');
    } catch {}
  }
  
  console.log('--- Frontend API (FAPI) Config ---');
  if (fapiDomain) {
    console.log(`  FAPI Domain: ${fapiDomain}`);
    try {
      const envRes = await fetch(`https://${fapiDomain}/v1/environment`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const envData = await envRes.json();
      
      // Auth config
      if (envData.auth_config) {
        const ac = envData.auth_config;
        console.log(`\n  --- Auth Config ---`);
        console.log(`  Single session mode: ${ac.single_session_mode}`);
        console.log(`  URL-based session syncing: ${ac.url_based_session_syncing}`);
        if (ac.id) console.log(`  Auth config ID: ${ac.id}`);
        console.log(`  All auth_config keys: ${Object.keys(ac).join(', ')}`);
      }

      // User settings
      if (envData.user_settings) {
        const us = envData.user_settings;
        console.log(`\n  --- User Settings ---`);
        
        if (us.attributes) {
          console.log('  Attributes:');
          for (const [key, val] of Object.entries(us.attributes)) {
            if (val && typeof val === 'object' && val.enabled) {
              const parts = [`enabled`];
              if (val.required) parts.push('REQUIRED');
              if (val.used_for_first_factor) parts.push('1st-factor');
              if (val.used_for_second_factor) parts.push('2nd-factor');
              if (val.first_factors?.length) parts.push(`first_factors=${JSON.stringify(val.first_factors)}`);
              if (val.verifications?.length) parts.push(`verifications=${JSON.stringify(val.verifications)}`);
              console.log(`    ${key}: ${parts.join(', ')}`);
            }
          }
        }

        if (us.sign_up) {
          console.log(`\n  Sign-up settings:`);
          console.log(`    ${JSON.stringify(us.sign_up, null, 4)}`);
        }

        if (us.sign_in) {
          console.log(`\n  Sign-in settings:`);
          console.log(`    ${JSON.stringify(us.sign_in, null, 4)}`);
        }

        if (us.restrictions) {
          console.log(`\n  Restrictions:`);
          console.log(`    ${JSON.stringify(us.restrictions, null, 4)}`);
        }

        if (us.actions) {
          console.log(`\n  Actions:`);
          console.log(`    ${JSON.stringify(us.actions, null, 4)}`);
        }

        // Social providers
        if (us.social) {
          const enabledSocial = Object.entries(us.social)
            .filter(([, val]) => val && typeof val === 'object' && val.enabled)
            .map(([key, val]) => `${key}(required=${val.required}, authenticatable=${val.authenticatable})`);
          console.log(`\n  Social Providers: ${enabledSocial.join(', ') || 'none'}`);
        }

        if (us.password_settings) {
          console.log(`\n  Password settings:`);
          console.log(`    ${JSON.stringify(us.password_settings, null, 4)}`);
        }
      }

      // Display config  
      if (envData.display_config) {
        const dc = envData.display_config;
        console.log(`\n  --- Display Config ---`);
        console.log(`  Application name: ${dc.application_name}`);
        console.log(`  Home URL: ${dc.home_url}`);
        console.log(`  Sign-in URL: ${dc.sign_in_url}`);
        console.log(`  Sign-up URL: ${dc.sign_up_url}`);
        console.log(`  After sign-in URL: ${dc.after_sign_in_url}`);
        console.log(`  After sign-up URL: ${dc.after_sign_up_url}`);
        console.log(`  Captcha public key: ${dc.captcha_public_key || '(none — bot protection OFF)'}`);
        console.log(`  Captcha public key invisible: ${dc.captcha_public_key_invisible || '(none)'}`);
        console.log(`  Captcha provider: ${dc.captcha_provider || '(none)'}`);
        console.log(`  Captcha widget type: ${dc.captcha_widget_type || '(none)'}`);
        console.log(`  Bot protection: ${dc.captcha_public_key ? '🔴 ENABLED' : '🟢 DISABLED'}`);
        console.log(`  All display_config keys: ${Object.keys(dc).join(', ')}`);
      }

    } catch (e) {
      console.log(`  Error fetching FAPI: ${e.message}`);
    }
  } else {
    console.log('  Could not parse FAPI domain from publishable key');
  }

  // 4. List recent sign-ups to check status patterns
  console.log('\n\n--- Recent Sign-Up Attempts (last 5) ---');
  const signUpsRes = await fetchClerk('/sign_ups?limit=5');
  if (signUpsRes.ok && Array.isArray(signUpsRes.data)) {
    for (const su of signUpsRes.data) {
      console.log(`  ${su.id}: status=${su.status}, email=${su.email_address || 'N/A'}`);
      console.log(`    missing_fields: ${JSON.stringify(su.missing_fields || [])}`);
      console.log(`    required_fields: ${JSON.stringify(su.required_fields || [])}`);
      console.log(`    unverified_fields: ${JSON.stringify(su.unverified_fields || [])}`);
      console.log(`    created_at: ${su.created_at ? new Date(su.created_at).toISOString() : 'N/A'}`);
    }
  } else {
    console.log(`  Status ${signUpsRes.status}: ${signUpsRes.text?.slice(0, 200)}`);
  }

  console.log('\n=== Diagnostics Complete ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
