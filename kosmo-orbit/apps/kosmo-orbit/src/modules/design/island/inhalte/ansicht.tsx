import { useEffect, useState, type ReactNode } from 'react';
import { KSelect, meldeFehler } from '@kosmo/ui';
import { useProject } from '../../../../state/project-store';
import { useViewportChromeRuntime } from '../../../../state/viewport-chrome-runtime';
import { usePlanAnsicht } from '../../../../state/plan-ansicht';
import { setSunDate } from '../../Viewport3D';
import { registriereInhalt } from './registry';
import './pd3a.css';

/**
 * Stufe-2/3-Inhalte der ANSICHT-Insel (PD3a, `docs/ISLAND-UI-SPEZ.md` §4.4
 * ANSICHT-Tabelle). Diese Datei gehört exklusiv PD3a — Registrierung als
 * Import-Seiteneffekt, s. `registry.ts`-Kopfkommentar. Achsen bleibt hier
 * bewusst UNREGISTRIERT (`hatPopup:false`, reiner Toggle, `island-katalog.ts`)
 * — 5 von 6 ANSICHT-Werkzeugen.
 *
 * **Sonne (Referenzmuster):** `sonnenDatum`/`sonnenStunde`/`sonneOffen` in
 * `DesignWorkspace.tsx` sind lokaler `useState` (nicht im Store), darum
 * NICHT von hier aus erreichbar. Die echte Wirkung läuft stattdessen über
 * `Viewport3D.tsx`s exportierte `setSunDate(d)` — ein modul-globaler Setter,
 * den auch `DesignWorkspace.tsx` selbst nur aufruft (`Viewport3D.tsx:110`),
 * kein zweiter Datenpfad. Dieses Fenster hält seinen EIGENEN Datum/Zeit/
 * Schatten-Zustand (dieselbe useEffect→setSunDate-Kopplung wie das Vorbild)
 * und ruft `setSunDate` direkt — echte, sofort sichtbare Wirkung im
 * Viewport, unabhängig vom lokalen State in `DesignWorkspace.tsx`.
 */

// ---------------------------------------------------------------------------
// Dateilokale Bausteine (eigenständig von `zeichnen.tsx` — Dateikreis bleibt
// exklusiv, keine geteilte dritte Datei).
// ---------------------------------------------------------------------------

function Zeile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="pd3a-zeile">
      <span className="pd3a-label">{label}</span>
      {children}
    </label>
  );
}

