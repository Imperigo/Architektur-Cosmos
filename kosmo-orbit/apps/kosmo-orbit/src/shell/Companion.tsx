import { useEffect, useLayoutEffect, useState } from 'react';
import { siaPhaseLabel } from '@kosmo/kernel';
import { KButton, KFehlerzone, KMeldungen, melde, meldeFehler } from '@kosmo/ui';
import { sia112Gruppe } from '../state/orbit-rang';
import { useProject } from '../state/project-store';
import { initVault } from '../state/project-vault';
import { auftragErfassen, listeAuftraege, type Auftrag } from '../state/auftragsbuch';
import { useVisRuntime, type NodeLauf } from '../modules/vis/vis-runtime';
import { freigebenJob, mappeJobStatus } from '../modules/vis/vis-jobs';
import { STATION_GLYPHE, WerkzeugGlyphe, type WerkzeugGlyphenArt } from './werkzeug-glyphen';
import {
  STATUS_LABEL,
  STATUS_TON,
  companionKarten,
  phasenSegmente,
  type CompanionKarte,
  type CompanionKartenTon,
} from './companion-daten';

/**
 * V0.7.2 W4-G (Paket-Ergänzung «Companion minimal», Spec §10) — die schmale
 * PWA-Ansicht unter `#companion`. `main.tsx` rendert diese Komponente
 * ANSTELLE von `<App/>`, sobald der Hash mit `#companion` beginnt (Spec §12,
 * die von W1-A vorbereitete No-op-Weiche) — es gibt darum WÄHREND dieser
 * Ansicht keinen `<App/>`-Baum, kein `window.__kosmo`-Fenster-Hook, keinen
 * Router zwischen den beiden. Companion liest darum jede Quelle SELBST:
 *
 *  - Phasen-Ring: `state/project-store.ts`s `doc.settings.siaPhase` (dieselbe
 *    Quelle wie `PhasenLeiste.tsx`) → `sia112Gruppe()` (`state/orbit-rang.ts`,
 *    KEINE Zweitimplementierung).
 *  - Job-/Freigabe-Karten: `state/auftragsbuch.ts` (KosmoDev, IndexedDB) +
 *    `modules/vis/vis-runtime.ts` (Render-Läufe, In-Memory je Sitzung) über
 *    die reine Ableitung `shell/companion-daten.ts`.
 *  - Freigabe: dieselbe Bridge-Route wie `NodeCanvas.tsx`
 *    (`vis-jobs.ts#freigebenJob`, braucht `jobId` + `approvalToken` aus dem
 *    Lauf) — keine zweite Freigabe-Implementierung.
 *
 * Ehrlichkeitsgrenze (Spec §10 wörtlich, «Lese-/Freigabe-Companion, KEIN
 * Zeichnen»): `vis-runtime.ts`s Läufe leben BEWUSST nur im Speicher DIESER
 * Sitzung (CLAUDE.md «Laufzeit ≠ Modell») — ein frisch geladener Companion
 * (eigener Tab/eigenes Gerät) sieht darum in der Praxis meist KEINE
 * Vis-Freigabe-Karte, auch wenn auf einem anderen Bildschirm gerade ein
 * Render wartet. Das ist kein Bug dieser Ansicht, sondern die dokumentierte
 * Grenze der bestehenden Architektur — die Ansicht zeigt dafür ehrlich den
 * Leerzustand «Keine laufenden Aufträge» statt einen erfundenen Platzhalter.
 *
 * «Zurück in die Voll-App» (4er-Kreis-Dock): OHNE Zugriff auf `App.tsx`
 * (fremder Dateibesitz, Spec §12) kann diese Ansicht keinen Ziel-Screen
 * direkt öffnen (kein Router/keine Hash-Konvention dafür existiert) — die
 * vier Kreise sind darum wörtlich das, was Spec §10 als Alternative nennt:
 * «Hash räumen + Modul öffnen BZW. `location`-Wechsel». Jeder Kreis räumt den
 * `#companion`-Hash und lädt neu; die Voll-App startet dann an der Zentrale,
 * von wo aus die vier Stationen einen Klick entfernt sind.
 */

/** Ton → konkrete Token-Farbe des Status-Punkts (Spec §0 Grundregel 3: Farbe
 *  nur mit Bedeutung — hier die Bedeutung «läuft/ruht/fertig/Fehler», nicht
 *  die Rollenfarbe der Quelle). */
