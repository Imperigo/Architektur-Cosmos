import { useEffect, useState, type CSSProperties } from 'react';
import { ORBIT_HAUPTWERKZEUGE } from './orbit-werkzeuge';
import './start-sequenz.css';

/**
 * Paket P-S1 («Startsequenz/Boot», `docs/V0812-START-SPEZ.md` §E-S1,
 * Owner-Package `docs/owner-packages/2026-07-21-startsequenz/`).
 *
 * EHRLICHER BOOT (Owner-Kernentscheid, Package-README «Kernentscheide» §1,
 * Sanktion 3): die fünf Boot-Zeilen binden an ECHTE Signale, kein Fake-
 * Fortschrittsbalken, keine erfundenen Prozente:
 *
 *  - KERN       — synchron wahr, sobald dieses Modul importiert ist (kein
 *                 Ladevorgang zu simulieren — der Code liegt bereits im
 *                 Speicher, sonst würde diese Komponente selbst nicht
 *                 laufen). EHRLICH TRIVIAL, so benannt statt es als
 *                 «geladen nach X Sekunden» zu verkleiden.
 *  - KOSMO-LLM  — `localStorage['kosmo.llm']` wird gelesen (derselbe
 *                 Schlüssel wie `KosmoPanel.tsx`/`WerkzeugSetup.tsx`), NIE
 *                 ein echter API-Call. Fehlt der Schlüssel oder trägt er
 *                 keinen Provider, ist «KOSMO-LLM — NICHT KONFIGURIERT» die
 *                 ehrliche, VOLLSTÄNDIGE Antwort — die Sequenz läuft
 *                 trotzdem weiter (Owner-Vorgabe explizit).
 *  - PROJEKTGRAPH — wird von aussen gereicht (`projektgraphBereit`-Prop):
 *                 App.tsx meldet hierüber den Abschluss von `initVault()`s
 *                 Promise (echter Tresor-Restore, `state/project-vault.ts`,
 *                 TABU für dieses Paket — nur sein bestehendes Promise wird
 *                 hier beobachtbar gemacht, s. App.tsx-Kommentar an der
 *                 Aufrufstelle).
 *  - BRIDGE     — ein echter `/health`-Ping gegen `localStorage['kosmo.
 *                 bridge']` (Fallback `http://localhost:8600`, derselbe
 *                 Schlüssel/Fallback wie `VisWorkspace.tsx`/`vis-jobs.ts`/
 *                 `KosmoPanel.tsx` u. a.), Timeout 1.5 s per
 *                 `AbortController` (dasselbe Muster wie `WerkzeugSetup.
 *                 tsx`s `erreichbar()`). Offline → ehrlich «BRIDGE — NICHT
 *                 VERBUNDEN», die Sequenz endet trotzdem (Owner-Vorgabe
 *                 explizit).
 *  - STATIONEN  — `ORBIT_HAUPTWERKZEUGE.length > 0`: die echte
 *                 Modul-Registry, die auch `OrbitStart.tsx` für die
 *                 Zentrale-Kacheln liest (`shell/orbit-werkzeuge.ts`,
 *                 read-only Import — diese Datei bleibt TABU/unangetastet).
 *                 Synchron wahr, sobald importiert — EHRLICH TRIVIAL wie
 *                 KERN oben.
 *
 * WEBDRIVER-GUARD (Sanktion 1, Bestandsschutz-HART): `navigator.webdriver`
 * ist der spezifikationskonforme Automations-Marker (derselbe Weg wie
 * `App.tsx`s `gehZu()`), zusammen mit dem Muster `kosmo.vis.onboarding.
 * erzwingen` (`VisOnboarding.tsx`) — nur wenn BEIDES zutrifft (echter
 * Mensch ODER Test mit explizitem Erzwingen-Flag) rendert diese Komponente
 * überhaupt etwas. Alle bestehenden E2E-Specs laufen ohne dieses Flag —
 * für sie ist diese Komponente ein Null-Render, keine einzige bestehende
 * Assertion sieht sie je.
 *
 * MARKE: EIN handgeschriebenes SVG nach der Package-Geometrie (Ellipse
 * rotate(-24), rx17/ry8.5 Teal `#57B6C2`; A-Spitze `M11 25 L20 9 L29 25`
 * Neutral `#DCE0E8`; Knoten r2.4) — bewusst NICHT `OrbitMark` aus
 * `@kosmo/ui` (andere, ältere Geometrie), weil das Owner-Package exakt
 * diese neue Marke für die Startsequenz vorgibt.
 */

