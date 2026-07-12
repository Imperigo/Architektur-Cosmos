import { useLayoutEffect, useMemo, useRef } from 'react';
import { flipFirst, flipPlay, type FlipRechteck, type ModuleId } from '@kosmo/ui';
import { useProject } from '../state/project-store';
import {
  ALLE_TOOL_IDS,
  aktuelleRaenge,
  sortiereNachRang,
  tierFuerPosition,
  TIER_GROESSE,
  STATION_ZU_TOOLID,
  type RangTier,
  type ToolId,
} from '../state/orbit-rang';
import { STATION_GLYPHE, WerkzeugGlyphe, type WerkzeugGlyphenArt } from './werkzeug-glyphen';
import type { StationModulId } from './stations-werkzeuge';
import { KosmoSymbol } from './KosmoSymbol';
import './boden-dock.css';

/**
 * v0.7.3 «Kosmodesign» Bau-Agent S5 — Boden-Dock: EIN app-weiter, ZUSÄTZLICHER
 * Navigations-Layer unten Mitte, additiv NEBEN der bestehenden Navigation
 * (OrbitStart-Hub, module-*-Kacheln, Kopfleiste bleiben WÖRTLICH unverändert
 * — dieses Bauteil ersetzt/entfernt nichts).
 *
 * Rang/Grösse: dieselbe Formel wie der OrbitStart-Hub (Spec
 * `docs/V072-VISUELLES-UPDATE-SPEZ.md` §4) — `aktuelleRaenge(siaPhase)` +
 * `sortiereNachRang` + `tierFuerPosition` (64/54/46 px, `state/orbit-rang.ts`,
 * NUR gelesen, nicht verändert). Die Reihenfolge wird NICHT hier neu
 * geglättet (keine eigene Hysterese/Kontingent-Instanz wie OrbitStarts
 * `useHubRang` — der ist eine private Funktion dieser Datei, keine
 * exportierte Schnittstelle) — ein Phasenwechsel berechnet einfach neu
 * (`useMemo`, Abhängigkeit `siaPhase`), FLIP glättet den Sprung optisch.
 *
 * Rollenfarbe/Icon je Knopf: dieselbe Quelle wie OrbitStarts Rang-Kreise —
 * `STATION_GLYPHE` (`werkzeug-glyphen.tsx`, «Station → Glyphe → Rollenfarbe»,
 * Spec §3) — KEINE zweite, abweichende Farbtabelle. Die Zuordnung ToolId →
 * StationModulId ist die INVERSE von `STATION_ZU_TOOLID`
 * (`state/orbit-rang.ts`, einzige Quelle dieser Abbildung) — hier nur
 * gespiegelt, nicht neu erfunden. Einzige Ausnahme: `connect` (Sync) ist per
 * Definition KEINE Station (s. Kopfkommentar `STATION_ZU_TOOLID`: «Sync,
 * zählt für Rang nicht als Station») — für dieses eine Werkzeug gibt es
 * deshalb keinen `STATION_GLYPHE`-Eintrag; die Rollenfarbe dafür ist eine
 * bewusst SCHLICHTE, hier dokumentierte Fallback-Zuordnung (s.
 * `SYNC_ROLLE_FALLBACK` unten), keine neu erfundene Bedeutung.
 *
 * NAVIGATION (Owner-Auftrag, App.tsx-Ankerzeile Zeile 975 — «NUR die eine
 * Ankerzeile ersetzen, keine andere Zeile anfassen»): `onOeffnen` ist
 * identisch zu `OrbitStart`s `onOeffnen`-Prop — App.tsx übergibt an der
 * Ankerzeile dieselbe bereits vorhandene `oeffneModulById`-Funktion (kein
 * zweiter Navigationsweg, keine App.tsx-Änderung ausserhalb der Ankerzeile
 * nötig). `connect` (Sync) hat keine Station zum Öffnen — der nächstliegende
 * ECHTE, bereits existierende Weg dafür ist das Sync-Panel im Header
 * (App.tsx `sync-toggle`/`syncOpen`); `onSyncToggle` reicht diesen bereits
 * vorhandenen Header-Weg durch, erfindet keinen neuen.
 *
 * KOSMO-ORB IM DOCK (v0.7.4 P3, Owner-Wunschfeature, Nachtrag zur früheren
 * Abweichung oben in der Historie): App.tsx rendert das freistehende
 * `<KosmoSymbol>` jetzt NUR NOCH auf der Zentrale/Home
 * (`!kosmoOpen && screen === 'home'`, App.tsx-Ankerzeile). In jeder
 * Modul-Ansicht (`screen !== 'home'`, genau dort wo dieser Dock erscheint)
 * lebt die EINZIGE `<KosmoSymbol>`-Instanz stattdessen HIER, als rechter
 * Slot der Dock-Reihe, mit der `eingebettet`-Variante (keine
 * `position:fixed`-Hülle, `KosmoSymbol.tsx`). Sie erscheint — wie das
 * freistehende Symbol auf Home auch — NUR wenn `kosmoOpen` false ist (Panel
 * zu); ist das Panel offen, verschwindet sie wieder, exakt wie bisher beim
 * freistehenden Symbol. Damit gilt app-weit je Screen-Zustand genau EIN
 * `data-testid="kosmo-symbol"`-Knoten: nie zwei (kein Playwright-Strict-
 * Bruch), nie keiner solange das Panel zu ist.
 */

