import { defineConfig } from '@playwright/test';

/**
 * Visuelle E2E-Suite (Owner-Auftrag: visuell testen, nicht nur Code).
 * Läuft gegen den Preview-Build; WebGL via SwiftShader (kein GPU nötig).
 * Screenshots je Lauf unter e2e-results/ — die KosmoDoc-Berichte.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results',
  timeout: 90_000,
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5183',
    viewport: { width: 1400, height: 900 },
    screenshot: 'only-on-failure',
    launchOptions: {
      ...(process.env['PLAYWRIGHT_CHROMIUM_PATH']
        ? { executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] }
        : {}),
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: 'npm run preview -w @kosmo/orbit-app -- --port 5183 --strictPort',
    port: 5183,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
