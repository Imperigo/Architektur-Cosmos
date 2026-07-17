import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  areaOf,
  assemblyThickness,
  dist,
  formatArea,
  formatLength,
  treppenTeile,
  type Assembly,
  type MassBody,
  type Opening,
  type Roof,
  type Stair,
  type Storey,
  type Wall,
  type Zone,
} from '@kosmo/kernel';
import { KButton, KInput, KSelect, meldeFehler } from '@kosmo/ui';
import { useProject, type ProjectState } from '../../../../state/project-store';
import { useUiZustand } from '../../../../state/ui-zustand';
import { Inspector } from '../../Inspector';
import { registriereInhalt } from './registry';
import './pd3a.css';

/**
 * Stufe-2/3-Inhalte der ZEICHNEN-Insel (PD3a, `docs/ISLAND-UI-SPEZ.md` §4.4
 * ZEICHNEN-Tabelle). Diese Datei gehört exklusiv PD3a — Registrierung als
 * Import-Seiteneffekt, s. `registry.ts`-Kopfkommentar.
 *
 * **Wirkweg (verbindlich):** jede Modelländerung läuft über
 * `useProject().runCommand` (Command→Patch→Undo/Sync) — nie am Store vorbei.
 * Wo ein Werkzeug HEUTE nur über lokalen `useState` in `DesignWorkspace.tsx`
 * wirkt (z.B. `assemblyId`/`treppenForm`, ausserhalb dieses Dateikreises),
 * destilliert dieser Inhalt stattdessen die Bearbeitung der AUSGEWÄHLTEN
 * Entität über `design.eigenschaftSetzen` — ein echter, undo-fähiger Weg, der
 * ohne Zugriff auf jene lokalen States auskommt. Wo gar keine Bearbeitung
 * existiert (Treppe/Stütze-Querschnitt), zeigt der Inhalt ehrlich Status
 * statt eine Attrappe.
 */

// ---------------------------------------------------------------------------
// Dateilokale Bausteine (Stufe2/3 dieser Datei teilen sie sich — keine dritte
// Datei nötig, Dateikreis bleibt exklusiv zeichnen.tsx/ansicht.tsx).
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

type RunCommand = ProjectState['runCommand'];

/** `design.eigenschaftSetzen` — der generische Feld-Setter (Wand/Dach/Zone/
 *  Volumen/Öffnung), fängt `CommandError` wie `Inspector.tsx`/`RasterPanel.tsx`. */
function setzeEigenschaft(runCommand: RunCommand, entityId: string, feld: string, wert: string | number): void {
  try {
    runCommand('design.eigenschaftSetzen', { entityId, feld, wert });
  } catch (err) {
    meldeFehler(err);
  }
}

/** Die aktuell ausgewählte Entität (erstes Element von `selection`) — 1:1
 *  dasselbe Muster wie `Inspector.tsx` (`selection`/`revision`-Abhängigkeit,
 *  `doc` per `getState()` statt Selektor, da `KosmoDoc` selbst keine stabile
 *  Objekt-Identität pro Feldänderung hat). */
function useAusgewaehlteEntitaet() {
  const selection = useProject((s) => s.selection);
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  return useMemo(() => {
    const id = selection[0];
    return id ? (doc.get(id) ?? null) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, doc, revision]);
}

const KIND_LABEL: Record<string, string> = {
  wall: 'Wand',
  slab: 'Decke',
  roof: 'Dach',
  zone: 'Zone',
  mass: 'Volumen',
  opening: 'Öffnung',
  freemesh: 'Mesh',
  stair: 'Treppe',
  column: 'Stütze',
  beam: 'Unterzug',
  grid: 'Achse',
};

// ---------------------------------------------------------------------------
// 1 · Auswahl — Stufe 2: Anzahl/Kind-Filter · Stufe 3: Inspector.tsx (1:1
// importiert, bereits das volle Eigenschaften-Panel für die Auswahl).
// ---------------------------------------------------------------------------

