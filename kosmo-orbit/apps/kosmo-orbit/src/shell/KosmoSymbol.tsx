import { useEffect, useRef, useState } from 'react';
import { greeting, type ChatMessage } from '@kosmo/ai';
import { KIcon, useOverlaySchliessen, type ModuleId } from '@kosmo/ui';
import { useKosmoStatus, kurzform } from '../state/kosmo-status';
import { useProject } from '../state/project-store';
import { KosmoOrb, useKlickVsDoppelklick } from './KosmoOrb';
// P-F2 (v0.9.2, bindende Owner-Entscheidung nach AskUserQuestion, revidiert
// die vorherige Zurückstellung): die «Kosmo»-Hauptkachel fällt aus der
// Zentrale-Kachel-Reihe (`OrbitStart.tsx`, `KACHEL_REIHENFOLGE`) — DIESER
// Orb übernimmt ihre 8 Untertools über ein eigenes Menü (s.
// `KOSMO_STATIONEN`/`zeigeStationen` unten). Reiner Lese-Import derselben
// Registry + Icon-Zuordnung, die auch `OrbitStart.tsx`/`island/
// StationenOrb.tsx` schon nutzen — EINE Wahrheit, kein zweites
// Stationsverzeichnis/keine zweite Icon-Tabelle.
import { ORBIT_HAUPTWERKZEUGE } from './orbit-werkzeuge';
import { UNTERTOOL_ICON } from './OrbitStart';
// PB4 (`docs/V084-SPEZ.md` §3 E2, reiner Lese-Import — `KosmoPanel.tsx`
// bleibt unverändert, s. Bauauftrag «nur falls Doppelklick-Weg es braucht»):
// derselbe benannte Export, den `island/KosmoOrb.tsx` schon für ihre
// Konversationskarte nutzt (Mock-Provider-Hinweis, s. dortiger
// Kopfkommentar) — kein zweiter Provider-Zustand. P-F2 (Owner-Feedback
// 23.07., «Sprechblasensystem»): zusätzlich `baueChatProvider` — derselbe
// Provider-Konstruktor, den `KosmoPanel.tsx`s volle `ChatSession` nutzt
// (reiner Extract dort, s. Kopfkommentar an der Exportstelle), damit die
// Blasen-Antwort unten ECHT mit dem konfigurierten Provider spricht statt
// etwas vorzutäuschen.
import { baueChatProvider, loadSettings } from './KosmoPanel';
import './orbit-065.css';
import './kosmo-symbol.css';

/**
 * P-F2 (Owner-Feedback 23.07. wörtlich: «wenn man draufklickt kommt immer
 * noch der balken .. der soll nicht mehr da sein sondern alles in blasen»):
 * die Systemzeile für die WERKZEUGLOSE Blasen-Antwort — bewusst EIN eigener,
 * kurzer Systemprompt statt `personas.kosmo.systemPrompt` (der spricht
 * explizit von `modell_lesen`/Vorschlagskarten — Werkzeugen, die es in
 * diesem schlanken Pfad NICHT gibt; ein Modell, das den vollen Prompt sähe,
 * könnte fälschlich einen Werkzeugaufruf versuchen). Ehrlich benennt der
 * Prompt die Grenze: Modelländerungen/Wissenssuche bleiben dem grossen
 * Panel vorbehalten (weiterhin per Doppelklick erreichbar — NUR der
 * Blasen-Klick-Weg dorthin entfällt, s. `sendeBlasenNachricht` unten).
 */
const BLASEN_SYSTEMPROMPT =
  'Du bist Kosmo, der Architektur-Copilot in KosmoOrbit. Dies ist eine kurze Sprechblasen-Antwort OHNE Werkzeuge ' +
  '(kein Modellzugriff, keine Vorschlagskarten) — antworte knapp in 1–4 Sätzen, Deutsch (Schweiz, «ss» statt «ß»). ' +
  'Für Modelländerungen, Wissenssuche oder mehrstufige Aufgaben verweise kurz auf das grosse Kosmo-Panel ' +
  '(Doppelklick auf den Orb).';