const ERZWINGEN_SCHLUESSEL = 'kosmo.start.erzwingen';
const BRIDGE_SCHLUESSEL = 'kosmo.bridge';
const BRIDGE_FALLBACK = 'http://localhost:8600';
const LLM_SCHLUESSEL = 'kosmo.llm';
const BRIDGE_TIMEOUT_MS = 1500;

// EHRLICH TRIVIAL (s. Kopfkommentar): beide Signale sind wahr, sobald dieses
// Modul importiert wurde — kein künstlicher Delay, kein Fortschrittswert.
const KERN_BEREIT = true;
const STATIONEN_BEREIT = ORBIT_HAUPTWERKZEUGE.length > 0;

type BridgeStatus = 'pruefend' | 'verbunden' | 'nicht-verbunden';

interface LlmSignal {
  text: string;
}

/** Bestandsschutz-Guard (Sanktion 1): ausserhalb von echtem Nutzer-Kontext
 *  (Playwright/WebDriver) rendert die Sequenz NUR mit explizitem Erzwingen-
 *  Flag im localStorage — genau das Muster aus `VisOnboarding.tsx`
 *  (`ERZWINGEN_SCHLUESSEL`). */
function pruefeErlaubt(): boolean {
  if (typeof navigator === 'undefined' || !navigator.webdriver) return true;
  try {
    return localStorage.getItem(ERZWINGEN_SCHLUESSEL) === '1';
  } catch {
    return false;
  }
}

/** KOSMO-LLM: reiner, synchroner Lesezugriff auf denselben Schlüssel, den
 *  auch `KosmoPanel.tsx` (`loadSettings`) beschreibt — kein zweiter Speicher-
 *  ort, kein API-Call. Ein fehlender/leerer Provider ist eine VOLLSTÄNDIGE,
 *  ehrliche Antwort, kein Fehlerzustand. */
function leseLlmSignal(): LlmSignal {
  try {
    const roh = localStorage.getItem(LLM_SCHLUESSEL);
    if (!roh) return { text: 'KOSMO-LLM — NICHT KONFIGURIERT' };
    const settings = JSON.parse(roh) as { provider?: string };
    const provider = settings.provider?.trim();
    if (!provider) return { text: 'KOSMO-LLM — NICHT KONFIGURIERT' };
    return { text: `KOSMO-LLM — ${provider.toUpperCase()}` };
  } catch {
    return { text: 'KOSMO-LLM — NICHT KONFIGURIERT' };
  }
}

/** Bridge-URL nach demselben Muster wie `VisWorkspace.tsx`/`vis-jobs.ts`/
 *  `KosmoPanel.tsx`: `localStorage['kosmo.bridge']`, Fallback
 *  `http://localhost:8600`. */
function bridgeUrl(): string {
  return (localStorage.getItem(BRIDGE_SCHLUESSEL) ?? BRIDGE_FALLBACK).replace(/\/$/, '');
}

