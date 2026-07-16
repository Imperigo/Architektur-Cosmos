import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Hairline, KButton, KChip, KIcon, KInput, KLade, KTabs, KToolbar, Measure, Messrahmen, Panel, bestaetigen, melde, meldeFehler, moduleHue, type KTabItem } from '@kosmo/ui';
import { FREEMESH_MAX_FACES, FREEMESH_MAX_VERTICES } from '@kosmo/kernel';
import { BauteilkatalogView, loadReferences, MaterialkatalogView, type RefEntry } from '../data/DataWorkspace';
import { setGlbContext } from '../design/Viewport3D';
import { glbZuMeshDaten } from './glb-zu-mesh';
import { renderStandbild } from './three-standbild';
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
import './asset.css';

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
 *
 * v0.8.0B / W8c-A (Spez §2/§3, Owner-Entscheid 16.07. «Scope-Blindpunkt jetzt
 * nachziehen»): reiner Visual-Umbau auf `asset.css` (Muster `publish.css`/
 * `data.css`) — Inline-Styles 50→<5 (Rest: Modul-Hue-Carrier `--_hue`).
 * **Signal-Audit:** «Ins Modell» im Detail-Aside bleibt die EINE gefüllte
 * Signal-Fläche (überführt Bibliotheks-Daten in den Entwurf, Muster
 * KosmoData); «GLB importieren» (Bibliotheks-Verwaltung) → `tone="quiet"`.
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

