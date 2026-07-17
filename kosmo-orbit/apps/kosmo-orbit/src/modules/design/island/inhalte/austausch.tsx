import { useEffect, useState } from 'react';
import type { Sheet } from '@kosmo/kernel';
import { melde, meldeFehler } from '@kosmo/ui';
import { useProject } from '../../../../state/project-store';
import { nutzungMelden } from '../../../../state/oberflaeche-adaption-kern';
import { syncActive } from '../../../../state/project-sync';
import { exportIfcFile, exportPlanDxf, exportPlanPdf, exportPlanSvg } from '../../export-plan';
import { importIfc } from '../../ifc-import';
import { useUnternehmerplan, verarbeiteUnternehmerplanDatei } from '../../unternehmerplan';
import { OFFENE_LAUF_STATUS, useVisRuntime } from '../../../vis/vis-runtime';
import { registriereInhalt } from './registry';
import './pd3b-inhalte.css';

/**
 * Stufe-2/3-Inhalte der AUSTAUSCH-Insel (Registrierung als Import-
 * Seiteneffekt, s. `registry.ts`-Kopfkommentar). Diese Datei gehört
 * exklusiv dem Paket PD3b — Inhalte je Werkzeug nach
 * `docs/ISLAND-UI-SPEZ.md` §4.4. `manuell` (hatPopup=false, Sofort-
 * Umschaltung wie im Prototyp) bleibt bewusst UNREGISTRIERT — das ist die
 * einzige §4.4-Ausnahme, s. Bauauftrag.
 */

// ═══════════════════════ Deep-Link-Brücke (§8-4) ═══════════════════════════
//
// Rendern/Blätter/Sync gehören heute zu KosmoVis/KosmoPublish/der Shell
// (§3.4-Mapping «Teilweise, andere Station»). Der Fable-Entscheid für PD3b
// ist «Deep-Link-Interim»: Stufe 3 zeigt destillierte Info + einen «Zur
// Station»-Knopf über den BESTEHENDEN Navigations-Weg — denselben
// Mechanismus wie `StationenOrb.tsx`s `onStationOeffnen`-Prop (s. dortiger
// Kopfkommentar: ein einfacher Callback, den `DesignWorkspace.tsx`
// (`aktiviereStation`) an die Komponente durchreicht).
//
// **Owner-Frage §8-4 bleibt offen** (wörtlich verlangt): dieser Callback
// lebt als Closure in `DesignWorkspace.tsx` und wird dort heute NUR an
// `StationenOrb`/`EntwurfsDock` durchgereicht — nicht an `IslandBuehne`
// oder diese Inhalte-Registry. `IslandShell.tsx`/`island-katalog.ts`/
// `DesignWorkspace.tsx` sind ausserhalb des PD3b-Dateikreises (Bauauftrag:
// «NICHTS anderes — keine Bestandsdateien») — die letzte Meile (EIN
// zusätzlicher `registriereStationsWeg(onStationOeffnen)`-Aufruf beim Mount
// von `DesignWorkspace.tsx`) kann PD3b darum nicht selbst schliessen.
//
// Diese Brücke bereitet den ECHTEN Weg vor (kein «native Mini-Kopie» einer
// Vis/Publish-Funktion): sobald die eine Zeile in `DesignWorkspace.tsx`
// nachgezogen ist, wirkt der Knopf unten sofort echt. Bis dahin zeigt das
// Fenster ehrlich, dass die Verdrahtung fehlt.
export type StationsZiel = 'vis' | 'publish' | 'prepare' | 'data' | 'design';
type StationsWeg = (ziel: StationsZiel) => void;

let stationsWeg: StationsWeg | undefined;

/** Von `DesignWorkspace.tsx` (Integrationspunkt, ausserhalb dieses
 *  Dateikreises) oder einem Test aufzurufen. */
export function registriereStationsWeg(weg: StationsWeg | undefined): void {
  stationsWeg = weg;
}

/** `true` = echte Navigation ausgelöst; `false` = Brücke noch unverdrahtet. */
export function versucheStationZuOeffnen(ziel: StationsZiel): boolean {
  if (!stationsWeg) return false;
  stationsWeg(ziel);
  return true;
}

