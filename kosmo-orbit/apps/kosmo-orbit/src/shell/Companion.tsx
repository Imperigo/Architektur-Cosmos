import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { siaPhaseLabel } from '@kosmo/kernel';
import { Hairline, KFehlerzone, KMeldungen, melde, meldeFehler } from '@kosmo/ui';
import { sia112Gruppe } from '../state/orbit-rang';
import { useProject } from '../state/project-store';
import { initVault } from '../state/project-vault';
import { auftragErfassen, listeAuftraege, type Auftrag } from '../state/auftragsbuch';
import { useVisRuntime, type NodeLauf } from '../modules/vis/vis-runtime';
import { abbrechenJob, freigebenJob, mappeJobStatus } from '../modules/vis/vis-jobs';
import { STATION_GLYPHE, WerkzeugGlyphe, type WerkzeugGlyphenArt } from './werkzeug-glyphen';
import { KosmoOrb } from './KosmoOrb';
import { useKosmoStatus } from '../state/kosmo-status';
import { GovernanceGate } from './GovernanceGate';
import { alleFuerJobErlaubt, erlaubeFuerJob, widerrufeFuerJob } from './governance-speicher';
import {
  ALLE_ZUSTAENDE,
  STATUS_LABEL,
  STATUS_TON,
  VIS_ROLLE,
  ZUSTAND_INFO,
  companionKarten,
  phasenSegmente,
  type CompanionKarte,
  type CompanionKartenTon,
} from './companion-daten';

/**
 * V0.7.2 W4-G (Paket-Ergänzung «Companion minimal», Spec §10) — die
 * PWA-Ansicht unter `#companion`. `main.tsx` rendert diese Komponente
 * ANSTELLE von `<App/>`, sobald der Hash mit `#companion` beginnt (Spec §12,
 * die von W1-A vorbereitete No-op-Weiche) — es gibt darum WÄHREND dieser
 * Ansicht keinen `<App/>`-Baum, kein `window.__kosmo`-Fenster-Hook, keinen
 * Router zwischen den beiden. Companion liest darum jede Quelle SELBST.
 *
 * v0.7.6 Welle 2 (ClaudeDesign-Soll §8.1+§10, «Companion — orb-zentrierter
 * Begleiter»): dieselbe Ehrlichkeitsgrenze wie bisher, jetzt als Vollflächen-
 * Shell (Header/Body/Statusbar) mit dem ECHTEN 9-Zustands-Orb
 * (`state/kosmo-status.ts` + `shell/KosmoOrb.tsx`, bereits gebaut — hier NUR
 * komponiert, kein zweiter Automat) im Zentrum der linken Spalte. Companion
 * treibt WEITERHIN keine `ChatSession` (kein `<App/>`-Zugriff, s.o.) — die
 * «Zwei Stimmen» und die Zustands-Legende sind darum bewusst STATISCHE
 * Erklärungen des echten Systems (verdrahtet in `KosmoPanel.tsx`), keine
 * live nachgespielte Konversation. Was Companion WIRKLICH live zeigt, bleibt
 * exakt das, was es schon vorher zeigte: die zwei echten Laufzeit-Quellen
 * `state/auftragsbuch.ts` + `modules/vis/vis-runtime.ts` (Ableitung
 * `shell/companion-daten.ts`) — jetzt als «Agenten & Aufträge»-Spalte, mit
 * dem neuen `GovernanceGate` (`shell/GovernanceGate.tsx`) für jede Karte,
 * die wirklich eine Freigabe braucht:
 *  - «Einmal erlauben»      → derselbe `freigebenJob`-Weg wie bisher.
 *  - «Für den Job erlauben» → echtes Auto-Freigeben für DIESEN Render-Knoten
 *    (`nodeId`), bis Widerruf — ein Knoten kann mehrere Render-Läufe
 *    nacheinander bekommen (`vis-runtime.ts`), «für den Job» heisst hier
 *    ehrlich «für alle künftigen Freigaben dieses Knotens». v0.7.7 Stream B1:
 *    persistent über `shell/governance-speicher.ts` (localStorage-
 *    Allowlist) — überlebt einen Reload, endet nur über den «… ·
 *    widerrufen»-Knopf des Gate.
 *  - «Nachfragen»           → Status quo, keine Wirkung.
 *  - «Ablehnen»              → `abbrechenJob` (dieselbe reale Bridge-Route
 *    wie der bestehende Abbrechen-Weg in `NodeCanvas.tsx`) statt eines
 *    stummen No-ops.
 * Auftragsbuch-Karten (`brauchtFreigabe: false`, s. `companion-daten.ts`)
 * bekommen KEIN Gate — sie sind ehrlich nie freigabebedürftig.
 *
 * «Zurück in die Voll-App» (4er-Kreis-Dock): OHNE Zugriff auf `App.tsx`
 * (fremder Dateibesitz, Spec §12) kann diese Ansicht keinen Ziel-Screen
 * direkt öffnen — die vier Kreise räumen den `#companion`-Hash und laden neu;
 * die Voll-App startet dann an der Zentrale. Sie sitzen jetzt im Header statt
 * als schwebender Boden-Dock (Soll-Bild-Shell-Grammatik: Header/Body/
 * Statusbar), DOM-Vertrag (`companion-dock`/`companion-dock-{id}`) bleibt
 * exakt gleich.
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

const MONO_FAINT: CSSProperties = {
  fontFamily: 'var(--k-font-mono)',
  fontSize: 11,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--k-ink-faint)',
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

/** Eine Zeile der «Agenten & Aufträge»-Spalte — reine Anzeige (Icon/Titel/
 *  Status), plus das abgestufte `GovernanceGate` GENAU für Karten, die
 *  `brauchtFreigabe` tragen (Ehrlichkeitsregel `companion-daten.ts`: nur
 *  Vis-Läufe mit echtem `jobId`/`approvalToken` sind das je). */
