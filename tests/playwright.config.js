// Browser tests for Forge. The app is served from the repo root by a tiny static server.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'off', serviceWorkers: 'block' },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    cwd: '..',
    url: 'http://localhost:4173/index.html',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'ignore',
  },
  projects: [
    { name: 'android', use: { ...devices['Pixel 7'] } },
    // iPhone screen size and touch, rendered with Chromium (one browser keeps CI quick)
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium', defaultBrowserType: 'chromium' }, testMatch: /layout|smoke|units/ },
  ],
});
