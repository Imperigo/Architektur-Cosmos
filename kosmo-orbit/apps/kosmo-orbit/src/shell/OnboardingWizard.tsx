import { useEffect, useState } from 'react';
import { Badge, Hairline, KButton, KIcon, KInput, KSelect, OrbitMark } from '@kosmo/ui';
import type { Betriebsart } from '@kosmo/ai';
import { useProject } from '../state/project-store';
import { werkzeugeFuer, type Pruefung, type Werkzeug } from '../state/werkzeuge';
import { loadSettings } from './KosmoPanel';
import { WerkzeugSetup } from './WerkzeugSetup';
import { ONBOARDING_SCHRITTE, type OnboardingSchrittId } from './onboarding-schritte';
import { Fortschrittsbalken } from './Fortschrittsbalken';
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
 * erreichbar ist (derselbe `/health`-Ping wie `WerkzeugSetup`). Schritt 03
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
  const bridgeUrl = localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600';
  const syncHttp = (localStorage.getItem('kosmo.sync.url') ?? 'ws://localhost:8700').replace(/^ws/, 'http');

  const aktuell = ONBOARDING_SCHRITTE[schritt]!;
  const istErster = schritt === 0;
  const istLetzter = schritt === ONBOARDING_SCHRITTE.length - 1;

  // Schritt 02 — Kosmo-Zentrale: live prüfen, sobald der Schritt aktiv wird
  // (oder «Erneut prüfen» gedrückt wurde). Cloud-Betriebsart braucht keine
  // eigene Zentrale — kein Ping, ehrlich als «nicht relevant» behandelt.
  useEffect(() => {
    if (aktuell.id !== 'zentrale') return;
    if (betriebsart === 'cloud') {
      setBridgeErreichbar(null);
      return;
    }
    let lebt = true;
    setBridgeErreichbar(null);
    void pruefeErreichbar(bridgeUrl, '/health').then((ok) => {
      if (lebt) setBridgeErreichbar(ok);
    });
    return () => {
      lebt = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktuell.id, betriebsart, bridgeUrl, pruefLauf]);

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
      className="k-glass k-einblenden"
      style={{
        position: 'relative',
        display: 'flex',
        minHeight: 460,
        overflow: 'hidden',
        color: 'var(--k-ink)',
      }}
    >
      {/* Atmosphärischer Hintergrund (README §10: «atmosphärischer Kosmos-
          Hintergrund») — reine CSS-Gradienten aus Bord-Tokens, kein Asset. */}
      <div aria-hidden className="onboarding-tiefe" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div
        aria-hidden
        className="onboarding-sternenfeld"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* LINKS — Stepper */}
      <aside
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'clamp(240px, 30%, 360px)',
          flex: 'none',
          borderRight: '1px solid var(--k-line)',
          background: 'color-mix(in srgb, var(--k-sunken, var(--k-field)) 60%, transparent)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '26px 26px 22px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--k-line)' }}>
          <OrbitMark module="orbit" size={30} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.06em' }}>KosmoOrbit</div>
            <div style={{ fontFamily: 'var(--k-font-mono, monospace)', fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--k-ink-faint)', marginTop: 2 }}>
              Einrichtung
            </div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '20px 26px', overflowY: 'auto' }}>
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
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      flex: 'none',
                      display: 'grid',
                      placeItems: 'center',
                      fontFamily: 'var(--k-font-mono, monospace)',
                      fontSize: 12,
                      fontWeight: 600,
                      background: fertig ? 'var(--k-accent)' : aktiv ? s.farbeFill : 'transparent',
                      border: `1.5px solid ${fertig ? 'var(--k-accent)' : aktiv ? s.farbe : 'var(--k-line-strong)'}`,
                      color: fertig ? 'var(--k-accent-ink)' : aktiv ? s.farbe : 'var(--k-ink-faint)',
                    }}
                  >
                    {fertig ? <KIcon name="haken" size={14} /> : s.nummer}
                  </span>
                  <span style={{ paddingTop: 3 }}>
                    <div
                      className="onboarding-stepper-titel"
                      style={{ fontWeight: 700, fontSize: 13.5, color: aktiv ? 'var(--k-ink)' : fertig ? 'var(--k-ink-soft)' : 'var(--k-ink-faint)' }}
                    >
                      {s.railTitel}
                    </div>
                    <div style={{ fontFamily: 'var(--k-font-mono, monospace)', fontSize: 10.5, letterSpacing: '0.04em', color: 'var(--k-ink-faint)', marginTop: 2 }}>
                      {s.railUntertitel}
                    </div>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '18px 26px', borderTop: '1px solid var(--k-line)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span aria-hidden style={{ color: 'var(--k-rolle-manuell)', display: 'inline-flex' }}>
            <KIcon name="schloss" size={14} />
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--k-ink-soft)', lineHeight: 1.4 }}>
            Alles läuft lokal auf deinem Core. Kein Upload, keine Cloud.
          </span>
        </div>
      </aside>

      {/* RECHTS — aktiver Schritt */}
      <main style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 28px 0' }}>
          <KButton size="sm" tone="ghost" data-testid="onboarding-ueberspringen" onClick={() => beenden(false)}>
            Später einrichten
          </KButton>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ maxWidth: 640, width: '100%', margin: '0 auto' }}>
            <div
              key={aktuell.id}
              className="k-einblenden"
              style={{ fontFamily: 'var(--k-font-mono, monospace)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: aktuell.farbe, marginBottom: 10 }}
            >
              Schritt {aktuell.nummer} · von 04
            </div>
            <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.12, letterSpacing: '-0.01em', color: 'var(--k-ink)' }}>{aktuell.titel}</h1>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--k-ink-soft)', margin: '12px 0 0', maxWidth: 560 }}>
              {aktuell.beschreibung}
            </p>

            {/* Schritt-Inhalt */}
            <div
              className="k-glass"
              style={{ marginTop: 26, padding: 20, display: 'grid', gap: 14 }}
            >
              {aktuell.id === 'konto' && (
                <>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--k-ink-soft)' }}>
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
                      style={{ maxWidth: 260 }}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Badge hue={aktuell.farbe}>
                      {betriebsart === 'cloud'
                        ? 'Cloud'
                        : bridgeErreichbar === null
                          ? 'prüft …'
                          : bridgeErreichbar
                            ? 'gefunden'
                            : 'nicht gefunden'}
                    </Badge>
                    <div style={{ flex: 1 }} />
                    {betriebsart !== 'cloud' && (
                      <KButton size="sm" tone="ghost" data-testid="onboarding-zentrale-pruefen" onClick={() => setPruefLauf((n) => n + 1)}>
                        Erneut prüfen
                      </KButton>
                    )}
                  </div>
                  {betriebsart === 'cloud' ? (
                    <div style={{ fontSize: 13, color: 'var(--k-ink-soft)', lineHeight: 1.55 }}>
                      Cloud-Betriebsart — keine eigene Zentrale nötig. Kosmo läuft über Claude (mind. Opus 4.8).
                    </div>
                  ) : (
                    <>
                      <SchrittZeile label="Bridge-Adresse" wert={bridgeUrl} mono />
                      <SchrittZeile label="Betriebsart" wert={BETRIEBSART_LABEL[betriebsart]} />
                      {betriebsart === 'remote' && <SchrittZeile label="HomePC-Adresse" wert={settings.remoteHost || '— nicht gesetzt —'} mono />}
                      {bridgeErreichbar === false && (
                        <div style={{ fontSize: 12.5, color: 'var(--k-warning)', lineHeight: 1.55 }}>
                          Keine Bridge auf {bridgeUrl} erreichbar. Richte sie über «Werkzeuge einrichten» ein oder
                          wähle im Kosmo-Panel eine andere Betriebsart/Adresse.
                        </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>
                      {werkzeugeFertig} von {pflichtWerkzeuge.length} Kern-Werkzeugen laufen
                    </div>
                    <div style={{ flex: 1 }} />
                    <KButton size="sm" tone="ghost" onClick={() => setPruefLauf((n) => n + 1)}>
                      Neu prüfen
                    </KButton>
                  </div>
                  <Fortschrittsbalken
                    data-testid="onboarding-werkzeuge-fortschritt"
                    anteil={pflichtWerkzeuge.length ? werkzeugeFertig / pflichtWerkzeuge.length : 0}
                    farbe={aktuell.farbe}
                  />
                  <div style={{ display: 'grid', gap: 2 }}>
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
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--k-ink-soft)' }}>
                    Projektname
                    <KInput
                      size="sm"
                      value={projektName}
                      data-testid="onboarding-projektname"
                      onChange={(e) => setProjektName(e.target.value)}
                      onBlur={commitProjektName}
                      style={{ maxWidth: 320 }}
                    />
                  </label>
                  <div style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', lineHeight: 1.55 }}>
                    Grundriss, Mengen und Visualisierung leiten sich automatisch aus dem Doc ab, sobald du zu
                    zeichnen beginnst — kein eigener «Zweig» nötig.
                  </div>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span aria-hidden style={{ color: 'var(--k-rolle-manuell)', display: 'inline-flex' }}>
                  <KIcon name="schloss" size={14} />
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>{aktuell.hinweis}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER — Punkte + Zurück/Weiter */}
        <div style={{ flex: 'none', borderTop: '1px solid var(--k-line)', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {ONBOARDING_SCHRITTE.map((s, i) => (
              <span
                key={s.id}
                aria-hidden
                style={{
                  width: i === schritt ? 24 : 7,
                  height: 7,
                  borderRadius: 999,
                  background: i <= schritt ? 'var(--k-accent)' : 'var(--k-line-strong)',
                  transition: 'width var(--k-motion-base, 200ms)',
                }}
              />
            ))}
          </div>
          <span style={{ fontFamily: 'var(--k-font-mono, monospace)', fontSize: 11, color: 'var(--k-ink-faint)' }}>
            {aktuell.nummer} / 04
          </span>
          <div style={{ flex: 1 }} />
          <KButton
            size="sm"
            tone="ghost"
            data-testid="onboarding-zurueck"
            disabled={istErster}
            onClick={() => setSchritt((s) => Math.max(0, s - 1))}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <KIcon name="pfeil-links" size={14} />
            Zurück
          </KButton>
          <KButton
            size="sm"
            tone="accent"
            data-testid={istLetzter ? 'onboarding-start' : 'onboarding-weiter'}
            onClick={weiter}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--k-line)' }}>
      <span style={{ fontFamily: 'var(--k-font-mono, monospace)', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--k-ink-faint)' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 12.5,
          color: 'var(--k-ink-soft)',
          fontFamily: mono ? 'var(--k-font-mono, monospace)' : undefined,
          textAlign: 'right',
          overflowWrap: 'anywhere',
        }}
      >
        {wert}
      </span>
    </div>
  );
}

function WerkzeugStatusZeile({ w, status }: { w: Werkzeug; status: PruefStatus }) {
  return (
    <div
      data-testid={`onboarding-werkzeug-${w.id}`}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}
    >
      <span style={{ fontSize: 12.5, color: 'var(--k-ink)', flex: 1, overflowWrap: 'anywhere' }}>{w.name}</span>
      <span style={{ fontSize: 11, color: STATUS_FARBE[status] }}>● {STATUS_TEXT[status]}</span>
    </div>
  );
}