function KarteZeile({
  karte,
  freigabeLaeuft,
  ablehnenLaeuft,
  autoFreigabeAktiv,
  onFreigeben,
  onFuerJob,
  onAblehnen,
}: {
  karte: CompanionKarte;
  freigabeLaeuft: boolean;
  ablehnenLaeuft: boolean;
  autoFreigabeAktiv: boolean;
  onFreigeben: (karte: CompanionKarte) => void;
  onFuerJob: (karte: CompanionKarte) => void;
  onAblehnen: (karte: CompanionKarte) => void;
}) {
  const art: WerkzeugGlyphenArt = karte.rolle === VIS_ROLLE ? 'viz' : 'pipeline';
  return (
    <div
      data-testid={`companion-job-${karte.id}`}
      className="k-glass"
      style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span
          aria-hidden="true"
          style={{
            width: 34,
            height: 34,
            flex: '0 0 auto',
            borderRadius: 'var(--k-radius-md)',
            background: 'var(--k-surface)',
            border: '1px solid var(--k-line)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <WerkzeugGlyphe art={art} size={19} rolle={karte.rolle} />
        </span>
        <div style={{ display: 'grid', gap: 2, minWidth: 0, flex: '1 1 auto' }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
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
              letterSpacing: '0.06em',
              color: `var(${karte.rolle})`,
            }}
          >
            {STATUS_LABEL[karte.status]}
          </div>
        </div>
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
      </div>

      {karte.brauchtFreigabe && (
        <GovernanceGate
          testid={`companion-governance-${karte.id}`}
          titel="Render freigeben?"
          unterzeile={karte.titel}
          onEinmal={() => onFreigeben(karte)}
          einmalTestid={`companion-job-${karte.id}-freigeben`}
          einmalLaeuft={freigabeLaeuft}
          onFuerJob={() => onFuerJob(karte)}
          fuerJobAktiv={autoFreigabeAktiv}
          fuerJobTestid={`companion-job-${karte.id}-fuer-job`}
          onAblehnen={() => onAblehnen(karte)}
          ablehnenTestid={`companion-job-${karte.id}-ablehnen`}
          ablehnenLaeuft={ablehnenLaeuft}
          onNachfragen={() => melde('Bleibt offen — wartet auf deine Entscheidung.')}
        />
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
  // sie liest nur, was App.tsx zuletzt gespeichert hat.
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

  const [freigabeLaeuft, setFreigabeLaeuft] = useState<ReadonlySet<string>>(new Set());
  const [ablehnenLaeuft, setAblehnenLaeuft] = useState<ReadonlySet<string>>(new Set());
  /**
   * v0.7.6 Welle 2 («Für den Job erlauben») — Knoten, deren KÜNFTIGE
   * Freigaben automatisch laufen, bis Widerruf. v0.7.7 Stream B1: PERSISTENT
   * über `shell/governance-speicher.ts` (localStorage-Allowlist, Art
   * `'vis'`) — überlebt einen Reload, endet nur über den bestehenden
   * «… · widerrufen»-Knopf des Gate (dort `widerrufeFuerJob`, s. Ehrlichkeits-
   * Kommentar in `governance-speicher.ts`: kein nodeId hat ein zuverlässiges
   * «Job fertig»-Ereignis, ein Knoten bekommt gewollt mehrere Läufe
   * nacheinander freigegeben — also kein Auto-Verfall). `autoFreigabeNodes`
   * bleibt ein reaktiver UI-Spiegel des Speichers, einmal beim Mount
   * eingelesen (Effekt unten), danach bei jedem Erlauben/Widerrufen synchron
   * mitgeschrieben.
   */
  const [autoFreigabeNodes, setAutoFreigabeNodes] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    // Persistenten Stand einmalig beim Mount einlesen — der Speicher
    // (localStorage) ist die Quelle der Wahrheit, s. `governance-speicher.ts`.
    setAutoFreigabeNodes(new Set(alleFuerJobErlaubt('vis')));
  }, []);

  const freigeben = (karte: CompanionKarte) => {
    if (!karte.nodeId || !karte.jobId || !karte.approvalToken) return;
    if (freigabeLaeuft.has(karte.nodeId)) return;
    const nodeId = karte.nodeId;
    setFreigabeLaeuft((s) => new Set(s).add(nodeId));
    void freigebenJob(karte.jobId, karte.approvalToken)
      .then((j) => {
        useVisRuntime.getState().patchLauf(nodeId, { status: mappeJobStatus(j) });
        melde('Render freigegeben.', { ton: 'erfolg' });
      })
      .catch((err) => meldeFehler(err))
      .finally(() =>
        setFreigabeLaeuft((s) => {
          const neu = new Set(s);
          neu.delete(nodeId);
          return neu;
        }),
      );
  };

  const ablehnen = (karte: CompanionKarte) => {
    if (!karte.nodeId || !karte.jobId) return;
    if (ablehnenLaeuft.has(karte.nodeId)) return;
    const nodeId = karte.nodeId;
    setAblehnenLaeuft((s) => new Set(s).add(nodeId));
    void abbrechenJob(karte.jobId)
      .then((j) => {
        useVisRuntime.getState().patchLauf(nodeId, { status: mappeJobStatus(j) });
        melde('Render abgelehnt.', { ton: 'info' });
      })
      .catch((err) => meldeFehler(err))
      .finally(() =>
        setAblehnenLaeuft((s) => {
          const neu = new Set(s);
          neu.delete(nodeId);
          return neu;
        }),
      );
  };

  const toggleAutoFreigabe = (nodeId: string) => {
    setAutoFreigabeNodes((s) => {
      const neu = new Set(s);
      if (neu.has(nodeId)) {
        neu.delete(nodeId);
        widerrufeFuerJob('vis', nodeId);
      } else {
        neu.add(nodeId);
        erlaubeFuerJob('vis', nodeId);
      }
      return neu;
    });
  };

  // «Für den Job erlauben»: wirkt SOFORT auf die aktuell offene Karte UND auf
  // jede künftige Karte desselben Knotens — beide Fälle laufen über denselben
  // `freigeben()`-Weg, ausgelöst durch diesen EINEN Effekt, sobald sich die
  // echten Laufzeit-Daten ODER die Auto-Freigabe-Liste ändern.
  useEffect(() => {
    for (const karte of karten) {
      if (karte.brauchtFreigabe && karte.nodeId && autoFreigabeNodes.has(karte.nodeId)) {
        freigeben(karte);
      }
    }
    // `freigeben` bewusst nicht in den Deps: seine Identität wechselt bei
    // jedem Render, sein Verhalten liest `jobId`/`approvalToken` ohnehin
    // frisch aus der jeweiligen `karte` — der Effekt soll nur laufen, wenn
    // sich `laeufe` (echte Vis-Runtime-Daten) oder die Auto-Freigabe-Liste
    // tatsächlich ändern, nicht bei jedem Re-Render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laeufe, autoFreigabeNodes]);

  const zustand = useKosmoStatus((s) => s.zustand);
  const zustandInfo = ZUSTAND_INFO[zustand];

  return (
    <KFehlerzone bereich="Companion">
      <div
        data-testid="companion"
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--k-field)',
          color: 'var(--k-ink)',
          fontFamily: 'var(--k-font-ui)',
        }}
      >
        {/* HEADER */}
        <header
          style={{
            height: 56,
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '0 20px',
            borderBottom: '1px solid var(--k-line)',
            background: 'var(--k-surface)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--k-font-mono)',
              fontWeight: 700,
              letterSpacing: '0.18em',
              fontSize: 13,
              color: 'var(--k-ink)',
            }}
          >
            KOSMOORBIT
          </span>
          <span style={{ width: 1, height: 20, background: 'var(--k-line-strong)' }} />
          <span style={MONO_FAINT}>Companion</span>
          <div style={{ flex: 1 }} />
          <nav data-testid="companion-dock" aria-label="Zurück zur Voll-App" style={{ display: 'flex', gap: 8 }}>
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
                  gap: 2,
                  background: 'var(--k-raised)',
                  border: '1px solid var(--k-line-strong)',
                  borderRadius: 'var(--k-radius-md)',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: 'inherit',
                  font: 'inherit',
                }}
              >
                <WerkzeugGlyphe art={eintrag.art} size={18} rolle={eintrag.rolle} />
                <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 8, letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
                  {eintrag.label}
                </span>
              </button>
            ))}
          </nav>
        </header>

        {/* BODY */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {/* LEFT — ORB & KONTEXT */}
          <aside
            style={{
              width: 340,
              flex: '0 0 auto',
              borderRight: '1px solid var(--k-line)',
              background: 'var(--k-surface)',
              overflowY: 'auto',
              padding: '26px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <KosmoOrb zustand={zustand} size={168} />
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: 'var(--k-font-mono)',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: `var(${zustandInfo.farbe})`,
                  }}
                >
                  {zustandInfo.label}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--k-ink-soft)',
                    marginTop: 6,
                    lineHeight: 1.4,
                    maxWidth: 250,
                  }}
                >
                  {zustandInfo.caption}
                </div>
              </div>
              {/* Zustands-Legende — RUHIG, kein Wähler (Kopfkommentar: Companion
                  treibt keine ChatSession, ein Klick könnte den echten Zustand
                  nicht ehrlich auslösen). */}
              <div
                data-testid="companion-zustaende"
                role="status"
                aria-label={`Kosmo-Zustand: ${zustandInfo.label}`}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, width: '100%' }}
              >
                {ALLE_ZUSTAENDE.map((z) => {
                  const info = ZUSTAND_INFO[z];
                  const aktiv = z === zustand;
                  return (
                    <span
                      key={z}
                      title={info.caption}
                      style={{
                        fontFamily: 'var(--k-font-mono)',
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        padding: '5px 2px',
                        borderRadius: 'var(--k-radius-sm)',
                        color: aktiv ? `var(${info.farbe})` : 'var(--k-ink-faint)',
                        background: aktiv ? `color-mix(in srgb, var(${info.farbe}) 14%, transparent)` : 'transparent',
                        border: `1px solid ${aktiv ? `color-mix(in srgb, var(${info.farbe}) 45%, transparent)` : 'var(--k-line)'}`,
                      }}
                    >
                      {info.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <Hairline />

            {/* Zwei Stimmen — statische Erklärung des ECHTEN Systems
                (`KosmoPanel.tsx` `who: 'system'|'kosmo'`); Companion selbst
                spielt keine Konversation nach (kein `ChatSession`-Zugriff). */}
            <div>
              <div style={{ ...MONO_FAINT, marginBottom: 12 }}>Zwei Stimmen</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 11 }}>
                  <span
                    aria-hidden="true"
                    style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--k-ink-soft)', marginTop: 5, flex: '0 0 auto' }}
                  />
                  <div>
                    <div style={{ fontFamily: 'var(--k-font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--k-ink-soft)' }}>
                      SYSTEM-STIMME
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--k-ink-faint)', marginTop: 2 }}>
                      Zustände, unpersönlich — Aufträge &amp; Stationswechsel im KosmoPanel.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 11 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: 'var(--k-signal)',
                      marginTop: 5,
                      flex: '0 0 auto',
                      boxShadow: '0 0 8px var(--k-signal)',
                    }}
                  />
                  <div>
                    <div style={{ fontFamily: 'var(--k-font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--k-signal)' }}>
                      KOSMO
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--k-ink-faint)', marginTop: 2 }}>
                      Direkte Antwort im Dialog — Der Architekt bleibt Autor.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Hairline />

            <Phasenring gruppe={gruppe} titel={projektBereit ? siaPhaseLabel(siaPhase) : 'lädt …'} />
          </aside>

          {/* CENTER — AGENTEN & AUFTRÄGE */}
          <main
            style={{
              flex: 1,
              minWidth: 0,
              overflowY: 'auto',
              padding: '26px 32px 40px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              background:
                'radial-gradient(120% 70% at 50% -10%, color-mix(in srgb, var(--k-signal) 5%, transparent), transparent 55%), var(--k-field)',
            }}
          >
            <div style={MONO_FAINT}>Agenten &amp; Aufträge</div>
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
              <div style={{ display: 'grid', gap: 10, maxWidth: 640 }}>
                {karten.map((karte) => (
                  <KarteZeile
                    key={karte.id}
                    karte={karte}
                    freigabeLaeuft={karte.nodeId !== undefined && freigabeLaeuft.has(karte.nodeId)}
                    ablehnenLaeuft={karte.nodeId !== undefined && ablehnenLaeuft.has(karte.nodeId)}
                    autoFreigabeAktiv={karte.nodeId !== undefined && autoFreigabeNodes.has(karte.nodeId)}
                    onFreigeben={freigeben}
                    onFuerJob={(k) => k.nodeId && toggleAutoFreigabe(k.nodeId)}
                    onAblehnen={ablehnen}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        {/* STATUSBAR */}
        <div
          style={{
            height: 30,
            flex: '0 0 auto',
            borderTop: '1px solid var(--k-line)',
            background: 'var(--k-raised)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '0 16px',
            fontFamily: 'var(--k-font-mono)',
            fontSize: 11,
            color: 'var(--k-ink-faint)',
          }}
        >
          <span>AK / KosmoOrbit / Companion</span>
          <div style={{ flex: 1 }} />
          <span style={{ color: `var(${zustandInfo.farbe})` }}>{zustandInfo.label}</span>
          <span>{karten.length} AKTIV</span>
        </div>

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
