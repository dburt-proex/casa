import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'cd ../control-plane && if [ ! -x .venv/bin/python ]; then python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt; fi && . .venv/bin/activate && python -m uvicorn governance_api:app --host 127.0.0.1 --port 5000',
      url: 'http://127.0.0.1:5000/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        NODE_ENV: 'development',
        ENABLE_DEV_LOGIN: 'true',
        CASA_GOVERNANCE_API_URL: process.env.CASA_GOVERNANCE_API_URL || 'http://127.0.0.1:5000',
        JWT_SECRET: 'playwright-local-jwt-secret',
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
