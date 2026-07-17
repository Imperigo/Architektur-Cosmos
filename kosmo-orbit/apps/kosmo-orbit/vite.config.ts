import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// v0.8.1-Release: Owner-Anzeigeversion und `package.json`-SemVer sind wieder
// deckungsgleich (kein Buchstaben-Suffix mehr nötig, anders als beim
// v0.8.0B-Teil-Release, s. STAND.md-Historie). Das Literal bleibt trotzdem
// bewusst von `package.json` entkoppelt (statt es zur Build-Zeit
// auszulesen) — dieselbe Stelle trägt so auch die nächste Teil-Release-
// Buchstaben-Ausnahme wieder, ohne den Mechanismus neu zu bauen.
const APP_VERSION = '0.8.1';

export default defineConfig({
  // Baut die Anzeige-Version in die App (Header/Fusszeile zeigen sie statt
  // einer festen «V1» — so ist die installierte Version ablesbar).
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registrierung passiert MANUELL in main.tsx (kein injiziertes
      // registerSW.js): im Tauri-Desktop wird der Service Worker bewusst NICHT
      // registriert und ein vorhandener aktiv entfernt — sonst serviert der
      // SW-Precache nach einem Installer-Update die ALTE Oberfläche weiter
      // (Owner-Befund 08.07.: «v1.5 sieht aus wie v1»). Die PWA (Browser/iPad)
      // behält ihr Offline-Verhalten unverändert.
      injectRegister: null,
      includeAssets: ['icons/icon-180.png'],
      manifest: {
        name: 'KosmoOrbit',
        short_name: 'KosmoOrbit',
        description: 'Die Architektur-Designzentrale des ArchitekturKosmos',
        lang: 'de-CH',
        display: 'standalone',
        orientation: 'any',
        // v0.7.2 §1 (Owner-Entscheid 11.07.): orbit ist der neue Standard —
        // die PWA-Manifest-Farben folgen dem neuen orbit-`--k-field`-Ton
        // statt dem alten Papier-Feld.
        background_color: '#0B0D12',
        theme_color: '#0B0D12',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Block 3 / FM4 (GLB→FreeMesh-Brücke) hat den Haupt-Chunk knapp über
        // die alte 6-MB-Grenze geschoben (die hatte praktisch keine Reserve
        // mehr, ~2 KB); angehoben statt Feature verkleinert — echtes
        // Code-Splitting ist ein separates Aufräum-Thema, kein FM4-Scope.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  server: {
    port: 5183,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
  // Tauri erwartet relativen Asset-Pfad; schadet der PWA nicht.
  base: './',
});