interface BlasenEintrag {
  id: number;
  who: 'du' | 'kosmo';
  text: string;
}

/**
 * P-F2 (v0.9.2, bindende Owner-Entscheidung nach AskUserQuestion): «der
 * Kosmo-Orb rechts unten übernimmt die 8 Unter-Stationen … über ein Menü am
 * Orb». Dieselben 8 Untertools, die vorher NUR über die entfallene
 * «Kosmo»-Kachel in der Zentrale erreichbar waren (`shell/orbit-werkzeuge.ts`
 * `id:'kosmo'`) — EIN echter Registry-Zugriff, keine zweite, kopierte Liste.
 * `!` ist sicher: `orbit-werkzeuge.test.ts` hält die Existenz des
 * `'kosmo'`-Eintrags bereits fest (Bestandsschutz, ausserhalb dieses
 * Dateikreises).
 */
const KOSMO_STATIONEN = ORBIT_HAUPTWERKZEUGE.find((h) => h.id === 'kosmo')!.untertools;

export interface KosmoSymbolProps {
  /** Öffnet das grosse Panel (Klick ODER Tastatur — natives <button>). */
  onOpen: () => void;
  /**
   * P-F2 (v0.9.2, s. `KOSMO_STATIONEN` oben) — optional (isoliert gemountete
   * Tests/Stories brauchen ihn nicht, gleiches Muster wie `onZentrale` in
   * `island/StationenOrb.tsx`): navigiert zu einer der 8 Kosmo-Untertool-
   * Stationen (Speak/Sketch/Modell/Train/Dev/Doc/Trust/Package), ausgelöst
   * über das Rechtsklick-Stationen-Menü (`kosmo-stationen-menu` unten).
   */
  onStationOeffnen?: (id: ModuleId) => void;
  /**
   * v0.7.4 P3 (Owner-Wunschfeature «Kosmo-Orb ins Dock»): wenn `true`, lässt
   * das Symbol die `position:fixed`-Hülle weg und sitzt stattdessen im
   * normalen Fluss des aufrufenden Layouts (hier: der rechte Slot in
   * `BodenDock.tsx`). Testids (`kosmo-symbol`/`kosmo-mini`) und die gesamte
   * Panel-Logik (Hover/Fokus-Popup, Klick öffnet) bleiben WÖRTLICH
   * unverändert — nur die äussere Positionierung entfällt.
   */
  eingebettet?: boolean;
}

