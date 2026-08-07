import { defineConfig } from '@playwright/test';

const baseURL = process.env.RPSGT_V3_BASE_URL || 'http://127.0.0.1:4173/rpsgt-v3/';
const useLocalServer = !process.env.RPSGT_V3_BASE_URL;

export default defineConfig({
  testDir: './tests/browser',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 12_000
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    acceptDownloads: true
  },
  webServer: useLocalServer
    ? {
        command: 'python3 -m http.server 4173 --directory ..',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000
      }
    : undefined,
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'tablet-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 834, height: 1112 },
        isMobile: false,
        hasTouch: true
      }
    },
    {
      name: 'mobile-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      }
    }
  ]
});
