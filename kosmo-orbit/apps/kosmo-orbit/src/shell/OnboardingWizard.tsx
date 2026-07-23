import { useEffect, useState } from 'react';
import { Badge, Hairline, KButton, KIcon, KInput, KSelect, OrbitMark } from '@kosmo/ui';
import { STANDARD_BRIDGE_URL, STANDARD_SYNC_URL, type Betriebsart } from '@kosmo/ai';
import type { BridgeHealth } from '@kosmo/contracts';
import { useProject } from '../state/project-store';
import { werkzeugeFuer, type Pruefung, type Werkzeug } from '../state/werkzeuge';
import { loadSettings } from './KosmoPanel';
import { WerkzeugSetup } from './WerkzeugSetup';
import { ONBOARDING_SCHRITTE, type OnboardingSchrittId } from './onboarding-schritte';
import { Fortschrittsbalken } from './Fortschrittsbalken';
import { diensteZeile, gpuZeile, pingeZentrale, zentralePairingSvg } from './onboarding-pairing';
import { homeServerEndpunkte, verbindeHomeServer } from '../state/home-server';
import './onboarding-wizard.css';

/**
 * Onboarding-Wizard (v0.7.6 Welle 3 Stream E) — ersetzt die statische
 * «Erste Schritte»-Karte durch den 4-Schritt-Wizard des ClaudeDesign-Soll-
 * Bilds (README §10, `Kosmo Viz Onboarding.dc.html`): Konto & Büro ·
 * Kosmo-Zentrale koppeln · Modelle & Core laden · Erstes Projekt & Zweig.
 * Linker Stepper, rechts der aktive Schritt, Footer mit Punkten + Zurück/
 * Weiter — nachgebaut aus Bord-Mitteln (`.k-glass`, Rollen-`-fill`/`-line`,
 * `--k-glow-cyan`), OHNE die DC-Runtime der Vorlage zu portieren.
 *
 * Ehrlichkeit vor Politur (verbindlich laut Auftrag): Schritt 02 täuscht
 * keine gefundene Zentrale vor — er prüft live, ob die HomeStation-Bridge
 * erreichbar ist (derselbe `/health`-Ping wie `WerkzeugSetup`, zusätzlich mit
 * echtem JSON-Parse der Antwort via `onboarding-pairing.ts`/`@kosmo/contracts`
 * `BridgeHealth`). Gefunden zeigt NUR echte Health-Felder (Version, Dienste,
 * GPU-Zeile NUR wenn die Bridge sie liefert — sonst ehrlich «kommt mit
 * deiner Zentrale», nie ein erfundenes «GPU 24 GB»). Nicht gefunden zeigt
 * den echten QR-Pairing-Code (`state/qr.ts` `qrSvg`, derselbe
 * `#sync=…&raum=…`-Link wie das bestehende «iPad koppeln» in `App.tsx` — P4
 * QR-Pairing wiederverwendet, nicht neu gebaut) plus manuelle
 * Bridge-Adress-Eingabe. Schritt 03
 * zeigt das reale Verhältnis erreichbarer Kern-Werkzeuge (`state/werkzeuge`),
 * keinen erfundenen Ladebalken, und öffnet bei Bedarf den ECHTEN
 * `WerkzeugSetup`-Dialog (importiert, nicht nachgebaut). Schritt 01/04
 * schreiben über die realen Commands `design.rolleSetzen`/
 * `design.projektNameSetzen` ins Doc — keine Attrappen-Felder.
 *
 * Verträge (E2E, unantastbar): `data-testid="onboarding"` auf der Wurzel,
 * `data-testid="onboarding-start"` auf dem Schluss-Knopf — setzt
 * `kosmo.onboarded='1'` und ruft `onAbschliessen(true)` (App.tsx navigiert
 * danach exakt wie vorher nach KosmoDesign). Der Skip-Knopf tut dasselbe mit
 * `onAbschliessen(false)` — bleibt in der Zentrale, wie das alte
 * «Ausblenden».
 */
