import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Hairline, KButton, KLade, Measure, Messrahmen, Panel, bestaetigen, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import { FREEMESH_MAX_FACES, FREEMESH_MAX_VERTICES } from '@kosmo/kernel';
import { BauteilkatalogView, loadReferences, MaterialkatalogView, type RefEntry } from '../data/DataWorkspace';
import { setGlbContext } from '../design/Viewport3D';
import { glbZuMeshDaten } from './glb-zu-mesh';
import { useProject } from '../../state/project-store';
import {
  assetBytes,
  entferneAssetReferenz,
  listeGlb,
  loescheGlb,
  speichereGlb,
  verknuepfeAssetMitReferenz,
  type AssetCategory,
  type AssetFormatStatus,
  type AssetType,
  type KosmoAsset,
  type KosmodataRefKind,
  type RightsStatus,
} from '../../state/asset-bibliothek';
import { pruefeGlbHeader } from '../../state/glb-guard';

/**
 * KosmoAsset (V1-Finish P3, Owner-Q14) — die Bibliothek der Dinge:
 * Materialkarten (PBR), CH-Bauteilkatalog (Übernehmen als Aufbau) und die
 * GLB-Objekt-Bibliothek. Objekte liegen projektübergreifend in IndexedDB
 * (nie Megabytes durch Undo/Yjs); «Ins Modell» lädt sie als studierbaren
 * Referenz-Kontext in den Design-Viewport.
 *
 * Batch 4 der Codex-Übernahme hebt die Objekt-Bibliothek (Tab «Objekte») auf
 * das UX-Niveau von KosmoData: Suche, Facetten (asset_type), Sammlung
 * (Stern + localStorage) und ein Detail-Aside, das das reiche
 * KosmoAsset-Manifest aus Batch 3 zeigt (Formate, Rechte, Sichtbarkeit,
 * Masse, KosmoData-Bezüge). Bauteil-/Materialkatalog-Tabs bleiben unverändert.
 */

const assetTypeLabel: Record<AssetType, string> = {
  '2d_symbol': '2D-Symbol',
  vector_plan_component: 'Vektor-Planteil',
  texture: 'Textur',
  material: 'Material',
  glb_model: 'GLB-Objekt',
  blender_collection: 'Blender-Sammlung',
  archicad_layer: 'ArchiCAD-Layer',
  detail: 'Detail',
  component: 'Bauteil',
  landscape: 'Landschaft',
  lighting: 'Licht',
  render_preset: 'Render-Preset',
};

const categoryLabel: Record<AssetCategory, string> = {
  structure: 'Tragwerk',
  facade: 'Fassade',
  opening: 'Öffnung',
  stair: 'Treppe',
  roof: 'Dach',
  ground: 'Boden',
  landscape: 'Landschaft',
  material: 'Material',
  furniture: 'Möbel',
  annotation: 'Annotation',
  site: 'Situation',
  atmosphere: 'Atmosphäre',
  utility: 'Haustechnik',
  component: 'Bauteil',
};

const rightsStatusLabel: Record<RightsStatus, string> = {
  unknown: 'Unbekannt',
  needs_permission: 'Erlaubnis nötig',
  private_research: 'Privat/Recherche',
  licensed: 'Lizenziert',
  public_domain: 'Gemeinfrei',
  own_work: 'Eigene Arbeit',
  generated_needs_review: 'Generiert — Prüfung nötig',
};

const formatStatusLabel: Record<AssetFormatStatus, string> = {
  ready: 'Bereit',
  missing: 'Fehlt',
  blocked: 'Gesperrt',
};

const formatStatusHue: Record<AssetFormatStatus, string> = {
  ready: 'var(--k-success)',
  missing: 'var(--k-ink-faint)',
  blocked: 'var(--k-warning)',
};

const kosmodataRefKindLabel: Record<KosmodataRefKind, string> = {
  reference_entry: 'Referenz-Eintrag',
  source_entry: 'Quell-Eintrag',
  project_context: 'Projekt-Kontext',
  material_context: 'Material-Kontext',
  typology_context: 'Typologie-Kontext',
};

