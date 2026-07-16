// Manuelle SW-Registrierung (vite-plugin-pwa): main.tsx registriert den
// Service Worker nur im Browser/PWA — im Tauri-Desktop bewusst nicht.
/// <reference types="vite-plugin-pwa/client" />

/**
 * Build-Zeit-Konstanten (Vite `define`). `__APP_VERSION__` ist die Owner-
 * Anzeigeversion (siehe `vite.config.ts` — seit v0.8.0B ein von der
 * SemVer-`package.json`-Version entkoppeltes Literal, weil Buchstaben-Suffixe
 * wie «0.8.0B» kein gültiges SemVer sind) und wird in Header/Fusszeile
 * angezeigt, damit die installierte Version wirklich ablesbar ist (statt
 * einer festen «V1»).
 */
declare const __APP_VERSION__: string;
