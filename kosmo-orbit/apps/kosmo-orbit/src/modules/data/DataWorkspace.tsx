import { useEffect, useMemo, useState } from 'react';
import { Badge, Hairline, Karteikarte, KButton, KLade, Measure, Messrahmen, Panel, moduleHue } from '@kosmo/ui';
import {
  bauteilkatalog,
  gesamtdicke,
  ladeReferenzenLive,
  materialkatalog,
  uWert,
  type KatalogEintrag,
  type RefEntry,
  type RefEntryAnalysisLayer,
  type RefEntryMedia,
  type RefEntryMediaType,
  type RefReviewStatus,
} from '@kosmo/data';
import { useProject } from '../../state/project-store';
import { setGlbContext } from '../design/Viewport3D';
import { listeGlb, type KosmoAsset } from '../../state/asset-bibliothek';

/**
 * KosmoData — die Referenzbibliothek (Keim aus architekturkosmos.ch).
 * Offline-Seed (112 kuratierte Einträge aus dem Repo) + Live-Sync von der
 * Website, Suche + Facetten. Referenz-3D-Import folgt (Q14).
 *
 * Batch 2 der Codex-Übernahme: das Detail-Dossier zeigt zusätzlich die
 * reichen Felder aus dem Master-Datenmodell (`packages/kosmo-data/src/reference.ts`) —
 * Medien-Galerie, Analyse-Ebenen, Geo, Materialprofil, Datenbankstatus und
 * Sichtbarkeit. `RefEntry` selbst kommt jetzt aus `@kosmo/data` (Superset,
 * strukturell rückwärtskompatibel zum bisherigen schlanken Typ hier).
 */

export type { RefEntry };

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

/** D6 (Batch 2): kurze deutsche Beschriftungen fürs Dossier — kein Fremd-Vokabular im UI. */
const reviewStatusLabel: Record<RefReviewStatus, string> = {
  draft: 'Entwurf',
  reviewed: 'Geprüft',
  verified: 'Verifiziert',
  needs_source: 'Quelle fehlt',
};

const reviewStatusHue: Record<RefReviewStatus, string> = {
  draft: 'var(--k-ink-faint)',
  reviewed: 'var(--k-info)',
  verified: 'var(--k-success)',
  needs_source: 'var(--k-warning)',
};

const dbStatusLabel: Record<string, string> = {
  draft: 'Entwurf',
  reviewed: 'Geprüft',
  published: 'Veröffentlicht',
  needs_sources: 'Quellen fehlen',
};

const mediaTypeLabel: Record<RefEntryMediaType, string> = {
  exterior: 'Aussen',
  interior: 'Innen',
  section: 'Schnitt',
  plan: 'Plan',
};

const analysisTypeLabel: Record<RefEntryAnalysisLayer['analysis_type'], string> = {
  structure: 'Tragwerk',
  tectonics: 'Tektonik',
  spatial_order: 'Raumordnung',
  material_system: 'Materialsystem',
  circulation: 'Erschliessung',
  typology: 'Typologie',
  urban_context: 'Städtebau',
  landscape_system: 'Landschaft',
  filter_classification: 'Filterklassifikation',
  source_reconstruction: 'Quellen-Rekonstruktion',
};

const entryTypeLabel: Record<string, string> = {
  building: 'Gebäude',
  urban_plan: 'Städtebau',
  landscape_project: 'Landschaft',
  text: 'Text',
  theory: 'Theorie',
  map: 'Karte',
  infrastructure: 'Infrastruktur',
  object: 'Objekt',
  event: 'Ereignis',
};

/** Medien-Kachel: Bild mit Fallback auf Platzhalter-Label (kein Fremd-CSS, nur @kosmo/ui-Variablen). */
function MediaThumb({ media }: { media: RefEntryMedia }) {
  return (
    <div
      style={{
        position: 'relative',
        height: 84,
        borderRadius: 'var(--k-radius-sm)',
        border: '1px solid var(--k-line)',
        background: 'var(--k-field)',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          padding: '0 6px',
          textAlign: 'center',
          fontSize: 10,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--k-ink-faint)',
        }}
      >
        {mediaTypeLabel[media.type]}
        {!media.url && ' · gesperrt'}
      </span>
      {media.url && (
        <img
          src={media.url}
          alt={media.label}
          loading="lazy"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(ev) => ((ev.target as HTMLImageElement).style.display = 'none')}
        />
      )}
      {media.credit && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            fontSize: 8.5,
            padding: '2px 4px',
            background: 'color-mix(in srgb, var(--k-surface) 70%, transparent)',
            color: 'var(--k-ink-faint)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {media.credit}
        </span>
      )}
    </div>
  );
}

