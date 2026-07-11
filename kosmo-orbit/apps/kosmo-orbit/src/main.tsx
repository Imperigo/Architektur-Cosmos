import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@kosmo/ui/aura.css';
import './fonts.css'; // NACH aura.css (v0.7.2 §1) — self-gehostet, siehe Datei-Kopf
import './zod-jitless'; // muss vor ./App bleiben — siehe Kommentar dort (CSP/Zod-eval-Probe)
import { App } from './App';
import { Companion } from './shell/Companion';
import { istTauriDesktop } from './shell/cloud-login';

// Service Worker: NUR im Browser/PWA (Offline-Fähigkeit auf iPad & Co.).
// Im Tauri-Desktop ist er schädlich — der Precache serviert nach einem
// Installer-Update die ALTE Oberfläche weiter (Owner-Befund 08.07.: die
// installierte v1.5 sah aus wie v1). Dort wird er darum nie registriert und
// ein von früheren Versionen zurückgelassener SW samt Cache aktiv entfernt,
// damit sich auch bereits betroffene Installationen selbst heilen.
if (istTauriDesktop()) {
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) void r.unregister();
    });
  }
  if ('caches' in window) {
    void caches.keys().then((keys) => {
      for (const k of keys) void caches.delete(k);
    });
  }
} else if ('serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

// v072: fenster=charakter — Schnittstelle für W3-F (Paket 07, Zweitfenster
// Tauri "kosmo-charakter"). Noch KEINE Funktion: W1-A legt hier nur den
// dokumentierten Anker an (Spec §12 Stream-Schnittstellen); W3-F füllt die
// tatsächliche Charakter-Ansicht ein, sobald die Route existiert.
// const fensterCharakter = new URLSearchParams(window.location.search).get('fenster') === 'charakter';

// v072: #companion — W4-G (Paket-Ergänzung «Companion minimal», Spec
// §10/§12): die schmale, lese-/freigabe-fähige PWA-Ansicht rendert ANSTELLE
// der vollen App, sobald der Hash mit `#companion` beginnt. Ohne diesen Hash
// bleibt das Verhalten BYTE-IDENTISCH zu vorher (Harter Vertrag §11 — kein
// Einfluss auf `orbit-start.spec`/`oberflaeche-minimal.spec`/`kosmo-symbol.
// spec`/Splash).
const istCompanion = window.location.hash.startsWith('#companion');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{istCompanion ? <Companion /> : <App />}</StrictMode>,
);