/**
 * KosmoSymbol — das schwebende Copilot-Symbol (K11, Owner-Befund wörtlich:
 * «Kosmo als Copilot-Symbol, nicht Dauerchat: Hover = Mini-Popup (letzte
 * Aktivität), Klick = entfaltet, volle Interaktion = grosses Panel; Animation
 * wenn Kosmo arbeitet»). Rendert NUR, solange das grosse Panel zu ist
 * (App.tsx) — auf der Zentrale/Home frei schwebend unten rechts (fixed,
 * über dem Inhalt); in einer Modul-Ansicht als `eingebettet`-Variante im
 * rechten Slot des Boden-Docks (`BodenDock.tsx`, v0.7.4 P3) — so existiert
 * je Screen-Zustand genau EINE Instanz mit `data-testid="kosmo-symbol"`.
 *
 * Arbeitet Kosmo gerade (Sende-Lebenszyklus, `state/kosmo-status.ts`),
 * pulsiert das Symbol per CSS-Klasse (`.k-kosmo-symbol-beschaeftigt`,
 * aura.css) — der globale `prefers-reduced-motion`-Block in aura.css
 * killt jede Animation/Transition, auch diese, ohne Sonderfall hier.
 * `k-kosmo-arbeitet` (aura.css) bleibt damit als Fallback bestehen, auch
 * wenn der Store gerade keinen granularen `zustand` liefert.
 *
 * v0.7.2 §6 (Paket 06): das Innere des Knopfs ist jetzt der wiederverwendbare
 * `KosmoOrb` (`shell/KosmoOrb.tsx`) statt des statischen `OrbitMark` — er
 * zeigt den feingranularen `zustand` (idle/thinking/listening/…/takeover)
 * über `data-zustand`. Testids/DOM-Vertrag (`kosmo-symbol`, `kosmo-mini`,
 * Symbol↔Panel) bleiben exakt unverändert, nur das Icon-Innere wechselt.
 *
 * **PB4 (`docs/V084-SPEZ.md` §3 E2 «Orb-Gesetz»):** Einfachklick öffnet ab
 * jetzt NICHT mehr direkt das grosse Panel, sondern dieselbe Art
 * Konversationskarte, die `island/KosmoOrb.tsx` bereits zeigt (Vorschlagstext
 * + 2 Aktions-Chips + Eingabezeile, `data-testid="kosmo-karte"`) —
 * Doppelklick öffnet das Panel direkt (`onOpen`, neu). Die Unterscheidung
 * läuft über den geteilten `useKlickVsDoppelklick`-Hook (`./KosmoOrb`,
 * derselbe, den `island/KosmoOrb.tsx` nutzt — EIN Zeitwert app-weit). Esc/
 * Aussenklick schliessen die Karte (`useOverlaySchliessen`, `ref`=derselbe
 * `wrapperRef` wie das Mini-Popup — ein Klick auf den Trigger-Knopf selbst
 * zählt damit nie als "aussen", exakt dasselbe Prinzip wie beim Popup oben).
 *
 * **P-F2 (Owner-Feedback 23.07. wörtlich: «sprechblasensystem … sehr
 * schmal, zudem wenn man draufklickt kommt immer noch der balken … der
 * soll nicht mehr da sein sondern alles in blasen»):** die Karte
 * (`.ks-karte`, `kosmo-symbol.css`) ist deutlich breiter geworden UND ihr
 * «Antworten»/Senden-Weg öffnet das grosse Panel («der Balken») NICHT mehr —
 * `handoff()`/`onOpen()` sind aus diesem Pfad entfernt. Stattdessen bleibt
 * die Karte offen und wird zum Mini-Gesprächsverlauf: «Antworten» fokussiert
 * nur das bestehende Eingabefeld, ein Absenden hängt die Nachricht als
 * eigene Blase an (`verlauf`, unten) und holt über `sendeBlasenNachricht`
 * eine ECHTE, aber werkzeuglose Antwort vom konfigurierten Provider
 * (`baueChatProvider`, aus `KosmoPanel.tsx` extrahiert — dieselbe
 * Provider-Auswahl wie die volle `ChatSession`, kein zweiter, drifender
 * Zustand). Das grosse Panel bleibt UNVERÄNDERT über seine bestehenden Wege
 * erreichbar: Doppelklick auf den Orb (`panelDoppelklick` unten,
 * unangetastet) und den Header-Toggle (`kosmo-toggle`, ausserhalb der
 * Zentrale) — NUR der Weg VON DER BLASE AUS wurde umgeleitet.
 *
 * **P-F2 (v0.9.2, bindende Owner-Entscheidung nach AskUserQuestion):** die
 * frühere «Kosmo»-Hauptkachel in der Zentrale-Reihe (`OrbitStart.tsx`) ist
 * entfallen — DIESER Orb übernimmt ihre 8 Untertools (Speak/Sketch/Modell/
 * Train/Dev/Doc/Trust/Package) über ein eigenes Rechtsklick-Menü
 * (`kosmo-stationen-menu`, `KOSMO_STATIONEN` oben). Rechtsklick ist bewusst
 * die gewählte Geste: Einfachklick/Doppelklick/Hover sind laut Orb-Gesetz
 * (PB4) bereits vergeben (Karte/Panel/Mini-Popup) — `contextmenu` war app-
 * weit auf diesem Element noch frei, keine neue Geste im Sinn eines neuen
 * MUSTERS, nur ein bisher ungenutztes natives Browser-Ereignis.
 */