const TON_FARBE: Record<CompanionKartenTon, string> = {
  ruhe: 'var(--k-ink-faint)',
  laeuft: 'var(--k-signal)',
  erfolg: 'var(--k-success)',
  fehler: 'var(--k-danger)',
};

interface DockEintrag {
  id: 'design' | 'data' | 'kosmo' | 'office';
  label: string;
  art: WerkzeugGlyphenArt;
  rolle: string;
}

/** Die 4 Hauptwerkzeuge (`orbit-icons.tsx`s `IconHaupt*`-Zuordnung, Spec §3
 *  «Station→Glyphe→Rolle») — dieselbe Glyphe/Rollenfarbe, hier direkt aus
 *  `werkzeug-glyphen.tsx` gebaut (Spec §10 Dateibesitz: «Glyphen aus
 *  shell/werkzeug-glyphen.tsx»), keine neue Zuordnungstabelle. */
const DOCK: readonly DockEintrag[] = [
  { id: 'design', label: 'DESIGN', art: 'draw', rolle: STATION_GLYPHE.design.rolle },
  { id: 'data', label: 'DATA', art: 'data', rolle: STATION_GLYPHE.data.rolle },
  { id: 'kosmo', label: 'KOSMO', art: 'chat', rolle: STATION_GLYPHE.speak.rolle },
  { id: 'office', label: 'OFFICE', art: 'office', rolle: '--k-rolle-office' },
];

/** Hash räumen + echten Reload — der einzige Weg zurück in `<App/>` ohne
 *  `App.tsx` anzufassen (s. Kopfkommentar). Ein blosses `location.hash = ''`
 *  wäre eine reine Fragment-Navigation (kein Reload, `main.tsx` prüft den
 *  Hash nur EINMAL beim Laden) — darum explizit `history.replaceState` +
 *  `location.reload()`, dasselbe Muster wie das bestehende QR-Pairing
 *  (`App.tsx`, Hash-Aufräumen nach `#sync=…`). */
function zurueckZurVollApp(): void {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  window.location.reload();
}

/** Phasen-Ring (Spec §10 «Kreisprogress n/5 aus `sia112Gruppe()`») — 5
 *  Ring-Segmente über `pathLength` (normiert die Dash-Rechnung unabhängig
 *  vom tatsächlichen Kreisumfang), die ersten `gruppe` davon Signal-Teal,
 *  der Rest ruhige Linienfarbe. Statisch (keine Animation) — automatisch
 *  reduced-motion-konform, ohne eigene `matchMedia`-Prüfung nötig. */
function Phasenring({ gruppe, titel }: { gruppe: 1 | 2 | 3 | 4 | 5; titel: string }) {
  const segmente = phasenSegmente(gruppe);
  const SEGMENT_LAENGE = 100 / segmente.length;
  const LUECKE = 3;
  return (
    <div
      data-testid="companion-phasenring"
      role="img"
      aria-label={`Phase ${gruppe} von 5 — ${titel}`}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
    >
      <svg width={84} height={84} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
        <g transform="rotate(-90 24 24)">
          {segmente.map((gefuellt, i) => (
            <circle
              key={i}
              cx={24}
              cy={24}
              r={20}
              pathLength={100}
              fill="none"
              stroke={gefuellt ? 'var(--k-signal)' : 'var(--k-line-strong)'}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={`${SEGMENT_LAENGE - LUECKE} ${100 - (SEGMENT_LAENGE - LUECKE)}`}
              strokeDashoffset={-(i * SEGMENT_LAENGE)}
            />
          ))}
        </g>
        <text
          x={24}
          y={28}
          textAnchor="middle"
          fontFamily="var(--k-font-mono)"
          fontSize={13}
          fontWeight={700}
          fill="var(--k-ink)"
        >
          {gruppe}/5
        </text>
      </svg>
      <div
        style={{
          fontFamily: 'var(--k-font-mono)',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--k-ink-soft)',
          textAlign: 'center',
        }}
      >
        {titel}
      </div>
    </div>
  );
}