export interface OnboardingWizardProps {
  /** Wizard fertig ODER übersprungen — Gate schliesst; `true` navigiert
   * zusätzlich nach KosmoDesign (identisch zum alten «Los geht's»-Knopf). */
  onAbschliessen: (zielDesign: boolean) => void;
  /** Öffnet das Kosmo-Panel (Zahnrad → Betriebsart/HomePC-Adresse) — Schritt
   * 02 verlinkt dorthin, statt die Umschaltung ein zweites Mal zu bauen. */
  onOeffneKosmoEinstellungen: () => void;
}

type PruefStatus = 'prueft' | 'da' | 'fehlt' | 'manuell' | 'konto';

const STATUS_TEXT: Record<PruefStatus, string> = {
  prueft: 'prüft …',
  da: 'läuft',
  fehlt: 'nicht erreichbar',
  manuell: 'selbst prüfen',
  konto: 'Schlüssel nötig',
};
const STATUS_FARBE: Record<PruefStatus, string> = {
  prueft: 'var(--k-ink-faint)',
  da: 'var(--k-success)',
  fehlt: 'var(--k-warning)',
  manuell: 'var(--k-ink-faint)',
  konto: 'var(--k-warning)',
};

/** Derselbe Live-Ping wie `WerkzeugSetup.erreichbar` — dort nicht exportiert,
 * darum hier als eigene, kleine Kopie (WerkzeugSetup.tsx bleibt unangetastet). */
