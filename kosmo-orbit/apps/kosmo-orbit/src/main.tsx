import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@kosmo/ui/aura.css';
import './zod-jitless'; // muss vor ./App bleiben — siehe Kommentar dort (CSP/Zod-eval-Probe)
import { App } from './App';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