function reduzierteBewegung(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

export interface StartSequenzProps {
  /**
   * PROJEKTGRAPH-Signal: `true`, sobald das (in App.tsx bereits laufende)
   * `initVault()`-Promise abgeschlossen ist. App.tsx ändert dafür NUR seine
   * eigene Mount-Zeile (`void initVault().then(...)`) — `project-vault.ts`
   * selbst bleibt unangetastet.
   */
  projektgraphBereit: boolean;
}

export function StartSequenz({ projektgraphBereit }: StartSequenzProps) {
  // Referentiell stabil über die Lebensdauer der Instanz (navigator.webdriver
  // + der Erzwingen-Flag ändern sich nicht innerhalb einer Sitzung) — alle
  // Hooks unten laufen unabhängig davon IMMER (React-Regel), ihr jeweiliger
  // Effekt-Körper prüft `erlaubt` selbst und no-opt sonst. Der Null-Render
  // (Bestandsschutz) passiert erst ganz am Ende der Funktion.
  const [erlaubt] = useState(pruefeErlaubt);
  const [reduziert] = useState(reduzierteBewegung);
  const [llm] = useState(leseLlmSignal);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('pruefend');
  const [sichtbar, setSichtbar] = useState(true);
  const [austretend, setAustretend] = useState(false);

  // BRIDGE — echter /health-Ping, 1.5s Timeout (AbortController), s.
  // Kopfkommentar. Läuft nur, wenn der Bestandsschutz die Sequenz überhaupt
  // zulässt.
  useEffect(() => {
    if (!erlaubt) return;
    let lebendig = true;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), BRIDGE_TIMEOUT_MS);
    fetch(`${bridgeUrl()}/health`, { signal: ctl.signal })
      .then((res) => {
        if (!lebendig) return;
        setBridgeStatus(res.ok ? 'verbunden' : 'nicht-verbunden');
      })
      .catch(() => {
        if (!lebendig) return;
        setBridgeStatus('nicht-verbunden');
      })
      .finally(() => clearTimeout(timer));
    return () => {
      lebendig = false;
      ctl.abort();
      clearTimeout(timer);
    };
  }, [erlaubt]);

  const alleSignaleFertig = KERN_BEREIT && STATIONEN_BEREIT && projektgraphBereit && bridgeStatus !== 'pruefend';

  // Skippbar: Klick/Tap/Escape beendet SOFORT, unabhängig vom Signalstand
  // (Package-Prinzip «Skippbar & abschaltbar» — «alles skippbar»).
  const beenden = () => {
    if (!sichtbar || austretend) return;
    setAustretend(true);
  };

  useEffect(() => {
    if (!erlaubt || !sichtbar) return;
    const aufEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') beenden();
    };
    window.addEventListener('keydown', aufEscape);
    return () => window.removeEventListener('keydown', aufEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [erlaubt, sichtbar]);

  // Auto-Ende, sobald alle fünf Signale abgeschlossen sind: reduced-motion
  // beendet sofort (Package-Prinzip «Skippbar & abschaltbar»: «der statische
  // Zustand ist vollständig lesbar» — kein erzwungenes Halten), Standard
  // hält den Leitsatz kurz sichtbar (Set E des Package: «Halten ≥ 1.2 s»)
  // bevor der Austritt startet.
  useEffect(() => {
    if (!erlaubt || !alleSignaleFertig || austretend) return;
    if (reduziert) {
      setAustretend(true);
      return;
    }
    const timer = setTimeout(() => setAustretend(true), 1300);
    return () => clearTimeout(timer);
  }, [erlaubt, alleSignaleFertig, austretend, reduziert]);

  // Austritt: Motion-Token «Standard» 0.5s (Package: die längste der drei
  // Dauern für den grössten Bewegungsschritt), danach vollständiger
  // Unmount — die Zentrale darunter war die ganze Zeit schon gemountet.
  useEffect(() => {
    if (!austretend) return;
    if (reduziert) {
      setSichtbar(false);
      return;
    }
    const timer = setTimeout(() => setSichtbar(false), 500);
    return () => clearTimeout(timer);
  }, [austretend, reduziert]);

  if (!erlaubt || !sichtbar) return null;

  const zeilen: { testid: string; text: string; fertig: boolean }[] = [
    { testid: 'kern', text: 'KERN — BEREIT', fertig: KERN_BEREIT },
    { testid: 'kosmo-llm', text: llm.text, fertig: true },
    {
      testid: 'projektgraph',
      text: projektgraphBereit ? 'PROJEKTGRAPH — WIEDERHERGESTELLT' : 'PROJEKTGRAPH — WIRD GELADEN…',
      fertig: projektgraphBereit,
    },
    {
      testid: 'bridge',
      text:
        bridgeStatus === 'pruefend'
          ? 'BRIDGE — PRÜFE…'
          : bridgeStatus === 'verbunden'
            ? 'BRIDGE — VERBUNDEN'
            : 'BRIDGE — NICHT VERBUNDEN',
      fertig: bridgeStatus !== 'pruefend',
    },
    { testid: 'stationen', text: 'STATIONEN — BEREIT', fertig: STATIONEN_BEREIT },
  ];

  return (
    <div
      className={`k-start-sequenz${austretend ? ' k-start-sequenz--austritt' : ''}${reduziert ? ' k-start-sequenz--ruhig' : ''}`}
      data-testid="start-sequenz"
      role="status"
      aria-label="KosmoOrbit startet"
      onClick={beenden}
    >
      <button
        type="button"
        className="k-start-sequenz-ueberspringen"
        data-testid="start-sequenz-ueberspringen"
        onClick={(e) => {
          e.stopPropagation();
          beenden();
        }}
      >
        Überspringen
      </button>

      <div className="k-start-sequenz-marke">
        <svg viewBox="0 0 40 40" fill="none" width="72" height="72" aria-hidden="true">
          <g transform="rotate(-24 20 20)">
            <ellipse cx="20" cy="20" rx="17" ry="8.5" stroke="#57B6C2" strokeWidth="1.4" />
            {!reduziert && (
              <circle
                r="1.6"
                fill="#57B6C2"
                data-testid="start-sequenz-satellit"
                className="k-start-sequenz-satellit"
                style={{
                  offsetPath: "path('M 3 20 A 17 8.5 0 1 1 37 20 A 17 8.5 0 1 1 3 20')",
                }}
              />
            )}
          </g>
          <path
            d="M11 25 L20 9 L29 25"
            fill="none"
            stroke="#DCE0E8"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx="20"
            cy="16.5"
            r="2.4"
            fill="#57B6C2"
            className={`k-start-sequenz-knoten${alleSignaleFertig ? ' k-start-sequenz-knoten--angedockt' : ''}`}
            data-testid="start-sequenz-knoten"
          />
          {reduziert && (
            // reduced-motion: derselbe Knoten-Testid-Vertrag («Satellit-
            // Knoten existiert»), aber ohne Umlauf-Animation — der Punkt
            // steht bereits angedockt (statischer, vollständig lesbarer
            // Zustand, Package-Prinzip «Skippbar & abschaltbar»).
            <circle r="1.6" fill="#57B6C2" cx="20" cy="16.5" data-testid="start-sequenz-satellit" aria-hidden="true" />
          )}
        </svg>
        <span className="k-start-sequenz-wort">KosmoOrbit</span>
      </div>

      <div className="k-start-sequenz-zeilen" data-testid="start-sequenz-zeilen">
        {zeilen.map((z, i) => (
          <div
            key={z.testid}
            className={`k-start-sequenz-zeile${z.fertig ? ' k-start-sequenz-zeile--fertig' : ''}`}
            data-testid={`start-sequenz-zeile-${z.testid}`}
            style={reduziert ? undefined : ({ '--k-staffel': `${i * 85}ms` } as CSSProperties)}
          >
            {z.text}
          </div>
        ))}
      </div>

      {alleSignaleFertig && (
        <div className="k-start-sequenz-leitsatz-buehne">
          <div className="k-start-sequenz-leitsatz" data-testid="start-sequenz-leitsatz">
            Der Architekt bleibt Autor.
          </div>
          <div className="k-start-sequenz-bereit" data-testid="start-sequenz-bereit">
            SYSTEM BEREIT
          </div>
        </div>
      )}
    </div>
  );
}
