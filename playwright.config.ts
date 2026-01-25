import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

const overrideEnv =
  String(process.env.E2E_ENV_OVERRIDE || '').toLowerCase() === '1' ||
  String(process.env.E2E_ENV_OVERRIDE || '').toLowerCase() === 'true';
dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.test', override: overrideEnv });

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4000';
const forceRestartServer =
  String(process.env.E2E_RESTART_SERVER || '').toLowerCase() === '1' ||
  String(process.env.E2E_RESTART_SERVER || '').toLowerCase() === 'true';

const webServerEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, v]) => typeof v === 'string') as Array<[string, string]>
);

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  webServer: {
    command: 'npm run dev',
    env: webServerEnv,
    url: baseURL,
    reuseExistingServer: !forceRestartServer,
    timeout: 120_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    storageState: process.env.E2E_STORAGE_STATE || 'test-results/storageState.json',
  },
  globalSetup: require.resolve('./tests/e2e/global-setup'),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
