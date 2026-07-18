import { useMemo, useState } from 'react';
import {
  areaReport,
  deriveBerechnungsliste,
  phaseLabel,
  pruefeGrundriss,
  siaPhaseLabel,
  type BauPhase,
  type Kommentar,
  type SiaPhase,
  type Zone,
} from '@kosmo/kernel';
import { KButton, KInput, KSelect, meldeFehler } from '@kosmo/ui';
import { useProject } from '../../../../state/project-store';
import { useUiZustand } from '../../../../state/ui-zustand';
import { empfohlenePlanPhaseFuer } from '../../phasen-presets';
import { KennzahlenPanel } from '../../KennzahlenPanel';
import { SubmissionsCheckPanel } from '../../SubmissionsCheckPanel';
import { VariantenPanel } from '../../VariantenPanel';
import { BerechnungslistePanel } from '../../BerechnungslistePanel';
import { registriereInhalt } from './registry';
import './pd3b-inhalte.css';

/**
 * Stufe-2/3-Inhalte der PROJEKT-Insel (Registrierung als Import-
 * Seiteneffekt, s. `registry.ts`-Kopfkommentar). Diese Datei gehört
 * exklusiv dem Paket PD3b — Inhalte je Werkzeug nach
 * `docs/ISLAND-UI-SPEZ.md` §4.4.
 *
 * **Fund (wichtig für alle sechs Werkzeuge hier):** `DesignWorkspace.tsx`
 * rendert `DockFlaeche` (die Heimat von `KennzahlenPanel`/`VariantenPanel`/
 * `BerechnungslistePanel`/`SubmissionsCheckPanel`) NUR, wenn
 * `designOberflaeche === 'manuell'` ist (`DesignWorkspace.tsx` Z. 3147).
 * Im Island-Modus existieren diese Panels visuell NIRGENDS — dieses
 * Fenster (Stufe 3) ist darum nicht nur eine «Destillation», sondern für
 * Kennzahlen/Checks/Varianten/Liste der EINZIGE Ort, an dem man sie im
 * Island-Modus überhaupt zu sehen bekommt. Deshalb betten diese vier
 * Stufe-3-Komponenten die ECHTEN Bestands-Panels direkt ein (dieselben
 * Stores/Commands, kein Duplikat) statt sie nachzubauen — «über bestehende
 * Stores/Commands», wörtlich wie im Bauauftrag verlangt.
 */

const fmt = (m2: number) => (m2 >= 100 ? Math.round(m2).toLocaleString('de-CH') : m2.toFixed(1));

// ─────────────────────────── Kennzahlen ────────────────────────────────────

function KennzahlenStufe2() {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  const report = useMemo(() => areaReport(doc), [doc, revision]);
  const hasZones = report.totalNgf > 0;
  const hasMasses = report.gfVolumen > 0;
  return (
    <div className="pd3b-liste" data-testid="island-kennzahlen-stufe2">
      {hasZones ? (
        <>
          <div className="pd3b-zeile">
            <span>NGF</span>
            <strong data-testid="island-kennzahlen-ngf">{fmt(report.totalNgf)} m²</strong>
          </div>
          <div className="pd3b-zeile">
            <span>aGF-Ziel</span>
            <strong>{fmt(report.agfZiel)} m²</strong>
          </div>
          <div className="pd3b-zeile">
            <span>GF-Schätzung</span>
            <strong>{fmt(report.gfSchaetzung)} m²</strong>
          </div>
        </>
      ) : hasMasses ? (
        <div className="pd3b-zeile">
          <span>GF Volumenstudie</span>
          <strong data-testid="island-kennzahlen-ngf">{fmt(report.gfVolumen)} m²</strong>
        </div>
      ) : (
        <p className="pd3b-hinweis" data-testid="island-kennzahlen-ngf">
          Keine Fläche — zeichne Zonen oder Volumen.
        </p>
      )}
    </div>
  );
}

function KennzahlenStufe3() {
  return (
    <div className="pd3b-eingebettet" data-testid="island-kennzahlen-stufe3">
      <KennzahlenPanel />
    </div>
  );
}

// ────────────────────────────── Checks ─────────────────────────────────────

