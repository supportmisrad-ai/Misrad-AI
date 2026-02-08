import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import * as path from 'path';

const overrideEnv =
  String(process.env.E2E_ENV_OVERRIDE || '').toLowerCase() === '1' ||
  String(process.env.E2E_ENV_OVERRIDE || '').toLowerCase() === 'true';

dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.test', override: overrideEnv });
dotenv.config({ path: '.env.local', override: false });

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4000';
const baseUrlObj = new URL(baseURL);
const baseUrlPort = baseUrlObj.port || (baseUrlObj.protocol === 'https:' ? '443' : '80');
const forceRestartServer =
  String(process.env.E2E_RESTART_SERVER || '').toLowerCase() === '1' ||
  String(process.env.E2E_RESTART_SERVER || '').toLowerCase() === 'true';

const disableGlobalSetup =
  String(process.env.E2E_DISABLE_GLOBAL_SETUP || '').toLowerCase() === '1' ||
  String(process.env.E2E_DISABLE_GLOBAL_SETUP || '').toLowerCase() === 'true';

const useExistingServer =
  String(process.env.E2E_USE_EXISTING_SERVER || '').toLowerCase() === '1' ||
  String(process.env.E2E_USE_EXISTING_SERVER || '').toLowerCase() === 'true';

const isAuthSetupRun =
  String(process.env.E2E_SETUP_AUTH || '').toLowerCase() === '1' ||
  String(process.env.E2E_SETUP_AUTH || '').toLowerCase() === 'true';

const webServerEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, v]) => typeof v === 'string') as Array<[string, string]>
);

const defaultWebServerCommand = process.platform === 'win32' ? 'npm.cmd run dev' : 'npm run dev';
const webServerCommand = process.env.E2E_WEBSERVER_COMMAND || defaultWebServerCommand;
const webServerTimeout = Number(process.env.E2E_WEBSERVER_TIMEOUT_MS || 600_000);

const disableHtmlReport =
  String(process.env.E2E_DISABLE_HTML_REPORT || '').toLowerCase() === '1' ||
  String(process.env.E2E_DISABLE_HTML_REPORT || '').toLowerCase() === 'true';

const htmlReportOutputFolder =
  process.platform === 'win32'
    ? path.join('playwright-report', `run-${Date.now()}`)
    : 'playwright-report';

const htmlReporter: ['html', { open: 'never'; outputFolder: string }] = [
  'html',
  { open: 'never', outputFolder: htmlReportOutputFolder },
];

const listReporter: ['list', Record<string, never>] = ['list', {}];
const reporter = disableHtmlReport ? [listReporter] : [htmlReporter, listReporter];

export default defineConfig({
  timeout: Number(process.env.E2E_TEST_TIMEOUT_MS || 120_000),
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : Number(process.env.E2E_WORKERS || 1),
  reporter,
  webServer: useExistingServer
    ? undefined
    : {
        command: webServerCommand,
        env: {
          ...webServerEnv,
          PORT: baseUrlPort,
          NEXT_TELEMETRY_DISABLED: String(process.env.NEXT_TELEMETRY_DISABLED || '1'),
          MISRAD_RATE_LIMIT_DISABLE_REDIS: String(process.env.MISRAD_RATE_LIMIT_DISABLE_REDIS || 'true'),
        },
        url: baseURL,
        reuseExistingServer: !forceRestartServer,
        timeout: webServerTimeout,
      },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: Number(process.env.E2E_NAVIGATION_TIMEOUT_MS || 120_000),
    storageState:
      isAuthSetupRun || disableGlobalSetup
        ? undefined
        : (process.env.E2E_STORAGE_STATE || 'tests/e2e/.auth/storageState.json'),
  },
  globalSetup: disableGlobalSetup ? undefined : require.resolve('./tests/e2e/global-setup'),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