function AuswahlStufe2() {
  const selection = useProject((s) => s.selection);
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  const kinds = useMemo(() => {
    const zaehler = new Map<string, number>();
    for (const id of selection) {
      const e = doc.get(id);
      if (e) zaehler.set(e.kind, (zaehler.get(e.kind) ?? 0) + 1);
    }
    return [...zaehler.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, doc, revision]);
  return (
    <div className="pd3a-stufe2" data-testid="island-auswahl-stufe2" onClick={(e) => e.stopPropagation()}>
      <p className="pd3a-kennzahl">{selection.length} ausgewählt</p>
      {kinds.length > 0 ? (
        <ul className="pd3a-liste">
          {kinds.map(([kind, n]) => (
            <li key={kind}>
              {KIND_LABEL[kind] ?? kind} × {n}
            </li>
          ))}
        </ul>
      ) : (
        <Hinweis>Keine Auswahl — Klick auf ein Element im Viewer wählt es aus.</Hinweis>
      )}
    </div>
  );
}

function AuswahlStufe3() {
  const selection = useProject((s) => s.selection);
  return (
    <div className="pd3a-stufe3" data-testid="island-auswahl-stufe3">
      <p className="pd3a-titel">Eigenschaften (destilliert aus Inspector.tsx)</p>
      {selection.length > 0 ? <Inspector /> : <Hinweis>Keine Auswahl.</Hinweis>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2 · Wand — Referenzmuster, voll ausgebaut.
// ---------------------------------------------------------------------------

function AufbauKatalogTabelle({
  aufbauten,
  aktivId,
  onAnwenden,
}: {
  aufbauten: readonly Assembly[];
  aktivId: string | null;
  onAnwenden: ((id: string) => void) | null;
}) {
  return (
    <table className="pd3a-tabelle" data-testid="island-wand-aufbau-katalog">
      <thead>
        <tr>
          <th>Aufbau</th>
          <th>Dicke</th>
          <th>Tragend</th>
          {onAnwenden ? <th /> : null}
        </tr>
      </thead>
      <tbody>
        {aufbauten.map((a) => {
          const tragend = a.layers.some((l) => l.function === 'tragend');
          return (
            <tr key={a.id} className={aktivId === a.id ? 'pd3a-zeile-aktiv' : undefined}>
              <td>{a.name}</td>
              <td>{formatLength(assemblyThickness(a))}</td>
              <td>{tragend ? 'ja' : 'nein'}</td>
              {onAnwenden ? (
                <td>
                  <KButton size="sm" tone="ghost" data-testid={`island-wand-aufbau-anwenden-${a.id}`} onClick={() => onAnwenden(a.id)}>
                    anwenden
                  </KButton>
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function useWandAufbauten(): readonly Assembly[] {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  return useMemo(
    () => doc.byKind<Assembly>('assembly').filter((a) => a.target === 'wall'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, revision],
  );
}

function WandStufe2() {
  const entity = useAusgewaehlteEntitaet();
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  const aufbauten = useWandAufbauten();
  const wand = entity && entity.kind === 'wall' ? (entity as Wall) : null;
  if (!wand) {
    return (
      <div className="pd3a-stufe2" data-testid="island-wand-stufe2" onClick={(e) => e.stopPropagation()}>
        <Hinweis testid="island-wand-hinweis-keine-auswahl">
          Keine Wand ausgewählt — Wand im Viewer wählen, um Aufbau/Dicke/Tragend zu sehen und zu ändern.
        </Hinweis>
      </div>
    );
  }
  const aufbauRoh = doc.get(wand.assemblyId);
  const aufbau = aufbauRoh && aufbauRoh.kind === 'assembly' ? (aufbauRoh as Assembly) : null;
  const tragend = aufbau ? aufbau.layers.some((l) => l.function === 'tragend') : null;
  return (
    <div className="pd3a-stufe2" data-testid="island-wand-stufe2" onClick={(e) => e.stopPropagation()}>
      <Zeile label="Aufbau">
        <KSelect
          size="sm"
          data-testid="island-wand-aufbau"
          value={wand.assemblyId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setzeEigenschaft(runCommand, wand.id, 'assemblyId', e.target.value)}
        >
          {aufbauten.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </KSelect>
      </Zeile>
      <p className="pd3a-kennzahl" data-testid="island-wand-dicke">
        Dicke: {aufbau ? formatLength(assemblyThickness(aufbau)) : '—'}
      </p>
      <p className="pd3a-kennzahl" data-testid="island-wand-tragend">
        Tragend: {tragend === null ? '—' : tragend ? 'ja' : 'nein'}
      </p>
    </div>
  );
}

function WandStufe3() {
  const entity = useAusgewaehlteEntitaet();
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  const aufbauten = useWandAufbauten();
  const wand = entity && entity.kind === 'wall' ? (entity as Wall) : null;

  const umbauAendern = (wandId: string, wert: string) => {
    try {
      if (wert === 'keiner') runCommand('design.renovationSetzen', { ids: [wandId] });
      else runCommand('design.renovationSetzen', { ids: [wandId], status: wert });
    } catch (err) {
      meldeFehler(err);
    }
  };

  if (!wand) {
    return (
      <div className="pd3a-stufe3" data-testid="island-wand-stufe3">
        <p className="pd3a-titel">Aufbau-Katalog</p>
        <AufbauKatalogTabelle aufbauten={aufbauten} aktivId={null} onAnwenden={null} />
        <Hinweis testid="island-wand-hinweis-keine-auswahl-fenster">
          Keine Wand ausgewählt — Achse/Länge/Öffnungen/Umbaustatus erscheinen erst mit einer ausgewählten Wand.
        </Hinweis>
      </div>
    );
  }

  const laenge = dist(wand.a, wand.b);
  const oeffnungen = doc.openingsOf(wand.id);
  const umbau = wand.meta?.renovation ?? 'keiner';
  const aufbauRoh = doc.get(wand.assemblyId);
  const aufbau = aufbauRoh && aufbauRoh.kind === 'assembly' ? (aufbauRoh as Assembly) : null;

  return (
    <div className="pd3a-stufe3" data-testid="island-wand-stufe3">
      <p className="pd3a-titel">Aufbau-Katalog</p>
      <AufbauKatalogTabelle
        aufbauten={aufbauten}
        aktivId={wand.assemblyId}
        onAnwenden={(id) => setzeEigenschaft(runCommand, wand.id, 'assemblyId', id)}
      />
      <p className="pd3a-kennzahl" data-testid="island-wand-dicke">
        Dicke: {aufbau ? formatLength(assemblyThickness(aufbau)) : '—'}
      </p>
      <Zeile label="Achse">
        <KSelect
          size="sm"
          data-testid="island-wand-achse"
          value={wand.alignment}
          onChange={(e) => setzeEigenschaft(runCommand, wand.id, 'alignment', e.target.value)}
        >
          <option value="zentrum">Zentrum</option>
          <option value="kern-aussen">Kern aussen</option>
          <option value="kern-innen">Kern innen</option>
        </KSelect>
      </Zeile>
      <Zeile label="Höhe (mm, leer = Geschoss)">
        <KInput
          size="sm"
          mono
          type="number"
          data-testid="island-wand-hoehe"
          value={wand.height ?? ''}
          onChange={(e) => e.target.value !== '' && setzeEigenschaft(runCommand, wand.id, 'height', Number(e.target.value))}
        />
      </Zeile>
      <p className="pd3a-kennzahl" data-testid="island-wand-laenge">
        Länge: {formatLength(Math.round(laenge))}
      </p>
      <p className="pd3a-kennzahl" data-testid="island-wand-oeffnungen">
        Öffnungen: {oeffnungen.length}
      </p>
      <Zeile label="Umbaustatus">
        <KSelect size="sm" data-testid="island-wand-umbaustatus" value={umbau} onChange={(e) => umbauAendern(wand.id, e.target.value)}>
          <option value="keiner">— keiner —</option>
          <option value="bestand">Bestand</option>
          <option value="neu">Neu</option>
          <option value="abbruch">Abbruch</option>
        </KSelect>
      </Zeile>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3 · Öffnung — Fable-Entscheid: Einstellungen als Vorgabewerte für die
// bestehende Skizze-Geste, KEIN neuer ToolId/Platzier-Modus (§8-5 bleibt
// Owner-Frage). Ist eine Öffnung ausgewählt, wirken die Felder ECHT über
// `design.eigenschaftSetzen` (genau die Parameter aus `design.oeffnungSetzen`).
// ---------------------------------------------------------------------------

interface OeffnungVorgabe {
  openingType: 'fenster' | 'tuer';
  width: number;
  height: number;
  sill: number;
  swing: 'links' | 'rechts';
}

let oeffnungVorgabe: OeffnungVorgabe = { openingType: 'fenster', width: 1200, height: 1500, sill: 900, swing: 'rechts' };

function useOeffnungVorgabe(): readonly [OeffnungVorgabe, (patch: Partial<OeffnungVorgabe>) => void] {
  const [zustand, setZustandRoh] = useState(oeffnungVorgabe);
  const setZustand = (patch: Partial<OeffnungVorgabe>) => {
    const naechster = { ...zustand, ...patch };
    oeffnungVorgabe = naechster;
    setZustandRoh(naechster);
  };
  return [zustand, setZustand] as const;
}

function VorgabeHinweis() {
  return (
    <Hinweis testid="island-oeffnung-hinweis-vorgabe">
      Vorgabewerte für die nächste Skizze-Geste — die automatische Übernahme durch die bestehende
      Skizze-Geste (onSketchWandOeffnung) ist noch offen (Owner-Entscheid §8-5, ein eigener
      ToolId/Platzier-Modus ist bewusst NICHT gebaut).
    </Hinweis>
  );
}

function OeffnungStufe2() {
  const entity = useAusgewaehlteEntitaet();
  const runCommand = useProject((s) => s.runCommand);
  const [vorgabe, setVorgabe] = useOeffnungVorgabe();
  const oeffnung = entity && entity.kind === 'opening' ? (entity as Opening) : null;

  if (oeffnung) {
    return (
      <div className="pd3a-stufe2" data-testid="island-oeffnung-stufe2" onClick={(e) => e.stopPropagation()}>
        <Zeile label="Typ">
          <KSelect
            size="sm"
            data-testid="island-oeffnung-typ"
            value={oeffnung.openingType}
            onChange={(e) => setzeEigenschaft(runCommand, oeffnung.id, 'openingType', e.target.value)}
          >
            <option value="fenster">Fenster</option>
            <option value="tuer">Tür</option>
          </KSelect>
        </Zeile>
        <Zeile label="Breite (mm)">
          <KInput
            size="sm"
            mono
            type="number"
            data-testid="island-oeffnung-breite"
            value={oeffnung.width}
            onChange={(e) => setzeEigenschaft(runCommand, oeffnung.id, 'width', Number(e.target.value))}
          />
        </Zeile>
        <Zeile label="Höhe (mm)">
          <KInput
            size="sm"
            mono
            type="number"
            data-testid="island-oeffnung-hoehe"
            value={oeffnung.height}
            onChange={(e) => setzeEigenschaft(runCommand, oeffnung.id, 'height', Number(e.target.value))}
          />
        </Zeile>
      </div>
    );
  }

  return (
    <div className="pd3a-stufe2" data-testid="island-oeffnung-stufe2" onClick={(e) => e.stopPropagation()}>
      <Zeile label="Typ (Vorgabe)">
        <KSelect
          size="sm"
          data-testid="island-oeffnung-vorgabe-typ"
          value={vorgabe.openingType}
          onChange={(e) => setVorgabe({ openingType: e.target.value as OeffnungVorgabe['openingType'] })}
        >
          <option value="fenster">Fenster</option>
          <option value="tuer">Tür</option>
        </KSelect>
      </Zeile>
      <Zeile label="Breite (mm, Vorgabe)">
        <KInput
          size="sm"
          mono
          type="number"
          data-testid="island-oeffnung-vorgabe-breite"
          value={vorgabe.width}
          onChange={(e) => setVorgabe({ width: Number(e.target.value) || 0 })}
        />
      </Zeile>
      <Zeile label="Höhe (mm, Vorgabe)">
        <KInput
          size="sm"
          mono
          type="number"
          data-testid="island-oeffnung-vorgabe-hoehe"
          value={vorgabe.height}
          onChange={(e) => setVorgabe({ height: Number(e.target.value) || 0 })}
        />
      </Zeile>
      <VorgabeHinweis />
    </div>
  );
}

function OeffnungStufe3() {
  const entity = useAusgewaehlteEntitaet();
  const runCommand = useProject((s) => s.runCommand);
  const [vorgabe, setVorgabe] = useOeffnungVorgabe();
  const oeffnung = entity && entity.kind === 'opening' ? (entity as Opening) : null;

  if (oeffnung) {
    return (
      <div className="pd3a-stufe3" data-testid="island-oeffnung-stufe3">
        <Zeile label="Typ">
          <KSelect
            size="sm"
            data-testid="island-oeffnung-fenster-typ"
            value={oeffnung.openingType}
            onChange={(e) => setzeEigenschaft(runCommand, oeffnung.id, 'openingType', e.target.value)}
          >
            <option value="fenster">Fenster</option>
            <option value="tuer">Tür</option>
          </KSelect>
        </Zeile>
        <Zeile label="Breite (mm)">
          <KInput
            size="sm"
            mono
            type="number"
            data-testid="island-oeffnung-fenster-breite"
            value={oeffnung.width}
            onChange={(e) => setzeEigenschaft(runCommand, oeffnung.id, 'width', Number(e.target.value))}
          />
        </Zeile>
        <Zeile label="Höhe (mm)">
          <KInput
            size="sm"
            mono
            type="number"
            data-testid="island-oeffnung-fenster-hoehe"
            value={oeffnung.height}
            onChange={(e) => setzeEigenschaft(runCommand, oeffnung.id, 'height', Number(e.target.value))}
          />
        </Zeile>
        <Zeile label="Brüstung (mm)">
          <KInput
            size="sm"
            mono
            type="number"
            data-testid="island-oeffnung-fenster-bruestung"
            value={oeffnung.sill}
            onChange={(e) => setzeEigenschaft(runCommand, oeffnung.id, 'sill', Number(e.target.value))}
          />
        </Zeile>
        <Zeile label="Anschlag">
          <KSelect
            size="sm"
            data-testid="island-oeffnung-fenster-anschlag"
            value={oeffnung.swing ?? 'rechts'}
            onChange={(e) => setzeEigenschaft(runCommand, oeffnung.id, 'swing', e.target.value)}
          >
            <option value="links">Links</option>
            <option value="rechts">Rechts</option>
          </KSelect>
        </Zeile>
      </div>
    );
  }

  return (
    <div className="pd3a-stufe3" data-testid="island-oeffnung-stufe3">
      <Zeile label="Typ (Vorgabe)">
        <KSelect
          size="sm"
          data-testid="island-oeffnung-vorgabe-fenster-typ"
          value={vorgabe.openingType}
          onChange={(e) => setVorgabe({ openingType: e.target.value as OeffnungVorgabe['openingType'] })}
        >
          <option value="fenster">Fenster</option>
          <option value="tuer">Tür</option>
        </KSelect>
      </Zeile>
      <Zeile label="Breite (mm, Vorgabe)">
        <KInput size="sm" mono type="number" value={vorgabe.width} onChange={(e) => setVorgabe({ width: Number(e.target.value) || 0 })} />
      </Zeile>
      <Zeile label="Höhe (mm, Vorgabe)">
        <KInput size="sm" mono type="number" value={vorgabe.height} onChange={(e) => setVorgabe({ height: Number(e.target.value) || 0 })} />
      </Zeile>
      <Zeile label="Brüstung (mm, Vorgabe)">
        <KInput size="sm" mono type="number" value={vorgabe.sill} onChange={(e) => setVorgabe({ sill: Number(e.target.value) || 0 })} />
      </Zeile>
      <Zeile label="Anschlag (Vorgabe)">
        <KSelect size="sm" value={vorgabe.swing} onChange={(e) => setVorgabe({ swing: e.target.value as OeffnungVorgabe['swing'] })}>
          <option value="links">Links</option>
          <option value="rechts">Rechts</option>
        </KSelect>
      </Zeile>
      <VorgabeHinweis />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4 · Volumen
// ---------------------------------------------------------------------------

function VolumenStufe2() {
  const entity = useAusgewaehlteEntitaet();
  const runCommand = useProject((s) => s.runCommand);
  const masse = entity && entity.kind === 'mass' ? (entity as MassBody) : null;
  if (!masse) {
    return (
      <div className="pd3a-stufe2" data-testid="island-volumen-stufe2" onClick={(e) => e.stopPropagation()}>
        <Hinweis>Kein Volumenkörper ausgewählt — Volumen im Viewer wählen.</Hinweis>
      </div>
    );
  }
  return (
    <div className="pd3a-stufe2" data-testid="island-volumen-stufe2" onClick={(e) => e.stopPropagation()}>
      <Zeile label="Höhe (mm)">
        <KInput
          size="sm"
          mono
          type="number"
          data-testid="island-volumen-hoehe"
          value={masse.height}
          onChange={(e) => setzeEigenschaft(runCommand, masse.id, 'height', Number(e.target.value))}
        />
      </Zeile>
      <Zeile label="Nutzung">
        <KInput
          size="sm"
          data-testid="island-volumen-programm"
          value={masse.program ?? ''}
          onChange={(e) => setzeEigenschaft(runCommand, masse.id, 'program', e.target.value)}
        />
      </Zeile>
      <p className="pd3a-kennzahl" data-testid="island-volumen-grundflaeche">
        Grundfläche: {formatArea(areaOf(masse.outline))}
      </p>
    </div>
  );
}

function VolumenStufe3() {
  const entity = useAusgewaehlteEntitaet();
  const runCommand = useProject((s) => s.runCommand);
  const masse = entity && entity.kind === 'mass' ? (entity as MassBody) : null;
  return (
    <div className="pd3a-stufe3" data-testid="island-volumen-stufe3">
      {masse ? (
        <>
          <Zeile label="Höhe (mm)">
            <KInput
              size="sm"
              mono
              type="number"
              data-testid="island-volumen-fenster-hoehe"
              value={masse.height}
              onChange={(e) => setzeEigenschaft(runCommand, masse.id, 'height', Number(e.target.value))}
            />
          </Zeile>
          <Zeile label="Nutzung">
            <KInput
              size="sm"
              data-testid="island-volumen-fenster-programm"
              value={masse.program ?? ''}
              onChange={(e) => setzeEigenschaft(runCommand, masse.id, 'program', e.target.value)}
            />
          </Zeile>
          <p className="pd3a-kennzahl">Grundfläche: {formatArea(areaOf(masse.outline))}</p>
        </>
      ) : (
        <Hinweis>Kein Volumenkörper ausgewählt.</Hinweis>
      )}
      <KButton
        size="sm"
        tone="ghost"
        data-testid="island-volumen-studie-oeffnen"
        onClick={() => useUiZustand.getState().setStudieOffen(true)}
      >
        Volumenstudien-Panel öffnen (GF, Baugrenze, Geschosshöhe, Varianten)
      </KButton>
      <Hinweis testid="island-volumen-hinweis-sichtbarkeit">
        Setzt das echte Panel-Flag (studieOffen) — sichtbar wird das Panel im Island-Modus erst,
        sobald der Dock dort mitrendert (offene Sichtbarkeits-Politur, ausserhalb dieses
        Dateikreises); im Manuell-Modus ist es sofort sichtbar.
      </Hinweis>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5 · Zone
// ---------------------------------------------------------------------------

const RAUMTYPEN = [
  'zimmer',
  'wohnen',
  'kueche',
  'bad',
  'korridor',
  'treppenhaus',
  'abstellraum',
  'balkon',
  'technik',
  'gewerbe',
] as const;

function ZoneStufe2() {
  const entity = useAusgewaehlteEntitaet();
  const runCommand = useProject((s) => s.runCommand);
  const zone = entity && entity.kind === 'zone' ? (entity as Zone) : null;
  if (!zone) {
    return (
      <div className="pd3a-stufe2" data-testid="island-zone-stufe2" onClick={(e) => e.stopPropagation()}>
        <Hinweis>Keine Zone ausgewählt — Zone im Viewer wählen.</Hinweis>
      </div>
    );
  }
  return (
    <div className="pd3a-stufe2" data-testid="island-zone-stufe2" onClick={(e) => e.stopPropagation()}>
      <Zeile label="Raumtyp">
        <KSelect
          size="sm"
          data-testid="island-zone-raumtyp"
          value={zone.raumTyp ?? ''}
          onChange={(e) => {
            try {
              runCommand('design.raumTypSetzen', { zoneId: zone.id, raumTyp: e.target.value });
            } catch (err) {
              meldeFehler(err);
            }
          }}
        >
          <option value="" disabled>
            wählen…
          </option>
          {RAUMTYPEN.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </KSelect>
      </Zeile>
      <p className="pd3a-kennzahl" data-testid="island-zone-flaeche">
        Fläche: {formatArea(areaOf(zone.outline))}
      </p>
    </div>
  );
}

function ZoneStufe3() {
  const entity = useAusgewaehlteEntitaet();
  const runCommand = useProject((s) => s.runCommand);
  const zone = entity && entity.kind === 'zone' ? (entity as Zone) : null;
  if (!zone) {
    return (
      <div className="pd3a-stufe3" data-testid="island-zone-stufe3">
        <Hinweis>Keine Zone ausgewählt.</Hinweis>
      </div>
    );
  }
  return (
    <div className="pd3a-stufe3" data-testid="island-zone-stufe3">
      <Zeile label="Name">
        <KInput size="sm" data-testid="island-zone-name" value={zone.name} onChange={(e) => setzeEigenschaft(runCommand, zone.id, 'name', e.target.value)} />
      </Zeile>
      <Zeile label="SIA-Klasse">
        <KSelect size="sm" data-testid="island-zone-sia" value={zone.sia} onChange={(e) => setzeEigenschaft(runCommand, zone.id, 'sia', e.target.value)}>
          {(['HNF', 'NNF', 'VF', 'FF', 'KF'] as const).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </KSelect>
      </Zeile>
      <Zeile label="Nutzung">
        <KInput
          size="sm"
          data-testid="island-zone-programm"
          value={zone.program ?? ''}
          onChange={(e) => setzeEigenschaft(runCommand, zone.id, 'program', e.target.value)}
        />
      </Zeile>
      <Zeile label="Raumtyp">
        <KSelect
          size="sm"
          data-testid="island-zone-fenster-raumtyp"
          value={zone.raumTyp ?? ''}
          onChange={(e) => {
            try {
              runCommand('design.raumTypSetzen', { zoneId: zone.id, raumTyp: e.target.value });
            } catch (err) {
              meldeFehler(err);
            }
          }}
        >
          <option value="" disabled>
            wählen…
          </option>
          {RAUMTYPEN.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </KSelect>
      </Zeile>
      <p className="pd3a-kennzahl">Fläche: {formatArea(areaOf(zone.outline))}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6 · Dach
// ---------------------------------------------------------------------------

function DachStufe2() {
  const entity = useAusgewaehlteEntitaet();
  const runCommand = useProject((s) => s.runCommand);
  const dach = entity && entity.kind === 'roof' ? (entity as Roof) : null;
  if (!dach) {
    return (
      <div className="pd3a-stufe2" data-testid="island-dach-stufe2" onClick={(e) => e.stopPropagation()}>
        <Hinweis>Kein Dach ausgewählt — Dach im Viewer wählen.</Hinweis>
      </div>
    );
  }
  return (
    <div className="pd3a-stufe2" data-testid="island-dach-stufe2" onClick={(e) => e.stopPropagation()}>
      <p className="pd3a-kennzahl">Form: {dach.form === 'sattel' ? 'Sattel' : 'Walm'} (nur beim Zeichnen wählbar)</p>
      <Zeile label="Neigung (°)">
        <KInput
          size="sm"
          mono
          type="number"
          data-testid="island-dach-neigung"
          value={dach.pitch}
          onChange={(e) => setzeEigenschaft(runCommand, dach.id, 'pitch', Number(e.target.value))}
        />
      </Zeile>
    </div>
  );
}

function DachStufe3() {
  const entity = useAusgewaehlteEntitaet();
  const runCommand = useProject((s) => s.runCommand);
  const dach = entity && entity.kind === 'roof' ? (entity as Roof) : null;
  if (!dach) {
    return (
      <div className="pd3a-stufe3" data-testid="island-dach-stufe3">
        <Hinweis>Kein Dach ausgewählt.</Hinweis>
      </div>
    );
  }
  return (
    <div className="pd3a-stufe3" data-testid="island-dach-stufe3">
      <p className="pd3a-kennzahl">
        Form: {dach.form === 'sattel' ? `Sattel (First ${dach.firstrichtung ?? 'x'})` : 'Walm'} — nur beim Zeichnen wählbar,
        design.eigenschaftSetzen kennt bei Dach nur Neigung/Überstand.
      </p>
      <Zeile label="Neigung (°)">
        <KInput
          size="sm"
          mono
          type="number"
          data-testid="island-dach-fenster-neigung"
          value={dach.pitch}
          onChange={(e) => setzeEigenschaft(runCommand, dach.id, 'pitch', Number(e.target.value))}
        />
      </Zeile>
      <Zeile label="Überstand (mm)">
        <KInput
          size="sm"
          mono
          type="number"
          data-testid="island-dach-ueberstand"
          value={dach.overhang}
          onChange={(e) => setzeEigenschaft(runCommand, dach.id, 'overhang', Number(e.target.value))}
        />
      </Zeile>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7 · Treppe — kein Command ändert Form/Breite einer bestehenden Treppe
// (`design.eigenschaftSetzen` kennt `kind:'stair'` nicht) — ehrlich nur Status.
// ---------------------------------------------------------------------------

function TreppeInfo() {
  const entity = useAusgewaehlteEntitaet();
  const doc = useProject.getState().doc;
  const treppe = entity && entity.kind === 'stair' ? (entity as Stair) : null;
  if (!treppe) return <Hinweis>Keine Treppe ausgewählt — Treppe im Viewer wählen.</Hinweis>;
  const storeyRoh = doc.get(treppe.storeyId);
  const storey = storeyRoh && storeyRoh.kind === 'storey' ? (storeyRoh as Storey) : null;
  const teile = storey ? treppenTeile(treppe, storey.height, storey.elevation) : null;
  return (
    <>
      <p className="pd3a-kennzahl" data-testid="island-treppe-form">
        Form: {treppe.form ?? 'gerade'} · Breite: {formatLength(treppe.width)}
      </p>
      {teile ? (
        <p className="pd3a-kennzahl" data-testid="island-treppe-steigung">
          Steigung: {Math.round(teile.spec.riser)} mm · Auftritt: {Math.round(teile.spec.going)} mm ({teile.spec.steps} Stufen)
        </p>
      ) : null}
      <Hinweis testid="island-treppe-hinweis-nicht-aenderbar">
        Form/Breite sind nur beim Zeichnen wählbar (treppen-form-Select in der klassischen
        Werkzeugleiste) — nachträgliches Ändern hat noch keinen Command
        (design.eigenschaftSetzen kennt «stair» nicht, §4.4).
      </Hinweis>
    </>
  );
}

function TreppeStufe2() {
  return (
    <div className="pd3a-stufe2" data-testid="island-treppe-stufe2" onClick={(e) => e.stopPropagation()}>
      <TreppeInfo />
    </div>
  );
}

function TreppeStufe3() {
  return (
    <div className="pd3a-stufe3" data-testid="island-treppe-stufe3">
      <TreppeInfo />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8 · Stütze — Raster-Achse/Querschnitt: kein Command ändert eine bestehende
// Stütze, aber `design.rasterSetzen`/`design.stuetzenAusRaster` sind echte,
// wirkende Aktionen (1:1 `RasterPanel.tsx`s «Achsen ins Modell»-Ausschnitt).
// ---------------------------------------------------------------------------

interface StuetzeVorgabe {
  achsmass: number;
  anzahl: number;
  querAnzahl: number;
  profil: 'rechteck' | 'rund';
  b: number;
  material: string;
}

let stuetzeVorgabe: StuetzeVorgabe = { achsmass: 6000, anzahl: 5, querAnzahl: 4, profil: 'rechteck', b: 300, material: 'beton' };

function useStuetzeVorgabe(): readonly [StuetzeVorgabe, (patch: Partial<StuetzeVorgabe>) => void] {
  const [zustand, setZustandRoh] = useState(stuetzeVorgabe);
  const setZustand = (patch: Partial<StuetzeVorgabe>) => {
    const naechster = { ...zustand, ...patch };
    stuetzeVorgabe = naechster;
    setZustandRoh(naechster);
  };
  return [zustand, setZustand] as const;
}

function StuetzeStufe2() {
  const [vorgabe, setVorgabe] = useStuetzeVorgabe();
  const runCommand = useProject((s) => s.runCommand);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  return (
    <div className="pd3a-stufe2" data-testid="island-stuetze-stufe2" onClick={(e) => e.stopPropagation()}>
      <Zeile label="Raster-Achse (mm)">
        <KInput
          size="sm"
          mono
          type="number"
          data-testid="island-stuetze-achsmass"
          value={vorgabe.achsmass}
          onChange={(e) => setVorgabe({ achsmass: Number(e.target.value) || 1000 })}
        />
      </Zeile>
      <Zeile label="Querschnitt">
        <KSelect
          size="sm"
          data-testid="island-stuetze-profil"
          value={vorgabe.profil}
          onChange={(e) => setVorgabe({ profil: e.target.value as StuetzeVorgabe['profil'] })}
        >
          <option value="rechteck">Rechteck</option>
          <option value="rund">Rund</option>
        </KSelect>
      </Zeile>
      <KButton
        size="sm"
        tone="ghost"
        data-testid="island-stuetze-achsen-setzen"
        onClick={() => {
          if (!activeStoreyId) return;
          try {
            runCommand('design.rasterSetzen', {
              storeyId: activeStoreyId,
              achsmass: vorgabe.achsmass,
              anzahl: vorgabe.anzahl,
              querAnzahl: vorgabe.querAnzahl,
            });
          } catch (err) {
            meldeFehler(err);
          }
        }}
      >
        Achsen ins Modell
      </KButton>
    </div>
  );
}

function StuetzeStufe3() {
  const [vorgabe, setVorgabe] = useStuetzeVorgabe();
  const runCommand = useProject((s) => s.runCommand);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  return (
    <div className="pd3a-stufe3" data-testid="island-stuetze-stufe3">
      <Zeile label="Raster-Achse (mm)">
        <KInput
          size="sm"
          mono
          type="number"
          data-testid="island-stuetze-fenster-achsmass"
          value={vorgabe.achsmass}
          onChange={(e) => setVorgabe({ achsmass: Number(e.target.value) || 1000 })}
        />
      </Zeile>
      <Zeile label="Hauptachsen">
        <KInput size="sm" mono type="number" value={vorgabe.anzahl} onChange={(e) => setVorgabe({ anzahl: Number(e.target.value) || 2 })} />
      </Zeile>
      <Zeile label="Querachsen">
        <KInput size="sm" mono type="number" value={vorgabe.querAnzahl} onChange={(e) => setVorgabe({ querAnzahl: Number(e.target.value) || 2 })} />
      </Zeile>
      <Zeile label="Querschnitt">
        <KSelect
          size="sm"
          data-testid="island-stuetze-fenster-profil"
          value={vorgabe.profil}
          onChange={(e) => setVorgabe({ profil: e.target.value as StuetzeVorgabe['profil'] })}
        >
          <option value="rechteck">Rechteck</option>
          <option value="rund">Rund</option>
        </KSelect>
      </Zeile>
      <Zeile label="Breite/Ø (mm)">
        <KInput size="sm" mono type="number" value={vorgabe.b} onChange={(e) => setVorgabe({ b: Number(e.target.value) || 80 })} />
      </Zeile>
      <div className="pd3a-btn-reihe">
        <KButton
          size="sm"
          tone="ghost"
          data-testid="island-stuetze-fenster-achsen-setzen"
          onClick={() => {
            if (!activeStoreyId) return;
            try {
              runCommand('design.rasterSetzen', {
                storeyId: activeStoreyId,
                achsmass: vorgabe.achsmass,
                anzahl: vorgabe.anzahl,
                querAnzahl: vorgabe.querAnzahl,
              });
            } catch (err) {
              meldeFehler(err);
            }
          }}
        >
          Achsen ins Modell
        </KButton>
        <KButton
          size="sm"
          tone="ghost"
          data-testid="island-stuetze-auf-raster"
          onClick={() => {
            if (!activeStoreyId) return;
            try {
              runCommand('design.stuetzenAusRaster', {
                storeyId: activeStoreyId,
                profil: vorgabe.profil,
                b: vorgabe.b,
                material: vorgabe.material,
              });
            } catch (err) {
              meldeFehler(err);
            }
          }}
        >
          Stützen auf Rasterkreuzungen
        </KButton>
      </div>
      <Hinweis testid="island-stuetze-hinweis">
        Volles Raster-Panel (Wohnraster-Varianten, Bewertung): Ebenen ▸ Raster (rasterOffen) —
        im Manuell-Modus sofort sichtbar.
      </Hinweis>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9 · Skizze — bleibt eigenes Freihand-Werkzeug (§4.4: kein zusätzliches
// Fenster nötig); Stufe2/3 informieren ehrlich über das bestehende Verhalten
// statt eine Attrappe zu bauen.
// ---------------------------------------------------------------------------

function SkizzeInfo() {
  return (
    <>
      <p className="pd3a-kennzahl">Kürzel F — die Skizze selbst ist das Werkzeug.</p>
      <Hinweis testid="island-skizze-hinweis">
        Nach dem Loslassen erscheinen 3 Annäherungs-Karten (Wand-Varianten) direkt im Canvas
        (SketchOverlay) — kein zusätzliches Insel-Fenster nötig (§4.4, heutiges Verhalten von
        onSketchWandOeffnung).
      </Hinweis>
    </>
  );
}

function SkizzeStufe2() {
  return (
    <div className="pd3a-stufe2" data-testid="island-skizze-stufe2" onClick={(e) => e.stopPropagation()}>
      <SkizzeInfo />
    </div>
  );
}

function SkizzeStufe3() {
  return (
    <div className="pd3a-stufe3" data-testid="island-skizze-stufe3">
      <SkizzeInfo />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10 · Mesh
// ---------------------------------------------------------------------------

function MeshStufe2() {
  const entity = useAusgewaehlteEntitaet();
  const meshEditId = useProject((s) => s.meshEditId);
  const setMeshEditId = useProject((s) => s.setMeshEditId);
  const [distanz, setDistanz] = useState(500);
  const mesh = entity && entity.kind === 'freemesh' ? entity : null;
  return (
    <div className="pd3a-stufe2" data-testid="island-mesh-stufe2" onClick={(e) => e.stopPropagation()}>
      <p className="pd3a-kennzahl" data-testid="island-mesh-status">
        Bearbeitungsmodus: {meshEditId ? 'aktiv' : 'inaktiv'}
      </p>
      {mesh ? (
        <KButton
          size="sm"
          tone={meshEditId === mesh.id ? 'accent' : 'ghost'}
          data-testid="island-mesh-bearbeiten"
          onClick={() => setMeshEditId(meshEditId === mesh.id ? null : mesh.id)}
        >
          {meshEditId === mesh.id ? 'Mesh-Bearbeitung beenden' : 'Mesh bearbeiten'}
        </KButton>
      ) : (
        <Hinweis>Kein Mesh ausgewählt.</Hinweis>
      )}
      <Zeile label="Extrudier-Distanz (mm)">
        <KInput
          size="sm"
          mono
          type="number"
          data-testid="island-mesh-extrudier-distanz"
          value={distanz}
          onChange={(e) => setDistanz(Number(e.target.value) || 0)}
        />
      </Zeile>
    </div>
  );
}

function MeshStufe3() {
  const entity = useAusgewaehlteEntitaet();
  const meshEditId = useProject((s) => s.meshEditId);
  const setMeshEditId = useProject((s) => s.setMeshEditId);
  const [distanz, setDistanz] = useState(500);
  const mesh = entity && entity.kind === 'freemesh' ? entity : null;
  return (
    <div className="pd3a-stufe3" data-testid="island-mesh-stufe3">
      <p className="pd3a-kennzahl">Bearbeitungsmodus: {meshEditId ? 'aktiv' : 'inaktiv'}</p>
      {mesh ? (
        <>
          <p className="pd3a-kennzahl">
            Vertices: {mesh.positions.length / 3} · Flächen: {mesh.faces.length / 3}
          </p>
          <KButton
            size="sm"
            tone={meshEditId === mesh.id ? 'accent' : 'ghost'}
            data-testid="island-mesh-fenster-bearbeiten"
            onClick={() => setMeshEditId(meshEditId === mesh.id ? null : mesh.id)}
          >
            {meshEditId === mesh.id ? 'Mesh-Bearbeitung beenden' : 'Mesh bearbeiten'}
          </KButton>
        </>
      ) : (
        <Hinweis>Kein Mesh ausgewählt.</Hinweis>
      )}
      <Zeile label="Extrudier-Distanz (mm)">
        <KInput size="sm" mono type="number" value={distanz} onChange={(e) => setDistanz(Number(e.target.value) || 0)} />
      </Zeile>
      <Hinweis testid="island-mesh-hinweis-distanz">
        Das echte Extrudieren braucht eine im Viewport angeklickte Fläche (mesh-edit-panel,
        lokaler meshFace-State in DesignWorkspace.tsx, ausserhalb dieses Dateikreises) — diese
        Distanz ist deshalb eine eigene Vorgabe, keine zweite Quelle für denselben Zustand.
      </Hinweis>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 11 · Messen — Interims-Inhalt (§4.4): Ketten-Typ über
// `design.bemassungSetzen`, echtes Punkt-zu-Punkt-Messen bleibt NEU (§8-7).
// ---------------------------------------------------------------------------

function useBemassung() {
  const runCommand = useProject((s) => s.runCommand);
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  const bemassung = useMemo(() => doc.settings.bemassung, [doc, revision]);
  const setzen = (patch: Partial<{ aussenKetten: 'beide' | 'gesamt' | 'keine'; innenKetten: boolean; hoehenKoten: boolean; rohKette: boolean }>) => {
    try {
      runCommand('design.bemassungSetzen', patch);
    } catch (err) {
      meldeFehler(err);
    }
  };
  return [bemassung, setzen] as const;
}

function MessenStufe2() {
  const [bemassung, setzen] = useBemassung();
  return (
    <div className="pd3a-stufe2" data-testid="island-messen-stufe2" onClick={(e) => e.stopPropagation()}>
      <Zeile label="Kette-Typ (aussen)">
        <KSelect
          size="sm"
          data-testid="island-messen-aussenketten"
          value={bemassung.aussenKetten}
          onChange={(e) => setzen({ aussenKetten: e.target.value as 'beide' | 'gesamt' | 'keine' })}
        >
          <option value="beide">Öffnungen + Gesamtmass</option>
          <option value="gesamt">Nur Gesamtmass</option>
          <option value="keine">Keine</option>
        </KSelect>
      </Zeile>
      <Hinweis testid="island-messen-hinweis">
        Interims-Inhalt (§4.4): steuert nur die automatische Anzeige — echtes Punkt-zu-Punkt-
        Messen ist noch nicht gebaut (§8-7, kein Command bislang).
      </Hinweis>
    </div>
  );
}

function MessenStufe3() {
  const [bemassung, setzen] = useBemassung();
  return (
    <div className="pd3a-stufe3" data-testid="island-messen-stufe3">
      <Zeile label="Aussenketten">
        <KSelect
          size="sm"
          data-testid="island-messen-fenster-aussenketten"
          value={bemassung.aussenKetten}
          onChange={(e) => setzen({ aussenKetten: e.target.value as 'beide' | 'gesamt' | 'keine' })}
        >
          <option value="beide">Öffnungen + Gesamtmass</option>
          <option value="gesamt">Nur Gesamtmass</option>
          <option value="keine">Keine</option>
        </KSelect>
      </Zeile>
      <label className="pd3a-zeile">
        <input
          type="checkbox"
          data-testid="island-messen-innenketten"
          checked={bemassung.innenKetten}
          onChange={(e) => setzen({ innenKetten: e.target.checked })}
        />
        Innenketten (Werkplan)
      </label>
      <label className="pd3a-zeile">
        <input
          type="checkbox"
          data-testid="island-messen-hoehenkoten"
          checked={bemassung.hoehenKoten}
          onChange={(e) => setzen({ hoehenKoten: e.target.checked })}
        />
        Höhenkoten
      </label>
      <label className="pd3a-zeile">
        <input
          type="checkbox"
          data-testid="island-messen-rohkette"
          checked={bemassung.rohKette ?? false}
          onChange={(e) => setzen({ rohKette: e.target.checked })}
        />
        Rohkonstruktions-Kette
      </label>
      <Hinweis testid="island-messen-fenster-hinweis">
        Interims-Inhalt (§4.4): design.bemassungSetzen steuert nur die automatische Anzeige der
        Massketten — ein echtes interaktives Punkt-zu-Punkt-Mess-Werkzeug bleibt PD3a-Neubau
        (§8-7, kein Command bislang; doc.byKind('mass') sind Volumenkörper, kein Mess-Ergebnis).
      </Hinweis>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registrierung — 11/11 ZEICHNEN-Werkzeuge (keine hatPopup-Ausnahme in dieser
// Insel, s. `island-katalog.ts`).
// ---------------------------------------------------------------------------

registriereInhalt('auswahl', { Stufe2: AuswahlStufe2, Stufe3: AuswahlStufe3 });
registriereInhalt('wand', { Stufe2: WandStufe2, Stufe3: WandStufe3 });
registriereInhalt('oeffnung', { Stufe2: OeffnungStufe2, Stufe3: OeffnungStufe3 });
registriereInhalt('volumen', { Stufe2: VolumenStufe2, Stufe3: VolumenStufe3 });
registriereInhalt('zone', { Stufe2: ZoneStufe2, Stufe3: ZoneStufe3 });
registriereInhalt('dach', { Stufe2: DachStufe2, Stufe3: DachStufe3 });
registriereInhalt('treppe', { Stufe2: TreppeStufe2, Stufe3: TreppeStufe3 });
registriereInhalt('stuetze', { Stufe2: StuetzeStufe2, Stufe3: StuetzeStufe3 });
registriereInhalt('skizze', { Stufe2: SkizzeStufe2, Stufe3: SkizzeStufe3 });
registriereInhalt('mesh', { Stufe2: MeshStufe2, Stufe3: MeshStufe3 });
registriereInhalt('messen', { Stufe2: MessenStufe2, Stufe3: MessenStufe3 });