function ChecksStufe2() {
  const revision = useProject((s) => s.revision);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const doc = useProject.getState().doc;
  const [filter, setFilter] = useState<'alle' | 'fehler'>('alle');
  const befunde = useMemo(
    () => (activeStoreyId ? pruefeGrundriss(doc, activeStoreyId) : []),
    [doc, revision, activeStoreyId],
  );
  const fehlerAnzahl = befunde.filter((b) => b.schwere === 'fehler').length;
  const sichtbareAnzahl = filter === 'alle' ? befunde.length : fehlerAnzahl;
  return (
    // `onClick` stoppt die Bubble-Weiterleitung an `IslandShell.tsx`s
    // `.isl-popup`-Wrapper (dort `onClick={aufPopupKlick}` — «2. Klick auf
    // Symbol ODER POPUP» eskaliert laut §4.1 zu Stufe 3). Ohne diesen Stop
    // würde JEDER Klick auf die Filter-Knöpfe unten die Insel sofort zum
    // Fenster eskalieren, statt den Filter zu setzen — dieselbe Abwehr, die
    // `IslandShell.tsx`s eigener «✕»-Schliessen-Knopf schon nutzt.
    <div className="pd3b-liste" data-testid="island-checks-stufe2" onClick={(e) => e.stopPropagation()}>
      <div className="pd3b-zeile">
        <span>Befunde</span>
        <strong data-testid="island-checks-anzahl">{sichtbareAnzahl}</strong>
      </div>
      <div className="pd3b-knopfreihe">
        <button
          type="button"
          className={`pd3b-knopf${filter === 'alle' ? ' pd3b-knopf-aktiv' : ''}`}
          data-testid="island-checks-filter-alle"
          onClick={() => setFilter('alle')}
        >
          Alle
        </button>
        <button
          type="button"
          className={`pd3b-knopf${filter === 'fehler' ? ' pd3b-knopf-aktiv' : ''}`}
          data-testid="island-checks-filter-fehler"
          onClick={() => setFilter('fehler')}
        >
          Nur Fehler
        </button>
      </div>
    </div>
  );
}

function ChecksStufe3() {
  return (
    <div className="pd3b-eingebettet-stapel" data-testid="island-checks-stufe3">
      <KennzahlenPanel />
      <SubmissionsCheckPanel onClose={() => useUiZustand.getState().setSubmissionOffen(false)} />
    </div>
  );
}

// ───────────────────────────── Varianten ───────────────────────────────────

/**
 * Der Live-Zähler «N Varianten geprüft» (`varianten-panel-zaehler`) ist
 * Laufzeit-`useState` INNERHALB `VariantenPanel.tsx` selbst (Datei-
 * Kopfkommentar dort: «Laufzeit ≠ Modell», kein globaler Store, weil bisher
 * nur dieses eine Panel ihn braucht) — von aussen nicht lesbar, ohne das
 * Panel zu mounten. Die Insel zeigt deshalb ehrlich einen ANDEREN, doch
 * echten Modell-Wert (bereits im Doc bestätigte Einheiten aus einer
 * früheren Segmentierung, `Zone.program`) statt eine Attrappe des
 * Such-Zählers.
 */
function VariantenStufe2() {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  const einheitenAnzahl = useMemo(
    () => doc.byKind<Zone>('zone').filter((z) => Boolean(z.program)).length,
    [doc, revision],
  );
  return (
    <div className="pd3b-liste" data-testid="island-varianten-stufe2">
      <div className="pd3b-zeile">
        <span>Einheiten im Modell</span>
        <strong data-testid="island-varianten-anzahl">{einheitenAnzahl}</strong>
      </div>
      <p className="pd3b-hinweis">Live-Zähler «N Varianten geprüft» startet im Fenster (echtes Panel).</p>
    </div>
  );
}

function VariantenStufe3() {
  return (
    <div className="pd3b-eingebettet" data-testid="island-varianten-stufe3">
      <VariantenPanel onClose={() => useUiZustand.getState().setVariantenPanelOffen(false)} />
    </div>
  );
}

// ─────────────────────────────── Phase ─────────────────────────────────────

const BAU_PHASEN: readonly BauPhase[] = ['wettbewerb', 'vorprojekt', 'bauprojekt', 'baueingabe', 'werkplan'];
const SIA_PHASEN: readonly SiaPhase[] = [
  'strategie',
  'wettbewerb',
  'vorprojekt',
  'bauprojekt',
  'bewilligung',
  'ausschreibung',
  'ausfuehrung',
  'abnahme',
];

/** Zwei Schnellwahlen — dieselben Commands wie das bestehende Projekt-Menü
 *  (`design.phaseSetzen`/`design.siaPhaseSetzen`, `DesignWorkspace.tsx`
 *  Z. 2792/2840), hier destilliert auf die zwei Selects ohne die
 *  Bemassungs-/Massstab-Nebeneffekte des Menüs (die bleiben dort). */
