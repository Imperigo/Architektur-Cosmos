import { useMemo, useState } from 'react';
import { ausmassAlsCsv, deriveAusmass, deriveMengen, raumTypVorschlag, type Entity, type MassBody, type Roof, type Slab, type Stair, type Wall, type Zone, type Assembly } from '@kosmo/kernel';
import { KButton, KPanelZweiStufen, Measure, type KPanelZweiStufenTab } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import { stufeUmschalten, useDockZustand } from '../../state/dock-zustand';
import './design-panels.css';

/**
 * KosmoDraw — der sichtbare BIM-Verständnisträger (Vision Q9/Q15):
 * Modellbaum (jedes Element mit IFC-Identität, Klick = Auswahl) und
 * Mengenauszug (ehrliche Vorausmasse aus der Parametrik, kein NPK-Ausmass).
 *
 * v0.8.1 Welle 4 / Paket P5b («Zwei-Stufen-Popups», Pilot, `docs/V081-
 * SPEZ.md` §2.2/§2.4) — migriert auf `KPanelZweiStufen`: die alten
 * KButton-Tabs (`draw-tab-*`-Halbmuster, drei Ad-hoc-`KButton`s mit
 * `tone`-Umschaltung) sind ersetzt durch EIN `KTabs`-Durchklick-Menü — die
 * drei testids (`draw-tab-baum`/`-mengen`/`-ausmass`) wandern dabei
 * BYTE-GLEICH auf `KTabItem.testid` mit, nur die Render-Implementierung
 * ändert sich. Die Kernkennzahl im Kopf ist der Name des aktiv gewählten
 * Tabs (§2.2: «Kopf zeigt den Namen des aktiv gewählten Tabs»). Die
 * Zwei-Stufen-Stufe (`PanelOverride.stufe`) ist unabhängig vom Tab-State —
 * `tab` bleibt lokaler React-State wie zuvor, nur `stufe` kommt neu aus dem
 * Dock-Store.
 */

const TAB_LABEL = { baum: 'Modellbaum', mengen: 'Mengen', ausmass: 'Ausmass' } as const;

function elementLabel(doc: ReturnType<typeof useProject.getState>['doc'], e: Entity): string {
  switch (e.kind) {
    case 'wall': {
      const w = e as Wall;
      const asm = doc.get<Assembly>(w.assemblyId);
      const len = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y) / 1000;
      return `${asm?.kind === 'assembly' ? asm.name : 'Wand'} · ${len.toFixed(2)} m`;
    }
    case 'slab':
      return `Decke · ${((e as Slab).thickness / 10).toFixed(0)} cm`;
    case 'roof':
      return `Walmdach · ${(e as Roof).pitch}°`;
    case 'stair':
      return `Treppe · ${((e as Stair).width / 1000).toFixed(2)} m`;
    case 'zone': {
      const z = e as Zone;
      return `Zone «${z.name}» (${z.sia})`;
    }
    case 'mass':
      return `Volumen · ${((e as MassBody).height / 1000).toFixed(1)} m hoch`;
    case 'opening':
      return 'Öffnung';
    default:
      return e.kind;
  }
}

const IFC: Record<string, string> = {
  wall: 'IfcWall',
  slab: 'IfcSlab',
  roof: 'IfcRoof',
  stair: 'IfcStair',
  zone: 'IfcSpace',
  mass: 'IfcBuildingElementProxy',
  opening: 'IfcOpeningElement',
};

function RaumTypCopilot() {
  const revision = useProject((s) => s.revision);
  const selection = useProject((s) => s.selection);
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  void revision;
  if (selection.length !== 1) return null;
  const e = doc.get(selection[0]!);
  if (!e || e.kind !== 'zone') return null;
  const zone = e as Zone;
  const v = raumTypVorschlag(doc, zone);
  if (!v) return null;
  return (
    <div data-testid="raumtyp-vorschlag" className="draw-copilot">
      <span className="sp-textsoft">
        Raumtyp? Kosmo meint «{v.raumTyp}» ({v.grund})
      </span>
      <div className="dp-fuell" />
      <KButton
        size="sm"
        tone="quiet"
        data-testid="raumtyp-uebernehmen"
        onClick={() => runCommand('design.raumTypSetzen', { zoneId: zone.id, raumTyp: v.raumTyp })}
      >
        Übernehmen
      </KButton>
    </div>
  );
}