/** Springt zu KosmoData und merkt den Bezug für die Vorauswahl im Dossier (sessionStorage-Brücke). */
function oeffneInKosmoData(entryId: string) {
  try {
    sessionStorage.setItem('kosmo.data.openRef', entryId);
  } catch {
    /* privates Fenster — Klick zeigt nur den Bezug an, kein Sprung */
  }
  (window as never as { __kosmo?: { open: (s: string) => void } }).__kosmo?.open('data');
}

export function AssetWorkspace() {
  const [tab, setTab] = useState<'objekte' | 'bauteile' | 'materialien'>('objekte');
  const [objekte, setObjekte] = useState<KosmoAsset[] | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | null>(null);
  const [selected, setSelected] = useState<KosmoAsset | null>(null);
  const [nurSammlung, setNurSammlung] = useState(false);
  const [sammlung, setSammlung] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('kosmo.asset-sammlung') ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });
  const toggleSammlung = (id: string) => {
    setSammlung((alt) => {
      const next = new Set(alt);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('kosmo.asset-sammlung', JSON.stringify([...next]));
      return next;
    });
  };

  const laden = () => {
    void listeGlb()
      .then((liste) => {
        setObjekte(liste);
        // Batch 5: KosmoData kann per Klick auf «Assets dieses Projekts» hierher
        // springen — die Brücke ist sessionStorage (analog `kosmo.data.openRef`),
        // weil `__kosmo.open()` nur den Screen wechselt, keine Nutzlast trägt.
        try {
          const pendingId = sessionStorage.getItem('kosmo.asset.openId');
          if (pendingId) {
            sessionStorage.removeItem('kosmo.asset.openId');
            const treffer = liste.find((o) => o.id === pendingId);
            if (treffer) {
              setTab('objekte');
              setSelected(treffer);
            }
          }
        } catch {
          /* privates Fenster — kein Sprung, kein Absturz */
        }
      })
      .catch((err) => {
        setObjekte([]);
        meldeFehler(err);
      });
  };
  useEffect(laden, []);

  // Batch 5: Ref↔Asset-Verknüpfung — Picker für «Mit Referenzprojekt verknüpfen».
  const [refs, setRefs] = useState<RefEntry[] | null>(null);
  const [refPickerOffen, setRefPickerOffen] = useState(false);
  const [refQuery, setRefQuery] = useState('');

  const aktualisiereAsset = async (assetId: string) => {
    const liste = await listeGlb();
    setObjekte(liste);
    const treffer = liste.find((a) => a.id === assetId);
    if (treffer) setSelected(treffer);
  };

  const oeffneRefPicker = () => {
    setRefPickerOffen(true);
    if (refs === null) {
      void loadReferences()
        .then(setRefs)
        .catch((err) => {
          setRefs([]);
          meldeFehler(err);
        });
    }
  };

  const refTreffer = useMemo(() => {
    if (!selected) return [];
    const bereits = new Set(selected.kosmodata_refs.map((r) => r.entry_id));
    const q = refQuery.toLowerCase().trim();
    return (refs ?? [])
      .filter((e) => !bereits.has(e.id))
      .filter((e) => !q || [e.title, e.city, e.country].filter(Boolean).join(' ').toLowerCase().includes(q))
      .slice(0, 30);
  }, [refs, refQuery, selected]);

  const verknuepfen = async (entry: RefEntry) => {
    if (!selected) return;
    try {
      await verknuepfeAssetMitReferenz(selected.id, entry.id);
      await aktualisiereAsset(selected.id);
      setRefPickerOffen(false);
      setRefQuery('');
      melde(`«${selected.title}» mit «${entry.title}» verknüpft`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  };

  const entferneRef = async (referenzId: string) => {
    if (!selected) return;
    try {
      await entferneAssetReferenz(selected.id, referenzId);
      await aktualisiereAsset(selected.id);
      melde('Verknüpfung entfernt', { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  };

  // Picker schliesst sich, sobald ein anderes/kein Objekt gewählt ist.
  useEffect(() => {
    setRefPickerOffen(false);
    setRefQuery('');
  }, [selected?.id]);

  const typeCounts = useMemo(() => {
    const counts = new Map<AssetType, number>();
    for (const o of objekte ?? []) counts.set(o.asset_type, (counts.get(o.asset_type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [objekte]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return (objekte ?? []).filter((o) => {
      if (nurSammlung && !sammlung.has(o.id)) return false;
      if (typeFilter && o.asset_type !== typeFilter) return false;
      if (!q) return true;
      const hay = [o.title, o.asset_type, o.category, ...o.tags].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [objekte, query, typeFilter, nurSammlung, sammlung]);

  const importieren = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb';
    input.multiple = true;
    input.onchange = async () => {
      try {
        // B7-Härtung: Header+Grösse VOR dem Speichern prüfen — abgeschnittene/
        // gefälschte/übergrosse Dateien schreiben nie einen Tresor-Eintrag.
        let importiert = 0;
        const abgelehnt: string[] = [];
        for (const f of [...(input.files ?? [])]) {
          const guard = pruefeGlbHeader(await f.arrayBuffer());
          if (!guard.ok) {
            abgelehnt.push(`«${f.name}»: ${guard.fehler}`);
            continue;
          }
          await speichereGlb(f);
          importiert++;
        }
        laden();
        if (importiert > 0) melde(`${importiert} Objekt(e) in der Bibliothek`, { ton: 'erfolg' });
        if (abgelehnt.length > 0) meldeFehler(`Abgelehnt: ${abgelehnt.join('; ')}`);
      } catch (err) {
        meldeFehler(err);
      }
    };
    input.click();
  };

  const insModell = (o: KosmoAsset) => {
    const url = URL.createObjectURL(new Blob([o.daten], { type: 'model/gltf-binary' }));
    setGlbContext(url);
    melde(`«${o.title}» liegt als Referenz-Kontext im Design-Viewport`, { ton: 'erfolg' });
  };

  /**
   * GLB-Brücke (Buildplan Block 3, Batch FM4/E6): übernimmt ein GLB-Objekt
   * als editierbares FreeMesh im aktiven Geschoss — NUR wenn es unters harte
   * Vertex-/Flächen-Budget passt (Budget-Wächter VOR dem Command, ehrliche
   * Zahlen in der Meldung). Zu grosse Objekte bleiben Referenz-Kontext, der
   * bestehende «Ins Modell»-Weg bleibt der Ausweg. `design.meshErstellen`
   * (form «daten») bewacht Budget/Indizes zusätzlich selbst — ein CommandError
   * von dort (Doppelboden) landet ebenfalls in `meldeFehler`.
   */
  const alsFreeMesh = async (o: KosmoAsset) => {
    const { activeStoreyId, runCommand } = useProject.getState();
    if (!activeStoreyId) {
      meldeFehler(
        'Kein aktives Geschoss/Projekt — zuerst in KosmoDesign ein Projekt öffnen und ein Geschoss wählen, dann übernehmen.',
      );
      return;
    }
    try {
      const { positions, faces, vertexCount, faceCount } = await glbZuMeshDaten(o.daten);
      if (vertexCount === 0 || faceCount === 0) {
        meldeFehler(`«${o.title}» enthält kein auswertbares Dreiecksnetz — bleibt Referenz-Kontext, nutze «Ins Modell».`);
        return;
      }
      if (vertexCount > FREEMESH_MAX_VERTICES || faceCount > FREEMESH_MAX_FACES) {
        meldeFehler(
          `«${o.title}» ist zu gross für editierbares FreeMesh (${vertexCount} Vertices / ${faceCount} Flächen — ` +
            `Budget ${FREEMESH_MAX_VERTICES}/${FREEMESH_MAX_FACES}). Bleibt Referenz-Kontext — nutze «Ins Modell».`,
        );
        return;
      }
      runCommand('design.meshErstellen', {
        form: 'daten',
        storeyId: activeStoreyId,
        positions,
        faces,
        name: o.title,
      });
      melde(`«${o.title}» als FreeMesh im Modell — im KosmoDesign bearbeiten`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  };

  const loeschen = (o: KosmoAsset) => {
    void bestaetigen({
      titel: `Objekt «${o.title}» löschen?`,
      gefaehrlich: true,
      bestaetigen: 'Löschen',
    }).then((ok) => {
      if (!ok) return;
      void loescheGlb(o.id).then(() => {
        if (selected?.id === o.id) setSelected(null);
        laden();
      });
    });
  };

  return (
    <div className="k-einblenden" style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Badge hue={moduleHue.asset}>KosmoAsset</Badge>
            <KButton size="sm" tone={tab === 'objekte' ? 'accent' : 'ghost'} onClick={() => setTab('objekte')} data-testid="tab-objekte">
              Objekte (GLB)
            </KButton>
            <KButton size="sm" tone={tab === 'bauteile' ? 'accent' : 'ghost'} onClick={() => setTab('bauteile')} data-testid="asset-tab-bauteile">
              Bauteilkatalog CH
            </KButton>
            <KButton size="sm" tone={tab === 'materialien' ? 'accent' : 'ghost'} onClick={() => setTab('materialien')} data-testid="asset-tab-materialien">
              Materialien
            </KButton>
            {tab === 'objekte' && objekte !== null && (
              <span style={{ color: 'var(--k-ink-soft)', fontSize: 13 }}>
                {filtered.length} von {objekte.length} Objekten
              </span>
            )}
            <div style={{ flex: 1 }} />
            {tab === 'objekte' && (
              <KButton size="sm" tone="accent" onClick={importieren} data-testid="glb-import">
                + GLB importieren
              </KButton>
            )}
          </div>
          <Hairline />

          {tab === 'bauteile' && <BauteilkatalogView />}
          {tab === 'materialien' && <MaterialkatalogView />}

          {tab === 'objekte' && (
            <>
              <span style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>
                Projektübergreifende Objekt-Bibliothek — Möbel, Bäume, Kontextbauten als GLB.
                «Ins Modell» legt das Objekt als Referenz-Kontext in den Design-Viewport
                (studierbar, nicht Teil der Pläne). «Als FreeMesh übernehmen» wandelt ein
                kleines GLB (bis {FREEMESH_MAX_VERTICES} Vertices) ins editierbare Doc-Mesh —
                grössere bleiben ehrlich Referenz-Kontext. Blender exportiert GLB direkt.
              </span>

              <input
                data-testid="asset-search"
                placeholder="Suchen: Titel, Typ, Kategorie, Tag …"
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
                  data-testid="asset-sammlung"
                  onClick={() => setNurSammlung(!nurSammlung)}
                >
                  ★ Sammlung ({sammlung.size})
                </KButton>
                {typeCounts.map(([t, n]) => (
                  <KButton
                    key={t}
                    size="sm"
                    tone={typeFilter === t ? 'accent' : 'quiet'}
                    data-testid={`asset-facet-${t}`}
                    onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                  >
                    {assetTypeLabel[t] ?? t} · {n}
                  </KButton>
                ))}
              </div>

              {objekte === null && <KLade text="Bibliothek laden …" height={160} />}
              {objekte !== null && objekte.length === 0 && (
                <Messrahmen height={220} caption="Noch keine Objekte — «+ GLB importieren» füllt die Bibliothek" />
              )}
              {objekte !== null && objekte.length > 0 && filtered.length === 0 && (
                <Messrahmen height={220} caption="Kein Objekt passt zur Suche — Begriff lockern oder Filter lösen" />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {filtered.map((o) => (
                  <Panel
                    key={o.id}
                    pad={false}
                    data-testid="asset-card"
                    onClick={() => setSelected(o)}
                    style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                  >
                    <button
                      aria-label="Zur Sammlung"
                      data-testid={`asset-stern-${o.id}`}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggleSammlung(o.id);
                      }}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        position: 'absolute',
                        top: 6,
                        right: 8,
                        zIndex: 2,
                        fontSize: 15,
                        color: sammlung.has(o.id) ? 'var(--k-warning)' : 'var(--k-ink-faint)',
                        textShadow: '0 0 3px var(--k-raised)',
                      }}
                    >
                      {sammlung.has(o.id) ? '★' : '☆'}
                    </button>
                    <div data-testid="glb-karte" style={{ display: 'grid', gap: 6, padding: 10 }}>
                      <AssetPreviewView asset={o} />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 600, fontSize: 12.5, overflowWrap: 'anywhere' }}>{o.title}</span>
                        <div style={{ flex: 1 }} />
                        <Measure>{(assetBytes(o) / 1024).toFixed(0)} KB</Measure>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Badge hue={moduleHue.asset}>{assetTypeLabel[o.asset_type] ?? o.asset_type}</Badge>
                        <Badge hue="var(--k-ink-faint)">{categoryLabel[o.category] ?? o.category}</Badge>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {o.asset_type === 'glb_model' && (
                          <KButton
                            size="sm"
                            tone="quiet"
                            data-testid="glb-ins-modell"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              insModell(o);
                            }}
                          >
                            Ins Modell
                          </KButton>
                        )}
                        {o.asset_type === 'glb_model' && (
                          <KButton
                            size="sm"
                            tone="quiet"
                            data-testid="asset-als-freemesh"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              void alsFreeMesh(o);
                            }}
                          >
                            Als FreeMesh übernehmen
                          </KButton>
                        )}
                        <KButton
                          size="sm"
                          tone="ghost"
                          aria-label={`${o.title} löschen`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            loeschen(o);
                          }}
                        >
                          Löschen
                        </KButton>
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {tab === 'objekte' && selected && (
        <aside
          data-testid="asset-detail"
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
            <Badge hue={moduleHue.asset}>Objekt</Badge>
            <div style={{ flex: 1 }} />
            <KButton size="sm" tone="ghost" onClick={() => setSelected(null)}>
              ×
            </KButton>
          </div>

          <AssetPreviewView asset={selected} />

          <div style={{ fontSize: 17, fontWeight: 600, overflowWrap: 'anywhere' }}>{selected.title}</div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge hue={moduleHue.asset}>{assetTypeLabel[selected.asset_type] ?? selected.asset_type}</Badge>
            <Badge hue="var(--k-ink-faint)">{categoryLabel[selected.category] ?? selected.category}</Badge>
            <span data-testid="asset-visibility">
              <Badge hue={selected.visibility === 'public' ? 'var(--k-success)' : 'var(--k-warning)'}>
                {selected.visibility === 'public' ? 'Öffentlich' : 'Privat'}
              </Badge>
            </span>
          </div>

          {selected.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {selected.tags.map((t) => (
                <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--k-accent-wash)' }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          <Hairline />
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
            Formate
          </div>
          <div data-testid="asset-formats" style={{ display: 'grid', gap: 4 }}>
            {selected.formats.map((f, i) => (
              <div key={`${f.format}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                <Measure>{f.format.toUpperCase()}</Measure>
                <span style={{ color: 'var(--k-ink-soft)' }}>{(f.bytes / 1024).toFixed(0)} KB</span>
                <div style={{ flex: 1 }} />
                <Badge hue={formatStatusHue[f.status]}>{formatStatusLabel[f.status]}</Badge>
              </div>
            ))}
          </div>

          <Hairline />
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
            Rechte
          </div>
          <div data-testid="asset-rights" style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', display: 'grid', gap: 3 }}>
            <div>Status: {rightsStatusLabel[selected.rights_status] ?? selected.rights_status}</div>
            <div>Öffentliche Nutzung: {selected.public_use_allowed ? 'Erlaubt' : 'Nicht erlaubt'}</div>
          </div>

          {selected.dimensions && (
            <>
              <Hairline />
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
                Masse
              </div>
              <div data-testid="asset-dimensions">
                <Measure>
                  {[
                    selected.dimensions.width_m != null ? `B ${selected.dimensions.width_m} m` : null,
                    selected.dimensions.depth_m != null ? `T ${selected.dimensions.depth_m} m` : null,
                    selected.dimensions.height_m != null ? `H ${selected.dimensions.height_m} m` : null,
                    selected.dimensions.scale ? `M ${selected.dimensions.scale}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Measure>
              </div>
            </>
          )}

          <Hairline />
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
            KosmoData-Bezüge
          </div>
          {selected.kosmodata_refs.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--k-ink-faint)' }}>Noch keine Referenz verknüpft</span>
          )}
          {selected.kosmodata_refs.length > 0 && (
            <div data-testid="asset-refs" style={{ display: 'grid', gap: 6 }}>
              {selected.kosmodata_refs.map((r, i) => (
                <div key={`${r.entry_id}-${i}`} style={{ display: 'grid', gap: 2, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <KButton
                      size="sm"
                      tone="ghost"
                      onClick={() => oeffneInKosmoData(r.entry_id)}
                      data-testid={`asset-ref-oeffnen-${r.entry_id}`}
                      title="In KosmoData öffnen (falls dort vorhanden)"
                    >
                      {r.entry_id}
                    </KButton>
                    <Badge hue="var(--k-info)">{r.relation.replace(/_/g, ' ')}</Badge>
                    <div style={{ flex: 1 }} />
                    <button
                      aria-label="Verknüpfung entfernen"
                      data-testid={`asset-ref-entfernen-${r.entry_id}`}
                      onClick={() => void entferneRef(r.entry_id)}
                      style={{ all: 'unset', cursor: 'pointer', color: 'var(--k-ink-faint)', fontSize: 14, padding: '0 4px' }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ color: 'var(--k-ink-faint)' }}>
                    {kosmodataRefKindLabel[r.kind] ?? r.kind} · {r.review_status.replace(/_/g, ' ')}
                  </div>
                  {r.notes && <div style={{ fontStyle: 'italic', color: 'var(--k-ink-soft)' }}>{r.notes}</div>}
                </div>
              ))}
            </div>
          )}

          <KButton
            size="sm"
            tone={refPickerOffen ? 'accent' : 'quiet'}
            data-testid="asset-ref-verknuepfen"
            onClick={() => (refPickerOffen ? setRefPickerOffen(false) : oeffneRefPicker())}
          >
            {refPickerOffen ? 'Picker schliessen' : '+ Mit Referenzprojekt verknüpfen'}
          </KButton>

          {refPickerOffen && (
            <div data-testid="asset-ref-picker" style={{ display: 'grid', gap: 6 }}>
              <input
                data-testid="asset-ref-picker-suche"
                placeholder="Referenz suchen: Titel, Ort …"
                value={refQuery}
                onChange={(e) => setRefQuery(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--k-radius-sm)',
                  border: '1px solid var(--k-line-strong)',
                  background: 'var(--k-raised)',
                  fontSize: 13,
                }}
              />
              {refs === null && <KLade text="Referenzen laden …" height={60} />}
              {refs !== null && refTreffer.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--k-ink-faint)' }}>Kein Treffer</span>
              )}
              {refTreffer.length > 0 && (
                <div style={{ display: 'grid', gap: 4, maxHeight: 220, overflow: 'auto' }}>
                  {refTreffer.map((entry) => (
                    <button
                      key={entry.id}
                      data-testid={`asset-ref-treffer-${entry.id}`}
                      onClick={() => void verknuepfen(entry)}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        padding: '6px 8px',
                        borderRadius: 'var(--k-radius-sm)',
                        border: '1px solid var(--k-line)',
                        fontSize: 12.5,
                      }}
                    >
                      {entry.title}
                      <span style={{ color: 'var(--k-ink-faint)' }}>
                        {' '}
                        · {[entry.city, entry.country].filter(Boolean).join(', ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Hairline />
          <Measure>{new Date(selected.createdAt).toLocaleString('de-CH')}</Measure>

          <Hairline />
          <div style={{ display: 'flex', gap: 6 }}>
            {selected.asset_type === 'glb_model' && (
              <KButton size="sm" tone="accent" data-testid="asset-detail-ins-modell" onClick={() => insModell(selected)}>
                Ins Modell
              </KButton>
            )}
            {selected.asset_type === 'glb_model' && (
              <KButton size="sm" tone="quiet" data-testid="asset-detail-als-freemesh" onClick={() => void alsFreeMesh(selected)}>
                Als FreeMesh übernehmen
              </KButton>
            )}
            <KButton size="sm" tone="ghost" onClick={() => loeschen(selected)}>
              Löschen
            </KButton>
          </div>
        </aside>
      )}
    </div>
  );
}

/** Wählt den passenden Vorschau-Renderer je Asset — glb_model ist der Hauptfall
 * (importierte GLBs), Swatch/Wireframe sind für spätere Material-/Komponenten-
 * Assets vorbereitet (`preview.kind` aus dem Batch-3-Manifest). */
function AssetPreviewView({ asset }: { asset: KosmoAsset }) {
  if (asset.asset_type === 'glb_model') return <GlbVorschau objekt={asset} />;
  const kind = asset.preview?.kind;
  if (kind === 'material_swatch') return <MaterialSwatchVorschau asset={asset} />;
  if (kind === 'axis_marker' || kind === 'wireframe_component') return <WireframeVorschau kind={kind} />;
  return <Messrahmen height={120} caption={assetTypeLabel[asset.asset_type] ?? asset.asset_type} />;
}

/** Stabiler Hash → Farbton, solange kein PBR-Farbwert im Manifest steht. */
function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function MaterialSwatchVorschau({ asset }: { asset: KosmoAsset }) {
  const hue = hashHue(asset.id);
  return (
    <div
      data-testid="asset-preview-swatch"
      title="Material-Swatch (Platzhalter — Farbwert folgt mit PBR-Daten)"
      style={{
        height: 120,
        borderRadius: 'var(--k-radius-sm)',
        border: '1px solid var(--k-line)',
        background: `linear-gradient(135deg, hsl(${hue} 35% 55%), hsl(${hue} 35% 72%))`,
      }}
    />
  );
}

function WireframeVorschau({ kind }: { kind: 'axis_marker' | 'wireframe_component' }) {
  return (
    <div
      data-testid="asset-preview-wireframe"
      style={{
        height: 120,
        display: 'grid',
        placeItems: 'center',
        gap: 4,
        border: '1px dashed var(--k-line-strong)',
        borderRadius: 'var(--k-radius-sm)',
        background: 'var(--k-plan-paper)',
      }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden>
        <polygon points="20,4 36,12 36,28 20,36 4,28 4,12" fill="none" stroke="var(--k-technik)" strokeWidth="1" />
        <line x1="4" y1="12" x2="20" y2="20" stroke="var(--k-technik)" strokeWidth="1" />
        <line x1="36" y1="12" x2="20" y2="20" stroke="var(--k-technik)" strokeWidth="1" />
        <line x1="20" y1="20" x2="20" y2="36" stroke="var(--k-technik)" strokeWidth="1" />
      </svg>
      <span style={{ fontSize: 10, color: 'var(--k-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {kind === 'axis_marker' ? 'Achsmarker' : 'Wireframe'}
      </span>
    </div>
  );
}

/** Kleine statische three-Vorschau — lädt das GLB einmal und rendert ein Standbild. */
function GlbVorschau({ objekt }: { objekt: KosmoAsset }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    let verworfen = false;
    let url = '';
    void (async () => {
      // P6-Review #4: WebGL-Kontexte sind knapp (~8–16 pro Browser). Der
      // Renderer lebt nur für EIN Standbild auf einem Wegwerf-Canvas, das
      // Ergebnis wandert per drawImage in den sichtbaren 2D-Canvas, und der
      // Kontext wird im finally HART freigegeben (forceContextLoss).
      let renderer: import('three').WebGLRenderer | null = null;
      try {
        const [THREE, { GLTFLoader }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/loaders/GLTFLoader.js'),
        ]);
        if (verworfen || !ref.current) return;
        const ziel = ref.current;
        const breite = ziel.clientWidth || 208;
        const offscreen = document.createElement('canvas');
        renderer = new THREE.WebGLRenderer({ canvas: offscreen, antialias: true, alpha: true });
        renderer.setSize(breite, 120, false);
        const scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 1.1));
        const sonne = new THREE.DirectionalLight(0xffffff, 1.4);
        sonne.position.set(3, 5, 4);
        scene.add(sonne);
        url = URL.createObjectURL(new Blob([objekt.daten], { type: 'model/gltf-binary' }));
        const gltf = await new GLTFLoader().loadAsync(url);
        if (verworfen) return;
        scene.add(gltf.scene);
        // Kamera auf den Inhalt einpassen (leichte Vogelperspektive)
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const mitte = box.getCenter(new THREE.Vector3());
        const groesse = Math.max(box.getSize(new THREE.Vector3()).length(), 0.001);
        const camera = new THREE.PerspectiveCamera(40, breite / 120, groesse / 100, groesse * 10);
        camera.position.set(mitte.x + groesse * 0.7, mitte.y + groesse * 0.5, mitte.z + groesse * 0.7);
        camera.lookAt(mitte);
        renderer.render(scene, camera);
        ziel.width = breite;
        ziel.height = 120;
        ziel.getContext('2d')?.drawImage(offscreen, 0, 0);
      } catch {
        if (!verworfen) setFehler(true);
      } finally {
        if (renderer) {
          renderer.forceContextLoss();
          renderer.dispose();
        }
        if (url) URL.revokeObjectURL(url);
      }
    })();
    return () => {
      verworfen = true;
    };
  }, [objekt]);

  if (fehler) return <Messrahmen height={120} caption="Vorschau nicht lesbar — GLB prüfen" />;
  return <canvas ref={ref} style={{ width: '100%', height: 120, border: '1px solid var(--k-line)', background: 'var(--k-plan-paper)' }} />;
}