function PhaseAuswahl() {
  const revision = useProject((s) => s.revision);
  void revision;
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  return (
    // s. Kommentar in `ChecksStufe2` — stoppt die Eskalations-Bubble zu
    // Stufe 3, damit die KSelect-Trigger unten tatsächlich anwählbar sind.
    <div className="pd3b-liste" data-testid="island-phase-auswahl" onClick={(e) => e.stopPropagation()}>
      <label className="pd3b-feld">
        <span>Plan-Phase</span>
        <KSelect
          size="sm"
          value={doc.settings.phase}
          data-testid="island-phase-plan-select"
          onChange={(e) => runCommand('design.phaseSetzen', { phase: e.target.value as BauPhase })}
        >
          {BAU_PHASEN.map((p) => (
            <option key={p} value={p}>
              {phaseLabel(p)}
            </option>
          ))}
        </KSelect>
      </label>
      <label className="pd3b-feld">
        <span>SIA-Teilphase</span>
        <KSelect
          size="sm"
          value={doc.settings.siaPhase}
          data-testid="island-phase-sia-select"
          onChange={(e) => runCommand('design.siaPhaseSetzen', { siaPhase: e.target.value as SiaPhase })}
        >
          {SIA_PHASEN.map((p) => (
            <option key={p} value={p}>
              {siaPhaseLabel(p)}
            </option>
          ))}
        </KSelect>
      </label>
    </div>
  );
}

function PhaseStufe3() {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  void revision;
  const empfohlen = empfohlenePlanPhaseFuer(doc.settings.siaPhase);
  return (
    <div className="pd3b-liste" data-testid="island-phase-stufe3">
      <PhaseAuswahl />
      <p className="pd3b-hinweis">
        Plan-Phase steuert die Detaillierung (Poché/Schraffuren/Massstab), SIA-Teilphase den
        realen Projektstand — beide sind bewusst NICHT gekoppelt (Owner entscheidet selbst).
        Zur aktuellen Teilphase «{siaPhaseLabel(doc.settings.siaPhase)}» passt Plan-Phase «
        {phaseLabel(empfohlen)}».
      </p>
    </div>
  );
}

// ─────────────────────────────── Liste ─────────────────────────────────────

function ListeStufe2() {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  const liste = useMemo(() => deriveBerechnungsliste(doc), [doc, revision]);
  return (
    <div className="pd3b-liste" data-testid="island-liste-stufe2">
      <div className="pd3b-zeile">
        <span>Einträge</span>
        <strong data-testid="island-liste-eintraege">{liste.zeilen.length}</strong>
      </div>
      <div className="pd3b-zeile">
        <span>Total GF</span>
        <strong>{fmt(liste.totalGf)} m²</strong>
      </div>
    </div>
  );
}

function ListeStufe3() {
  const [wohnungstyp, setWohnungstyp] = useState<string | null>(null);
  return (
    <div className="pd3b-eingebettet" data-testid="island-liste-stufe3">
      <BerechnungslistePanel
        wohnungstyp={wohnungstyp}
        setWohnungstyp={setWohnungstyp}
        onClose={() => useUiZustand.getState().setListeOffen(false)}
      />
    </div>
  );
}

// ────────────────────────────── Kommentare ─────────────────────────────────

/**
 * v0.8.3 E1 (§1, docs/V083-SPEZ.md, Island-§8-Freigabe §8-6) — die Owner-
 * Frage §8-6 ist beantwortet (`Kommentar`-Entity + `design.kommentarSetzen`/
 * `-StatusSetzen`/`-Loeschen`, `packages/kosmo-kernel/src/model/entities.ts`/
 * `commands/design.ts`). Diese Insel bekommt echten Inhalt: Liste,
 * Erfassen-Formular, Status-Umschalter.
 *
 * Zusammenspiel mit dem Klickmodus (E3, `DesignWorkspace.tsx`s
 * `punktSetzen()`, `tool === 'kommentar'`): ein Klick im Plan/Viewport setzt
 * NUR den Welt-mm-Punkt (`useUiZustand().kommentarPunkt` — reine UI-Brücke,
 * geht nie durchs Doc) — Text/Autor sind Pflichtfelder des Commands, die ein
 * blosser Klick nicht liefern kann. `KommentarErfassen` zeigt das
 * Formular erst, sobald ein Punkt gesetzt ist, und committet
 * `design.kommentarSetzen` erst beim Absenden.
 */
