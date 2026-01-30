const { spawn } = require('node:child_process');
const fs = require('node:fs');
const dotenv = require('dotenv');

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const overrideEnv =
  String(process.env.E2E_ENV_OVERRIDE || '').toLowerCase() === '1' ||
  String(process.env.E2E_ENV_OVERRIDE || '').toLowerCase() === 'true';

dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.test', override: overrideEnv });
dotenv.config({ path: '.env.local', override: false });

const args = ['playwright', 'test', 'tests/e2e/setup-auth.spec.ts'];

function runSetupAuth(label, envOverrides) {
  return new Promise((resolve) => {
    const child = spawn(npxCmd, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        E2E_SETUP_AUTH: process.env.E2E_SETUP_AUTH || '1',
        ...envOverrides,
      },
    });

    child.on('exit', (code) => {
      resolve({ label, code: code || 0 });
    });
  });
}

async function main() {
  const baseEnv = {
    E2E_ENV_FILE: process.env.E2E_ENV_FILE || '.env.test',
  };

  const defaultStatePath = process.env.E2E_STORAGE_STATE;
  const victimStatePath = process.env.E2E_VICTIM_STORAGE_STATE || process.env.E2E_STORAGE_STATE;
  const attackerStatePath = process.env.E2E_ATTACKER_STORAGE_STATE;

  const victimEmail = process.env.E2E_EMAIL;
  const victimPassword = process.env.E2E_PASSWORD;
  const attackerEmail = process.env.E2E_ATTACKER_EMAIL;
  const attackerPassword = process.env.E2E_ATTACKER_PASSWORD;

  const results = [];

  // Generate victim storageState once (used for victim tests). If the default storageState path differs,
  // copy the victim state into the default path to prevent globalSetup from attempting a flaky UI login.
  const victimRunPath = victimStatePath || defaultStatePath;
  if (victimRunPath) {
    results.push(
      await runSetupAuth('victim', {
        ...baseEnv,
        E2E_STORAGE_STATE: String(victimRunPath),
        ...(victimEmail ? { E2E_AUTH_EMAIL: String(victimEmail) } : {}),
        ...(victimPassword ? { E2E_AUTH_PASSWORD: String(victimPassword) } : {}),
      })
    );

    if (defaultStatePath && String(defaultStatePath) !== String(victimRunPath)) {
      try {
        fs.mkdirSync(require('node:path').dirname(String(defaultStatePath)), { recursive: true });
        fs.copyFileSync(String(victimRunPath), String(defaultStatePath));
      } catch {
        // ignore copy failure; the test run will fall back to globalSetup login.
      }
    }
  }

  if (attackerStatePath && attackerEmail && attackerPassword) {
    results.push(
      await runSetupAuth('attacker', {
        ...baseEnv,
        E2E_STORAGE_STATE: String(attackerStatePath),
        E2E_AUTH_EMAIL: String(attackerEmail),
        E2E_AUTH_PASSWORD: String(attackerPassword),
      })
    );
  }

  const failed = results.filter((r) => r.code !== 0);
  process.exit(failed.length ? 1 : 0);
}

main().catch(() => process.exit(1));
