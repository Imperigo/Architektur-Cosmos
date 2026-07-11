import { useEffect, useState } from 'react';
import { KosmoOrb } from './KosmoOrb';
import { istTauriDesktop } from './cloud-login';
import { useKosmoStatus, kurzform, type KosmoZustand } from '../state/kosmo-status';
import './kosmo-charakter-fenster.css';

/**
 * KosmoCharakterFenster (v0.7.2 §9, Paket 07, Stream W3-F) — der Inhalt des
 * Tauri-Zweitfensters `kosmo-charakter` (~200×220, `decorations:false,
 * transparent:true, alwaysOnTop:true, skipTaskbar:true`, unten rechts).
 * `main.tsx` rendert diese Komponente ANSTELLE von `<App/>`, wenn
 * `?fenster=charakter` in der URL steht (Spec §12 — die Weiche selbst legte
 * W1-A als No-op-Anker an, W3-F aktiviert sie NUR, ändert sonst nichts an
 * `main.tsx`).
 *
 * **Wiederverwendung statt Zweitimplementierung** (Auftrag, wörtlich): die
 * eigentliche Zustands-Darstellung (idle/thinking/listening/…/takeover,
 * §6) ist exakt `shell/KosmoOrb.tsx` aus W2-D — hier NUR eingebettet, keine
 * zweite Kopie der Zustands-CSS/-Logik. Was DIESE Datei zusätzlich beiträgt
 * (Spec §9, wörtlich nicht Teil von KosmoOrb):
 *  - der gepunktete Charakter-Ring (r 20, dash 2 4.4) + dunkler Kern-Hof
 *    (#12151D) als Fenster-Chrome UM den Orb herum,
 *  - ein umlaufender Satellit (7s) + eine sehr langsame Atem-Skalierung
 *    (3s) der ganzen Chrome-Gruppe,
 *  - die Meldungs-Chips (Pill, Glas) links vom Orb,
 *  - die Aufstarten-Sequenz (2 gegenläufige Punkte 1.8s/2.7s + Lade-Pill).
 *
 * **Ehrliche Grenze (Schliessen-Choreografie):** Spec §9 beschreibt zusätzlich
 * ein Schliessen-Bild («Hauptfenster-Inhalt skaliert zur Ecke … Orb
 * schluckt mit Pop … Sound plopp»), das eine choreografierte Übergabe
 * zwischen BEIDEM Fenstern voraussetzt (Hauptfenster-Inhalt + dieses
 * Fenster + der tatsächliche Tauri-`hide()`-Zeitpunkt aus `lib.rs`). Das ist
 * NICHT umgesetzt: es bräuchte entweder eine Änderung an `App.tsx` über die
 * erlaubte Anker-Zeile hinaus (verboten, Spec §12) oder einen eigenen
 * Rust→JS-"vor dem Verstecken"-Vorlauf-Event, den `lib.rs` heute nicht
 * sendet. Was UMGESETZT ist: die Aufstarten-Sequenz beim Mount dieses
 * Fensters, plus `plopp()` (aus `state/sounds.ts`, feature-detected/Default
 * AUS) als loser Baustein — er ist nur nicht an ein echtes Schliessen-Event
 * angeschlossen, weil es keins gibt. Siehe Abschlussbericht.
 */

const AUFSTARTEN_DAUER_MS = 2000;

export function KosmoCharakterFenster() {
  const [aufstarten, setAufstarten] = useState(true);
  const [fernZustand, setFernZustand] = useState<KosmoZustand>(() => useKosmoStatus.getState().zustand);
  const letzteAktivitaet = useKosmoStatus((s) => s.letzteAktivitaet);

  // Aufstarten-Sequenz (Spec §9): 2 Punkte kreisen gegenläufig + Lade-Pill,
  // danach die normale Orb-Darstellung. `AUFSTARTEN_DAUER_MS` ist bewusst
  // fest (kein Reduced-Motion-Sonderfall in JS nötig — der Kollaps auf 0
  // sichtbare Millisekunden macht die 2s-Wartezeit unter reduced-motion
  // zwar nicht kürzer, ABER die eigentliche CSS-Animation selbst wird vom
  // globalen aura.css-Riegel auf 0.01ms gekürzt; nur der Wechsel danach
  // bleibt sichtbar synchron mit dem Timer). Ehrliche Grenze: ein Timer statt
  // eines `onAnimationEnd` — die Aufstarten-Sequenz hat kein einzelnes
  // "Ende"-Ereignis (zwei parallel laufende Loops + eine Lade-Pill), darum
  // hier bewusst ein fester Timer statt der `CursorEbene.tsx`-Technik.
  useEffect(() => {
    const t = setTimeout(() => setAufstarten(false), AUFSTARTEN_DAUER_MS);
    return () => clearTimeout(t);
  }, []);

  // Tauri-Event `kosmo-zustand` (Spec §9/§12): vom Hauptfenster gesendet
  // (`shell/kosmo-zustand-bruecke.ts`). Feature-detected — ausserhalb von
  // Tauri (z.B. versehentlicher Aufruf im Browser) bleibt der lokale
  // Default-Zustand ('idle') stehen, kein Fehler.
  useEffect(() => {
    if (!istTauriDesktop()) return;
    let abbestellen: (() => void) | undefined;
    let lebendig = true;
    void import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen<KosmoZustand>('kosmo-zustand', (event) => {
          if (lebendig) setFernZustand(event.payload);
        }),
      )
      .then((f) => {
        if (lebendig) abbestellen = f;
        else f();
      })
      .catch(() => undefined);
    return () => {
      lebendig = false;
      abbestellen?.();
    };
  }, []);

  return (
    <div className="charakter-fenster" data-testid="kosmo-charakter-fenster">
      {aufstarten ? (
        <div className="charakter-aufstarten" data-testid="kosmo-charakter-aufstarten" aria-hidden="true">
          <div className="charakter-aufstarten-punkt charakter-aufstarten-punkt--a" />
          <div className="charakter-aufstarten-punkt charakter-aufstarten-punkt--b" />
          <div className="charakter-aufstarten-pill">
            <div className="charakter-aufstarten-pill-scan" />
          </div>
        </div>
      ) : (
        <>
          {letzteAktivitaet && (
            <div className="charakter-chip" data-testid="kosmo-charakter-chip">
              {kurzform(letzteAktivitaet, 60)}
            </div>
          )}
          <div className="charakter-chrome" data-testid="kosmo-charakter-chrome">
            <div className="charakter-ring" aria-hidden="true" />
            <div className="charakter-satellit" aria-hidden="true">
              <span className="charakter-satellit-punkt" />
            </div>
            <div className="charakter-kern-hof" aria-hidden="true" />
            <KosmoOrb zustand={fernZustand} size={64} />
          </div>
        </>
      )}
    </div>
  );
}
