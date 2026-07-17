import { defineConfig } from '@playwright/test';
import { kosmoUiV1SeedMitManuell } from './e2e/helpers/manuell-seed';

/**
 * Visuelle E2E-Suite (Owner-Auftrag: visuell testen, nicht nur Code).
 * Läuft gegen den Preview-Build; WebGL via SwiftShader (kein GPU nötig).
 * Screenshots je Lauf unter e2e-results/ — die KosmoDoc-Berichte.
 */

// EINE Konstante für baseURL UND den storageState-Origin (unten) — ein
// künftiger Port-Override (z.B. via ENV) muss nur hier geändert werden,
// statt an zwei Stellen synchron zu bleiben.
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5183';
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results',
  timeout: 90_000,
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1400, height: 900 },
    screenshot: 'only-on-failure',
    // v0.6.6 MOTION-KONZEPT-066 §7: E2E läuft mit erzwungener reduced-motion
    // — Playwright setzt `prefers-reduced-motion: reduce` in jedem Kontext,
    // damit Bewegung (Federn/Übergänge/Knopfdruck-Skalierung) nie zu Flakiness
    // führt. Wer eine Animation GEZIELT testet, tut das in einer eigenen
    // Spec ohne diese Fixture (Konzept-Vorgabe, kein Ausnahme-Flag hier).
    reducedMotion: 'reduce',
    // v0.6.6 BEWEGUNGSKONZEPT-066 §8: `kosmo.ui.v1` mit `modusAutomatik: false`
    // vorbelegt (für ALLE Specs, vor jeder Navigation) — die 0.6.6-Arbeits-
    // modi-Automatik ist NEU und würde, einmal in DesignWorkspace.tsx
    // verdrahtet (Stream B), Panels/Werkzeuge je erkanntem Modus ausblenden.
    // Ohne diesen Seed sähen die ~1633 BESTEHENDEN testid-Verträge plötzlich
    // eine andere Oberfläche als heute. Mit dem Seed sehen alle Bestands-
    // specs weiterhin die heutige Voll-UI; nur NEUE Specs (`arbeitsmodi.
    // spec.ts`, `kosmo-ui-bruecke.spec.ts`) schalten die Automatik
    // ausdrücklich per `ui.modusAutomatik`/localStorage wieder ein.
    //
    // Feldname bewusst `version` (nicht `v`): `state/ui-zustand.ts` folgt
    // demselben Versionierungsmuster wie `kosmo.adaption.v1`
    // (`oberflaeche-adaption-kern.ts`) — dort heisst das Feld überall
    // `version`. `modusFesthalten`/`phasenFokus` dürfen fehlen (der Store
    // liest sie defensiv mit Default nach), stehen hier trotzdem explizit,
    // damit dieser Seed für sich allein bereits ein vollständiger, gültiger
    // Datensatz ist.
    //
    // v0.8.2 / PD2 (`docs/ISLAND-UI-SPEZ.md` §6 Sanktion 2, `docs/V082-SPEZ.
    // md` C-35): der Default-Flip macht `designOberflaeche:'island'` zum
    // echten Produktions-Default (`state/ui-zustand.ts`) — dieser EINE Seed
    // zwingt ALLE Bestands-Specs zurück auf `'manuell'` (die heutige
    // Werkzeugleiste/Dock-Fläche/Geschossleiste), ohne dass eine einzelne
    // Spec-Datei angefasst werden muss. Ausführliche Begründung («warum EIN
    // Ort reicht»): `e2e/helpers/manuell-seed.ts`-Kopfkommentar.
    // v0.6.6 Welle 2 / Stream D (V-M1 Commit 2): `kosmo.leistung.v1` mit
    // `renderBeiBedarf: false` vorbelegt — der neue on-demand-Renderloop
    // (Viewport3D.tsx, state/leistung.ts) ist für echte Nutzer:innen ohne
    // gespeicherten Wert AN (Default true), würde aber ALLE bestehenden
    // 3D-Specs (die auf den alten Dauerloop timen, __kosmoViewport.renderOnce
    // etc.) auf einen anderen Rendertakt umstellen. Mit diesem Seed sehen
    // alle Bestands-Specs weiterhin den alten Dauerloop; nur
    // `render-knopf.spec.ts`/`e2e/tools/frame-messung.mts` schalten das Flag
    // gezielt selbst ein. Gleiches Muster wie `kosmo.ui.v1` oben (Stream B).
    storageState: {
      cookies: [],
      origins: [
        {
          origin: new URL(BASE_URL).origin,
          localStorage: [
            {
              name: 'kosmo.ui.v1',
              value: kosmoUiV1SeedMitManuell(),
            },
            {
              name: 'kosmo.leistung.v1',
              value: JSON.stringify({ version: 1, zustimmungErteilt: false, override: 'auto', renderBeiBedarf: false }),
            },
            // v0.8.0 / Paket PD2 (Default-Oberflächen): der Erststart-Marker
            // (`state/dock-preset-anwendung.ts`) sorgt dafür, dass ein
            // ECHTER Erststart (kein `kosmo.dock.v1`, kein Marker) einmalig
            // «Fokus» auf beide Preset-Stationen anwendet. Ohne diesen Seed
            // sähe JEDE der ~90 bestehenden Dock-Specs (die alle mit einem
            // leeren `localStorage` starten) bei jedem `page.goto('/')`
            // plötzlich das Fokus-Layout statt der heutigen Voll-UI-Defaults
            // — exakt dieselbe Schutzlogik wie bei `kosmo.ui.v1`/`kosmo.
            // leistung.v1` oben. Der Marker allein (ohne `kosmo.dock.v1`)
            // bildet exakt den «Bestandsnutzer, dessen Entscheidung schon
            // gefallen ist»-Fall ab — nur `e2e/dock-presets.spec.ts`s
            // Erststart-Test entfernt ihn gezielt wieder.
            {
              name: 'kosmo.dock.presetInit.v1',
              value: '1',
            },
          ],
        },
      ],
    },
    launchOptions: {
      ...(process.env['PLAYWRIGHT_CHROMIUM_PATH']
        ? { executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] }
        : {}),
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: `npm run preview -w @kosmo/orbit-app -- --port ${PORT} --strictPort`,
    port: Number(PORT),
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