function KommentarErfassen() {
  const runCommand = useProject((s) => s.runCommand);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const kommentarPunkt = useUiZustand((s) => s.kommentarPunkt);
  const setKommentarPunkt = useUiZustand((s) => s.setKommentarPunkt);
  const [text, setText] = useState('');
  const [autor, setAutor] = useState('');

  if (!kommentarPunkt) {
    return (
      <p className="pd3b-hinweis" data-testid="island-kommentar-hinweis-punkt">
        Werkzeug «Kommentar» wählen und einen Punkt im Plan/Viewport anklicken, um einen neuen
        Kommentar zu erfassen.
      </p>
    );
  }

  const gueltig = text.trim().length > 0 && autor.trim().length > 0;
  const absenden = () => {
    if (!gueltig) return;
    try {
      runCommand('design.kommentarSetzen', {
        text: text.trim(),
        autor: autor.trim(),
        at: kommentarPunkt,
        ...(activeStoreyId ? { storeyId: activeStoreyId } : {}),
        erstelltAm: new Date().toLocaleDateString('de-CH'),
      });
      setText('');
      setKommentarPunkt(null);
    } catch (err) {
      meldeFehler(err);
    }
  };

  return (
    <div className="pd3b-block" data-testid="island-kommentar-erfassen" onClick={(e) => e.stopPropagation()}>
      <label className="pd3b-feld">
        <span>Text</span>
        <KInput size="sm" data-testid="island-kommentar-text" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <label className="pd3b-feld">
        <span>Autor</span>
        <KInput size="sm" data-testid="island-kommentar-autor" value={autor} onChange={(e) => setAutor(e.target.value)} />
      </label>
      <KButton size="sm" data-testid="island-kommentar-setzen" disabled={!gueltig} onClick={absenden}>
        Kommentar setzen
      </KButton>
    </div>
  );
}

/** Erledigungsdatum kommt von der App (`toLocaleDateString('de-CH')`), NIE
 *  aus dem Kernel — dieselbe Regel wie überall (`Mangel`/`Kommentar`-
 *  Kommentar in `model/entities.ts`). */
function KommentareListe({ begrenzen }: { begrenzen?: number }) {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  const runCommand = useProject((s) => s.runCommand);
  const alle = useMemo(() => doc.byKind<Kommentar>('kommentar'), [doc, revision]);
  if (alle.length === 0) {
    return (
      <p className="pd3b-hinweis" data-testid="island-kommentare-leer">
        Noch keine Kommentare.
      </p>
    );
  }
  const sichtbar = begrenzen ? alle.slice(0, begrenzen) : alle;
  return (
    <div className="pd3b-liste" data-testid="island-kommentare-liste">
      {sichtbar.map((k) => (
        <div className="pd3b-zeile" key={k.id} onClick={(e) => e.stopPropagation()}>
          <span>
            {k.status === 'erledigt' ? '✓ ' : ''}
            {k.text}
          </span>
          <KButton
            size="sm"
            tone="quiet"
            data-testid="island-kommentar-status-umschalten"
            onClick={() =>
              runCommand('design.kommentarStatusSetzen', {
                kommentarId: k.id,
                status: k.status === 'offen' ? 'erledigt' : 'offen',
                ...(k.status === 'offen' ? { erledigtAm: new Date().toLocaleDateString('de-CH') } : {}),
              })
            }
          >
            {k.status === 'offen' ? 'Erledigt' : 'Wieder öffnen'}
          </KButton>
        </div>
      ))}
    </div>
  );
}

function KommentareStufe2() {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  const offenAnzahl = useMemo(
    () => doc.byKind<Kommentar>('kommentar').filter((k) => k.status === 'offen').length,
    [doc, revision],
  );
  return (
    <div className="pd3b-liste" data-testid="island-kommentare-stufe2" onClick={(e) => e.stopPropagation()}>
      <div className="pd3b-zeile">
        <span>Offen</span>
        <strong data-testid="island-kommentare-anzahl">{offenAnzahl}</strong>
      </div>
      <KommentarErfassen />
    </div>
  );
}

function KommentareStufe3() {
  return (
    <div className="pd3b-liste" data-testid="island-kommentare-stufe3">
      <KommentarErfassen />
      <KommentareListe />
    </div>
  );
}

// ──────────────────────────── Registrierung ────────────────────────────────

registriereInhalt('kennzahlen', { Stufe2: KennzahlenStufe2, Stufe3: KennzahlenStufe3 });
registriereInhalt('checks', { Stufe2: ChecksStufe2, Stufe3: ChecksStufe3 });
registriereInhalt('varianten', { Stufe2: VariantenStufe2, Stufe3: VariantenStufe3 });
registriereInhalt('phase', { Stufe2: PhaseAuswahl, Stufe3: PhaseStufe3 });
registriereInhalt('liste', { Stufe2: ListeStufe2, Stufe3: ListeStufe3 });
registriereInhalt('kommentare', { Stufe2: KommentareStufe2, Stufe3: KommentareStufe3 });