async function pruefeErreichbar(url: string, pfad: string): Promise<boolean> {
  if (!url) return false;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1400);
    const res = await fetch(`${url.replace(/\/$/, '')}${pfad}`, { signal: ctl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function pruefeWerkzeug(
  art: Pruefung,
  cfg: { llmBaseUrl: string; bridgeUrl: string; syncHttp: string; hatSchluessel: boolean },
): Promise<PruefStatus> {
  if (art === 'manuell') return 'manuell';
  if (art === 'konto') return cfg.hatSchluessel ? 'da' : 'konto';
  if (art === 'ollama') return (await pruefeErreichbar(cfg.llmBaseUrl, '/api/tags')) ? 'da' : 'fehlt';
  if (art === 'bridge') return (await pruefeErreichbar(cfg.bridgeUrl, '/health')) ? 'da' : 'fehlt';
  return (await pruefeErreichbar(cfg.syncHttp, '/raeume')) ? 'da' : 'fehlt';
}

const ROLLEN: { wert: '' | 'entwurf' | 'ausfuehrung' | 'admin'; label: string }[] = [
  { wert: '', label: 'neutral' },
  { wert: 'entwurf', label: 'Entwurf' },
  { wert: 'ausfuehrung', label: 'Ausführung' },
  { wert: 'admin', label: 'Administration' },
];

const BETRIEBSART_LABEL: Record<Betriebsart, string> = {
  standard: 'Standard · HomePC',
  remote: 'Remote · VPN',
  cloud: 'Cloud · Claude',
};

export function OnboardingWizard({ onAbschliessen, onOeffneKosmoEinstellungen }: OnboardingWizardProps) {
  const [schritt, setSchritt] = useState(0);
  const [pruefLauf, setPruefLauf] = useState(0);
  const [bridgeErreichbar, setBridgeErreichbar] = useState<boolean | null>(null);
  const [zentraleHealth, setZentraleHealth] = useState<BridgeHealth | null>(null);
  const [manuelleBridgeUrl, setManuelleBridgeUrl] = useState('');
  // v0.9.2 Owner-Feedback 23.07.2026 («bridge adresse direkt scannen zum
  // richtigen server den wir festgesetzt haben»): Host des festgelegten
  // HomeServers, wenn der Schritt ihn automatisch übernommen hat — treibt
  // nur die ehrliche Hinweiszeile unten, nie einen erfundenen Status.
  const [autoGekoppeltHost, setAutoGekoppeltHost] = useState<string | null>(null);
  const [werkzeugStatus, setWerkzeugStatus] = useState<Record<string, PruefStatus>>({});
  const [werkzeugSetupOffen, setWerkzeugSetupOffen] = useState(false);

  // Revision abonnieren (wie App.tsx) — löst Re-Render bei jeder Doc-
  // Mutation aus, gelesen wird trotzdem frisch über getState() (kein
  // stiller Re-Render-Verlust bei fremden Mutationen zwischendurch).
  const revision = useProject((s) => s.revision);
  void revision;
  const doc = useProject.getState().doc;
  const rolle = doc.settings.rolle;
  const [projektName, setProjektName] = useState(() => doc.settings.projectName);

  const settings = loadSettings();
  const betriebsart = settings.betriebsart;
  const bridgeUrl = localStorage.getItem('kosmo.bridge') ?? STANDARD_BRIDGE_URL;
  const syncHttp = (localStorage.getItem('kosmo.sync.url') ?? STANDARD_SYNC_URL).replace(/^ws/, 'http');

  const aktuell = ONBOARDING_SCHRITTE[schritt]!;
  const istErster = schritt === 0;
  const istLetzter = schritt === ONBOARDING_SCHRITTE.length - 1;

  // Schritt 02 — Kosmo-Zentrale: live prüfen, sobald der Schritt aktiv wird
  // (oder «Erneut prüfen» gedrückt wurde). Cloud-Betriebsart braucht keine
  // eigene Zentrale — kein Ping, ehrlich als «nicht relevant» behandelt. Der
  // Ping liest jetzt auch die echte `/health`-Antwort (BridgeHealth) statt
  // nur `res.ok` — Grundlage für die ehrlichen Detailfelder unten.
  useEffect(() => {
    if (aktuell.id !== 'zentrale') return;
    if (betriebsart === 'cloud') {
      setBridgeErreichbar(null);
      setZentraleHealth(null);
      return;
    }
    let lebt = true;
    setBridgeErreichbar(null);
    setZentraleHealth(null);
    void (async () => {
      const erst = await pingeZentrale(bridgeUrl);
      if (!lebt) return;
      if (erst.ok) {
        setBridgeErreichbar(true);
        setZentraleHealth(erst.health);
        return;
      }
      // v0.9.2 Owner-Feedback 23.07.2026: die gespeicherte/Standard-Adresse
      // (auf frischen Geräten noch `localhost:8600` — die «alte» Adresse)
      // antwortet nicht → direkt den FESTGELEGTEN HomeServer scannen
      // (`homeServerHost()`, Default die Owner-Tailnet-Adresse aus
      // `state/home-server.ts`) und bei Antwort in EINEM Zug übernehmen —
      // derselbe `verbindeHomeServer`-Weg wie der Einstellungs-Knopf
      // (schreibt kosmo.bridge/sync/llm konsistent). Antwortet auch der
      // festgelegte Server nicht, bleibt ehrlich «nicht gefunden» samt
      // manuellem Feld — nichts wird stillschweigend umgestellt.
      const fest = homeServerEndpunkte();
      if (fest.bridgeUrl.replace(/\/$/, '') !== bridgeUrl.replace(/\/$/, '')) {
        const zweit = await pingeZentrale(fest.bridgeUrl);
        if (!lebt) return;
        if (zweit.ok) {
          await verbindeHomeServer(fest.host);
          if (!lebt) return;
          setAutoGekoppeltHost(fest.host);
          setBridgeErreichbar(true);
          setZentraleHealth(zweit.health);
          return;
        }
      }
      setBridgeErreichbar(false);
      setZentraleHealth(null);
    })();
    return () => {
      lebt = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktuell.id, betriebsart, bridgeUrl, pruefLauf]);

  // Manuelles Eingabefeld (nur im «nicht gefunden»-Zustand sichtbar) folgt
  // dem echten `bridgeUrl`-Wert, solange der Owner nicht selbst tippt — so
  // zeigt es nach einem Ping-Erfolg oder einer Änderung über das Kosmo-Panel
  // immer die aktuell gespeicherte Adresse.
  useEffect(() => {
    setManuelleBridgeUrl(bridgeUrl);
  }, [bridgeUrl]);

  const uebernehmeManuelleBridgeUrl = () => {
    const wert = manuelleBridgeUrl.trim();
    if (wert.length === 0) return;
    localStorage.setItem('kosmo.bridge', wert);
    setPruefLauf((n) => n + 1);
  };

  // Schritt 03 — Modelle & Core: die Kern-Werkzeuge der aktuellen
  // Betriebsart, real geprüft (derselbe Live-Ping wie oben, kein Fake-%).
  const pflichtWerkzeuge = werkzeugeFuer(betriebsart).filter((w) => w.pflicht);
  useEffect(() => {
    if (aktuell.id !== 'werkzeuge') return;
    setWerkzeugStatus(Object.fromEntries(pflichtWerkzeuge.map((w) => [w.id, 'prueft' as PruefStatus])));
    const cfg = {
      llmBaseUrl: settings.baseUrl,
      bridgeUrl,
      syncHttp,
      hatSchluessel: Boolean(settings.anthropicKey?.trim()),
    };
    for (const w of pflichtWerkzeuge) {
      void pruefeWerkzeug(w.pruefung, cfg).then((s) => setWerkzeugStatus((prev) => ({ ...prev, [w.id]: s })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktuell.id, betriebsart, pruefLauf]);

  const werkzeugeFertig = pflichtWerkzeuge.filter((w) => werkzeugStatus[w.id] === 'da').length;

  const commitProjektName = () => {
    const wert = projektName.trim();
    if (wert.length > 0 && wert !== doc.settings.projectName) {
      useProject.getState().runCommand('design.projektNameSetzen', { name: wert });
    }
  };

  const beenden = (zielDesign: boolean) => {
    if (zielDesign) commitProjektName();
    localStorage.setItem('kosmo.onboarded', '1');
    onAbschliessen(zielDesign);
  };

  const weiter = () => {
    if (istLetzter) {
      beenden(true);
      return;
    }
    setSchritt((s) => Math.min(ONBOARDING_SCHRITTE.length - 1, s + 1));
  };

  return (
    // Bewusst INLINE (nicht `position:fixed`) — der Wizard lebt im Home-Fluss
    // wie zuvor die «Erste Schritte»-Karte: ein Vollbild-Overlay würde die
    // Orbit-Kacheln überdecken und E2E-Specs brechen, die beim Erststart (ohne
    // gesetztes `kosmo.onboarded`) direkt eine Modul-Kachel klicken
    // (module.spec: KosmoPublish/KosmoPrepare). App.tsx spannt diesen Block
    // per `gridColumn: 1 / -1` über beide Home-Spalten, damit der 392-Stepper
    // + Hauptbereich der Soll-Vorlage trotzdem nebeneinander Platz haben.
    <div
      data-testid="onboarding"
      role="region"
      aria-label="KosmoOrbit einrichten"
      className="k-glass k-einblenden ow-root"
    >
      {/* Atmosphärischer Hintergrund (README §10: «atmosphärischer Kosmos-
          Hintergrund») — reine CSS-Gradienten aus Bord-Tokens, kein Asset. */}
      <div aria-hidden className="onboarding-tiefe" />
      <div aria-hidden className="onboarding-sternenfeld" />

      {/* LINKS — Stepper */}
      <aside className="ow-stepper-spalte">
        <div className="ow-marke-zeile">
          <OrbitMark module="orbit" size={30} />
          <div>
            <div className="ow-marke-titel">KosmoOrbit</div>
            <div className="ow-marke-sub">
              Einrichtung
            </div>
          </div>
        </div>
        <div className="ow-stepper-liste">
          {ONBOARDING_SCHRITTE.map((s, i) => {
            const fertig = i < schritt;
            const aktiv = i === schritt;
            return (
              <div key={s.id}>
                <button
                  type="button"
                  className="onboarding-stepper-zeile"
                  data-testid={`onboarding-schritt-${s.id}`}
                  aria-current={aktiv ? 'step' : undefined}
                  onClick={() => setSchritt(i)}
                >
                  <span
                    aria-hidden
                    className={`onboarding-stepper-badge${fertig ? ' onboarding-stepper-badge--fertig' : aktiv ? ' onboarding-stepper-badge--aktiv' : ''}`}
                    style={aktiv && !fertig ? { ['--_farbe' as string]: s.farbe, ['--_farbe-fill' as string]: s.farbeFill } : undefined}
                  >
                    {fertig ? <KIcon name="haken" size={14} /> : s.nummer}
                  </span>
                  <span className="ow-stepper-text">
                    <div
                      className={`onboarding-stepper-titel${aktiv ? ' onboarding-stepper-titel--aktiv' : fertig ? ' onboarding-stepper-titel--fertig' : ''}`}
                    >
                      {s.railTitel}
                    </div>
                    <div className="ow-stepper-untertitel">
                      {s.railUntertitel}
                    </div>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="ow-stepper-fuss">
          <span aria-hidden className="ow-icon-schloss">
            <KIcon name="schloss" size={14} />
          </span>
          <span className="ow-stepper-fuss-text">
            Alles läuft lokal auf deinem Core. Kein Upload, keine Cloud.
          </span>
        </div>
      </aside>

      {/* RECHTS — aktiver Schritt */}
      <main className="ow-hauptbereich">
        <div className="ow-skip-zeile">
          <KButton size="sm" tone="ghost" data-testid="onboarding-ueberspringen" onClick={() => beenden(false)}>
            Später einrichten
          </KButton>
        </div>
        <div className="ow-inhalt-scroll">
          <div className="ow-inhalt-mitte">
            <div
              key={aktuell.id}
              className="k-einblenden ow-schritt-label"
              style={{ ['--_farbe' as string]: aktuell.farbe }}
            >
              Schritt {aktuell.nummer} · von 04
            </div>
            <h1 className="ow-titel">{aktuell.titel}</h1>
            <p className="ow-beschreibung">
              {aktuell.beschreibung}
            </p>

            {/* Schritt-Inhalt */}
            <div
              className="k-glass ow-schritt-karte"
            >
              {aktuell.id === 'konto' && (
                <>
                  <label className="ow-feld-label">
                    Rolle
                    <KSelect
                      size="sm"
                      value={rolle ?? ''}
                      data-testid="onboarding-rolle"
                      onChange={(e) =>
                        useProject
                          .getState()
                          .runCommand('design.rolleSetzen', e.target.value ? { rolle: e.target.value } : {})
                      }
                      className="ow-feld-schmal"
                    >
                      {ROLLEN.map((r) => (
                        <option key={r.wert} value={r.wert}>
                          {r.label}
                        </option>
                      ))}
                    </KSelect>
                  </label>
                  <SchrittZeile label="Betriebsart" wert={BETRIEBSART_LABEL[betriebsart]} />
                  <SchrittZeile label="Region" wert="Schweiz · DACH" />
                  <SchrittZeile label="Sprache" wert="Deutsch" />
                </>
              )}

              {aktuell.id === 'zentrale' && (
                <>
                  <div className="ow-status-zeile">
                    <span data-testid="onboarding-zentrale-status">
                      <Badge hue={aktuell.farbe}>
                        {betriebsart === 'cloud'
                          ? 'Cloud-Betrieb'
                          : bridgeErreichbar === null
                            ? 'sucht …'
                            : bridgeErreichbar
                              ? 'Zentrale gefunden'
                              : 'nicht gefunden — manuell koppeln'}
                      </Badge>
                    </span>
                    <div className="ow-spacer" />
                    {betriebsart !== 'cloud' && (
                      <KButton size="sm" tone="ghost" data-testid="onboarding-zentrale-pruefen" onClick={() => setPruefLauf((n) => n + 1)}>
                        Erneut prüfen
                      </KButton>
                    )}
                  </div>
                  {betriebsart === 'cloud' ? (
                    <div className="ow-hinweis-text">
                      Cloud-Betrieb — keine eigene Zentrale nötig. Kosmo läuft über Claude (mind. Opus 4.8).
                    </div>
                  ) : (
                    <>
                      <SchrittZeile label="Bridge-Adresse" wert={bridgeUrl} mono />
                      <SchrittZeile label="Betriebsart" wert={BETRIEBSART_LABEL[betriebsart]} />
                      {betriebsart === 'remote' && <SchrittZeile label="HomePC-Adresse" wert={settings.remoteHost || '— nicht gesetzt —'} mono />}

                      {/* Gefunden — NUR echte Health-Felder, kein erfundener
                          Ladebalken/GPU-Wert. Fehlt ein Feld in der
                          Antwort, steht dort ehrlich «kommt mit deiner
                          Zentrale» statt einer Attrappe. */}
                      {bridgeErreichbar === true && (
                        <>
                          {autoGekoppeltHost && (
                            <div className="ow-hinweis-text" data-testid="onboarding-zentrale-autoscan">
                              Die gespeicherte Adresse antwortete nicht — dein festgelegter HomeServer{' '}
                              {autoGekoppeltHost} wurde direkt gefunden und übernommen.
                            </div>
                          )}
                          <SchrittZeile label="Version" wert={zentraleHealth?.version ?? 'kommt mit deiner Zentrale'} mono />
                          <SchrittZeile label="Dienste" wert={diensteZeile(zentraleHealth)} />
                          <SchrittZeile label="GPU" wert={gpuZeile(zentraleHealth)} />
                        </>
                      )}

                      {/* Nicht gefunden — ehrlicher Rückweg: manuelle
                          Adress-Eingabe UND der echte QR-Pairing-Code (P4
                          QR-Pairing wiederverwendet), falls ein Zweitgerät
                          schon Kontakt zur selben Zentrale hat. */}
                      {bridgeErreichbar === false && (
                        <>
                          <div className="ow-warn-text">
                            Keine Bridge auf {bridgeUrl} erreichbar. Richte sie über «Werkzeuge einrichten» ein, trag
                            eine andere Adresse ein oder koppel ein bereits verbundenes Gerät über den Code.
                          </div>
                          <label className="ow-feld-label">
                            Bridge-Adresse manuell
                            <span className="ow-feld-inline">
                              <KInput
                                size="sm"
                                value={manuelleBridgeUrl}
                                data-testid="onboarding-zentrale-bridge-url"
                                onChange={(e) => setManuelleBridgeUrl(e.target.value)}
                                onBlur={uebernehmeManuelleBridgeUrl}
                                onKeyDown={(e) => e.key === 'Enter' && uebernehmeManuelleBridgeUrl()}
                                className="ow-feld-schmal"
                              />
                              <KButton size="sm" tone="ghost" onClick={uebernehmeManuelleBridgeUrl}>
                                Übernehmen
                              </KButton>
                            </span>
                          </label>
                          <ZentralePairingCode />
                        </>
                      )}
                    </>
                  )}
                  <KButton size="sm" tone="ghost" data-testid="onboarding-kosmo-oeffnen" onClick={onOeffneKosmoEinstellungen}>
                    Kosmo-Panel öffnen …
                  </KButton>
                </>
              )}

              {aktuell.id === 'werkzeuge' && (
                <>
                  <div className="ow-reihe-gap10">
                    <div className="ow-text-soft-125">
                      {werkzeugeFertig} von {pflichtWerkzeuge.length} Kern-Werkzeugen laufen
                    </div>
                    <div className="ow-spacer" />
                    <KButton size="sm" tone="ghost" onClick={() => setPruefLauf((n) => n + 1)}>
                      Neu prüfen
                    </KButton>
                  </div>
                  <Fortschrittsbalken
                    data-testid="onboarding-werkzeuge-fortschritt"
                    anteil={pflichtWerkzeuge.length ? werkzeugeFertig / pflichtWerkzeuge.length : 0}
                    farbe={aktuell.farbe}
                  />
                  <div className="ow-werkzeug-liste">
                    {pflichtWerkzeuge.map((w) => (
                      <WerkzeugStatusZeile key={w.id} w={w} status={werkzeugStatus[w.id] ?? 'prueft'} />
                    ))}
                  </div>
                  <KButton size="sm" tone="ghost" data-testid="onboarding-werkzeuge-oeffnen" onClick={() => setWerkzeugSetupOffen(true)}>
                    Werkzeuge einrichten …
                  </KButton>
                </>
              )}

              {aktuell.id === 'projekt' && (
                <>
                  <label className="ow-feld-label">
                    Projektname
                    <KInput
                      size="sm"
                      value={projektName}
                      data-testid="onboarding-projektname"
                      onChange={(e) => setProjektName(e.target.value)}
                      onBlur={commitProjektName}
                      className="ow-feld-mittel"
                    />
                  </label>
                  <div className="ow-hinweis-klein">
                    Grundriss, Mengen und Visualisierung leiten sich automatisch aus dem Doc ab, sobald du zu
                    zeichnen beginnst — kein eigener «Zweig» nötig.
                  </div>
                </>
              )}

              <div className="ow-lock-zeile">
                <span aria-hidden className="ow-icon-schloss">
                  <KIcon name="schloss" size={14} />
                </span>
                <span className="ow-text-soft-125">{aktuell.hinweis}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER — Punkte + Zurück/Weiter */}
        <div className="onboarding-footer">
          <div className="onboarding-footer-punkte">
            {ONBOARDING_SCHRITTE.map((s, i) => (
              <span
                key={s.id}
                aria-hidden
                className={`onboarding-footer-punkt ${i <= schritt ? 'onboarding-footer-punkt--erreicht' : ''} ${i === schritt ? 'onboarding-footer-punkt--aktiv' : 'onboarding-footer-punkt--inaktiv'}`}
              />
            ))}
          </div>
          <span className="onboarding-footer-zaehler">
            {aktuell.nummer} / 04
          </span>
          <div className="ow-spacer" />
          <KButton
            size="sm"
            tone="ghost"
            data-testid="onboarding-zurueck"
            disabled={istErster}
            onClick={() => setSchritt((s) => Math.max(0, s - 1))}
            className="ow-btn-inhalt"
          >
            <KIcon name="pfeil-links" size={14} />
            Zurück
          </KButton>
          <KButton
            size="sm"
            tone="accent"
            data-testid={istLetzter ? 'onboarding-start' : 'onboarding-weiter'}
            onClick={weiter}
            className="ow-btn-inhalt"
          >
            {aktuell.cta}
            <KIcon name="pfeil-rechts" size={14} />
          </KButton>
        </div>
      </main>

      {werkzeugSetupOffen && (
        <WerkzeugSetup
          betriebsart={betriebsart}
          onClose={() => {
            setWerkzeugSetupOffen(false);
            setPruefLauf((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

function SchrittZeile({ label, wert, mono = false }: { label: string; wert: string; mono?: boolean }) {
  return (
    <div className="ow-kv-zeile">
      <span className="ow-kv-label">
        {label}
      </span>
      <span className={`ow-kv-wert${mono ? ' ow-kv-wert--mono' : ''}`}>
        {wert}
      </span>
    </div>
  );
}

/**
 * Echter QR-Pairing-Code für Schritt 02 — derselbe Weg wie das bestehende
 * «iPad koppeln» (`App.tsx`, P4 QR-Pairing): `qrSvg` aus `state/qr.ts`
 * kodiert dasselbe `#sync=…&raum=…`-Fragment, das `App.tsx` beim Laden
 * bereits auswertet und automatisch verbindet. Kein neuer Pairing-Weg,
 * nur an dieser Stelle sichtbar gemacht.
 */
function ZentralePairingCode() {
  const { svg, grund } = zentralePairingSvg();
  return (
    <div data-testid="onboarding-zentrale-qr" className="ow-qr-zeile">
      {svg ? (
        <div
          className="ow-qr-bild"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="ow-qr-fehler">{grund}</div>
      )}
      <span className="ow-qr-text">
        Läuft die Zentrale bereits auf einem anderen Gerät im selben Netz? Mit dessen Kamera scannen — KosmoOrbit
        öffnet sich dort und verbindet automatisch mit demselben Sync-Raum. Die Verbindung steckt im Link-Fragment,
        nie in Server-Logs.
      </span>
    </div>
  );
}

function WerkzeugStatusZeile({ w, status }: { w: Werkzeug; status: PruefStatus }) {
  return (
    <div
      data-testid={`onboarding-werkzeug-${w.id}`}
      className="ow-werkzeug-zeile"
    >
      <span className="ow-werkzeug-name">{w.name}</span>
      <span className="ow-werkzeug-status" style={{ ['--_farbe' as string]: STATUS_FARBE[status] }}>● {STATUS_TEXT[status]}</span>
    </div>
  );
}
