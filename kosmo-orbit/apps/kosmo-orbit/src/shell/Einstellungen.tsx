import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Hairline, KButton, KIcon, moduleHue, type ModuleId, type ThemeName } from '@kosmo/ui';
import './orbit-065.css';
import { AKZENTE } from './akzente';
import { NEUIGKEITEN, neuigkeitenFuerStation } from './neuigkeiten';
import { adaptionAktiv, adaptionZuruecksetzen, setAdaptionAktiv } from '../state/oberflaeche-adaption-kern';
import {
  effektiveLeistungsStufe,
  formatiereLeistungsBericht,
  holeLetztesErgebnis,
  holeOverride,
  istZustimmungErteilt,
  pruefeLeistungMitFreigabe,
  setOverride,
  setZustimmung,
  type LeistungsOverride,
} from '../state/leistung';
import { WerkzeugSetup } from './WerkzeugSetup';
import { loadSettings } from './KosmoPanel';
import { istTauriDesktop } from './cloud-login';
import { sindSoundsAn, setSoundsAn } from '../state/sounds';
import { eigencursorAktiv, setEigencursorEingestellt } from '../state/cursor-zustand';
import { abspielenEingestellt, setAbspielenEingestellt } from '../state/abspiel-ebene';
import { useDockZustand } from '../state/dock-zustand';
import type { DockModus } from '../state/dock-kern';

/**
 * Zentrales Einstellungs-Panel (Serie K / Batch A4, Owner-Befund K14, wörtlich:
 * «Einstellungsmenüs: zentral in der Übersicht + je Station … Funktionen &
 * Neues»). EIN Panel für die ganze App — die Kopfleiste öffnet es ungefiltert
 * (`station` undefined), jede Station öffnet dasselbe Panel mit einem
 * Filter-Prop (siehe die `station-einstellungen-<id>`-Zahnräder in den
 * Workspaces). Kein zweites Panel, keine zweite Logik: Darstellung (Thema/
 * Akzent) und Rundgang rufen exakt dieselben Setter/Funktionen wie die
 * Kopfleiste/der «?»-Knopf; Betriebsart/TTS/Lizenz bleiben ehrlich im
 * Kosmo-Panel (nur ein Öffnen-Knopf hierher, kein Duplikat); Werkzeuge
 * einrichten bettet die bestehende `WerkzeugSetup`-Komponente direkt ein;
 * die Oberflächen-Anpassung (Serie J3c) ruft den stationsneutralen Adaptions-
 * Kern direkt (`oberflaeche-adaption-kern.ts`) — derselbe globale Schalter,
 * den DesignWorkspace/DataWorkspace über ihre eigene Kopie schon anzeigen.
 *
 * v0.6.5 (Mass 5, UI-KONZEPT-065 §3): der Kopf/Körper-Aufbau folgt jetzt
 * `KDialog` (Plakat-Titel, Schliessen-KIcon, `.k-dialog-box`/`.k-dialog-kopf`/
 * `.k-dialog-koerper`-Klassen aus `packages/kosmo-ui` — dieselbe Optik wie
 * jeder andere Dialog). Die Komponente selbst wird NICHT instanziiert: sie
 * kennt kein Prop, um `data-testid="einstellungen-panel"` auf die BOX (statt
 * auf den Scrim) zu legen, und dieser exakte Testid-Ort ist ein bestehender
 * Vertrag (`einstellungen.spec.ts` u. a.: `panel.toContainText(...)` erwartet
 * Titel UND Sektionen im selben Element). Deshalb hier dieselben Klassen von
 * Hand, mit vollem Zugriff auf die Testid-Platzierung — Verhalten/Optik
 * bleiben identisch zu `KDialog`. Innere Sektions-Testids/-Struktur (System,
 * Darstellung, Leistung, Funktionen & Neues, `neuigkeiten-version-*`)
 * bleiben unverändert, nur die Sektionstitel wandern auf `--k-t-lg`
 * (`.orbit065-einstellungen-sektionstitel`, orbit-065.css) statt `--k-primaer`.
 */

