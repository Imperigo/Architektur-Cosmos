import { istTauriDesktop } from './cloud-login';
import { useKosmoStatus } from '../state/kosmo-status';

/**
 * Kosmo-Zustand → Tauri-Event-Brücke (v0.7.2 §9, Paket 07, Stream W3-F).
 *
 * Spec §9/§12, wörtlich: «Haupt emittet `kosmo-zustand` bei Zustandswechsel
 * — der Web-Teil dieser Emission gehört dir». `state/kosmo-status.ts`
 * selbst (der Zustands-Store, fremder Dateibesitz W2-D) bleibt UNANGETASTET
 * — dieses Modul hängt sich nur von AUSSEN über `useKosmoStatus.subscribe`
 * an und meldet jeden `zustand`-Wechsel als Tauri-Event `kosmo-zustand`
 * (Payload: der rohe `KosmoZustand`-String) an ALLE lauschenden Fenster —
 * insbesondere `KosmoCharakterFenster.tsx`, das im Zweitfenster denselben
 * `KosmoOrb` damit treibt.
 *
 * Nur im Hauptfenster sinnvoll (`CursorEbene.tsx` — mountet nur dort, siehe
 * `main.tsx`-Weiche `?fenster=charakter`). Feature-detected: ausserhalb von
 * Tauri (Web/PWA) ist `installiereKosmoZustandSender()` ein reines No-op —
 * `@tauri-apps/api/event` wird nie geladen, kein Tauri-Code zwingt sich in
 * den Web-Bundle-Pfad.
 */

let installiert = false;

/** Startet die Brücke (no-op ausserhalb von Tauri/bei Doppel-Installation)
 *  — Rückgabewert ist eine Aufräum-Funktion (React-`useEffect`-Muster). */
export function installiereKosmoZustandSender(): () => void {
  if (!istTauriDesktop() || installiert) return () => {};
  installiert = true;

  let lebendig = true;
  let abbestellen: (() => void) | null = null;

  void import('@tauri-apps/api/event')
    .then(({ emit }) => {
      if (!lebendig) return;
      // Initialzustand sofort senden — ein frisch geöffnetes Charakter-
      // Fenster soll nicht bis zum NÄCHSTEN Wechsel auf 'idle' warten.
      void emit('kosmo-zustand', useKosmoStatus.getState().zustand).catch(() => undefined);
      abbestellen = useKosmoStatus.subscribe((zustand, vorher) => {
        if (zustand.zustand === vorher.zustand) return;
        void emit('kosmo-zustand', zustand.zustand).catch(() => undefined);
      });
    })
    .catch(() => undefined);

  return () => {
    lebendig = false;
    installiert = false;
    abbestellen?.();
  };
}
