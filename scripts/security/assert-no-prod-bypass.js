function isTruthy(value) {
  const v = String(value || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function isProductionEnv() {
  const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase();
  if (nodeEnv === 'production') return true;

  const vercelEnv = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
  if (vercelEnv === 'production') return true;

  const nextPublicVercelEnv = String(process.env.NEXT_PUBLIC_VERCEL_ENV || '').trim().toLowerCase();
  if (nextPublicVercelEnv === 'production') return true;

  return false;
}

function main() {
  const bypassEntitlements = isTruthy(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS);
  const isE2E = isTruthy(process.env.IS_E2E_TESTING);
  const allowSchemaFallbacks = isTruthy(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS);
  if (allowSchemaFallbacks && !isE2E) {
    console.error(
      '[Safety] MISRAD_ALLOW_SCHEMA_FALLBACKS is enabled. ' +
        'This can hide schema mismatches by returning empty/default values. ' +
        'Remove MISRAD_ALLOW_SCHEMA_FALLBACKS from the runtime environment.'
    );
    process.exitCode = 1;
  }

  if (!isProductionEnv()) return;

  if (isE2E) {
    console.error(
      '[Security Risk] IS_E2E_TESTING is enabled in a production environment. ' +
        'This flag is allowed only for E2E runs in non-production environments.'
    );
    process.exitCode = 1;
  }

  if (!bypassEntitlements) return;
  if (isE2E) return;

  console.error(
    '[Security Risk] E2E_BYPASS_MODULE_ENTITLEMENTS is enabled in production environment. ' +
      'This flag is allowed only for E2E runs (set IS_E2E_TESTING=true).'
  );
  process.exitCode = 1;
}

main();
