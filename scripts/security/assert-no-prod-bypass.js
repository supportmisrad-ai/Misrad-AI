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
  if (!bypassEntitlements) return;

  const isE2E = isTruthy(process.env.IS_E2E_TESTING);
  if (isE2E) return;

  if (!isProductionEnv()) return;

  console.error(
    '[Security Risk] E2E_BYPASS_MODULE_ENTITLEMENTS is enabled in production environment. ' +
      'This flag is allowed only for E2E runs (set IS_E2E_TESTING=true).'
  );
  process.exitCode = 1;
}

main();
