import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SiaPhase } from '@kosmo/kernel';
import { flipFirst, flipPlay, type FlipRechteck, type ModuleId } from '@kosmo/ui';
import { useProject } from '../state/project-store';
import { nutzungsProfil } from '../state/oberflaeche-adaption-kern';
import {
  ALLE_TOOL_IDS,
  anfangsKontingent,
  naechsteReihenfolge,
  tierFuerPosition,
  TIER_GROESSE,
  toolNutzungMelden,
  STATION_ZU_TOOLID,
  type RangTier,
  type ToolId,
  type UmordnungsKontingent,
} from '../state/orbit-rang';
import { werkzeugInPhaseSichtbar } from '../state/phasen-matrix';
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
 * Rang: dieselbe Formel wie der OrbitStart-Hub (Spec
 * `docs/V072-VISUELLES-UPDATE-SPEZ.md` §4, seit v0.8.0B/W3 wörtlich auch
 * `docs/V080B-DESIGN-SPEZ.md` §4 B-67) — `naechsteReihenfolge()` +
 * `tierFuerPosition` (Positions-Grenzen, `state/orbit-rang.ts`, NUR gelesen,
 * nicht verändert) bestimmen NUR die Reihenfolge/Betonungs-Stufe je Position;
 * die daraus abgeleiteten Pixelgrössen sind je Aufrufer EIGENSTÄNDIG (Boden-
 * Dock hier über `TIER_GROESSE`, s. Kopfkommentar zu `BODEN_DOCK_RESERVE_PX`
 * unten — v0.8.1/P1 auf die Blaupausen-Masse 44/36px zurückgestellt;
 * OrbitStart hält seine Kreisgrössen 64/54/46 unverändert eigenständig in
 * `orbit-065.css`, nicht über diese Konstante — beide dürfen seit jeher
 * unabhängig voneinander sein, `TIER_GROESSE` ist nur EIN Konsument von
 * `tierFuerPosition`). Seit W3 glättet ein EIGENER Hook (`useBodenRang`
 * unten) die Reihenfolge MIT Hysterese/Anti-Nerv-Kontingent — dieselbe
 * Formel wie OrbitStarts `useHubRang`, hier zusätzlich mit einem Zeit-Timer,
 * weil der Boden-Dock (anders als der Hub) dauerhaft gemountet bleibt.
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
 *  dort, keine exportierte Schnittstelle zum Wiederverwenden).
 *  v0.8.1/P1 (Owner-Entscheid, `TIER_GROESSE` 44/36/36 statt 64/54/46, s.
 *  `orbit-rang.ts`) — proportional mitgezogen (bisheriges Verhältnis
 *  Icon≈44 % der Kreisgrösse gehalten: 28/64≈24/54≈20/46≈0.44, jetzt
 *  20/44≈16/36≈0.44), sonst würde das Icon im geschrumpften Kreis
 *  unproportional gross/eng wirken. */
const ICON_GROESSE: Record<RangTier, number> = { innen: 20, mitte: 16, aussen: 16 };