/**
 * Batch 5 (Codex-Übernahme) — Rückrichtung der Ref↔Asset-Verknüpfung: springt
 * zu KosmoAsset und merkt das Objekt für die Vorauswahl dort (sessionStorage-
 * Brücke, analog `kosmo.data.openRef` in AssetWorkspace.tsx).
 */
function oeffneInKosmoAsset(assetId: string) {
  try {
    sessionStorage.setItem('kosmo.asset.openId', assetId);
  } catch {
    /* privates Fenster — kein Sprung, kein Absturz */
  }
  (window as never as { __kosmo?: { open: (s: string) => void } }).__kosmo?.open('asset');
}

export function DataWorkspace() {
  const [entries, setEntries] = useState<RefEntry[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState<string | null>(null);
  const [selected, setSelected] = useState<RefEntry | null>(null);
  const [syncState, setSyncState] = useState<'seed' | 'synced' | 'fehler'>('seed');
  const [tab, setTab] = useState<'referenzen' | 'bauteile' | 'materialien'>('referenzen');
  const [nurSammlung, setNurSammlung] = useState(false);
  const [sammlung, setSammlung] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('kosmo.sammlung') ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });
  const toggleSammlung = (id: string) => {
    setSammlung((alt) => {
      const next = new Set(alt);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('kosmo.sammlung', JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    void loadReferences()
      .then((es) => {
        setEntries(es);
        // Batch 4: KosmoAsset kann per kosmodata_refs auf eine Referenz zeigen —
        // die Brücke ist sessionStorage, weil `__kosmo.open()` nur den Screen
        // wechselt und keine Nutzlast transportiert.
        try {
          const pendingId = sessionStorage.getItem('kosmo.data.openRef');
          if (pendingId) {
            sessionStorage.removeItem('kosmo.data.openRef');
            const treffer = es.find((e) => e.id === pendingId);
            if (treffer) setSelected(treffer);
          }
        } catch {
          /* privates Fenster — kein Sprung, kein Absturz */
        }
      })
      .finally(() => setGeladen(true));
  }, []);

  // Batch 5: Ref↔Asset-Verknüpfung — «Assets dieses Projekts» im Dossier.
  const [refAssets, setRefAssets] = useState<KosmoAsset[]>([]);
  useEffect(() => {
    if (!selected) {
      setRefAssets([]);
      return;
    }
    let verworfen = false;
    void listeGlb()
      .then((alle) => {
        if (verworfen) return;
        setRefAssets(alle.filter((a) => a.kosmodata_refs.some((r) => r.entry_id === selected.id)));
      })
      .catch(() => {
        if (!verworfen) setRefAssets([]);
      });
    return () => {
      verworfen = true;
    };
  }, [selected]);

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
      if (nurSammlung && !sammlung.has(e.id)) return false;
      if (sector && e.style_sector !== sector) return false;
      if (!q) return true;
      const hay = [e.title, e.city, e.country, ...(e.authors ?? []), ...(e.themes ?? []), ...(e.materials ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query, sector, nurSammlung, sammlung]);

  // E2: Live-Sync read-only — Live → Cache (letzter guter Stand) → Seed
  const [quelle, setQuelle] = useState<'seed' | 'live' | 'cache'>('seed');
  const syncLive = async () => {
    const ergebnis = await ladeReferenzenLive();
    if (!ergebnis) {
      setSyncState('fehler');
      return;
    }
    setEntries(ergebnis.eintraege as RefEntry[]);
    setQuelle(ergebnis.quelle);
    setSyncState('synced');
  };

  return (
    <div className="k-einblenden" style={{ position: 'absolute', inset: 0, display: 'flex' }}>
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
            <KButton size="sm" tone={tab === 'materialien' ? 'accent' : 'ghost'} onClick={() => setTab('materialien')} data-testid="tab-materialien">
              Materialien
            </KButton>
            <span style={{ color: 'var(--k-ink-soft)', fontSize: 13 }}>
              {tab === 'referenzen'
                ? `${filtered.length} von ${entries.length} Referenzen`
                : tab === 'bauteile'
                  ? `${bauteilkatalog.length} Aufbauten`
                  : `${materialkatalog.length} Materialien`}
            </span>
            <div style={{ flex: 1 }} />
            <Badge hue={syncState === 'synced' && quelle === 'live' ? 'var(--k-success)' : syncState === 'fehler' ? 'var(--k-warning)' : 'var(--k-info)'}>
              {syncState === 'seed'
                ? 'Offline-Seed'
                : syncState === 'fehler'
                  ? 'Site nicht erreichbar — Seed bleibt'
                  : quelle === 'live'
                    ? `Live · ${entries.length}`
                    : `Cache (letzter Stand) · ${entries.length}`}
            </Badge>
            <KButton size="sm" tone="ghost" onClick={() => void syncLive()} data-testid="data-sync">
              Sync
            </KButton>
          </div>

          {tab === 'bauteile' && <BauteilkatalogView />}
          {tab === 'materialien' && <MaterialkatalogView />}

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
            <KButton
              size="sm"
              tone={nurSammlung ? 'accent' : 'quiet'}
              data-testid="filter-sammlung"
              onClick={() => setNurSammlung(!nurSammlung)}
            >
              ★ Sammlung ({sammlung.size})
            </KButton>
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

          {/* D3: Leerzustand als Bauzeichnung (Gestaltungskonzept) */}
          {filtered.length === 0 && (
            <Messrahmen
              height={220}
              caption="Keine Referenz passt zur Suche — Begriff lockern oder Filter lösen"
            />
          )}
          {!geladen && <KLade text="Referenzen laden …" height={200} />}
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
                style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
              >
                <button
                  aria-label="Zur Sammlung"
                  data-testid={`stern-${e.id}`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    toggleSammlung(e.id);
                  }}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    position: 'absolute',
                    top: 6,
                    right: 8,
                    zIndex: 2,
                    fontSize: 15,
                    color: sammlung.has(e.id) ? 'var(--k-warning)' : 'var(--k-ink-faint)',
                    textShadow: '0 0 3px var(--k-raised)',
                  }}
                >
                  {sammlung.has(e.id) ? '★' : '☆'}
                </button>
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
          data-testid="ref-detail-dossier"
          style={{
            width: 420,
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
          {(selected.authors ?? []).length > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>{(selected.authors ?? []).join(', ')}</div>
          )}

          {/* D6 (Batch 2): Status- und Sichtbarkeitschips aus dem reichen Master-Modell. */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {selected.entry_type && <Badge hue={moduleHue.data}>{entryTypeLabel[selected.entry_type] ?? selected.entry_type}</Badge>}
            {selected.database_profile && (
              <Badge hue="var(--k-info)">Datenbank {dbStatusLabel[selected.database_profile.status] ?? selected.database_profile.status}</Badge>
            )}
            {selected.source_quality && <Badge hue="var(--k-ink-faint)">Quelle {selected.source_quality.replace(/_/g, ' ')}</Badge>}
            <span data-testid="ref-visibility">
              <Badge hue={(selected.visibility ?? 'public') === 'public' ? 'var(--k-success)' : 'var(--k-warning)'}>
                {(selected.visibility ?? 'public') === 'public' ? 'Öffentlich' : 'Privat'}
              </Badge>
            </span>
          </div>

          <Hairline />
          {selected.one_sentence && <div style={{ fontSize: 13, fontStyle: 'italic' }}>{selected.one_sentence}</div>}
          {(selected.full_description ?? selected.short_description) && (
            <div style={{ fontSize: 13, color: 'var(--k-ink-soft)', lineHeight: 1.55 }}>
              {selected.full_description ?? selected.short_description}
            </div>
          )}
          {(selected.themes ?? []).length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {(selected.themes ?? []).map((t) => (
                <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--k-accent-wash)' }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Materialprofil: strukturiert (materials_detail) falls vorhanden, sonst die schlanke Tag-Liste. */}
          {selected.materials_detail ? (
            <div style={{ fontSize: 12, color: 'var(--k-ink-faint)', display: 'grid', gap: 3 }}>
              {(selected.materials_detail.primary ?? []).length > 0 && (
                <div>Primär: {(selected.materials_detail.primary ?? []).join(', ')}</div>
              )}
              {(selected.materials_detail.stone_type ?? []).length > 0 && (
                <div>Gestein: {(selected.materials_detail.stone_type ?? []).join(', ')}</div>
              )}
              {(selected.materials_detail.secondary ?? []).length > 0 && (
                <div>Sekundär: {(selected.materials_detail.secondary ?? []).join(', ')}</div>
              )}
              {selected.materials_detail.notes && (
                <div style={{ fontStyle: 'italic' }}>{selected.materials_detail.notes}</div>
              )}
            </div>
          ) : (
            (selected.materials ?? []).length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--k-ink-faint)' }}>
                Material: {(selected.materials ?? []).join(', ')}
              </div>
            )
          )}

          {/* Geo: Koordinaten + Region/Kanton/Land als Text — keine Karten-Lib (Offline/CORS). */}
          {selected.geo && (selected.geo.lat != null || selected.geo.region || selected.geo.canton) && (
            <>
              <Hairline />
              <div data-testid="ref-geo" style={{ display: 'grid', gap: 3 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
                  Geo
                </div>
                {selected.geo.lat != null && selected.geo.lon != null && (
                  <Measure>
                    {selected.geo.lat.toFixed(4)}°, {selected.geo.lon.toFixed(4)}°
                  </Measure>
                )}
                <div style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
                  {[selected.geo.region, selected.geo.canton, selected.country].filter(Boolean).join(' · ')}
                </div>
              </div>
            </>
          )}

          {/* Medien-Galerie: Bilder mit öffentlicher URL als Thumbnail, sonst gesperrte Platzhalterkachel. */}
          {(selected.media ?? []).length > 0 && (
            <>
              <Hairline />
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
                Medien
              </div>
              <div data-testid="ref-media" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {(selected.media ?? []).map((m, i) => (
                  <MediaThumb key={`${m.type}-${i}`} media={m} />
                ))}
              </div>
            </>
          )}

          {/* Analyse-Ebenen: Typ + Zusammenfassung + Prüfstatus-Chip. */}
          {(selected.analysis_layers ?? []).length > 0 && (
            <>
              <Hairline />
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
                Analyse
              </div>
              <div data-testid="ref-analyse" style={{ display: 'grid', gap: 8 }}>
                {(selected.analysis_layers ?? []).map((layer, i) => (
                  <div key={`${layer.analysis_type}-${i}`} style={{ display: 'grid', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{analysisTypeLabel[layer.analysis_type] ?? layer.analysis_type}</span>
                      <div style={{ flex: 1 }} />
                      <Badge hue={reviewStatusHue[layer.review_status]}>{reviewStatusLabel[layer.review_status]}</Badge>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--k-ink-soft)', lineHeight: 1.45 }}>{layer.summary}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Assets dieses Projekts (Batch 5): Rückrichtung zu KosmoAsset per kosmodata_refs. */}
          <Hairline />
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
            Assets dieses Projekts
          </div>
          <div data-testid="ref-assets" style={{ display: 'grid', gap: 6 }}>
            {refAssets.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--k-ink-faint)' }}>Noch keine Assets verknüpft</span>
            )}
            {refAssets.map((a) => (
              <KButton
                key={a.id}
                size="sm"
                tone="ghost"
                data-testid={`ref-asset-${a.id}`}
                onClick={() => oeffneInKosmoAsset(a.id)}
              >
                {a.title}
              </KButton>
            ))}
          </div>

          {selected.has_3d && (
            <>
              <Hairline />
              <KButton
                size="sm"
                tone="accent"
                data-testid="ref3d-laden"
                onClick={() => {
                  setGlbContext(`https://architekturkosmos.ch/archive-models/${selected.id}/low.glb`);
                  (window as never as { __kosmo?: { open: (s: string) => void } }).__kosmo?.open('design');
                }}
              >
                Referenz-3D ins Modell laden
              </KButton>
              <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
                Lädt das Studienmodell von architekturkosmos.ch als Kontext neben deinen Entwurf.
              </span>
            </>
          )}
        </aside>
      )}
    </div>
  );
}

/** CH-Bauteilkatalog (Q14): Aufbauten mit Schichten + U-Wert, per Klick ins Projekt. */
export function BauteilkatalogView() {
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
          <div className="k-titel" style={{ fontSize: 14 }}>{kat}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
            {bauteilkatalog
              .filter((e) => e.kategorie === kat)
              .map((e) => {
                const dicke = gesamtdicke(e.layers);
                const u = uWert(e.layers);
                const schonDa = vorhandene.has(e.name);
                const nr = bauteilkatalog.indexOf(e) + 1;
                return (
                  <Karteikarte key={e.id} nr={nr} data-testid={`bauteil-${e.id}`}>
                   <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontFamily: 'var(--k-font-mono)', fontWeight: 700, fontSize: 13 }}>{e.name}</div>
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
                   </div>
                  </Karteikarte>
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

/** Materialkatalog (Q14): ein Schlüssel — PBR fürs 3D, SIA-Schraffur, Lambda. */
export function MaterialkatalogView() {
  const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
      {materialkatalog.map((m) => (
        <Panel key={m.key} data-testid={`material-${m.key}`} style={{ padding: '10px 12px', display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${hex(m.pbr.color)}, color-mix(in srgb, ${hex(m.pbr.color)} ${Math.round((1 - m.pbr.roughness) * 60 + 40)}%, white))`,
                border: '1px solid var(--k-line-strong)',
                flexShrink: 0,
              }}
              title={`Rauheit ${m.pbr.roughness}${m.pbr.metalness ? ` · Metall ${m.pbr.metalness}` : ''}`}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 550, fontSize: 13 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>
                Schraffur: {m.sia}
                {m.lambda !== undefined ? ` · λ ${m.lambda}` : ''}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--k-ink-soft)', lineHeight: 1.45 }}>{m.beschrieb}</div>
        </Panel>
      ))}
      <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--k-ink-faint)' }}>
        Dieselben Schlüssel tragen die Aufbauten des Bauteilkatalogs — 3D-Farbe, Plan-Schraffur
        und U-Wert kommen aus einer Quelle. Texturen (PBR-Maps) folgen mit der HomeStation.
      </div>
    </div>
  );
}