export function DrawPanel() {
  const revision = useProject((s) => s.revision);
  const selection = useProject((s) => s.selection);
  const select = useProject((s) => s.select);
  const setActiveStorey = useProject((s) => s.setActiveStorey);
  const doc = useProject.getState().doc;
  const [tab, setTab] = useState<'baum' | 'mengen' | 'ausmass'>('baum');
  const modus = useDockZustand((s) => s.modus);
  const layouts = useDockZustand((s) => s.layouts);
  const panelOverrideSetzen = useDockZustand((s) => s.panelOverrideSetzen);
  const stufeRoh = layouts[`${modus}:design`]?.panels['drawOffen']?.stufe;
  const stufe = stufeRoh ?? 'offen';

  const mengen = useMemo(
    () => deriveMengen(doc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
  const ausmass = useMemo(
    () => deriveAusmass(doc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
  const ausmassCsv = () => {
    const url = URL.createObjectURL(new Blob([ausmassAlsCsv(ausmass)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}-Ausmass.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  const storeys = doc.storeysOrdered();

  const fmt = (v: number | undefined, einheit: string) =>
    v === undefined ? '—' : `${v.toLocaleString('de-CH', { maximumFractionDigits: 1 })} ${einheit}`;

  const tabs: readonly KPanelZweiStufenTab[] = [
    {
      id: 'baum',
      label: 'Modellbaum',
      testid: 'draw-tab-baum',
      inhalt: (
        <div className="draw-koerper">
          {storeys.length === 0 ? (
            <span className="dp-leer">Noch kein Geschoss.</span>
          ) : (
            storeys.map((s) => {
              const elemente = doc.inStorey(s.id).filter((e) => e.kind !== 'opening');
              return (
                <div key={s.id} className="dp-spalte--eng">
                  <div className="k-titel draw-geschoss-titel">
                    {s.name} <span className="draw-baum-anzahl">({elemente.length})</span>
                  </div>
                  {elemente.map((e) => (
                    <button
                      key={e.id}
                      data-testid={`baum-${e.id}`}
                      onClick={() => {
                        setActiveStorey(s.id);
                        select([e.id]);
                      }}
                      className={`draw-baum-eintrag${selection.includes(e.id) ? ' draw-baum-eintrag--aktiv' : ''}`}
                    >
                      <span className="draw-baum-label">{elementLabel(doc, e)}</span>
                      <span className="draw-baum-ifc">{IFC[e.kind] ?? ''}</span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      ),
    },
    {
      id: 'mengen',
      label: 'Mengen',
      testid: 'draw-tab-mengen',
      inhalt: (
        <div className="draw-koerper">
          {mengen.positionen.length === 0 ? (
            <span className="dp-leer">Noch keine Bauteile im Modell.</span>
          ) : (
            <table className="dp-tabelle draw-tabelle-links" data-testid="mengen-tabelle">
              <thead>
                <tr>
                  <th>Position</th>
                  <th className="dp-num">Stk</th>
                  <th className="dp-num">Fläche</th>
                  <th className="dp-num">Volumen</th>
                </tr>
              </thead>
              <tbody>
                {mengen.positionen.map((p) => (
                  <tr key={p.kind + p.bezeichnung}>
                    <td>
                      {p.bezeichnung}
                      <div className="draw-zeile-detail">{p.ifcKlasse}</div>
                    </td>
                    <td className="dp-num">
                      <Measure>{p.anzahl}</Measure>
                    </td>
                    <td className="dp-num">
                      <Measure>{fmt(p.flaeche, 'm²')}</Measure>
                    </td>
                    <td className="dp-num">
                      <Measure>{fmt(p.volumen, 'm³')}</Measure>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {mengen.positionen.length > 0 && (
            <span className="draw-fussnote">
              Vorausmasse aus der Parametrik (Wände netto, Dächer als Grundfläche) — kein NPK-Ausmass.
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'ausmass',
      label: 'Ausmass',
      testid: 'draw-tab-ausmass',
      inhalt: (
        <div className="draw-koerper">
          {ausmass.positionen.length === 0 ? (
            <span className="dp-leer">Noch keine Bauteile im Modell.</span>
          ) : (
            <>
              <table className="dp-tabelle draw-tabelle-links" data-testid="ausmass-tabelle">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th className="dp-num">Menge</th>
                  </tr>
                </thead>
                <tbody>
                  {ausmass.positionen.map((p, i) => (
                    <tr key={i}>
                      <td>
                        {p.position}
                        <div className="draw-zeile-detail">
                          {p.kapitel} · {p.herleitung}
                        </div>
                      </td>
                      <td className="dp-num draw-nowrap">
                        <Measure>
                          {p.menge.toLocaleString('de-CH', { maximumFractionDigits: 2 })} {p.einheit === 'm2' ? 'm²' : p.einheit === 'm3' ? 'm³' : p.einheit}
                        </Measure>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="draw-csv-zeile">
                <KButton size="sm" tone="quiet" onClick={ausmassCsv} data-testid="ausmass-csv">
                  CSV (Excel-CH)
                </KButton>
                <span className="draw-csv-hinweis">
                  {ausmass.hinweise[ausmass.hinweise.length - 1]}
                </span>
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div data-testid="draw-panel" className="dp-dialog--flex">
      <RaumTypCopilot />
      <KPanelZweiStufen
        // Additive testid (Regel «additive neue testids der Komponente ok»)
        // — `draw-panel` selbst BLEIBT byte-gleich auf dem äusseren Wrapper
        // (`RaumTypCopilot` ist dessen Geschwister, kein Kind von
        // `KPanelZweiStufen`); dieser eigene Testid gibt der Kopf-/Tab-Zone
        // einen stabilen Ankerpunkt für den Kompakt/Offen-Umschalt-Knopf
        // (`draw-panel-koerper-umschalten`), den es vorher nicht gab.
        data-testid="draw-panel-koerper"
        titel="KosmoDraw"
        kernkennzahl={TAB_LABEL[tab]}
        stufe={stufe}
        onStufeUmschalten={() => panelOverrideSetzen('design', 'drawOffen', { stufe: stufeUmschalten(stufeRoh) })}
        aktiverTab={tab}
        onTabWechseln={(id) => setTab(id as 'baum' | 'mengen' | 'ausmass')}
        tabs={tabs}
      />
    </div>
  );
}