/**
 * v0.8.0 P11 (Owner-Pflichtauftrag 15.07., «BodenDock ins Dock-System») —
 * Gesamt-Reserve vom UNTEREN Viewport-Rand, die der Boden-Dock optisch
 * beansprucht: `bottom:96px` (`boden-dock.css`) + die tatsächliche
 * Container-Höhe der Knopfreihe (Top-3-Tier-Kreis `TIER_GROESSE.innen`,
 * `state/orbit-rang.ts`, die höchste der drei Grössen) + `padding:10px 16px`
 * oben/unten (`boden-dock.css`, 2×10px).
 *
 * v0.8.1/P1 (Owner-Entscheid 16.07.2026, `docs/V081-SPEZ.md` §4.1 Entscheid
 * 2/C-2) — **neu gerechnet**, weil `TIER_GROESSE.innen` auf die Blaupausen-
 * Masse 44px zurückgestellt wurde (`orbit-rang.ts`s Kopfkommentar zu
 * `TIER_GROESSE`, vorher 64px): Formel bleibt wörtlich `96 (bottom) +
 * TIER_GROESSE.innen + 20 (padding 2×10)` = **96 + 44 + 20 = 160px**
 * (vorher 96 + 64 + 20 = 180px).
 *
 * Benannte Konstante statt Magic Number, für Stationen OHNE eigenen
 * Dock-Feld-Messlauf (`shell/dock/DockFlaeche.tsx` misst dieselbe Reserve
 * LIVE am `boden-dock`/`kosmo-symbol`-DOM, s. dortiger Kopfkommentar) — z.B.
 * `modules/publish/PublishWorkspace.tsx`s Blattfläche, die den sichtbaren
 * Blatt-Bereich um diesen Betrag nach unten polstert, damit die Pille nie
 * über dem Blatt liegt (Owner-Befund: «liegt mitten auf dem Blatt»). Bewusst
 * ein statischer Wert statt Laufzeitmessung: die Publish-Station hat (anders
 * als Design/Vis) keinen `ResizeObserver`-Feld-Messlauf, und ein neuer nur
 * für diesen einen Zweck wäre mehr Maschinerie als der ehrliche, an die
 * bestehende CSS gebundene Wert hier — ändert sich `boden-dock.css`/
 * `TIER_GROESSE`, muss diese Konstante mitgezogen werden (dieselbe Pflicht
 * gilt für jede andere Stelle, die diese Zahlen kennt).
 */
export const BODEN_DOCK_RESERVE_PX = 160;

/**
 * v0.8.0B / W3 (Spez §4, B-67) — Rang-Formel-Kreislauf des Boden-Docks, MIT
 * Hysterese/Anti-Nerv-Kontingent statt der bisherigen «bei jedem Phasen-
 * wechsel neu sortieren»-Kurzfassung: `naechsteReihenfolge()` (`state/
 * orbit-rang.ts`, bereits vollständig gebaut UND getestet für `OrbitStart`s
 * `useHubRang` — hier additiv WIEDERVERWENDET, keine zweite Formel-
 * Implementierung) liefert `RANG(T)=0.6·PHASE(T)+0.4·NUTZUNG(T,7Tage)`
 * bereits inklusive Hysterese-Schwelle (Δ>0.08) UND Anti-Nerv-Kontingent
 * (höchstens 1 Umsortierung/Sitzungsminute ausserhalb eines Phasenwechsels).
 * KEIN `state/`-Eingriff — dieser Hook liegt vollständig HIER (Chrome-Datei),
 * `orbit-rang.ts` wird nur GELESEN (importiert), nicht verändert.
 *
 * NEU gegenüber `OrbitStart.tsx`s `useHubRang` (die nur bei Phasenwechsel/
 * Fächer-Wechsel neu rechnet): ein `BODEN_RANG_INTERVALL_MS`-Timer lässt den
 * Boden-Dock (ein app-weit DAUERHAFT gemountetes Element, anders als der
 * Hub) auch OHNE Phasenwechsel auf Nutzungsdrift reagieren — «stabil vor
 * spontan» bleibt gewahrt, weil Hysterese-Schwelle UND Kontingent unverändert
 * aus `orbit-rang.ts` gelten (der Timer fragt nur öfter nach, er umgeht keine
 * der beiden Wachen).
 *
 * Deterministischer Start (Test-Vertrag `boden-dock.spec.ts`): ohne
 * Nutzungsdaten (frisches `localStorage`, wie in jedem E2E-Seed) ist
 * `NUTZUNG(T)` für alle Werkzeuge 0 — der erste Aufruf sortiert dann rein
 * nach `PHASE(T)`, byte-gleich zur bisherigen `aktuelleRaenge`-Reihenfolge.
 */
const BODEN_RANG_INTERVALL_MS = 20_000;

