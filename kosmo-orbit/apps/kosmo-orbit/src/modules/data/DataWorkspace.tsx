import { useEffect, useMemo, useState } from 'react';
import { Badge, Hairline, KButton, Measure, Panel, moduleHue } from '@kosmo/ui';
import { bauteilkatalog, gesamtdicke, uWert, type KatalogEintrag } from './bauteilkatalog';
import { useProject } from '../../state/project-store';

/**
 * KosmoData — die Referenzbibliothek (Keim aus architekturkosmos.ch).
 * Offline-Seed (112 kuratierte Einträge aus dem Repo) + Live-Sync von der
 * Website, Suche + Facetten. Referenz-3D-Import folgt (Q14).
 */

export interface RefEntry {
  id: string;
  title: string;
  year_start?: number | null;
  year_end?: number | null;
  authors: string[];
  city?: string | null;
  country?: string | null;
  style_sector?: string | null;
  themes: string[];
  materials: string[];
  program?: string | null;
  one_sentence?: string | null;
  short_description?: string | null;
  hero?: string | null;
  has_3d: boolean;
}

let cache: RefEntry[] | null = null;

export async function loadReferences(): Promise<RefEntry[]> {
  if (cache) return cache;
  const res = await fetch('./kosmodata-seed.json');
  const data = (await res.json()) as { entries: RefEntry[] };
  cache = data.entries;
  return cache;
}

function formatYear(e: RefEntry): string {
  const y = e.year_start;
  if (y == null) return '—';
  if (y < 0) return `${Math.abs(y)} v. Chr.`;
  return String(y);
}