function Hinweis({ children, testid }: { children: ReactNode; testid?: string }) {
  return (
    <p className="pd3a-hinweis" {...(testid !== undefined ? { 'data-testid': testid } : {})}>
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// 12 · Darstellung
// ---------------------------------------------------------------------------

function useDarstellung() {
  const runCommand = useProject((s) => s.runCommand);
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  void revision; // erzwingt Re-Render bei jeder Mutation (Settings-Patch inklusive)
  return {
    darstellung3d: doc.settings.darstellung3d ?? 'auto',
    pocheModus: doc.settings.pocheModus ?? 'phase',
    fensterBoegen: doc.settings.fensterBoegen !== false,
    setzeDarstellung: (darstellung3d: string) => {
      try {
        runCommand('design.darstellung3dSetzen', { darstellung3d });
      } catch (err) {
        meldeFehler(err);
      }
    },
    setzePoche: (pocheModus: string) => {
      try {
        runCommand('design.pocheModusSetzen', { pocheModus });
      } catch (err) {
        meldeFehler(err);
      }
    },
    setzeFensterBoegen: (fensterBoegen: boolean) => {
      try {
        runCommand('design.fensterBoegenSetzen', { fensterBoegen });
      } catch (err) {
        meldeFehler(err);
      }
    },
  };
}

function DarstellungStufe2() {
  const { darstellung3d, pocheModus, setzeDarstellung, setzePoche } = useDarstellung();
  return (
    <div className="pd3a-stufe2" data-testid="island-darstellung-stufe2" onClick={(e) => e.stopPropagation()}>
      <Zeile label="Darstellung">
        <KSelect size="sm" data-testid="island-darstellung-3d" value={darstellung3d} onChange={(e) => setzeDarstellung(e.target.value)}>
          <option value="auto">Automatisch (Phase)</option>
          <option value="material">Material</option>
          <option value="weiss">Weissmodell</option>
          <option value="schwarz">Schwarzmodell</option>
        </KSelect>
      </Zeile>
      <Zeile label="Poché">
        <KSelect size="sm" data-testid="island-darstellung-poche" value={pocheModus} onChange={(e) => setzePoche(e.target.value)}>
          <option value="phase">Nach Phase</option>
          <option value="schwarz">Immer schwarz</option>
          <option value="material">Immer Material</option>
        </KSelect>
      </Zeile>
    </div>
  );
}

function DarstellungStufe3() {
  const { darstellung3d, pocheModus, fensterBoegen, setzeDarstellung, setzePoche, setzeFensterBoegen } = useDarstellung();
  return (
    <div className="pd3a-stufe3" data-testid="island-darstellung-stufe3">
      <Zeile label="Darstellung">
        <KSelect size="sm" data-testid="island-darstellung-fenster-3d" value={darstellung3d} onChange={(e) => setzeDarstellung(e.target.value)}>
          <option value="auto">Automatisch (Phase)</option>
          <option value="material">Material</option>
          <option value="weiss">Weissmodell</option>
          <option value="schwarz">Schwarzmodell</option>
        </KSelect>
      </Zeile>
      <Zeile label="Poché">
        <KSelect size="sm" data-testid="island-darstellung-fenster-poche" value={pocheModus} onChange={(e) => setzePoche(e.target.value)}>
          <option value="phase">Nach Phase</option>
          <option value="schwarz">Immer schwarz</option>
          <option value="material">Immer Material</option>
        </KSelect>
      </Zeile>
      <label className="pd3a-zeile">
        <input
          type="checkbox"
          data-testid="island-darstellung-fensterboegen"
          checked={fensterBoegen}
          onChange={(e) => setzeFensterBoegen(e.target.checked)}
        />
        Fensterbögen im Grundriss
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 13 · Sonne — Referenzmuster, Stufe-3-Fenster NEU (Standort/Nachbargebäude/
// 2h-Nachweis ehrlich als «nicht gebaut» benannt, §4.4).
// ---------------------------------------------------------------------------

interface SonneZustand {
  datum: string;
  stunde: number;
  schattenAn: boolean;
}

let sonneVorgabe: SonneZustand = { datum: '2026-06-21', stunde: 14, schattenAn: false };

function useSonneSteuerung(): readonly [SonneZustand, (patch: Partial<SonneZustand>) => void] {
  const [zustand, setZustandRoh] = useState(sonneVorgabe);

  useEffect(() => {
    // 1:1 dieselbe Kopplung wie `DesignWorkspace.tsx`s Vorbild (Q12): aus =
    // Studio-Sonne (`setSunDate(null)`), an = echtes Datum/Uhrzeit.
    if (!zustand.schattenAn) {
      setSunDate(null);
      return;
    }
    const d = new Date(`${zustand.datum}T00:00:00`);
    d.setMinutes(Math.round(zustand.stunde * 60));
    setSunDate(d);
  }, [zustand.schattenAn, zustand.datum, zustand.stunde]);

  const setZustand = (patch: Partial<SonneZustand>) => {
    const naechster = { ...zustand, ...patch };
    sonneVorgabe = naechster;
    setZustandRoh(naechster);
  };
  return [zustand, setZustand] as const;
}

function SonneStufe2() {
  const [zustand, setZustand] = useSonneSteuerung();
  const standortLabel = useViewportChromeRuntime((s) => s.standortLabel);
  return (
    <div className="pd3a-stufe2" data-testid="island-sonne-stufe2" onClick={(e) => e.stopPropagation()}>
      <Zeile label="Datum">
        <input type="date" data-testid="island-sonne-datum" value={zustand.datum} onChange={(e) => setZustand({ datum: e.target.value })} />
      </Zeile>
      <Zeile label="Zeit">
        <input
          type="range"
          min={5}
          max={22}
          step={0.25}
          data-testid="island-sonne-zeit"
          value={zustand.stunde}
          onChange={(e) => setZustand({ stunde: Number(e.target.value) })}
        />
      </Zeile>
      <label className="pd3a-zeile">
        <input
          type="checkbox"
          data-testid="island-sonne-schatten"
          checked={zustand.schattenAn}
          onChange={(e) => setZustand({ schattenAn: e.target.checked })}
        />
        Schatten anzeigen
      </label>
      {standortLabel ? <p className="pd3a-kennzahl">Standort: {standortLabel}</p> : null}
    </div>
  );
}

function SonneStufe3() {
  const [zustand, setZustand] = useSonneSteuerung();
  const doc = useProject.getState().doc;
  const standort = doc.settings.standort;
  return (
    <div className="pd3a-stufe3" data-testid="island-sonne-stufe3">
      <Zeile label="Datum">
        <input
          type="date"
          data-testid="island-sonne-fenster-datum"
          value={zustand.datum}
          onChange={(e) => setZustand({ datum: e.target.value })}
        />
      </Zeile>
      <Zeile label="Zeit">
        <input
          type="range"
          min={5}
          max={22}
          step={0.25}
          data-testid="island-sonne-fenster-zeit"
          value={zustand.stunde}
          onChange={(e) => setZustand({ stunde: Number(e.target.value) })}
        />
      </Zeile>
      <p className="pd3a-kennzahl">
        {String(Math.floor(zustand.stunde)).padStart(2, '0')}:{String(Math.round((zustand.stunde % 1) * 60)).padStart(2, '0')}
      </p>
      <label className="pd3a-zeile">
        <input
          type="checkbox"
          data-testid="island-sonne-fenster-schatten"
          checked={zustand.schattenAn}
          onChange={(e) => setZustand({ schattenAn: e.target.checked })}
        />
        Schatten anzeigen
      </label>
      <p className="pd3a-kennzahl" data-testid="island-sonne-standort">
        Standort: {standort?.label ?? 'Innerschweiz (Standard)'}
      </p>
      <Hinweis testid="island-sonne-hinweis-nicht-gebaut">
        Standort ändern, Nachbargebäude und der 2h-Schattennachweis sind in diesem Fenster noch
        nicht gebaut (§4.4/§8) — heute nur über die klassische Sonne-Zeile (StandortSuche,
        Manuell-Modus) erreichbar.
      </Hinweis>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 14 · Ebenen — Textur an/aus (echt, `viewport-chrome-runtime.ts`); ein
// echtes Mehrschicht-Sichtbarkeitssystem ist NEU (§4.4).
// ---------------------------------------------------------------------------

function EbenenStufe2() {
  const bereit = useViewportChromeRuntime((s) => s.bereit);
  const texturenAn = useViewportChromeRuntime((s) => s.texturenAn);
  const onTexturToggle = useViewportChromeRuntime((s) => s.onTexturToggle);
  return (
    <div className="pd3a-stufe2" data-testid="island-ebenen-stufe2" onClick={(e) => e.stopPropagation()}>
      <label className="pd3a-zeile">
        <input type="checkbox" data-testid="island-ebenen-textur" checked={texturenAn} onChange={onTexturToggle} disabled={!bereit} />
        Textur
      </label>
      {!bereit ? <Hinweis>Nur bei aktivem 3D-Viewport wirksam (aktuell kein 3D gemountet).</Hinweis> : null}
    </div>
  );
}

function EbenenStufe3() {
  const bereit = useViewportChromeRuntime((s) => s.bereit);
  const texturenAn = useViewportChromeRuntime((s) => s.texturenAn);
  const onTexturToggle = useViewportChromeRuntime((s) => s.onTexturToggle);
  return (
    <div className="pd3a-stufe3" data-testid="island-ebenen-stufe3">
      <label className="pd3a-zeile">
        <input
          type="checkbox"
          data-testid="island-ebenen-fenster-textur"
          checked={texturenAn}
          onChange={onTexturToggle}
          disabled={!bereit}
        />
        Textur
      </label>
      {!bereit ? <Hinweis>Nur bei aktivem 3D-Viewport wirksam (aktuell kein 3D gemountet).</Hinweis> : null}
      <Hinweis testid="island-ebenen-hinweis-neu">
        Ein echtes Mehrschicht-Sichtbarkeitssystem (einzelne Ebenen wie Achsen/Bemassung/Text
        unabhängig ein-/ausblenden) ist NEU (§4.4) — heute gibt es nur diesen einen generischen
        Textur-Schalter; die Kontextzeilen-Gruppe «Ebenen» bündelt daneben fachfremde
        Panel-Toggles (Varianten/Draw/Liste/…) unter demselben Label.
      </Hinweis>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 15 · Trace / 16 · Graph — PD3c (Owner-Befehl 17.07. «alles weg bitte alles
// in die islands...», `docs/ISLAND-UI-SPEZ.md` §6 Sanktion 7): `traceId`/
// `graphAn` leben jetzt im geteilten, additiven `state/plan-ansicht.ts`-Store
// (NICHT persistiert, reiner Laufzeit-Anzeigezustand wie `tool`/`viewMode`
// in `ui-zustand.ts`) statt im vorherigen PlanView-lokalen `useState` — genau
// EIN State, den `PlanView.tsx` UND diese Insel lesen/schreiben. Die PD3a-
// Vorgänger-Fassung («kein eigener Zustand hier») ist damit überholt: diese
// Schalter wirken jetzt ECHT im Grundriss, auch wenn dessen eigene HUD-Zeile
// (`trace-select`/`graph-toggle`) im Island-Modus unsichtbar ist (PD3c blendet
// sie dort aus, s. `PlanView.tsx`s Kopfkommentar zur Rückgabe-JSX). Achsen
// (fünftes von sechs ANSICHT-Werkzeugen) bleibt bewusst UNREGISTRIERT
// (`hatPopup:false`, s. Datei-Kopfkommentar) — sein echter Store-Toggle läuft
// über `island-katalog.ts`s `hatPopup:false`-Pfad direkt in
// `DesignWorkspace.tsx`s `aktiviereIslandWerkzeug()` (Fall `'achsen'`,
// dokumentiert dort), nicht über ein Popup/Fenster hier.
// ---------------------------------------------------------------------------

function TraceAuswahl({ testid }: { testid: string }) {
  const traceId = usePlanAnsicht((s) => s.traceId);
  const setTraceId = usePlanAnsicht((s) => s.setTraceId);
  const revision = useProject((s) => s.revision);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const doc = useProject.getState().doc;
  void revision; // erzwingt Re-Render, wenn sich die Geschossliste ändert
  return (
    <Zeile label="Trace">
      <KSelect size="sm" data-testid={testid} value={traceId} onChange={(e) => setTraceId(e.target.value)}>
        <option value="">Aus</option>
        {doc
          .storeysOrdered()
          .filter((s) => s.id !== activeStoreyId)
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
      </KSelect>
    </Zeile>
  );
}

function TraceStufe2() {
  return (
    <div className="pd3a-stufe2" data-testid="island-trace-stufe2" onClick={(e) => e.stopPropagation()}>
      <TraceAuswahl testid="island-trace-ziel" />
      <p className="pd3a-kennzahl">Wirkt nur im Grundriss (2D) sichtbar — der Store-Wert gilt aber sofort.</p>
    </div>
  );
}

function TraceStufe3() {
  return (
    <div className="pd3a-stufe3" data-testid="island-trace-stufe3">
      <TraceAuswahl testid="island-trace-fenster-ziel" />
      <p className="pd3a-kennzahl">Wirkt nur im Grundriss (2D) sichtbar — der Store-Wert gilt aber sofort.</p>
      <Hinweis testid="island-trace-hinweis">
        Blasses Unterlegen eines anderen Geschosses, reine Bildschirmhilfe — Druck/Export bleiben
        unverändert (`derive/plan.ts`).
      </Hinweis>
    </div>
  );
}

function GraphSchalter({ testid }: { testid: string }) {
  const graphAn = usePlanAnsicht((s) => s.graphAn);
  const setGraphAn = usePlanAnsicht((s) => s.setGraphAn);
  return (
    <label className="pd3a-zeile">
      <input type="checkbox" data-testid={testid} checked={graphAn} onChange={(e) => setGraphAn(e.target.checked)} />
      Raumgraph anzeigen
    </label>
  );
}

function GraphStufe2() {
  return (
    <div className="pd3a-stufe2" data-testid="island-graph-stufe2" onClick={(e) => e.stopPropagation()}>
      <GraphSchalter testid="island-graph-an" />
      <p className="pd3a-kennzahl">Wirkt nur im Grundriss (2D) sichtbar.</p>
    </div>
  );
}

function GraphStufe3() {
  return (
    <div className="pd3a-stufe3" data-testid="island-graph-stufe3">
      <GraphSchalter testid="island-graph-fenster-an" />
      <p className="pd3a-kennzahl">Wirkt nur im Grundriss (2D) sichtbar.</p>
      <Hinweis testid="island-graph-hinweis">
        Knoten auf Raumzentren, Kanten an Raumübergängen — reine Bildschirmhilfe (Finch-Clip),
        kein Planinhalt.
      </Hinweis>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registrierung — 5/6 ANSICHT-Werkzeuge (Achsen bleibt `hatPopup:false`,
// reiner Toggle, s. Kopfkommentar).
// ---------------------------------------------------------------------------

registriereInhalt('darstellung', { Stufe2: DarstellungStufe2, Stufe3: DarstellungStufe3 });
registriereInhalt('sonne', { Stufe2: SonneStufe2, Stufe3: SonneStufe3 });
registriereInhalt('ebenen', { Stufe2: EbenenStufe2, Stufe3: EbenenStufe3 });
registriereInhalt('trace', { Stufe2: TraceStufe2, Stufe3: TraceStufe3 });
registriereInhalt('graph', { Stufe2: GraphStufe2, Stufe3: GraphStufe3 });