function ZurStationKnopf({ werkzeugId, ziel, label }: { werkzeugId: string; ziel: StationsZiel; label: string }) {
  const [ungewirkt, setUngewirkt] = useState(false);
  return (
    <div className="pd3b-block">
      <button
        type="button"
        className="pd3b-knopf"
        data-testid={`island-${werkzeugId}-zur-station`}
        onClick={() => setUngewirkt(!versucheStationZuOeffnen(ziel))}
      >
        Zur Station ({label})
      </button>
      {ungewirkt && (
        <p className="pd3b-hinweis" data-testid={`island-${werkzeugId}-zur-station-hinweis`}>
          Navigation ist vorbereitet, aber `DesignWorkspace.tsx` reicht den Weg (`onStationOeffnen`)
          noch nicht an diese Insel durch (ausserhalb des PD3b-Dateikreises) — Owner-Frage §8-4
          bleibt offen.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────── Export ────────────────────────────────────

function ExportKnoepfe() {
  return (
    // `onClick` stoppt die Bubble-Weiterleitung an `IslandShell.tsx`s
    // `.isl-popup`-Wrapper (`onClick={aufPopupKlick}`, §4.1 «2. Klick auf
    // Symbol ODER Popup» eskaliert zu Stufe 3) — sonst würde jeder
    // Export-Klick die Insel zusätzlich zum Fenster eskalieren, statt nur
    // den Export auszulösen.
    <div className="pd3b-knopfreihe" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="pd3b-knopf"
        data-testid="island-export-pdf"
        onClick={() => {
          nutzungMelden('export:pdf');
          void exportPlanPdf();
        }}
      >
        PDF
      </button>
      <button
        type="button"
        className="pd3b-knopf"
        data-testid="island-export-svg"
        onClick={() => {
          nutzungMelden('export:svg');
          exportPlanSvg();
        }}
      >
        SVG
      </button>
      <button
        type="button"
        className="pd3b-knopf"
        data-testid="island-export-dxf"
        onClick={() => {
          nutzungMelden('export:dxf');
          exportPlanDxf();
        }}
      >
        DXF
      </button>
      <button
        type="button"
        className="pd3b-knopf"
        data-testid="island-export-ifc"
        onClick={() => {
          nutzungMelden('export:ifc');
          exportIfcFile();
        }}
      >
        IFC
      </button>
    </div>
  );
}

function ExportStufe2() {
  return (
    <div className="pd3b-liste" data-testid="island-export-stufe2">
      <ExportKnoepfe />
    </div>
  );
}

function ExportStufe3() {
  return (
    <div className="pd3b-liste" data-testid="island-export-stufe3">
      <ExportKnoepfe />
      <p className="pd3b-hinweis">
        PDF/SVG: Grundriss des aktiven Geschosses (Massstab nach Plan-Phase). DXF: dieselbe
        Geometrie für AutoCAD/Rhino/Vectorworks (R2000/AC1015). IFC: das ganze Modell (IFC4).
      </p>
    </div>
  );
}

// ─────────────────────────────── Import ────────────────────────────────────

function waehleDateiUndVerarbeite(accept: string, verarbeite: (datei: File) => void | Promise<void>): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = () => {
    const datei = input.files?.[0];
    if (!datei) return;
    void verarbeite(datei);
  };
  input.click();
}

function importIfcKlick(): void {
  nutzungMelden('export:import-ifc');
  waehleDateiUndVerarbeite('.ifc', async (datei) => {
    try {
      const ergebnis = await importIfc(new Uint8Array(await datei.arrayBuffer()));
      const bauteile = ergebnis.erkannt.waende.length + ergebnis.erkannt.decken.length;
      melde(
        `IFC gelesen: ${ergebnis.elementCount} Elemente (${ergebnis.schema}), ${bauteile} erkannte Bauteile. ` +
          'Hinweis: die 3D-Kontext-Anzeige im Viewport lebt als lokaler Zustand in DesignWorkspace.tsx ' +
          '(ausserhalb des PD3b-Dateikreises) — hier nur der ehrliche Parse-Bericht.',
        { ton: 'info' },
      );
    } catch (err) {
      meldeFehler(err);
    }
  });
}

function importDxfKlick(): void {
  nutzungMelden('export:import-dxf');
  waehleDateiUndVerarbeite('.dxf,.dwg,.pdf', (datei) => verarbeiteUnternehmerplanDatei(datei));
}

function ImportKnoepfe() {
  return (
    // s. Kommentar in `ExportKnoepfe` — stoppt dieselbe Eskalations-Bubble.
    <div className="pd3b-knopfreihe" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="pd3b-knopf" data-testid="island-import-ifc" onClick={importIfcKlick}>
        IFC laden
      </button>
      <button type="button" className="pd3b-knopf" data-testid="island-import-dxf" onClick={importDxfKlick}>
        DXF laden
      </button>
    </div>
  );
}

function ImportStufe2() {
  return (
    <div className="pd3b-liste" data-testid="island-import-stufe2">
      <ImportKnoepfe />
    </div>
  );
}

/** DXF-Import läuft über den geteilten Store `useUnternehmerplan` (derselbe
 *  Weg wie `UnternehmerplanPanel.tsx`/der klassische `import-dxf`-Knopf) —
 *  Stufe 3 zeigt den zuletzt geladenen Stand live mit. IFC-Import hat KEINEN
 *  geteilten Ergebnis-Store (`ContextMesh[]` landet nur im lokalen
 *  DesignWorkspace-`useState`) — ehrlich als Lücke benannt statt verschwiegen. */
function ImportStufe3() {
  const dateiname = useUnternehmerplan((s) => s.dateiname);
  const fehler = useUnternehmerplan((s) => s.fehler);
  const abgleich = useUnternehmerplan((s) => s.abgleich);
  return (
    <div className="pd3b-liste" data-testid="island-import-stufe3">
      <ImportKnoepfe />
      {dateiname && !fehler && (
        <p className="pd3b-hinweis" data-testid="island-import-dxf-status">
          Zuletzt geladen: «{dateiname}» — {abgleich?.befunde.length ?? 0} Abweichung(en) zum
          Architektenplan.
        </p>
      )}
      {fehler && (
        <p className="pd3b-hinweis" data-testid="island-import-dxf-status">
          Letzter DXF-Import fehlgeschlagen: {fehler}
        </p>
      )}
      <p className="pd3b-hinweis">
        IFC-Import parst echt (web-ifc), aber der 3D-Kontext-Bestand (graue Referenzgeometrie im
        Viewport) lebt nur als lokaler Zustand in DesignWorkspace.tsx — von dieser Insel aus nicht
        erreichbar (ausserhalb des PD3b-Dateikreises).
      </p>
    </div>
  );
}

// ─────────────────────────────── Rendern ───────────────────────────────────

function laufZaehlung(laeufe: Record<string, { status: string }>): { laufend: number; fertig: number; fehler: number; gesamt: number } {
  const alle = Object.values(laeufe);
  const offen: readonly string[] = OFFENE_LAUF_STATUS;
  return {
    laufend: alle.filter((l) => offen.includes(l.status)).length,
    fertig: alle.filter((l) => l.status === 'fertig').length,
    fehler: alle.filter((l) => l.status === 'fehler').length,
    gesamt: alle.length,
  };
}

function RendernStufe2() {
  const laeufe = useVisRuntime((s) => s.laeufe);
  const { laufend, fertig, fehler, gesamt } = laufZaehlung(laeufe);
  return (
    <div className="pd3b-liste" data-testid="island-rendern-stufe2">
      {gesamt === 0 ? (
        <p className="pd3b-hinweis" data-testid="island-rendern-status">
          Kein Render-Lauf in dieser Sitzung.
        </p>
      ) : (
        <>
          <div className="pd3b-zeile">
            <span>Laufend</span>
            <strong data-testid="island-rendern-status">{laufend}</strong>
          </div>
          <div className="pd3b-zeile">
            <span>Fertig</span>
            <strong>{fertig}</strong>
          </div>
          <div className="pd3b-zeile">
            <span>Fehler</span>
            <strong>{fehler}</strong>
          </div>
        </>
      )}
    </div>
  );
}

function RendernStufe3() {
  const laeufe = useVisRuntime((s) => s.laeufe);
  const { laufend, fertig, fehler, gesamt } = laufZaehlung(laeufe);
  return (
    <div className="pd3b-liste" data-testid="island-rendern-stufe3">
      <p className="pd3b-hinweis">
        {gesamt === 0
          ? 'Kein Render-Lauf bekannt — Node-Läufe entstehen im Render-Graph (KosmoVis, NodeCanvas.tsx).'
          : `${gesamt} Lauf/Läufe insgesamt: ${laufend} laufend, ${fertig} fertig, ${fehler} fehlgeschlagen.`}
      </p>
      <ZurStationKnopf werkzeugId="rendern" ziel="vis" label="KosmoVis" />
    </div>
  );
}

// ─────────────────────────────── Blätter ───────────────────────────────────

/** Blätter leben als `sheet`-Entitäten im GETEILTEN Projekt-Doc (nicht als
 *  PublishWorkspace-lokaler Zustand) — direkt über `useProject` lesbar,
 *  kein Deep-Link für die reine Zahl nötig, nur fürs Bearbeiten selbst. */
function BlaetterStufe2() {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  void revision;
  const anzahl = doc.byKind<Sheet>('sheet').length;
  return (
    <div className="pd3b-liste" data-testid="island-blaetter-stufe2">
      <div className="pd3b-zeile">
        <span>Blätter</span>
        <strong data-testid="island-blaetter-anzahl">{anzahl}</strong>
      </div>
    </div>
  );
}

function BlaetterStufe3() {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  void revision;
  const sheets = doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index);
  return (
    <div className="pd3b-liste" data-testid="island-blaetter-stufe3">
      {sheets.length === 0 ? (
        <p className="pd3b-hinweis">Noch kein Blatt angelegt.</p>
      ) : (
        <ul className="pd3b-hinweis" style={{ margin: 0, paddingLeft: '1.1em' }}>
          {sheets.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>
      )}
      <ZurStationKnopf werkzeugId="blaetter" ziel="publish" label="KosmoPublish" />
    </div>
  );
}

// ──────────────────────────────── Sync ─────────────────────────────────────

/**
 * `syncActive()` ist ein reiner Getter (`client.verbunden`, `project-
 * sync.ts`) — nicht reaktiv. Peers/Wartend gibt es NUR über
 * `onSyncStatus()`, ein Einzel-Slot-Listener, den `App.tsx` bereits belegt
 * (`statusListener`, `project-sync.ts` Z. 14/46) — ein zweiter Aufruf
 * hier würde App.tsx' Kopfzeilen-Anzeige stillschweigend ERSETZEN
 * (Bestandsänderung, verboten). Darum: leichtes Polling nur für den
 * verbunden/getrennt-Status, Peers ehrlich als Lücke benannt.
 */
function useSyncVerbunden(): boolean {
  const [verbunden, setVerbunden] = useState(() => syncActive());
  useEffect(() => {
    const intervall = window.setInterval(() => setVerbunden(syncActive()), 500);
    return () => window.clearInterval(intervall);
  }, []);
  return verbunden;
}

function SyncStufe2() {
  const verbunden = useSyncVerbunden();
  return (
    <div className="pd3b-liste" data-testid="island-sync-stufe2">
      <div className="pd3b-zeile">
        <span>Status</span>
        <strong data-testid="island-sync-status">{verbunden ? 'Verbunden' : 'Getrennt'}</strong>
      </div>
    </div>
  );
}

function SyncStufe3() {
  const verbunden = useSyncVerbunden();
  return (
    <div className="pd3b-liste" data-testid="island-sync-stufe3">
      <div className="pd3b-zeile">
        <span>Status</span>
        <strong>{verbunden ? 'Verbunden' : 'Getrennt'}</strong>
      </div>
      <p className="pd3b-hinweis">
        Peer-Zahl ist hier ehrlich nicht verfügbar: `onSyncStatus()` ist ein Einzel-Slot-Listener,
        den App.tsx bereits für die Kopfzeile belegt — ein zweiter Aufruf würde diese Anzeige
        stillschweigend ersetzen (Bestandsänderung), darum unterlässt diese Insel das.
      </p>
      <p className="pd3b-hinweis">
        Sync ist Shell-Ebene, keine eigene Station (§3.4) — der reale Weg bleibt der
        Kopfzeilen-Knopf (`sync-toggle`), von dieser Insel aus (ausserhalb des PD3b-Dateikreises)
        nicht auslösbar. Owner-Frage §8-4 gilt auch hier.
      </p>
    </div>
  );
}

// ──────────────────────────── Registrierung ────────────────────────────────
// `manuell` bleibt bewusst unregistriert (hatPopup=false, Sofort-Umschaltung,
// s. Datei-Kopfkommentar).

registriereInhalt('export', { Stufe2: ExportStufe2, Stufe3: ExportStufe3 });
registriereInhalt('import', { Stufe2: ImportStufe2, Stufe3: ImportStufe3 });
registriereInhalt('rendern', { Stufe2: RendernStufe2, Stufe3: RendernStufe3 });
registriereInhalt('blaetter', { Stufe2: BlaetterStufe2, Stufe3: BlaetterStufe3 });
registriereInhalt('sync', { Stufe2: SyncStufe2, Stufe3: SyncStufe3 });