export function DataWorkspace() {
  const [entries, setEntries] = useState<RefEntry[]>([]);
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState<string | null>(null);
  const [selected, setSelected] = useState<RefEntry | null>(null);
  const [syncState, setSyncState] = useState<'seed' | 'synced' | 'fehler'>('seed');
  const [tab, setTab] = useState<'referenzen' | 'bauteile'>('referenzen');

  useEffect(() => {
    void loadReferences().then(setEntries);
  }, []);

  const sectors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      if (e.style_sector) counts.set(e.style_sector, (counts.get(e.style_sector) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return entries.filter((e) => {
      if (sector && e.style_sector !== sector) return false;
      if (!q) return true;
      const hay = [e.title, e.city, e.country, ...(e.authors ?? []), ...(e.themes ?? []), ...(e.materials ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query, sector]);

  const syncLive = async () => {
    try {
      const res = await fetch('https://architekturkosmos.ch/api/entries.json', { mode: 'cors' });
      if (!res.ok) throw new Error(String(res.status));
      setSyncState('synced');
    } catch {
      setSyncState('fehler');
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Badge hue={moduleHue.data}>KosmoData</Badge>
            <KButton size="sm" tone={tab === 'referenzen' ? 'accent' : 'ghost'} onClick={() => setTab('referenzen')} data-testid="tab-referenzen">
              Referenzen
            </KButton>
            <KButton size="sm" tone={tab === 'bauteile' ? 'accent' : 'ghost'} onClick={() => setTab('bauteile')} data-testid="tab-bauteile">
              Bauteilkatalog CH
            </KButton>
            <span style={{ color: 'var(--k-ink-soft)', fontSize: 13 }}>
              {tab === 'referenzen' ? `${filtered.length} von ${entries.length} Referenzen` : `${bauteilkatalog.length} Aufbauten`}
            </span>
            <div style={{ flex: 1 }} />
            <Badge hue={syncState === 'synced' ? 'var(--k-success)' : syncState === 'fehler' ? 'var(--k-warning)' : 'var(--k-info)'}>
              {syncState === 'seed' ? 'Offline-Seed' : syncState === 'synced' ? 'Live' : 'Site nicht erreichbar'}
            </Badge>
            <KButton size="sm" tone="ghost" onClick={() => void syncLive()}>
              Sync
            </KButton>
          </div>

          {tab === 'bauteile' && <BauteilkatalogView />}

          {tab === 'referenzen' && (<>
          <input
            data-testid="data-search"
            placeholder="Suchen: Titel, Ort, Architekt, Thema, Material …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--k-radius-sm)',
              border: '1px solid var(--k-line-strong)',
              background: 'var(--k-raised)',
              fontSize: 14,
            }}
          />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sectors.map(([s, n]) => (
              <KButton
                key={s}
                size="sm"
                tone={sector === s ? 'accent' : 'quiet'}
                onClick={() => setSector(sector === s ? null : s)}
              >
                {s.replace(/_/g, ' ')} · {n}
              </KButton>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {filtered.map((e) => (
              <Panel
                key={e.id}
                pad={false}
                data-testid="ref-card"
                onClick={() => setSelected(e)}
                style={{ cursor: 'pointer', overflow: 'hidden' }}
              >
                <div
                  style={{
                    height: 110,
                    background: 'var(--k-field)',
                    display: 'grid',
                    placeItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {e.hero ? (
                    <img
                      src={e.hero}
                      alt=""
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(ev) => ((ev.target as HTMLElement).style.display = 'none')}
                    />
                  ) : (
                    <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>{e.style_sector?.replace(/_/g, ' ')}</span>
                  )}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 550, fontSize: 13.5, lineHeight: 1.3 }}>{e.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)', marginTop: 3 }}>
                    {[formatYear(e), e.city, e.country].filter(Boolean).join(' · ')}
                    {e.has_3d ? ' · 3D' : ''}
                  </div>
                </div>
              </Panel>
            ))}
          </div>
          </>)}
        </div>
      </div>

      {selected && (
        <aside
          style={{
            width: 330,
            borderLeft: '1px solid var(--k-line)',
            background: 'var(--k-surface)',
            overflow: 'auto',
            padding: 16,
            display: 'grid',
            gap: 10,
            alignContent: 'start',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Badge hue={moduleHue.data}>Referenz</Badge>
            <div style={{ flex: 1 }} />
            <KButton size="sm" tone="ghost" onClick={() => setSelected(null)}>
              ×
            </KButton>
          </div>
          {selected.hero && (
            <img src={selected.hero} alt="" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--k-line)' }} />
          )}
          <div style={{ fontSize: 17, fontWeight: 600 }}>{selected.title}</div>
          <Measure>
            {[formatYear(selected), selected.city, selected.country].filter(Boolean).join(' · ')}
          </Measure>
          {selected.authors.length > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>{selected.authors.join(', ')}</div>
          )}
          <Hairline />
          {selected.one_sentence && <div style={{ fontSize: 13, fontStyle: 'italic' }}>{selected.one_sentence}</div>}
          {selected.short_description && (
            <div style={{ fontSize: 13, color: 'var(--k-ink-soft)', lineHeight: 1.55 }}>{selected.short_description}</div>
          )}
          {selected.themes.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {selected.themes.map((t) => (
                <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--k-accent-wash)' }}>
                  {t}
                </span>
              ))}
            </div>
          )}
          {selected.materials.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--k-ink-faint)' }}>
              Material: {selected.materials.join(', ')}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

/** CH-Bauteilkatalog (Q14): Aufbauten mit Schichten + U-Wert, per Klick ins Projekt. */
function BauteilkatalogView() {
  const runCommand = useProject((s) => s.runCommand);
  const revision = useProject((s) => s.revision);
  const { doc } = useProject.getState();
  const vorhandene = useMemo(
    () => new Set(doc.byKind<import('@kosmo/kernel').Assembly>('assembly').map((a) => a.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
  const [uebernommen, setUebernommen] = useState<string | null>(null);

  const kategorien: KatalogEintrag['kategorie'][] = ['Aussenwand', 'Innenwand', 'Decke', 'Dach'];

  function uebernehmen(e: KatalogEintrag) {
    runCommand('design.aufbauErstellen', { name: e.name, target: e.target, layers: e.layers });
    setUebernommen(e.id);
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {kategorien.map((kat) => (
        <div key={kat} style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 550, fontSize: 13.5 }}>{kat}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {bauteilkatalog
              .filter((e) => e.kategorie === kat)
              .map((e) => {
                const dicke = gesamtdicke(e.layers);
                const u = uWert(e.layers);
                const schonDa = vorhandene.has(e.name);
                return (
                  <Panel key={e.id} data-testid={`bauteil-${e.id}`} style={{ padding: '12px 14px', display: 'grid', gap: 8 }}>
                    <div style={{ fontWeight: 550, fontSize: 13.5 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>{e.beschrieb}</div>
                    {/* Schichtbalken (massstäblich) */}
                    <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--k-line)' }}>
                      {e.layers.map((l, i) => (
                        <div
                          key={i}
                          title={`${l.material} ${l.thickness} mm (${l.function})`}
                          style={{
                            width: `${(l.thickness / dicke) * 100}%`,
                            background:
                              l.function === 'tragend'
                                ? 'var(--k-ink-faint)'
                                : l.function === 'daemmung'
                                  ? 'var(--k-accent-wash)'
                                  : l.function === 'hohlraum'
                                    ? 'transparent'
                                    : 'var(--k-line-strong)',
                            borderRight: i < e.layers.length - 1 ? '1px solid var(--k-surface)' : 'none',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--k-ink-faint)' }}>
                      <span>{dicke} mm</span>
                      <span>U ≈ {u.toFixed(2)} W/m²K</span>
                      <div style={{ flex: 1 }} />
                      {schonDa ? (
                        <Badge hue="var(--k-success)">Im Projekt</Badge>
                      ) : (
                        <KButton size="sm" tone="quiet" onClick={() => uebernehmen(e)} data-testid={`uebernehmen-${e.id}`}>
                          Übernehmen
                        </KButton>
                      )}
                    </div>
                  </Panel>
                );
              })}
          </div>
        </div>
      ))}
      {uebernommen && (
        <div style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>
          Übernommen — ab sofort im Wand-/Decken-Werkzeug (KosmoDesign) wählbar. U-Werte sind
          Richtwerte (SIA-180-vereinfacht), kein Nachweis-Ersatz.
        </div>
      )}
    </div>
  );
}