export interface BodenDockProps {
  /** Öffnet eine Station — identischer Weg wie `OrbitStart`s `onOeffnen`. */
  onOeffnen: (id: ModuleId) => void;
  /** Sync-Panel im Header umschalten (`connect`/Sync hat keine eigene Station). */
  onSyncToggle: () => void;
  /** `kosmoOpen`-Zustand aus App.tsx — steuert, ob der eingebettete Kosmo-Orb
   *  im rechten Slot erscheint (nur wenn das grosse Panel zu ist, s.
   *  Kopfkommentar). */
  kosmoOpen: boolean;
  /** Öffnet das Kosmo-Panel — identisch zu App.tsx' `onOpen`-Weg für das
   *  freistehende Symbol (`setKosmoOpen(true)`). */
  onKosmoOpen: () => void;
}

/** ToolId → StationModulId, gespiegelt aus `STATION_ZU_TOOLID` (einzige
 *  Quelle) — vermeidet eine zweite, potenziell abdriftende Handtabelle. */
const TOOLID_ZU_STATION: Partial<Record<ToolId, StationModulId>> = Object.fromEntries(
  (Object.entries(STATION_ZU_TOOLID) as [StationModulId, ToolId][]).map(([station, tool]) => [tool, station]),
);

/** Anzeigetitel je Werkzeug (Button-`aria-label`/Tooltip) — folgt denselben
 *  Kurznamen wie `OrbitStart`s Untertool-Karten für dieselbe Station (Draw/
 *  Prepare/Vis/Publish/Dev/Speak), `Data`/`Sync` sind die ToolId-eigenen,
 *  ehrlichen Kurznamen (keine Station namens «Data»/«Sync» in `OrbitStart`,
 *  aber exakt das, was das Werkzeug ist). */
const TOOL_TITEL: Record<ToolId, string> = {
  prepare: 'Prepare',
  data: 'Data',
  chat: 'Speak',
  publish: 'Publish',
  pipeline: 'Dev',
  draw: 'Draw',
  connect: 'Sync',
  viz: 'Vis',
};

/** `connect` (Sync) hat keinen `STATION_GLYPHE`-Eintrag (s. Kopfkommentar) —
 *  neutraler, bereits bestehender Ton (`--k-ink-faint`, derselbe gedeckte
 *  Grauton wie das «Sync aus»-Badge im Header, App.tsx `sync-toggle`), kein
 *  neuer Token, keine neu erfundene Rollen-Bedeutung. */
const SYNC_ROLLE_FALLBACK = '--k-ink-faint';

/**
 * Rollen-Klartext je CSS-Variable, fürs `aria-label` (Repo-Regel: Status nie
 * NUR über Farbe) — Wortlaut direkt aus dem Rollenfarben-Kommentar in
 * `packages/kosmo-ui/src/aura.css` («WER handelt: Mensch, Planer, -Assistent,
 * Agent, Gedächtnis, Generator, Aussenkontakt, Büro»), nicht neu erfunden.
 * `--k-signal` (Speak/Kosmo) und der Sync-Fallback stehen ausserhalb jener
 * Aufzählung, ergänzt um denselben Wortgebrauch wie anderswo im Code
 * (Kosmo = «die Stimme im Raum», `tokens.ts`-Kommentar zu `moduleHue.speak`).
 */
