import { defineConfig, devices } from '@playwright/test';

const FRONTEND_PORT = 5173;
const BACKEND_PORT = 3000;

/**
 * E2E real: sobe back-end (Story 1, `db:prepare` + `dev`) e front-end
 * (`vite dev`) via `webServer`, sem mocks — a app rodando de verdade.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run db:prepare && npm run dev',
      cwd: '../backend',
      url: `http://localhost:${BACKEND_PORT}/api/municipios?q=sao`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      cwd: '.',
      port: FRONTEND_PORT,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