const TAB_ITEMS: readonly KTabItem[] = [
  { id: 'objekte', label: 'Objekte (GLB)', testid: 'tab-objekte' },
  { id: 'bauteile', label: 'Bauteilkatalog CH', testid: 'asset-tab-bauteile' },
  { id: 'materialien', label: 'Materialien', testid: 'asset-tab-materialien' },
];

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
        // K21/Batch 4: erfasste Material-Einträge leben in der «Materialien»-Tab
        // (eigene UI mit Pflicht-Quelle + Würfel-Vorschau), nicht gemischt unter
        // GLB-Objekten — dieselbe IndexedDB-Tabelle, zwei getrennte Ansichten.
        setObjekte(liste.filter((o) => o.asset_type !== 'material'));
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
    <div className="k-einblenden asset-viewport">
      <div className="asset-scroll">
        <div className="asset-content">
          {/* Kosmos-Kopf — reine Kopf-/Rahmen-Optik (Glass + Modul-Tönung),
              Inhalt/Testids/Logik der Werkzeugleiste unverändert. */}
          <div className="k-glass asset-kopf" style={{ ['--_hue' as string]: moduleHue.asset }}>
            <KToolbar data-testid="asset-werkzeugleiste" className="asset-kopf-leiste">
              <Badge hue={moduleHue.asset}>KosmoAsset</Badge>
              <KTabs items={TAB_ITEMS} aktiv={tab} onChange={(id) => setTab(id as typeof tab)} size="sm" />
              {tab === 'objekte' && objekte !== null && (
                <span className="asset-kopf-anzahl">
                  {filtered.length} von {objekte.length} Objekten
                </span>
              )}
              <div className="asset-kopf-spacer" />
              {tab === 'objekte' && (
                <KButton size="sm" tone="quiet" onClick={importieren} data-testid="glb-import">
                  <KIcon name="plus" size={14} /> GLB importieren
                </KButton>
              )}
            </KToolbar>
          </div>
          <Hairline />

          {tab === 'bauteile' && <BauteilkatalogView />}
          {tab === 'materialien' && <MaterialkatalogView />}

          {tab === 'objekte' && (
            <>
              <span className="asset-hinweis">
                Projektübergreifende Objekt-Bibliothek — Möbel, Bäume, Kontextbauten als GLB.
                «Ins Modell» legt das Objekt als Referenz-Kontext in den Design-Viewport
                (studierbar, nicht Teil der Pläne). «Als FreeMesh übernehmen» wandelt ein
                kleines GLB (bis {FREEMESH_MAX_VERTICES} Vertices) ins editierbare Doc-Mesh —
                grössere bleiben ehrlich Referenz-Kontext. Blender exportiert GLB direkt.
              </span>

              <KInput
                data-testid="asset-search"
                placeholder="Suchen: Titel, Typ, Kategorie, Tag …"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <div className="asset-facetten">
                <KButton
                  size="sm"
                  tone={nurSammlung ? 'accent' : 'quiet'}
                  data-testid="asset-sammlung"
                  onClick={() => setNurSammlung(!nurSammlung)}
                >
                  <KIcon name="stern-voll" size={14} /> Sammlung ({sammlung.size})
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

              <div className="asset-grid">
                {filtered.map((o) => (
                  <Panel
                    key={o.id}
                    pad={false}
                    /* Glass + dezente Asset-Hue-Note (40%) — ausgewählt
                       bleibt die volle Akzentfarbe. */
                    className={`k-glass asset-karte${selected?.id === o.id ? ' asset-karte--aktiv' : ''}`}
                    data-testid="asset-card"
                    onClick={() => setSelected(o)}
                    style={{ ['--_hue' as string]: moduleHue.asset }}
                  >
                    <button
                      aria-label="Zur Sammlung"
                      data-testid={`asset-stern-${o.id}`}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggleSammlung(o.id);
                      }}
                      className={`asset-karte-stern${sammlung.has(o.id) ? ' asset-karte-stern--aktiv' : ''}`}
                    >
                      <KIcon name={sammlung.has(o.id) ? 'stern-voll' : 'stern'} size={16} title="Zur Sammlung" />
                    </button>
                    <div data-testid="glb-karte" className="asset-karte-inhalt">
                      <AssetPreviewView asset={o} />
                      <div className="asset-karte-kopf">
                        <span className="asset-karte-titel">{o.title}</span>
                        <div className="asset-karte-spacer" />
                        <Measure>{(assetBytes(o) / 1024).toFixed(0)} KB</Measure>
                      </div>
                      <div className="asset-karte-badges">
                        <Badge hue={moduleHue.asset}>{assetTypeLabel[o.asset_type] ?? o.asset_type}</Badge>
                        <Badge hue="var(--k-ink-faint)">{categoryLabel[o.category] ?? o.category}</Badge>
                      </div>
                      <div className="asset-karte-aktionen">
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
        // v0.7.8 Welle D PD3: Glass + dezente Asset-Hue-Note (40%) am
        // linken Rand — reine Flächenoptik, Inhalt/Testid/Logik unverändert.
        <aside
          className="k-glass asset-detail"
          data-testid="asset-detail"
          style={{ ['--_hue' as string]: moduleHue.asset }}
        >
          <div className="asset-detail-kopf">
            <Badge hue={moduleHue.asset}>Objekt</Badge>
            <div className="asset-kopf-spacer" />
            <KButton size="sm" tone="ghost" onClick={() => setSelected(null)} aria-label="Detail schliessen">
              <KIcon name="schliessen" size={14} title="Detail schliessen" />
            </KButton>
          </div>

          <AssetPreviewView asset={selected} />

          <div className="asset-detail-titel">{selected.title}</div>

          <div className="asset-detail-badges">
            <Badge hue={moduleHue.asset}>{assetTypeLabel[selected.asset_type] ?? selected.asset_type}</Badge>
            <Badge hue="var(--k-ink-faint)">{categoryLabel[selected.category] ?? selected.category}</Badge>
            <span data-testid="asset-visibility">
              <Badge hue={selected.visibility === 'public' ? 'var(--k-success)' : 'var(--k-warning)'}>
                {selected.visibility === 'public' ? 'Öffentlich' : 'Privat'}
              </Badge>
            </span>
          </div>

          {selected.tags.length > 0 && (
            <div className="asset-detail-tags">
              {selected.tags.map((t) => (
                <KChip key={t} size="sm" tone="fuellung" hue="var(--k-ink-soft)">
                  {t}
                </KChip>
              ))}
            </div>
          )}

          <Hairline />
          <div className="asset-detail-label">Formate</div>
          <div data-testid="asset-formats" className="asset-detail-formats">
            {selected.formats.map((f, i) => (
              <div key={`${f.format}-${i}`} className="asset-detail-format-zeile">
                <Measure>{f.format.toUpperCase()}</Measure>
                <span className="asset-detail-format-groesse">{(f.bytes / 1024).toFixed(0)} KB</span>
                <div className="asset-kopf-spacer" />
                <Badge hue={formatStatusHue[f.status]}>{formatStatusLabel[f.status]}</Badge>
              </div>
            ))}
          </div>

          <Hairline />
          <div className="asset-detail-label">Rechte</div>
          <div data-testid="asset-rights" className="asset-detail-rechte">
            <div>Status: {rightsStatusLabel[selected.rights_status] ?? selected.rights_status}</div>
            <div>Öffentliche Nutzung: {selected.public_use_allowed ? 'Erlaubt' : 'Nicht erlaubt'}</div>
          </div>

          {selected.dimensions && (
            <>
              <Hairline />
              <div className="asset-detail-label">Masse</div>
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
          <div className="asset-detail-label">KosmoData-Bezüge</div>
          {selected.kosmodata_refs.length === 0 && (
            <span className="asset-detail-leer">Noch keine Referenz verknüpft</span>
          )}
          {selected.kosmodata_refs.length > 0 && (
            <div data-testid="asset-refs" className="asset-detail-ref">
              {selected.kosmodata_refs.map((r, i) => (
                <div key={`${r.entry_id}-${i}`} className="asset-detail-ref-zeile">
                  <div className="asset-detail-ref-kopf">
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
                    <div className="asset-kopf-spacer" />
                    <KButton
                      size="sm"
                      tone="ghost"
                      aria-label="Verknüpfung entfernen"
                      data-testid={`asset-ref-entfernen-${r.entry_id}`}
                      onClick={() => void entferneRef(r.entry_id)}
                    >
                      <KIcon name="schliessen" size={14} title="Verknüpfung entfernen" />
                    </KButton>
                  </div>
                  <div className="asset-detail-ref-meta">
                    {kosmodataRefKindLabel[r.kind] ?? r.kind} · {r.review_status.replace(/_/g, ' ')}
                  </div>
                  {r.notes && <div className="asset-detail-ref-notiz">{r.notes}</div>}
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
            {refPickerOffen ? 'Picker schliessen' : (
              <>
                <KIcon name="plus" size={14} /> Mit Referenzprojekt verknüpfen
              </>
            )}
          </KButton>

          {refPickerOffen && (
            <div data-testid="asset-ref-picker" className="asset-detail-picker">
              <KInput
                data-testid="asset-ref-picker-suche"
                placeholder="Referenz suchen: Titel, Ort …"
                value={refQuery}
                onChange={(e) => setRefQuery(e.target.value)}
              />
              {refs === null && <KLade text="Referenzen laden …" height={60} />}
              {refs !== null && refTreffer.length === 0 && (
                <span className="asset-detail-leer">Kein Treffer</span>
              )}
              {refTreffer.length > 0 && (
                <div className="asset-detail-picker-treffer">
                  {refTreffer.map((entry) => (
                    <button
                      key={entry.id}
                      data-testid={`asset-ref-treffer-${entry.id}`}
                      onClick={() => void verknuepfen(entry)}
                      className="asset-detail-picker-eintrag"
                    >
                      {entry.title}
                      <span className="asset-detail-picker-ort">
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
          <div className="asset-detail-fuss">
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
      className="asset-preview-swatch"
      // Datengetrieben (Hash → Farbton, kein PBR-Wert im Manifest) — der
      // Verlauf selbst bleibt inline, keine zweite Wahrheitsquelle.
      style={{ background: `linear-gradient(135deg, hsl(${hue} 35% 55%), hsl(${hue} 35% 72%))` }}
    />
  );
}

function WireframeVorschau({ kind }: { kind: 'axis_marker' | 'wireframe_component' }) {
  return (
    <div data-testid="asset-preview-wireframe" className="asset-preview-wireframe">
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden>
        <polygon points="20,4 36,12 36,28 20,36 4,28 4,12" fill="none" stroke="var(--k-technik)" strokeWidth="1" />
        <line x1="4" y1="12" x2="20" y2="20" stroke="var(--k-technik)" strokeWidth="1" />
        <line x1="36" y1="12" x2="20" y2="20" stroke="var(--k-technik)" strokeWidth="1" />
        <line x1="20" y1="20" x2="20" y2="36" stroke="var(--k-technik)" strokeWidth="1" />
      </svg>
      <span className="asset-preview-wireframe-label">
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
      try {
        if (verworfen || !ref.current) return;
        await renderStandbild(ref.current, 120, async ({ THREE, scene, breite, hoehe }) => {
          const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
          url = URL.createObjectURL(new Blob([objekt.daten], { type: 'model/gltf-binary' }));
          const gltf = await new GLTFLoader().loadAsync(url);
          if (verworfen) throw new Error('Vorschau verworfen (Komponente entfernt)');
          scene.add(gltf.scene);
          // Kamera auf den Inhalt einpassen (leichte Vogelperspektive)
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const mitte = box.getCenter(new THREE.Vector3());
          const groesse = Math.max(box.getSize(new THREE.Vector3()).length(), 0.001);
          const camera = new THREE.PerspectiveCamera(40, breite / hoehe, groesse / 100, groesse * 10);
          camera.position.set(mitte.x + groesse * 0.7, mitte.y + groesse * 0.5, mitte.z + groesse * 0.7);
          camera.lookAt(mitte);
          return camera;
        });
      } catch {
        if (!verworfen) setFehler(true);
      } finally {
        if (url) URL.revokeObjectURL(url);
      }
    })();
    return () => {
      verworfen = true;
    };
  }, [objekt]);

  if (fehler) return <Messrahmen height={120} caption="Vorschau nicht lesbar — GLB prüfen" />;
  return <canvas ref={ref} className="asset-preview-canvas" />;
}