const ROLLE_LABEL: Record<string, string> = {
  '--k-rolle-manuell': 'Mensch',
  '--k-rolle-pn': 'Planer',
  '--k-rolle-pna': 'Planer-Assistent',
  '--k-rolle-agent': 'Agent',
  '--k-rolle-memory': 'Gedächtnis',
  '--k-rolle-generator': 'Generator',
  '--k-rolle-ak': 'Aussenkontakt',
  '--k-rolle-office': 'Büro',
  '--k-signal': 'Kosmo',
  [SYNC_ROLLE_FALLBACK]: 'Sync',
};

interface WerkzeugMeta {
  titel: string;
  moduleId?: ModuleId;
  art: WerkzeugGlyphenArt;
  rolle: string;
}

function werkzeugMeta(toolId: ToolId): WerkzeugMeta {
  const station = TOOLID_ZU_STATION[toolId];
  if (station) {
    const glyphe = STATION_GLYPHE[station];
    return { titel: TOOL_TITEL[toolId], moduleId: station, art: glyphe.art, rolle: glyphe.rolle };
  }
  return { titel: TOOL_TITEL[toolId], art: 'connect', rolle: SYNC_ROLLE_FALLBACK };
}

/** Icon-Grösse je Tier — dieselbe Relation zur Kreisgrösse wie OrbitStarts
 *  `ICON_GROESSE` (`OrbitStart.tsx`), hier separat gehalten (private Konstante
 *  dort, keine exportierte Schnittstelle zum Wiederverwenden). */
const ICON_GROESSE: Record<RangTier, number> = { innen: 28, mitte: 24, aussen: 20 };

export function BodenDock({ onOeffnen, onSyncToggle, kosmoOpen, onKosmoOpen }: BodenDockProps) {
  // Reagiert auf jeden Phasenwechsel (`design.siaPhaseSetzen`, PhasenLeiste)
  // — derselbe Selektor-Zugriff wie `Viewport3D.tsx` (Kopfkommentar dort).
  const siaPhase = useProject((s) => s.doc.settings.siaPhase);

  const reihenfolge = useMemo(
    () => sortiereNachRang(ALLE_TOOL_IDS, aktuelleRaenge(siaPhase)),
    [siaPhase],
  );

  // FLIP bei Rang-Umsortierung (Spec §4) — derselbe First/Invert/Play-Ablauf
  // wie `OrbitStart.tsx` (dort pro Hauptwerkzeug-Fächer, hier eine einzige
  // Reihe); `flipPlay` prüft `prefers-reduced-motion` selbst.
  const kreisRefs = useRef<Map<ToolId, HTMLElement>>(new Map());
  const vorherigeRechtecke = useRef<Map<ToolId, FlipRechteck>>(new Map());
  useLayoutEffect(() => {
    for (const toolId of reihenfolge) {
      const el = kreisRefs.current.get(toolId);
      if (!el) continue;
      const vorher = vorherigeRechtecke.current.get(toolId);
      if (vorher) flipPlay(el, vorher);
      vorherigeRechtecke.current.set(toolId, flipFirst(el));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reihenfolge.join(',')]);

  return (
    <div className="boden-dock" data-testid="boden-dock">
      <div className="boden-dock-werkzeuge">
        {reihenfolge.map((toolId, position) => {
          const meta = werkzeugMeta(toolId);
          const tier = tierFuerPosition(position);
          const groesse = TIER_GROESSE[tier];
          const rollenLabel = ROLLE_LABEL[meta.rolle] ?? meta.rolle;
          return (
            <button
              key={toolId}
              type="button"
              data-testid={`boden-dock-tool-${toolId}`}
              className={`boden-dock-knopf boden-dock-knopf--${tier}`}
              style={
                {
                  width: groesse,
                  height: groesse,
                  '--k-dock-rolle': `var(${meta.rolle})`,
                } as React.CSSProperties
              }
              aria-label={`${meta.titel} öffnen — Rolle ${rollenLabel}`}
              title={`${meta.titel} — Rolle ${rollenLabel}`}
              onClick={() => (meta.moduleId ? onOeffnen(meta.moduleId) : onSyncToggle())}
              ref={(el) => {
                if (el) kreisRefs.current.set(toolId, el);
                else kreisRefs.current.delete(toolId);
              }}
            >
              <WerkzeugGlyphe art={meta.art} rolle={meta.rolle} size={ICON_GROESSE[tier]} />
            </button>
          );
        })}
      </div>
      {!kosmoOpen && (
        <div className="boden-dock-kosmo-slot">
          <KosmoSymbol eingebettet onOpen={onKosmoOpen} />
        </div>
      )}
    </div>
  );
}