function useBodenRang(toolIds: readonly ToolId[], siaPhase: SiaPhase): ToolId[] {
  const kontingentRef = useRef<UmordnungsKontingent>(anfangsKontingent());
  const raengeRef = useRef<Record<ToolId, number> | null>(null);
  const reihenfolgeRef = useRef<ToolId[]>([]);
  const toolIdsSchluessel = toolIds.join(',');

  const [reihenfolge, setReihenfolge] = useState<ToolId[]>(() => {
    const ergebnis = naechsteReihenfolge({
      toolIds,
      siaPhase,
      nutzung: nutzungsProfil(),
      alteReihenfolge: [],
      alteRaenge: null,
      kontingent: kontingentRef.current,
      jetztMs: Date.now(),
    });
    kontingentRef.current = ergebnis.kontingent;
    raengeRef.current = ergebnis.raenge;
    reihenfolgeRef.current = ergebnis.reihenfolge;
    return ergebnis.reihenfolge;
  });

  const neuBerechnen = () => {
    const ergebnis = naechsteReihenfolge({
      toolIds,
      siaPhase,
      nutzung: nutzungsProfil(),
      alteReihenfolge: reihenfolgeRef.current,
      alteRaenge: raengeRef.current,
      kontingent: kontingentRef.current,
      jetztMs: Date.now(),
    });
    kontingentRef.current = ergebnis.kontingent;
    raengeRef.current = ergebnis.raenge;
    if (ergebnis.umgeordnet) {
      reihenfolgeRef.current = ergebnis.reihenfolge;
      setReihenfolge(ergebnis.reihenfolge);
    }
  };

  useEffect(() => {
    neuBerechnen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siaPhase, toolIdsSchluessel]);

  useEffect(() => {
    const id = window.setInterval(neuBerechnen, BODEN_RANG_INTERVALL_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return reihenfolge;
}

export function BodenDock({ onOeffnen, onSyncToggle, kosmoOpen, onKosmoOpen }: BodenDockProps) {
  // Reagiert auf jeden Phasenwechsel (`design.siaPhaseSetzen`, PhasenLeiste)
  // — derselbe Selektor-Zugriff wie `Viewport3D.tsx` (Kopfkommentar dort).
  const siaPhase = useProject((s) => s.doc.settings.siaPhase);

  // V0812-SPEZ E-M (P-M) — Konsum von `PHASEN_MATRIX`: harte Ausblendung
  // ausserhalb der aktiven Phase. Praktisch ein No-op HEUTE (das Konzept
  // beschreibt keine Stations-Zeilen, `phasen-matrix.ts`s Kopfkommentar —
  // alle 8 bleiben `sichtbar` in jeder Phase), aber die Verdrahtung ist
  // wörtlich vorhanden, damit ein künftiger Stations-Eintrag im Register
  // hier ohne zweiten Konsum-Ort greift.
  const sichtbareToolIds = ALLE_TOOL_IDS.filter((id) => werkzeugInPhaseSichtbar(id, siaPhase));

  const reihenfolge = useBodenRang(sichtbareToolIds, siaPhase);

  // FLIP bei Rang-Umsortierung (Spec §4, 240–500ms — `flipPlay`s Default
  // 320ms liegt im Fenster) — derselbe First/Invert/Play-Ablauf wie
  // `OrbitStart.tsx` (dort pro Hauptwerkzeug-Fächer, hier eine einzige
  // Reihe); `flipPlay` prüft `prefers-reduced-motion` selbst (kappt den FLIP
  // vollständig, Spec §4 «prefers-reduced-motion kappt FLIP»).
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
              onClick={() => {
                // v0.8.0B / W3 (Spez §4, B-67) — jeder Klick zählt als
                // Nutzungspunkt in dasselbe geteilte 7-Tage-Profil, das auch
                // `EntwurfsDock`/`OrbitStart` füttern (`orbit-rang.ts`s
                // `toolNutzungMelden`, EINE Quelle) — der Rang-Timer oben
                // (`useBodenRang`) liest diesen Stand beim nächsten Zyklus.
                toolNutzungMelden(toolId);
                if (meta.moduleId) onOeffnen(meta.moduleId);
                else onSyncToggle();
              }}
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
        <>
          {/* v0.8.0B / W3 (Spez §4, B-64) — 1×26px-Trenner (Blaupausen-Mass)
              vor dem Kosmo-Slot; ersetzt den bisherigen `border-left` der
              Slot-Fläche selbst (bleibt als Fallback in `boden-dock.css`,
              falls `kosmoOpen` je ohne diesen Trenner rendern sollte). */}
          <span className="boden-dock-trenner" aria-hidden="true" />
          <div className="boden-dock-kosmo-slot">
            <KosmoSymbol eingebettet onOpen={onKosmoOpen} />
          </div>
        </>
      )}
    </div>
  );
}