export interface EinstellungenProps {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  akzent: string;
  setAkzent: (a: string) => void;
  onClose: () => void;
  /** Ruft denselben Weg wie der «?»-Knopf der Kopfleiste (A3-Versprechen). */
  aufRundgangStarten: () => void;
  /** Öffnet das Kosmo-Panel (Betriebsart/TTS/Lizenz leben dort, kein Duplikat). */
  aufKosmoOeffnen: () => void;
  /** F2 (v0.6.4, Entdoppelung): öffnet den Deinstallieren-Dialog — der Knopf
   *  wohnt NUR noch hier (eine Funktion = ein Ort), nicht mehr in der
   *  Kopfleiste; der Dialog selbst (AppDeinstallieren) bleibt in App.tsx. */
  aufDeinstallieren: () => void;
  /** Gesetzt, wenn über ein Stations-Zahnrad geöffnet — filtert «Funktionen &
   *  Neues» oben auf diese Station vor; die übrigen Sektionen bleiben gleich. */
  station?: ModuleId;
  /** Anzeigename der Station, für die Kopfzeile/den Filter-Titel. */
  stationName?: string;
}

/**
 * v0.7.4 P8 (Owner-Befund «Companion auffindbar»): der Companion
 * (`shell/Companion.tsx`, die schmale Lese-/Freigabe-Ansicht) war bisher NUR
 * über einen von Hand getippten `#companion`-URL-Hash erreichbar
 * (`main.tsx` `istCompanion`) — kein In-App-Weg. `main.tsx` prüft den Hash
 * nur EINMAL beim Laden (s. `Companion.tsx` `zurueckZurVollApp`-Kommentar),
 * darum reicht ein blosses `location.hash = ...` nicht — derselbe
 * Hash-setzen-und-neu-laden-Weg wie dort.
 */
function oeffneCompanion(): void {
  window.location.hash = '#companion';
  window.location.reload();
}