export function KosmoSymbol({ onOpen, onStationOeffnen, eingebettet = false }: KosmoSymbolProps) {
  const beschaeftigt = useKosmoStatus((s) => s.beschaeftigt);
  const zustand = useKosmoStatus((s) => s.zustand);
  const letzteAktivitaet = useKosmoStatus((s) => s.letzteAktivitaet);
  const [zeigePopup, setZeigePopup] = useState(false);
  const [zeigeKarte, setZeigeKarte] = useState(false);
  const [zeigeStationen, setZeigeStationen] = useState(false);
  const [eingabe, setEingabe] = useState('');
  const [verlauf, setVerlauf] = useState<BlasenEintrag[]>([]);
  const [blaseBeschaeftigt, setBlaseBeschaeftigt] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const eingabeRef = useRef<HTMLInputElement | null>(null);
  const verlaufSeq = useRef(0);
  const angemeldet = useRef(true);
  useEffect(
    () => () => {
      angemeldet.current = false;
    },
    [],
  );

  // v0.8.4 W1 / PA4 (Spez §3 E3, Pflicht-Konsument #1): Esc schliesst das
  // Mini-Popup app-weit; der Hover-Rückklapp ersetzt das bisherige SOFORTIGE
  // `onMouseLeave→setZeigePopup(false)` durch einen ~1s-Timer (Owner-Befund
  // §1.1: «Pille verschwindet ~1s nach Weg-Hover»), der beim erneuten
  // Betreten storniert wird. `ref` = der WRAPPER (Trigger + Popup als
  // Kinder), nicht nur der Knopf — sonst würde ein Hover auf den Popup-Text
  // selbst (die Popup sitzt absolut ÜBER dem Knopf, `kosmo-symbol.css`) als
  // "verlassen" missverstanden. `onClose` ist idempotent (State-Setter),
  // ein zusätzlicher Ruf auf ein bereits geschlossenes Popup ist harmlos.
  useOverlaySchliessen(wrapperRef, () => setZeigePopup(false), {
    esc: true,
    aussenklick: true,
    hoverRueckklappMs: 1000,
  });

  // PB4 (E3-Rollout-Doku, `overlay-schliessen.ts`-Kopfkommentar «Orb-Karte»):
  // eigener, zweiter Hook-Ruf für die Konversationskarte — esc+aussenklick,
  // bewusst KEIN `hoverRueckklappMs` (die Karte schliesst nur aktiv, nicht
  // durch Weg-Hover; dafür kennt die E2-Tabelle den Einfachklick). Derselbe
  // `wrapperRef` wie oben (statt nur der Karte selbst): ein Klick auf den
  // Trigger-Knopf, während die Karte offen ist, darf sie nicht per
  // Aussenklick-Handler sofort wieder zuklappen, bevor der eigene
  // Klick-Handler unten überhaupt zum Zug kommt.
  useOverlaySchliessen(wrapperRef, () => setZeigeKarte(false), {
    esc: true,
    aussenklick: true,
  });

  // P-F2: dritter, eigenständiger Hook-Ruf fürs Stationen-Menü — gleiches
  // esc+aussenklick-Muster wie die Karte oben, eigener State (Karte und
  // Menü schliessen sich nicht gegenseitig automatisch, s. `onContextMenu`
  // unten, der beide explizit synchronisiert).
  useOverlaySchliessen(wrapperRef, () => setZeigeStationen(false), {
    esc: true,
    aussenklick: true,
  });

  const { onClick: karteKlick, onDoubleClick: panelDoppelklick } = useKlickVsDoppelklick(
    () => {
      setZeigePopup(false);
      setZeigeKarte(true);
    },
    () => {
      setZeigeKarte(false);
      setEingabe('');
      onOpen();
    },
  );

  // Fallback fürs Mini-Popup, solange Kosmo noch NIE geantwortet hat (Panel
  // seit Programmstart nie geöffnet): dieselbe Begrüssungszeile, die das
  // Panel selbst beim ersten Mount zeigen würde (KosmoPanel.tsx) — kein
  // erfundener Platzhaltertext.
  const begruessung = () => {
    const { doc } = useProject.getState();
    return greeting(new Date(), doc.settings.projectName, {
      walls: doc.byKind('wall').length,
      storeys: doc.byKind('storey').length,
    });
  };
  const vorschlagText = letzteAktivitaet ?? kurzform(begruessung());
  const mockAktiv = loadSettings().provider === 'mock';

  /**
   * P-F2: «Antworten» führte bisher über `handoff()` sofort ins grosse
   * Panel (Text ging dabei verloren — `onOpen()` kennt keine Nachricht).
   * Jetzt bleibt die Karte offen, nur das Eingabefeld bekommt den Fokus —
   * kein Panel-Aufruf mehr von hier aus.
   */
  function fokussiereEingabe(): void {
    eingabeRef.current?.focus();
  }

  /**
   * Sendet eine Nachricht INNERHALB der Blase (kein `onOpen()`, s.
   * Kopfkommentar): hängt sie als «du»-Blase an `verlauf`, fragt den
   * konfigurierten Provider WERKZEUGLOS (`tools: []`) über `baueChatProvider`
   * — dieselbe Provider-Auswahl wie die volle `ChatSession`
   * (`KosmoPanel.tsx`) — und streamt die Antwort als wachsende «kosmo»-Blase
   * zurück. Bewusst OHNE Tools/Proposals: ein Modell, das trotzdem einen
   * Werkzeugaufruf versucht (z. B. `MockProvider`s Referenzsuche-Trigger,
   * der `req.tools` nicht auswertet), liefert laut dessen eigenem Ablauf
   * IMMER zuerst einen Text-Delta — endet der Zug OHNE jeden Text-Delta,
   * ist der ehrliche Hinweis aufs grosse Panel die einzig korrekte Antwort
   * (kein stilles Nichts, aber auch KEIN automatisches Aufklappen).
   */
  async function sendeBlasenNachricht(text: string): Promise<void> {
    const inhalt = text.trim();
    if (!inhalt || blaseBeschaeftigt) return;
    setVerlauf((v) => [...v, { id: ++verlaufSeq.current, who: 'du', text: inhalt }]);
    setEingabe('');
    setBlaseBeschaeftigt(true);
    useKosmoStatus.getState().setzeZustand('thinking');
    const vorherigerVerlauf = verlauf;
    const nachrichten: ChatMessage[] = [
      { role: 'system', content: BLASEN_SYSTEMPROMPT },
      ...vorherigerVerlauf.map(
        (b): ChatMessage => ({
          role: b.who === 'du' ? 'user' : 'assistant',
          content: b.text,
        }),
      ),
      { role: 'user', content: inhalt },
    ];
    const provider = baueChatProvider(loadSettings());
    let kosmoId = -1;
    let irgendeinText = false;
    try {
      for await (const ev of provider.chat({ messages: nachrichten, tools: [] })) {
        if (!angemeldet.current) return;
        if (ev.type === 'text') {
          irgendeinText = true;
          useKosmoStatus.getState().setzeZustand('writing');
          setVerlauf((v) => {
            const letzte = v[v.length - 1];
            if (letzte && letzte.who === 'kosmo' && letzte.id === kosmoId) {
              return [...v.slice(0, -1), { ...letzte, text: letzte.text + ev.delta }];
            }
            kosmoId = ++verlaufSeq.current;
            return [...v, { id: kosmoId, who: 'kosmo', text: ev.delta }];
          });
        }
      }
      if (!irgendeinText && angemeldet.current) {
        setVerlauf((v) => [
          ...v,
          {
            id: ++verlaufSeq.current,
            who: 'kosmo',
            text: 'Das braucht ein Werkzeug — bitte dafür das grosse Kosmo-Panel öffnen (Doppelklick auf den Orb).',
          },
        ]);
      }
    } catch (err) {
      if (angemeldet.current) {
        setVerlauf((v) => [
          ...v,
          {
            id: ++verlaufSeq.current,
            who: 'kosmo',
            text: `⚠ ${err instanceof Error ? err.message : String(err)}`,
          },
        ]);
      }
    } finally {
      if (angemeldet.current) setBlaseBeschaeftigt(false);
      useKosmoStatus.getState().setzeZustand('idle');
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={`ks-wrapper ${eingebettet ? 'ks-wrapper--eingebettet' : 'ks-wrapper--frei'}`}
    >
      {zeigePopup && !zeigeKarte && (
        <div
          data-testid="kosmo-mini"
          role="status"
          className="k-einblenden ks-popup"
        >
          <div className="ks-popup-titel">
            {beschaeftigt ? 'Kosmo arbeitet …' : 'Kosmo'}
          </div>
          {vorschlagText}
        </div>
      )}
      {zeigeKarte && (
        <div data-testid="kosmo-karte" className="k-einblenden ks-karte">
          <button
            type="button"
            className="ks-karte-schliessen"
            data-testid="kosmo-karte-schliessen"
            aria-label="Schliessen"
            onClick={() => setZeigeKarte(false)}
          >
            ✕
          </button>
          <div className="ks-karte-titel">{beschaeftigt || blaseBeschaeftigt ? 'Kosmo arbeitet …' : 'Kosmo'}</div>
          <p className="ks-karte-text" data-testid="kosmo-karte-text">
            {vorschlagText}
          </p>
          {mockAktiv ? (
            <p className="ks-karte-hinweis" data-testid="kosmo-karte-mock-hinweis">
              Mock-Provider aktiv — echte Antworten brauchen einen konfigurierten Provider (Einstellungen →
              Werkzeuge einrichten).
            </p>
          ) : null}
          {/* P-F2: der Gesprächsverlauf DIESER Blase — bleibt IN der Karte,
              wächst mit jeder Nachricht (kein Panel-Wechsel). Reine
              Positiv-Liste (nur sichtbar, sobald mindestens eine Nachricht
              lief), damit die Karte im Ruhezustand nicht unnötig hoch wird. */}
          {verlauf.length > 0 && (
            <div className="ks-karte-verlauf" data-testid="kosmo-karte-verlauf">
              {verlauf.map((b) => (
                <div key={b.id} className={`kp-bubble ${b.who === 'du' ? 'kp-bubble--du' : 'kp-bubble--kosmo'}`}>
                  {b.text}
                </div>
              ))}
            </div>
          )}
          <div className="ks-karte-chips">
            <button
              type="button"
              className="ks-karte-chip"
              data-testid="kosmo-karte-antworten"
              onClick={fokussiereEingabe}
            >
              Antworten
            </button>
            <button
              type="button"
              className="ks-karte-chip"
              data-testid="kosmo-karte-spaeter"
              onClick={() => setZeigeKarte(false)}
            >
              Später
            </button>
          </div>
          <form
            className="ks-karte-eingabe-zeile"
            onSubmit={(e) => {
              e.preventDefault();
              void sendeBlasenNachricht(eingabe);
            }}
          >
            <input
              ref={eingabeRef}
              type="text"
              className="ks-karte-eingabe"
              data-testid="kosmo-karte-eingabe"
              placeholder="An Kosmo …"
              value={eingabe}
              disabled={blaseBeschaeftigt}
              onChange={(e) => setEingabe(e.target.value)}
              aria-label="Nachricht an Kosmo"
            />
            <button
              type="submit"
              className="ks-karte-senden"
              data-testid="kosmo-karte-senden"
              aria-label="Nachricht als Blase senden"
              disabled={blaseBeschaeftigt || !eingabe.trim()}
            >
              ➔
            </button>
          </form>
        </div>
      )}
      {/* P-F2 (v0.9.2, bindende Owner-Entscheidung): Rechtsklick-Menü mit
          den 8 Kosmo-Untertools — Ersatz für die entfallene «Kosmo»-Kachel
          in der Zentrale-Reihe (`OrbitStart.tsx`). Selbes Popover-Grund-
          muster wie `island/StationenOrb.tsx` (Liste klickbarer Einträge,
          `kommend`/fehlende `moduleId` bleiben ehrlich `disabled` statt
          leise nichts zu tun — keiner der 8 Einträge ist heute `kommend`,
          die Klammer bleibt trotzdem als Ehrlichkeits-Netz für künftige
          Einträge bestehen).
          Testid-Wahl bewusst `module-<id>`/`testidOverride` (dieselbe
          Konvention wie `OrbitStart.tsx`s Fächer-Karten) statt eines neuen
          Namensraums: Dutzende Bestands-Specs klicken diese Stations-
          Testids direkt (`module-speak`/`-sketch`/`-train`/`-dev`/`-doc`/
          `-trust`/`-paket`) — mit der IDENTISCHEN Testid genügt pro
          Aufrufstelle ein vorangestellter Rechtsklick auf den Orb, keine
          zweite, parallele Testid-Welt. */}
      {zeigeStationen && (
        <div className="ks-stationen-popover" data-testid="kosmo-stationen-menu">
          {KOSMO_STATIONEN.map((u) => {
            const testid = u.testidOverride ?? (u.moduleId ? `module-${u.moduleId}` : `kosmo-stationen-eintrag-${u.id}`);
            return (
              <button
                key={u.id}
                type="button"
                className="ks-stationen-eintrag"
                data-testid={testid}
                disabled={u.kommend || !u.moduleId}
                aria-disabled={u.kommend ? true : undefined}
                onClick={
                  u.kommend || !u.moduleId
                    ? undefined
                    : () => {
                        setZeigeStationen(false);
                        onStationOeffnen?.(u.moduleId!);
                      }
                }
              >
                <KIcon name={UNTERTOOL_ICON[u.id] ?? 'mehr'} size={16} />
                {u.titel}
                {u.kommend && <span className="k-orbit-badge-kommend">kommend</span>}
              </button>
            );
          })}
        </div>
      )}
      <button
        data-testid="kosmo-symbol"
        onClick={karteKlick}
        onDoubleClick={panelDoppelklick}
        onMouseEnter={() => setZeigePopup(true)}
        onFocus={() => setZeigePopup(true)}
        onBlur={() => setZeigePopup(false)}
        // P-F2: Rechtsklick öffnet NUR das Stationen-Menü (nie zusätzlich
        // die Karte/das Panel) — `preventDefault` unterdrückt das native
        // Browser-Kontextmenü, das hier ohnehin nutzlos wäre.
        onContextMenu={(e) => {
          e.preventDefault();
          setZeigePopup(false);
          setZeigeKarte(false);
          setZeigeStationen(true);
        }}
        aria-label={
          beschaeftigt
            ? 'Kosmo öffnen — arbeitet gerade'
            : 'Kosmo öffnen (Klick: Karte, Doppelklick: Panel, Rechtsklick: Stationen)'
        }
        aria-expanded={zeigeKarte || zeigeStationen}
        title="Kosmo"
        // Aufgabe 3 (0.6.6): `.k-druck` zusätzlich zu den bestehenden
        // `k-kosmo-symbol*`-Klassen (Puls-Animation bleibt unverändert).
        className={
          beschaeftigt
            ? 'k-kosmo-symbol k-kosmo-symbol-beschaeftigt k-druck ks-knopf'
            : 'k-kosmo-symbol k-druck ks-knopf'
        }
      >
        {/* K22 (Owner: «kosmo darf etwas grösser sein», Befund Abschnitt 3:
            Orb 30→40, Hülle 52→64 in `kosmo-symbol.css`/Boden-Dock-Slot). */}
        <KosmoOrb zustand={zustand} size={40} />
      </button>
    </div>
  );
}