function JobKarte({
  karte,
  freigabeLaeuft,
  onFreigeben,
}: {
  karte: CompanionKarte;
  freigabeLaeuft: boolean;
  onFreigeben: (karte: CompanionKarte) => void;
}) {
  return (
    <div
      data-testid={`companion-job-${karte.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 'var(--k-radius-md)',
        background: 'var(--k-surface)',
        border: '1px solid var(--k-line)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          flex: '0 0 auto',
          borderRadius: 'var(--k-radius-pill)',
          background: TON_FARBE[STATUS_TON[karte.status]],
        }}
      />
      <div style={{ display: 'grid', gap: 2, minWidth: 0, flex: '1 1 auto' }}>
        <div
          style={{
            fontFamily: 'var(--k-font-mono)',
            fontSize: 12,
            letterSpacing: '0.02em',
            color: 'var(--k-ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={karte.titel}
        >
          {karte.titel}
        </div>
        <div
          style={{
            fontFamily: 'var(--k-font-mono)',
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: `var(${karte.rolle})`,
          }}
        >
          {STATUS_LABEL[karte.status]}
        </div>
      </div>
      {karte.brauchtFreigabe && (
        <KButton
          size="sm"
          tone="accent"
          data-testid={`companion-job-${karte.id}-freigeben`}
          disabled={freigabeLaeuft}
          onClick={() => onFreigeben(karte)}
        >
          {freigabeLaeuft ? 'FREIGEBE …' : 'FREIGEBEN'}
        </KButton>
      )}
    </div>
  );
}

export function Companion() {
  // Spec-Vertrag «e2e/splash.spec.ts» (§2): `#splash` lebt inline in
  // index.html VOR #root und wird synchron im allerersten Mount-Effect
  // entfernt — `<App/>` macht das bereits (App.tsx), aber Companion ERSETZT
  // `<App/>` komplett (main.tsx-Weiche), darum dasselbe Muster hier noch
  // einmal, sonst bliebe der Splash bei `#companion` für immer stehen.
  useLayoutEffect(() => {
    document.getElementById('splash')?.remove();
  }, []);

  // Thema (Spec §1): dieselbe gespeicherte Wahl wie die Voll-App respektieren
  // (Default 'orbit') — Companion SCHREIBT die Wahl nicht (reine Ansicht),
  // sie liest nur, was App.tsx zuletzt gespeichert hat. v0.7.3 D7: Tinte
  // («ink») wurde entfernt — falls Companion (eigener Einstiegspunkt,
  // `main.tsx`-Weiche) als ALLERERSTES in einer Session mountet, bevor
  // App.tsx je die Migration ink→orbit ausführen konnte, fängt dieselbe
  // Migration hier defensiv denselben Altwert ab (nur lesend für sich
  // selbst — kein Widerspruch zu «Companion schreibt die Wahl nicht»,
  // dieser Fallback verändert `localStorage` nicht, nur den lokal
  // angewandten Wert).
  useLayoutEffect(() => {
    const gespeichert = localStorage.getItem('kosmo.thema');
    document.documentElement.dataset.theme = gespeichert === 'ink' ? 'orbit' : (gespeichert ?? 'orbit');
  }, []);

  const revision = useProject((s) => s.revision);
  const [projektBereit, setProjektBereit] = useState(false);
  useEffect(() => {
    let lebendig = true;
    void initVault().then(() => {
      if (lebendig) setProjektBereit(true);
    });
    return () => {
      lebendig = false;
    };
  }, []);
  void revision;
  const siaPhase = useProject.getState().doc.settings.siaPhase;
  const gruppe = sia112Gruppe(siaPhase);

  const [auftraege, setAuftraege] = useState<Auftrag[]>([]);
  useEffect(() => {
    let lebendig = true;
    const laden = () => {
      void listeAuftraege().then((liste) => {
        if (lebendig) setAuftraege(liste);
      });
    };
    laden();
    // Leichtes Polling (Muster `DevWorkspace.tsx`) — das Auftragsbuch kann
    // sich ausserhalb dieser Ansicht ändern (App im selben Browser).
    const intervall = setInterval(laden, 4000);
    return () => {
      lebendig = false;
      clearInterval(intervall);
    };
  }, []);

  const laeufe = useVisRuntime((s) => s.laeufe);
  const karten = companionKarten(auftraege, laeufe);

  const [freigabeLaeuft, setFreigabeLaeuft] = useState<string | null>(null);
  const freigeben = (karte: CompanionKarte) => {
    if (!karte.nodeId || !karte.jobId || !karte.approvalToken) return;
    setFreigabeLaeuft(karte.nodeId);
    void freigebenJob(karte.jobId, karte.approvalToken)
      .then((j) => {
        useVisRuntime.getState().patchLauf(karte.nodeId!, { status: mappeJobStatus(j) });
        melde('Render freigegeben.', { ton: 'erfolg' });
      })
      .catch((err) => meldeFehler(err))
      .finally(() => setFreigabeLaeuft(null));
  };

  return (
    <KFehlerzone bereich="Companion">
      <div
        data-testid="companion"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          padding: '28px 20px 96px',
          background: 'var(--k-field)',
          color: 'var(--k-ink)',
          fontFamily: 'var(--k-font-ui)',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <header
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--k-font-mono)',
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--k-ink-faint)',
            }}
          >
            KosmoOrbit · Companion
          </div>
        </header>

        <Phasenring gruppe={gruppe} titel={projektBereit ? siaPhaseLabel(siaPhase) : 'lädt …'} />

        <section style={{ display: 'grid', gap: 10 }}>
          <div
            style={{
              fontFamily: 'var(--k-font-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--k-ink-faint)',
            }}
          >
            Aufträge &amp; Freigaben
          </div>
          {karten.length === 0 ? (
            <div
              data-testid="companion-leer"
              style={{
                fontFamily: 'var(--k-font-mono)',
                fontSize: 12,
                letterSpacing: '0.04em',
                color: 'var(--k-ink-faint)',
                padding: '18px 4px',
                textAlign: 'center',
              }}
            >
              Keine laufenden Aufträge.
            </div>
          ) : (
            karten.map((karte) => (
              <JobKarte
                key={karte.id}
                karte={karte}
                freigabeLaeuft={freigabeLaeuft === karte.nodeId}
                onFreigeben={freigeben}
              />
            ))
          )}
        </section>

        <nav
          data-testid="companion-dock"
          aria-label="Zurück zur Voll-App"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 18,
            padding: '14px 12px calc(14px + env(safe-area-inset-bottom, 0px))',
            background: 'var(--k-raised)',
            borderTop: '1px solid var(--k-line)',
          }}
        >
          {DOCK.map((eintrag) => (
            <button
              key={eintrag.id}
              type="button"
              data-testid={`companion-dock-${eintrag.id}`}
              aria-label={`Zurück zur Voll-App — ${eintrag.label}`}
              title={eintrag.label}
              onClick={zurueckZurVollApp}
              className="k-druck"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'inherit',
                font: 'inherit',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--k-radius-pill)',
                  background: 'var(--k-surface)',
                  border: '1px solid var(--k-line-strong)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <WerkzeugGlyphe art={eintrag.art} size={22} rolle={eintrag.rolle} />
              </span>
              <span
                style={{
                  fontFamily: 'var(--k-font-mono)',
                  fontSize: 9.5,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--k-ink-faint)',
                }}
              >
                {eintrag.label}
              </span>
            </button>
          ))}
        </nav>

        <KMeldungen />
      </div>
    </KFehlerzone>
  );
}

/**
 * Test-Hook (Playwright) — Muster wie `window.__kosmoStatus`
 * (`state/kosmo-status.ts`)/`window.__kosmoBlick` (`shell/KosmoPanel.tsx`):
 * rein lesend/schreibend, ruft NUR bestehende, echte Store-Funktionen auf
 * (`auftragErfassen`, `useVisRuntime`s `setzeLauf`) — kein zweiter,
 * fiktiver Datenpfad. `e2e/companion.spec.ts` seedet darüber gezielt einen
 * Auftrag bzw. einen Vis-Lauf, ohne die volle App-UI durchklicken zu müssen
 * (Companion rendert ja gerade ANSTELLE von `<App/>`, s. Kopfkommentar).
 */
if (typeof window !== 'undefined') {
  (window as never as Record<string, unknown>)['__kosmoCompanion'] = {
    erfasseAuftrag: (text: string) => auftragErfassen(text, 'getippt'),
    setzeVisLauf: (nodeId: string, lauf: NodeLauf) => useVisRuntime.getState().setzeLauf(nodeId, lauf),
  };
}