export function Einstellungen({
  theme,
  setTheme,
  akzent,
  setAkzent,
  onClose,
  aufRundgangStarten,
  aufDeinstallieren,
  aufKosmoOeffnen,
  station,
  stationName,
}: EinstellungenProps) {
  const [werkzeugSetupOffen, setWerkzeugSetupOffen] = useState(false);
  const [adaptionIstAn, setAdaptionIstAn] = useState(() => adaptionAktiv());

  // v0.7.8 Welle 3 (P6): Dock-Modus (Konzept A «Orbit-Zonen» / Konzept B
  // «Raster-Kachel») — derselbe Store, den `DockFlaeche.tsx` liest (`modus`),
  // hier nur gespiegelt für den 2-Segment-Wähler unten. `dock-zustand.ts`
  // persistiert `modus` bereits selbst (`kosmo.dock.v1`) — kein zweiter
  // Speicherweg nötig.
  const dockModus = useDockZustand((s) => s.modus);
  const dockModusSetzen = useDockZustand((s) => s.modusSetzen);

  // A9 (Owner-Befund K19, Leistungs-Autotuning): Zustimmung, letztes Ergebnis
  // und Override leben in leistung.ts (localStorage kosmo.leistung.v1) — hier
  // nur der React-Spiegel für die Anzeige, dieselben Setter wie überall sonst.
  const [leistungZustimmung, setLeistungZustimmungState] = useState(() => istZustimmungErteilt());
  const [leistungErgebnis, setLeistungErgebnis] = useState(() => holeLetztesErgebnis());
  const [leistungOverride, setLeistungOverrideState] = useState<LeistungsOverride>(() => holeOverride());

  // v0.7.2 §5/§7/§8/§9 (W4-H, Kritik-Auflage «Einstellungs-Verdrahtung»):
  // vier neue Schalter — Sounds/Eigencursor/Abspielen sind reine
  // localStorage-Spiegel (dieselben Lese-Funktionen wie die jeweiligen
  // Module selbst, KEINE Zweitlogik); der Charakter-Schalter hat KEINEN
  // persistierten Wert (er zeigt/versteckt das Tauri-Zweitfenster live).
  const [soundsAn, setSoundsAnState] = useState(() => sindSoundsAn());
  const [eigencursorAn, setEigencursorAnState] = useState(() => eigencursorAktiv());
  const [abspielenAn, setAbspielenAnState] = useState(() => abspielenEingestellt());
  const tauriDesktop = istTauriDesktop();
  const [charakterSichtbar, setCharakterSichtbar] = useState(false);
  const [charakterFehler, setCharakterFehler] = useState<string | null>(null);

  async function aufCharakterUmschalten(): Promise<void> {
    if (!tauriDesktop) return; // ausserhalb Tauri deaktiviert (s. Button-Render unten) — defensiv doppelt geprüft
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const neuSichtbar = await invoke<boolean>('charakter_fenster_umschalten');
      setCharakterSichtbar(neuSichtbar);
      setCharakterFehler(null);
    } catch (err) {
      // Ehrlich statt stillschweigend: das Fenster/der Command kann fehlen
      // (z.B. ein Build ohne Zweitfenster) — der Schalter bleibt unverändert.
      setCharakterFehler(err instanceof Error ? err.message : String(err));
    }
  }

  // Escape schliesst das Panel (Muster wie ZentraleKachel-Info/Kurzbefehle).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stationPunkte = station ? neuigkeitenFuerStation(station) : [];

  return createPortal(
    <div
      data-testid="einstellungen-scrim"
      role="dialog"
      aria-modal
      aria-label="Einstellungen"
      className="k-dialog-scrim"
      style={{ zIndex: 250, background: 'color-mix(in srgb, var(--k-ink) 22%, transparent)' }}
      onClick={onClose}
    >
      <div
        data-testid="einstellungen-panel"
        className="k-dialog-box k-dialog k-skalieren-ein"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, calc(100vw - 48px))',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {werkzeugSetupOffen && (
          <WerkzeugSetup betriebsart={loadSettings().betriebsart} onClose={() => setWerkzeugSetupOffen(false)} />
        )}
        <div className="k-dialog-kopf">
          <span className="k-titel k-dialog-kopf-titel">
            Einstellungen{station && stationName ? ` — ${stationName}` : ''}
          </span>
          <button type="button" aria-label="Schliessen" className="k-dialog-kopf-schliessen" onClick={onClose}>
            <KIcon name="schliessen" size={16} />
          </button>
        </div>

        <div className="k-dialog-koerper orbit065-einstellungen-koerper" style={{ overflowY: 'auto' }}>
          {station && (
            <section data-testid="einstellungen-neuigkeiten-station" className="orbit065-einstellungen-sektion">
              <div className="orbit065-einstellungen-sektionstitel">Neu in {stationName ?? station}</div>
              {stationPunkte.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--k-ink-faint)' }}>
                  Noch keine eigenen Einträge für diese Station — siehe «Funktionen &amp; Neues» unten.
                </div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4, fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
                  {stationPunkte.map((t, i) => (
                    <li key={i}>
                      <span style={{ color: 'var(--k-ink-faint)', fontFamily: 'var(--k-font-mono)', fontSize: 11 }}>
                        {t.version}
                        {t.inArbeit ? ' · in Arbeit' : ''}
                      </span>{' '}
                      {t.punkt.text}
                    </li>
                  ))}
                </ul>
              )}
              <Hairline />
            </section>
          )}

          <section data-testid="einstellungen-darstellung" className="orbit065-einstellungen-sektion">
            <div className="orbit065-einstellungen-sektionstitel">Darstellung</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* v0.7.3 D7 (Owner-Entscheid, Gestaltungs-Spez): Tinte entfernt —
                der 3-Segment-Wähler (0.7.2 §1) schrumpft zurück auf 2
                Segmente PAPIER/KOSMOS. `data-testid="einstellung-thema"`
                bleibt auf dem Segment-CONTAINER (Vertrag), aber
                `e2e/einstellungen.spec.ts` klickt seit D7 gezielt ein
                Segment statt den Container — mit nur zwei Segmenten läge ein
                Container-Klick (Playwright klickt die Bounding-Box-Mitte)
                GENAU auf der Grenze zwischen beiden Buttons, ein
                browserabhängig unklares Ziel statt des früheren, zuverlässig
                mittleren «Tinte»-Segments. */}
            <span
              data-testid="einstellung-thema"
              role="group"
              aria-label="Thema"
              style={{
                display: 'inline-flex',
                border: '1px solid var(--k-line-strong)',
                borderRadius: 'var(--k-radius-pill, 999px)',
                overflow: 'hidden',
              }}
            >
              {(
                [
                  { key: 'paper' as const, label: 'Papier' },
                  { key: 'orbit' as const, label: 'Kosmos' },
                ]
              ).map((seg) => (
                <button
                  key={seg.key}
                  type="button"
                  data-testid={`einstellung-thema-${seg.key}`}
                  aria-pressed={theme === seg.key}
                  onClick={() => setTheme(seg.key)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    padding: '5px 12px',
                    fontSize: 12.5,
                    fontWeight: theme === seg.key ? 650 : 500,
                    color: theme === seg.key ? 'var(--k-accent-ink)' : 'var(--k-ink-soft)',
                    background: theme === seg.key ? 'var(--k-accent)' : 'transparent',
                  }}
                >
                  {seg.label}
                </button>
              ))}
            </span>
            <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>
              {AKZENTE.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAkzent(a.key)}
                  title={`Akzent ${a.name}`}
                  aria-label={`Akzent ${a.name}`}
                  data-testid={`einstellung-akzent-${a.key}`}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: a.farbe ?? 'var(--k-technik)',
                    boxShadow:
                      akzent === a.key
                        ? '0 0 0 1.5px var(--k-field), 0 0 0 3px var(--k-technik)'
                        : '0 0 0 1px var(--k-line-strong)',
                  }}
                />
              ))}
            </span>
          </div>

          {/* v0.7.8 Welle 3 (P6): Werkzeug-Anordnung — Umschalter zwischen den
              zwei Modi DESSELBEN Dock-Solvers (`state/dock-kern.ts` `solve()`):
              Konzept A «Orbit-Zonen» (Standard, schwebende Panels möglich) und
              Konzept B «Raster-Kachel» (Tiling — nichts schwebt, alle Panels
              teilen sich den Platz als Streifen/Spalten). Gleiches 2-Segment-
              Muster wie `einstellung-thema` oben (Container-Testid + je
              Segment ein eigener, additiver Testid). */}
          <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>Werkzeug-Anordnung</span>
            <span
              data-testid="einstellungen-dock-modus"
              role="group"
              aria-label="Werkzeug-Anordnung"
              style={{
                display: 'inline-flex',
                width: 'fit-content',
                border: '1px solid var(--k-line-strong)',
                borderRadius: 'var(--k-radius-pill, 999px)',
                overflow: 'hidden',
              }}
            >
              {(
                [
                  { key: 'A' as const, label: 'Orbit-Zonen (A, Standard)' },
                  { key: 'B' as const, label: 'Raster-Kachel (B)' },
                ]
              ).map((seg) => (
                <button
                  key={seg.key}
                  type="button"
                  data-testid={`einstellungen-dock-modus-${seg.key}`}
                  aria-pressed={dockModus === seg.key}
                  onClick={() => dockModusSetzen(seg.key as DockModus)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    padding: '5px 12px',
                    fontSize: 12.5,
                    fontWeight: dockModus === seg.key ? 650 : 500,
                    color: dockModus === seg.key ? 'var(--k-accent-ink)' : 'var(--k-ink-soft)',
                    background: dockModus === seg.key ? 'var(--k-accent)' : 'transparent',
                  }}
                >
                  {seg.label}
                </button>
              ))}
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
              {dockModus === 'A'
                ? 'A: Panels können frei schweben (Pop-out möglich), Kollisionen löst der Solver automatisch.'
                : 'B: nichts schwebt, alle teilen sich den Platz — Panels erscheinen als Streifen ohne Pop-out.'}
            </span>
          </div>
        </section>
        <Hairline />

        {/* v0.7.2 W4-H (Kritik-Auflage «Einstellungs-Verdrahtung», Spec §5/§7/
            §8/§9): vier neue Schalter — dieselben Lese-Funktionen wie die
            jeweiligen Module selbst (keine Zweitlogik), Schreiben über die
            zugehörigen Setter (s. Import-Kopf). */}
        <section data-testid="einstellungen-bewegung-klang" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Bewegung &amp; Klang</div>

          <label style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              data-testid="einstellung-sounds"
              checked={soundsAn}
              onChange={(e) => {
                setSoundsAn(e.target.checked);
                setSoundsAnState(e.target.checked);
              }}
            />
            Dezente Klick-/Bestätigungstöne (Default aus)
          </label>

          <label style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              data-testid="einstellung-eigencursor"
              checked={eigencursorAn}
              onChange={(e) => {
                setEigencursorEingestellt(e.target.checked);
                setEigencursorAnState(e.target.checked);
              }}
            />
            Eigener Zeiger (Default an bei Maus/Trackpad, aus bei reinem Touch)
          </label>

          <label style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              data-testid="einstellung-abspielen"
              checked={abspielenAn}
              onChange={(e) => {
                setAbspielenEingestellt(e.target.checked);
                setAbspielenAnState(e.target.checked);
              }}
            />
            Kosmo zeichnet sichtbar, bevor eine Änderung übernommen wird (Default an)
          </label>

          <label
            style={{
              fontSize: 12.5,
              color: tauriDesktop ? 'var(--k-ink-soft)' : 'var(--k-ink-faint)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: tauriDesktop ? 1 : 0.55,
            }}
            title={tauriDesktop ? undefined : 'Nur in der Desktop-App verfügbar — im Browser/PWA gibt es kein Zweitfenster.'}
          >
            <input
              type="checkbox"
              data-testid="einstellung-charakter"
              checked={charakterSichtbar}
              disabled={!tauriDesktop}
              onChange={() => void aufCharakterUmschalten()}
            />
            Kosmo-Charakter-Fenster anzeigen (nur Desktop-App)
          </label>
          {charakterFehler && (
            <div style={{ fontSize: 11, color: 'var(--k-danger)' }}>{charakterFehler}</div>
          )}
        </section>
        <Hairline />

        <section data-testid="einstellungen-rundgang" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Rundgang &amp; Hilfe</div>
          <div>
            <KButton size="sm" tone="quiet" data-testid="einstellung-rundgang" onClick={aufRundgangStarten}>
              Rundgang erneut zeigen
            </KButton>
          </div>
        </section>
        <Hairline />

        <section data-testid="einstellungen-kosmo" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Kosmo &amp; Betrieb</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <KButton size="sm" tone="quiet" data-testid="einstellung-kosmo-oeffnen" onClick={aufKosmoOeffnen}>
              Kosmo-Einstellungen öffnen
            </KButton>
            <KButton size="sm" tone="quiet" data-testid="einstellung-werkzeuge" onClick={() => setWerkzeugSetupOffen(true)}>
              Werkzeuge einrichten
            </KButton>
            <KButton
              size="sm"
              tone="quiet"
              data-testid="einstellung-companion-oeffnen"
              title="Wechselt in die schmale Companion-Ansicht (Lesen/Freigeben) — ein Klick zurück in KosmoOrbit steht dort bereit."
              onClick={oeffneCompanion}
            >
              Companion öffnen
            </KButton>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)', lineHeight: 1.5 }}>
            Betriebsart, Sprachausgabe und Lizenz stehen im Kosmo-Panel selbst (⚙ dort) — kein zweiter Ort für dieselbe
            Einstellung.
          </div>
        </section>
        <Hairline />

        <section data-testid="einstellungen-adaption" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Oberflächen-Anpassung</div>
          <label style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              data-testid="einstellung-adaption-schalter"
              checked={adaptionIstAn}
              onChange={(e) => {
                setAdaptionAktiv(e.target.checked);
                setAdaptionIstAn(e.target.checked);
              }}
            />
            Werkzeugleisten passen sich der Nutzung an (Design, Data, weitere Stationen)
          </label>
          <div>
            <KButton
              size="sm"
              tone="ghost"
              data-testid="einstellung-adaption-reset"
              title="Gelerntes Nutzungsprofil löschen — betrifft alle Stationen, der Schalter bleibt unverändert."
              onClick={() => adaptionZuruecksetzen()}
            >
              Oberfläche zurücksetzen
            </KButton>
          </div>
        </section>
        <Hairline />

        <section data-testid="einstellungen-leistung" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Leistung</div>
          <label style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              data-testid="leistung-zustimmung"
              checked={leistungZustimmung}
              onChange={(e) => {
                setZustimmung(e.target.checked);
                setLeistungZustimmungState(e.target.checked);
              }}
            />
            Kosmo darf die Systemleistung prüfen (Kerne, Speicher, Grafiktreiber, ein kurzer Mikro-Benchmark) und die
            Render-Qualität selbst drosseln
          </label>
          <div>
            <KButton
              size="sm"
              tone="quiet"
              data-testid="leistung-pruefen"
              disabled={!leistungZustimmung}
              title={leistungZustimmung ? undefined : 'Erst die Zustimmung oben aktivieren'}
              onClick={() => {
                const ergebnis = pruefeLeistungMitFreigabe();
                if (ergebnis) setLeistungErgebnis(ergebnis);
              }}
            >
              Systemleistung jetzt prüfen
            </KButton>
          </div>
          {leistungErgebnis && (
            <div
              data-testid="leistung-bericht"
              style={{
                fontSize: 12,
                color: 'var(--k-ink-soft)',
                lineHeight: 1.6,
                background: 'var(--k-surface)',
                borderRadius: 8,
                padding: '8px 10px',
                display: 'grid',
                gap: 2,
              }}
            >
              {(() => {
                const bericht = formatiereLeistungsBericht(leistungErgebnis);
                return (
                  <>
                    <div>Kerne: {bericht.kerne}</div>
                    <div>Speicher: {bericht.speicher}</div>
                    <div>Grafiktreiber: {bericht.renderer}</div>
                    <div>
                      Stufe: <strong data-testid="leistung-stufe">{bericht.stufe}</strong>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--k-ink-faint)' }}>Render-Qualität:</span>
            {(['auto', 'hoch', 'mittel', 'niedrig'] as const).map((stufe) => (
              <button
                key={stufe}
                data-testid={`leistung-override-${stufe}`}
                onClick={() => {
                  setOverride(stufe);
                  setLeistungOverrideState(stufe);
                }}
                className="k-primaer"
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontSize: 11.5,
                  padding: '3px 9px',
                  borderRadius: 999,
                  color: leistungOverride === stufe ? 'var(--k-field)' : 'var(--k-ink-soft)',
                  background: leistungOverride === stufe ? 'var(--k-technik)' : 'var(--k-surface)',
                }}
              >
                {stufe === 'auto' ? `Automatisch (${effektiveLeistungsStufe()})` : stufe}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--k-ink-faint)', lineHeight: 1.5 }}>
            🔒 Cycles-Preview-Synchro, ein Host-PC-Client und die Wahl des lokalen LLM nach Leistung folgen erst mit der
            HomeStation — hier gibt es dafür bewusst keinen Regler.
          </div>
        </section>
        <Hairline />

        <section data-testid="einstellungen-neuigkeiten" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Funktionen &amp; Neues</div>
          {NEUIGKEITEN.map((eintrag) => (
            <div key={eintrag.version} data-testid={`neuigkeiten-version-${eintrag.version}`} style={{ display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Version {eintrag.version}</span>
                {eintrag.inArbeit && <Badge hue={moduleHue.kosmo}>in Arbeit</Badge>}
                <span style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>{eintrag.datum}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.6 }}>
                {eintrag.punkte.map((p, i) => (
                  <li key={i}>{p.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        <Hairline />

        {/* F2 (v0.6.4, Entdoppelung): «App deinstallieren…» zog aus der
            Kopfleiste hierher um — selten gebraucht, gehört zu den
            System-Einstellungen, nicht auf den teuersten Platz der App. */}
        <section data-testid="einstellungen-system" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">System</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <KButton size="sm" tone="quiet" data-testid="einstellung-deinstallieren" onClick={aufDeinstallieren}>
              App deinstallieren…
            </KButton>
            <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
              öffnet die ehrliche Anleitung für dein Betriebssystem — nichts wird sofort gelöscht.
            </span>
          </div>
        </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
