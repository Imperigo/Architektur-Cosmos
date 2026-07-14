import { useMemo, useState } from 'react';
import { ausmassAlsCsv, deriveAusmass, deriveMengen, raumTypVorschlag, type Entity, type MassBody, type Roof, type Slab, type Stair, type Wall, type Zone, type Assembly } from '@kosmo/kernel';
import { Badge, Hairline, KButton, Measure } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

/**
 * KosmoDraw — der sichtbare BIM-Verständnisträger (Vision Q9/Q15):
 * Modellbaum (jedes Element mit IFC-Identität, Klick = Auswahl) und
 * Mengenauszug (ehrliche Vorausmasse aus der Parametrik, kein NPK-Ausmass).
 */

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
    <div
      data-testid="raumtyp-vorschlag"
      style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 8px', fontSize: 11.5, borderBottom: '1px solid var(--k-line)' }}
    >
      <span style={{ color: 'var(--k-ink-soft)' }}>
        Raumtyp? Kosmo meint «{v.raumTyp}» ({v.grund})
      </span>
      <div style={{ flex: 1 }} />
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

  return (
    <div
      data-testid="draw-panel"
      style={{
        zIndex: 20,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--k-raised)',
        border: '1px solid var(--k-technik)',
        boxShadow: 'var(--k-shadow-overlay)',
      }}
    >
      <RaumTypCopilot />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
        <Badge hue="var(--k-mod-draw)">KosmoDraw</Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone={tab === 'baum' ? 'accent' : 'ghost'} onClick={() => setTab('baum')} data-testid="draw-tab-baum">
          Modellbaum
        </KButton>
        <KButton size="sm" tone={tab === 'mengen' ? 'accent' : 'ghost'} onClick={() => setTab('mengen')} data-testid="draw-tab-mengen">
          Mengen
        </KButton>
        <KButton size="sm" tone={tab === 'ausmass' ? 'accent' : 'ghost'} onClick={() => setTab('ausmass')} data-testid="draw-tab-ausmass">
          Ausmass
        </KButton>
      </div>
      <Hairline />
      <div style={{ overflow: 'auto', padding: '8px 10px', display: 'grid', gap: 6, fontSize: 12.5 }}>
        {tab === 'baum' ? (
          storeys.length === 0 ? (
            <span style={{ color: 'var(--k-ink-faint)' }}>Noch kein Geschoss.</span>
          ) : (
            storeys.map((s) => {
              const elemente = doc.inStorey(s.id).filter((e) => e.kind !== 'opening');
              return (
                <div key={s.id} style={{ display: 'grid', gap: 3 }}>
                  <div className="k-titel" style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>
                    {s.name} <span style={{ fontFamily: 'var(--k-font-mono)', textTransform: 'none' }}>({elemente.length})</span>
                  </div>
                  {elemente.map((e) => (
                    <button
                      key={e.id}
                      data-testid={`baum-${e.id}`}
                      onClick={() => {
                        setActiveStorey(s.id);
                        select([e.id]);
                      }}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'baseline',
                        padding: '2px 6px',
                        background: selection.includes(e.id) ? 'var(--k-accent-wash)' : 'transparent',
                        borderLeft: selection.includes(e.id) ? '2px solid var(--k-accent)' : '2px solid transparent',
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {elementLabel(doc, e)}
                      </span>
                      <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10.5, color: 'var(--k-ink-faint)' }}>
                        {IFC[e.kind] ?? ''}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })
          )
        ) : tab === 'ausmass' ? (
          ausmass.positionen.length === 0 ? (
            <span style={{ color: 'var(--k-ink-faint)' }}>Noch keine Bauteile im Modell.</span>
          ) : (
            <>
              <table style={{ borderCollapse: 'collapse', width: '100%' }} data-testid="ausmass-tabelle">
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--k-ink-faint)', fontSize: 11 }}>
                    <th style={{ fontWeight: 500, padding: '2px 4px' }}>Position</th>
                    <th style={{ fontWeight: 500, padding: '2px 4px', textAlign: 'right' }}>Menge</th>
                  </tr>
                </thead>
                <tbody>
                  {ausmass.positionen.map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--k-line)' }}>
                      <td style={{ padding: '3px 4px' }}>
                        {p.position}
                        <div style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10, color: 'var(--k-ink-faint)' }}>
                          {p.kapitel} · {p.herleitung}
                        </div>
                      </td>
                      <td style={{ padding: '3px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Measure>
                          {p.menge.toLocaleString('de-CH', { maximumFractionDigits: 2 })} {p.einheit === 'm2' ? 'm²' : p.einheit === 'm3' ? 'm³' : p.einheit}
                        </Measure>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <KButton size="sm" tone="quiet" onClick={ausmassCsv} data-testid="ausmass-csv">
                  CSV (Excel-CH)
                </KButton>
                <span style={{ color: 'var(--k-ink-faint)', fontSize: 10.5, flex: 1 }}>
                  {ausmass.hinweise[ausmass.hinweise.length - 1]}
                </span>
              </div>
            </>
          )
        ) : mengen.positionen.length === 0 ? (
          <span style={{ color: 'var(--k-ink-faint)' }}>Noch keine Bauteile im Modell.</span>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%' }} data-testid="mengen-tabelle">
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--k-ink-faint)', fontSize: 11 }}>
                <th style={{ fontWeight: 500, padding: '2px 4px' }}>Position</th>
                <th style={{ fontWeight: 500, padding: '2px 4px', textAlign: 'right' }}>Stk</th>
                <th style={{ fontWeight: 500, padding: '2px 4px', textAlign: 'right' }}>Fläche</th>
                <th style={{ fontWeight: 500, padding: '2px 4px', textAlign: 'right' }}>Volumen</th>
              </tr>
            </thead>
            <tbody>
              {mengen.positionen.map((p) => (
                <tr key={p.kind + p.bezeichnung} style={{ borderTop: '1px solid var(--k-line)' }}>
                  <td style={{ padding: '3px 4px' }}>
                    {p.bezeichnung}
                    <div style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10, color: 'var(--k-ink-faint)' }}>{p.ifcKlasse}</div>
                  </td>
                  <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                    <Measure>{p.anzahl}</Measure>
                  </td>
                  <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                    <Measure>{fmt(p.flaeche, 'm²')}</Measure>
                  </td>
                  <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                    <Measure>{fmt(p.volumen, 'm³')}</Measure>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'mengen' && mengen.positionen.length > 0 && (
          <span style={{ color: 'var(--k-ink-faint)', fontSize: 10.5 }}>
            Vorausmasse aus der Parametrik (Wände netto, Dächer als Grundfläche) — kein NPK-Ausmass.
          </span>
        )}
      </div>
    </div>
  );
}
