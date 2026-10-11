import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:5178', headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  webServer: {
    command: 'python3 -m http.server 5178 --bind 127.0.0.1',
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: false,
  },
});
