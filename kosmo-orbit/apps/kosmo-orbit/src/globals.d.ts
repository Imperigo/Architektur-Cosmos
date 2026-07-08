// Manuelle SW-Registrierung (vite-plugin-pwa): main.tsx registriert den
// Service Worker nur im Browser/PWA — im Tauri-Desktop bewusst nicht.
/// <reference types="vite-plugin-pwa/client" />

/**
 * Build-Zeit-Konstanten (Vite `define`). `__APP_VERSION__` kommt aus der
 * package.json und wird in Header/Fusszeile angezeigt, damit die installierte
 * Version wirklich ablesbar ist (statt einer festen «V1»).
 */
declare const __APP_VERSION__: string;
