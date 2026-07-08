import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Badge,
  bestaetigen,
  Hairline,
  Karteikarte,
  KButton,
  KLade,
  melde,
  meldeFehler,
  Measure,
  Messrahmen,
  Panel,
  moduleHue,
} from '@kosmo/ui';
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
import { setGlbContext, subscribeGlbStatus } from '../design/Viewport3D';
import { listeGlb, type KosmoAsset } from '../../state/asset-bibliothek';
import {
  istTraining,
  sammlungen,
  sucheDach,
  type KosmoDataEintrag,
  type KosmoDataSammlung,
  type KosmoDataZahlen,
} from '../../state/kosmodata-dach';
import {
  entferneArchiv,
  formatGroesse,
  listeArchiv,
  speichereArchiv,
  sucheArchiv,
  type ArchivEintrag,
  type ArchivKategorie,
} from '../../state/archiv';
import {
  basisIndex,
  geladeneSammlungen,
  importiereBasis,
  listDocs,
  removeDoc,
  searchKnowledge,
  setzeDocVisibility,
  type BasisSammlung,
  type KnowledgeDoc,
  type KnowledgeHit,
} from '../prepare/knowledge';
import { LearningJournal, type Learning } from '@kosmo/ai';
import { journalStore } from '../../state/journal-store';
import {
  architekturKorpus,
  exportTrainingJsonl,
  softwareKorpus,
  zaehleAchsen,
  type TrainBeispiel,
} from '../../state/training-korpus';
import { fokusKlasse } from '../../state/fokus';
import {
  ALLE_DATEN_GRUPPEN,
  DATEN_LEISTEN_BASIS,
  adaptiveDatenFokusStufe,
  leiteDatenTaetigkeitsKontextAb,
  type DatenGruppe,
} from '../../state/oberflaeche-adaption-data';
import { nutzungMelden, useAdaptionsSteuerung } from '../../state/oberflaeche-adaption-kern';

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

/**
 * T4c (Owner-Befund): «Referenz-3D ins Modell laden» rief bisher immer eine
 * hartcodierte Remote-URL (architekturkosmos.ch/archive-models/…) auf, die
 * für die Seed-Einträge nie existiert — jeder Klick endete im Fehler-Toast
 * aus Viewport3D. Ehrlicher Weg: bevorzugt die per KosmoAsset verknüpfte
 * lokale GLB (Serie-D-Verknüpfung, `kosmodata_refs`) — offline, ohne
 * CORS/Netz-Abhängigkeit. Reine Funktion (kein IndexedDB-Zugriff hier):
 * wählt aus bereits geladenen Assets, damit sie ohne Fake-IndexedDB-Wiring
 * testbar bleibt.
 */
export function lokaleRef3dQuelle(refId: string, assets: KosmoAsset[]): Blob | undefined {
  for (const asset of assets) {
    if (!asset.kosmodata_refs.some((r) => r.entry_id === refId)) continue;
    const hatGlb = asset.formats.some((f) => f.format === 'glb' && f.status === 'ready');
    if (hatGlb) return new Blob([asset.daten], { type: 'model/gltf-binary' });
  }
  return undefined;
}

export type DataTab = 'uebersicht' | 'referenzen' | 'bauteile' | 'materialien' | 'wissen' | 'training' | 'gedaechtnis' | 'archiv';

/** Serie J2 / Batch B1: deutsche Anzeige-Labels je Adaptions-Gruppe
 *  (Adaptions-Hinweis, analog `GRUPPEN_LABEL` in DesignWorkspace.tsx). */
const DATEN_GRUPPEN_LABEL: Record<DatenGruppe, string> = {
  navigation: 'Navigation',
  suche: 'Suche',
  sync: 'Sync',
  dossier: 'Dossier',
};

export function DataWorkspace() {
  const [entries, setEntries] = useState<RefEntry[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState<string | null>(null);
  const [selected, setSelected] = useState<RefEntry | null>(null);
  const [syncState, setSyncState] = useState<'seed' | 'synced' | 'fehler'>('seed');
  const [tab, setTab] = useState<DataTab>('referenzen');
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

  // T4c: lokale GLB-Quelle für «Referenz-3D ins Modell laden» — bevorzugt vor
  // der (für Seed-Einträge nicht existenten) Remote-URL; Ladezustand am Knopf.
  const ref3dQuelle = useMemo(
    () => (selected ? lokaleRef3dQuelle(selected.id, refAssets) : undefined),
    [selected, refAssets],
  );
  const [ref3dLaden, setRef3dLaden] = useState(false);
  const ref3dMounted = useRef(true);
  useEffect(
    () => () => {
      ref3dMounted.current = false;
    },
    [],
  );

  function ladeRef3d(entry: RefEntry, blob: Blob): void {
    setRef3dLaden(true);
    const url = URL.createObjectURL(blob);
    const beende = subscribeGlbStatus((ev) => {
      if (ev.url !== url || ev.status === 'loading') return;
      beende();
      if (ref3dMounted.current) setRef3dLaden(false);
      if (ev.status === 'loaded') {
        melde(`«${entry.title}» liegt als Referenz-Kontext im Design-Viewport.`, { ton: 'erfolg' });
      }
    });
    setGlbContext(url, { revoke: true });
    (window as never as { __kosmo?: { open: (s: string) => void } }).__kosmo?.open('design');
  }

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

  // Serie J2 / Batch B1 (SERIE-J2-IMMERSIVE-OBERFLAECHE.md Abschnitt 4):
  // KosmoData schliesst als zweite Station ans Adaptions-Regelwerk an — der
  // Kern (state/oberflaeche-adaption-kern.ts) ist derselbe, der KosmoDesign
  // bedient (Design bleibt in B1 unverändert). Die Matrix ist reine
  // Daten-Konfiguration (state/oberflaeche-adaption-data.ts): Suche bleibt
  // primär solange getippt wird, Sync tritt dabei zurück, das Dossier wird
  // nie gedimmt solange eine Referenz gewählt ist.
  const datenKontext = useMemo(
    () => leiteDatenTaetigkeitsKontextAb({ tab, query, dossierOffen: selected !== null }),
    [tab, query, selected],
  );
  const {
    adaptionIstAn,
    adaptionUmschalten,
    adaptionZuruecksetzenUndAuffrischen,
    stufeFuerGruppe,
    gedaempfteGruppen,
    adaptionHinweisSichtbar,
    elementStil,
    gruppeHatGehobenesElement,
  } = useAdaptionsSteuerung({
    taetigkeitsKontext: datenKontext,
    alleGruppen: ALLE_DATEN_GRUPPEN,
    basisProGruppe: DATEN_LEISTEN_BASIS,
    adaptiveStufe: adaptiveDatenFokusStufe,
  });
  const adaptionHinweisTitel = adaptionHinweisSichtbar
    ? `${gedaempfteGruppen.map((g) => DATEN_GRUPPEN_LABEL[g]).join('/')} zurückgestellt — du suchst gerade`
    : '';

  return (
    <div className="k-einblenden" style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14 }}>
          {/* Serie J2 / Batch B1: reiner Test-/Gruppierungs-Wrapper (kein
              eigener Box-Effekt, `display: contents`) — analog zu Designs
              `design-werkzeugleiste`, hier zusätzlich über die (nur im
              referenzen-Tab gerenderte) Such-/Filter-Gruppe hinweg, damit die
              feste-Anker-Prüfung (E2E) alle drei Adaptions-Gruppen erfasst. */}
          <div data-testid="referenzen-werkzeugleiste" style={{ display: 'contents' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Badge hue={moduleHue.data}>KosmoData</Badge>
            <span
              data-testid="leiste-gruppe-navigation"
              className={fokusKlasse(stufeFuerGruppe('navigation'))}
              style={{
                display: 'inline-flex',
                flexWrap: 'wrap',
                gap: 10,
                rowGap: 4,
                alignItems: 'center',
                ...(gruppeHatGehobenesElement('navigation') ? { opacity: 1 } : {}),
              }}
            >
              <KButton size="sm" tone={tab === 'uebersicht' ? 'accent' : 'ghost'} onClick={() => { setTab('uebersicht'); nutzungMelden('navigation:uebersicht'); }} data-testid="tab-uebersicht" {...elementStil('navigation', 'uebersicht')}>
                Übersicht
              </KButton>
              <KButton size="sm" tone={tab === 'referenzen' ? 'accent' : 'ghost'} onClick={() => { setTab('referenzen'); nutzungMelden('navigation:referenzen'); }} data-testid="tab-referenzen" {...elementStil('navigation', 'referenzen')}>
                Referenzen
              </KButton>
              <KButton size="sm" tone={tab === 'bauteile' ? 'accent' : 'ghost'} onClick={() => { setTab('bauteile'); nutzungMelden('navigation:bauteile'); }} data-testid="tab-bauteile" {...elementStil('navigation', 'bauteile')}>
                Bauteilkatalog CH
              </KButton>
              <KButton size="sm" tone={tab === 'materialien' ? 'accent' : 'ghost'} onClick={() => { setTab('materialien'); nutzungMelden('navigation:materialien'); }} data-testid="tab-materialien" {...elementStil('navigation', 'materialien')}>
                Materialien
              </KButton>
              <KButton size="sm" tone={tab === 'wissen' ? 'accent' : 'ghost'} onClick={() => { setTab('wissen'); nutzungMelden('navigation:wissen'); }} data-testid="tab-wissen" {...elementStil('navigation', 'wissen')}>
                Wissen
              </KButton>
              <KButton size="sm" tone={tab === 'training' ? 'accent' : 'ghost'} onClick={() => { setTab('training'); nutzungMelden('navigation:training'); }} data-testid="tab-training" {...elementStil('navigation', 'training')}>
                Training
              </KButton>
              <KButton size="sm" tone={tab === 'gedaechtnis' ? 'accent' : 'ghost'} onClick={() => { setTab('gedaechtnis'); nutzungMelden('navigation:gedaechtnis'); }} data-testid="tab-gedaechtnis" {...elementStil('navigation', 'gedaechtnis')}>
                Gedächtnis
              </KButton>
              <KButton size="sm" tone={tab === 'archiv' ? 'accent' : 'ghost'} onClick={() => { setTab('archiv'); nutzungMelden('navigation:archiv'); }} data-testid="tab-archiv" {...elementStil('navigation', 'archiv')}>
                Archiv
              </KButton>
            </span>
            <span style={{ color: 'var(--k-ink-soft)', fontSize: 13 }}>
              {tab === 'uebersicht'
                ? 'Sechs Sammlungen unter einem Dach'
                : tab === 'referenzen'
                  ? `${filtered.length} von ${entries.length} Referenzen`
                  : tab === 'bauteile'
                    ? `${bauteilkatalog.length} Aufbauten`
                    : tab === 'materialien'
                      ? `${materialkatalog.length} Materialien`
                      : tab === 'wissen'
                        ? 'Wissensbasis — durchsuchen, laden, freigeben'
                        : tab === 'training'
                          ? 'Trainings-Korpus — Architektur & Software-Selbstwissen'
                          : tab === 'gedaechtnis'
                            ? 'Lernjournal — Gedächtnis, verknüpft mit Wissen und Training'
                            : 'HomePC-Archiv — Manifest für die HDD, lokal & privat'}
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
            <span
              data-testid="leiste-gruppe-sync"
              className={fokusKlasse(stufeFuerGruppe('sync'))}
              style={{ display: 'inline-flex', ...(gruppeHatGehobenesElement('sync') ? { opacity: 1 } : {}) }}
            >
              <KButton
                size="sm"
                tone="ghost"
                onClick={() => {
                  void syncLive();
                  nutzungMelden('sync:sync-button');
                }}
                data-testid="data-sync"
                {...elementStil('sync', 'sync-button')}
              >
                Sync
              </KButton>
            </span>
            {/* Serie J2 / Batch B1 (Regel 2.3.5 Transparenz, geteilter
                Adaptions-Kern): KosmoData hat kein «Projekt ▾»-Menü wie
                Design — Hinweis/Schalter/Reset stehen direkt neben Sync. */}
            <span
              data-testid="adaption-hinweis"
              className="k-selten"
              title={adaptionHinweisTitel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 11,
                color: 'var(--k-ink-faint)',
                whiteSpace: 'nowrap',
                visibility: adaptionHinweisSichtbar ? 'visible' : 'hidden',
              }}
            >
              ⓘ angepasst
            </span>
            <label style={{ fontSize: 11.5, color: 'var(--k-ink-faint)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <input
                type="checkbox"
                data-testid="adaption-schalter"
                checked={adaptionIstAn}
                onChange={(e) => adaptionUmschalten(e.target.checked)}
              />
              Oberfläche passt sich an
            </label>
            <KButton
              size="sm"
              tone="ghost"
              data-testid="adaption-reset"
              title="Gelerntes Nutzungsprofil löschen — die Leisten fallen auf die Basis-Stufen zurück. Der Schalter bleibt unverändert."
              onClick={adaptionZuruecksetzenUndAuffrischen}
            >
              Oberfläche zurücksetzen
            </KButton>
          </div>

          {tab === 'referenzen' && (
            <span
              data-testid="leiste-gruppe-suche"
              className={fokusKlasse(stufeFuerGruppe('suche'))}
              style={{ display: 'grid', gap: 8, ...(gruppeHatGehobenesElement('suche') ? { opacity: 1 } : {}) }}
            >
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
            </span>
          )}
          </div>

          {tab === 'uebersicht' && (
            <KosmoDataUebersicht entries={entries} setTab={setTab} setSelected={setSelected} />
          )}
          {tab === 'bauteile' && <BauteilkatalogView />}
          {tab === 'materialien' && <MaterialkatalogView />}
          {tab === 'wissen' && <KosmoWissenView />}
          {tab === 'training' && <KosmoTrainingView />}
          {tab === 'gedaechtnis' && <KosmoGedaechtnisView />}
          {tab === 'archiv' && <KosmoArchivView />}

          {tab === 'referenzen' && (<>
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
                onClick={() => {
                  oeffneInKosmoAsset(a.id);
                  nutzungMelden('dossier:ref-asset');
                }}
              >
                {a.title}
              </KButton>
            ))}
          </div>

          {selected.has_3d && (
            <div
              data-testid="leiste-gruppe-dossier"
              className={fokusKlasse(stufeFuerGruppe('dossier'))}
              style={{ display: 'grid', gap: 6, ...(gruppeHatGehobenesElement('dossier') ? { opacity: 1 } : {}) }}
            >
              <Hairline />
              {ref3dQuelle ? (
                <>
                  <KButton
                    size="sm"
                    tone="accent"
                    data-testid="ref3d-laden"
                    disabled={ref3dLaden}
                    onClick={() => {
                      ladeRef3d(selected, ref3dQuelle);
                      nutzungMelden('dossier:ref3d-laden');
                    }}
                    {...elementStil('dossier', 'ref3d-laden')}
                  >
                    {ref3dLaden ? 'Lädt …' : 'Referenz-3D ins Modell laden'}
                  </KButton>
                  <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
                    Lädt das verknüpfte 3D-Objekt aus KosmoAsset als Kontext neben deinen Entwurf.
                  </span>
                </>
              ) : (
                <span data-testid="ref3d-kein-lokal" style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
                  Studienmodell noch nicht lokal verfügbar — verknüpfe in KosmoAsset ein 3D-Objekt
                  mit dieser Referenz oder importiere die GLB dort.
                </span>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

const sammlungLabel: Record<KosmoDataSammlung, string> = {
  referenz: 'Referenzen',
  asset: 'Assets',
  wissen: 'Wissen',
  training: 'Training',
  gedaechtnis: 'Gedächtnis',
  archiv: 'Archiv',
};

const sammlungHue: Record<KosmoDataSammlung, string> = {
  referenz: moduleHue.data,
  asset: moduleHue.asset,
  wissen: moduleHue.prepare,
  training: moduleHue.train,
  gedaechtnis: moduleHue.train,
  archiv: moduleHue.doc,
};

/**
 * D1 (KosmoData-Dach) — der Übersichts-Tab: sechs Sammlungen mit Zähler
 * (`sammlungen()`) und eine Suche über alle sechs (`sucheDach`). Ein Klick
 * springt in die passende Station: Referenz, Wissen, Training, Gedächtnis
 * UND Archiv bleiben alle in KosmoData (reiner Tab-Wechsel — D2: Wissen, D3:
 * Training, D4: Gedächtnis, D5: Archiv leben jetzt als erstklassige Tabs
 * hier, nicht mehr nur in KosmoPrepare/KosmoTrain), nur Asset wechselt per
 * sessionStorage-Brücke in die eigene KosmoAsset-Station.
 */
function KosmoDataUebersicht({
  entries,
  setTab,
  setSelected,
}: {
  entries: RefEntry[];
  setTab: (t: DataTab) => void;
  setSelected: (e: RefEntry | null) => void;
}) {
  const [zahlen, setZahlen] = useState<KosmoDataZahlen | null>(null);
  const [query, setQuery] = useState('');
  const [treffer, setTreffer] = useState<KosmoDataEintrag[]>([]);
  const suchSeq = useRef(0);

  useEffect(() => {
    void sammlungen().then(setZahlen);
  }, []);

  useEffect(() => {
    const q = query.trim();
    const seq = ++suchSeq.current;
    if (q.length < 2) {
      setTreffer([]);
      return;
    }
    void sucheDach(q).then((t) => {
      if (suchSeq.current === seq) setTreffer(t);
    });
  }, [query]);

  const springeZuTreffer = (eintrag: KosmoDataEintrag) => {
    const sprung = eintrag.sprung;
    if (!sprung) return;
    if (sprung.screen === 'data') {
      setTab('referenzen');
      const treffer2 = entries.find((e) => e.id === sprung.refId);
      if (treffer2) setSelected(treffer2);
      return;
    }
    if (sprung.screen === 'asset') {
      oeffneInKosmoAsset(sprung.assetId);
      return;
    }
    if (sprung.screen === 'wissen') {
      setTab('wissen');
      return;
    }
    if (sprung.screen === 'training') {
      setTab('training');
      return;
    }
    if (sprung.screen === 'gedaechtnis') {
      setTab('gedaechtnis');
      return;
    }
    if (sprung.screen === 'archiv') {
      setTab('archiv');
      return;
    }
  };

  const sammlungIds: KosmoDataSammlung[] = ['referenz', 'asset', 'wissen', 'training', 'gedaechtnis', 'archiv'];

  return (
    <div data-testid="kosmodata-dach" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        {zahlen
          ? sammlungIds.map((s) => (
              <Panel key={s} data-testid={`dach-zahl-${s}`} style={{ padding: '10px 12px', display: 'grid', gap: 6 }}>
                <Badge hue={sammlungHue[s]}>{sammlungLabel[s]}</Badge>
                <span style={{ fontSize: 22, fontWeight: 650 }}>{zahlen[s]}</span>
              </Panel>
            ))
          : <KLade text="Sammlungen laden …" height={80} />}
      </div>

      <input
        data-testid="dach-suche"
        placeholder="Über alle sechs Sammlungen suchen: Referenzen, Assets, Wissen, Training, Gedächtnis, Archiv …"
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

      {query.trim().length >= 2 && treffer.length === 0 && (
        <Messrahmen height={140} caption="Kein Treffer über die sechs Sammlungen — Begriff lockern" />
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {treffer.map((t) => (
          <Panel
            key={t.id}
            pad={false}
            data-testid="dach-treffer"
            onClick={() => springeZuTreffer(t)}
            style={{ cursor: 'pointer', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <Badge hue={sammlungHue[t.sammlung]}>{sammlungLabel[t.sammlung]}</Badge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 550 }}>{t.titel}</div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--k-ink-faint)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.kurztext}
              </div>
            </div>
            <span data-testid="dach-treffer-visibility">
              <Badge hue={t.visibility === 'public' ? 'var(--k-success)' : 'var(--k-warning)'}>
                {t.visibility === 'public' ? 'Öffentlich' : 'Privat'}
              </Badge>
            </span>
          </Panel>
        ))}
      </div>
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

/**
 * D2 (KosmoData-Dach) — der Wissen-Tab: die Wissensbasis aus KosmoPrepare
 * (`modules/prepare/knowledge.ts`, unverändert wiederverwendet) als
 * erstklassige, durchsuchbare und pflegbare Ansicht in KosmoData. Suche,
 * Dokumentliste mit Sichtbarkeits-Umschalter und die Bauwissen-Basis-Korpora
 * (`wissen/`-Bündel) — alles was vorher nur in KosmoPrepare lebte.
 */
export function KosmoWissenView() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [basis, setBasis] = useState<BasisSammlung[]>([]);
  const [geladeneBasis, setGeladeneBasis] = useState<Set<string>>(new Set());
  const [ladeBasis, setLadeBasis] = useState<string | null>(null);
  const [geladen, setGeladen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<KnowledgeHit[]>([]);
  const searchSeq = useRef(0);

  const refresh = () => {
    void Promise.all([
      listDocs().catch(() => []),
      basisIndex().catch(() => []),
      geladeneSammlungen().catch(() => new Set<string>()),
    ]).then(([d, b, g]) => {
      setDocs(d);
      setBasis(b);
      setGeladeneBasis(g);
      setGeladen(true);
    });
  };
  useEffect(refresh, []);

  useEffect(() => {
    const q = query.trim();
    const seq = ++searchSeq.current;
    if (q.length < 2) {
      setHits([]);
      return;
    }
    void searchKnowledge(q, 12).then((h) => {
      if (searchSeq.current === seq) setHits(h);
    });
  }, [query]);

  async function toggleVisibility(d: KnowledgeDoc) {
    const naechste = (d.visibility ?? 'private') === 'public' ? 'private' : 'public';
    try {
      await setzeDocVisibility(d.id, naechste);
      refresh();
    } catch (err) {
      meldeFehler(err);
    }
  }

  async function entfernen(d: KnowledgeDoc) {
    const ok = await bestaetigen({
      titel: `«${d.name}» entfernen?`,
      text: 'Das Dokument und seine Abschnitte werden aus der Wissensbasis gelöscht.',
      bestaetigen: 'Entfernen',
      gefaehrlich: true,
    });
    if (!ok) return;
    await removeDoc(d.id);
    refresh();
  }

  async function ladeSammlung(sa: BasisSammlung) {
    setLadeBasis(sa.sammlung);
    try {
      const { quellen, chunks } = await importiereBasis(sa.sammlung);
      refresh();
      melde(`${sa.label}: ${quellen} Quellen · ${chunks} Abschnitte geladen`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    } finally {
      setLadeBasis(null);
    }
  }

  const zeigtSuche = query.trim().length >= 2;
  const leer = geladen && docs.length === 0 && basis.length === 0;

  return (
    <div data-testid="kosmodata-wissen" style={{ display: 'grid', gap: 14 }}>
      <input
        data-testid="wissen-search"
        placeholder="Wissensbasis durchsuchen … (z.B. «Brandschutz Treppenhaus»)"
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

      {!geladen && <KLade text="Wissensbasis laden …" height={140} />}

      {geladen && leer && (
        <div data-testid="wissen-leer">
          <Messrahmen
            height={200}
            caption="Noch kein Wissen — Bauwissen-Basis laden oder in KosmoPrepare Dokumente aufnehmen"
          />
        </div>
      )}

      {zeigtSuche ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {hits.length === 0 && (
            <Messrahmen height={140} caption="Kein Treffer in der Wissensbasis — Begriff lockern" />
          )}
          {hits.map((h) => (
            <Panel key={h.id} data-testid="wissen-hit" style={{ padding: '10px 12px', display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 550 }}>
                  {h.docName} · Abschnitt {h.seq + 1}
                </span>
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 11, color: 'var(--k-ink-faint)' }}>
                  {h.score.toFixed(2)}
                </span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--k-ink-soft)' }}>
                {h.text.length > 220 ? `${h.text.slice(0, 220)} …` : h.text}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <>
          {docs.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div className="k-titel" style={{ fontSize: 13 }}>Dokumente ({docs.length})</div>
              {docs.map((d) => {
                const oeffentlich = (d.visibility ?? 'private') === 'public';
                return (
                  <Panel
                    key={d.id}
                    data-testid="wissen-doc"
                    style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 550,
                          fontSize: 13.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {d.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Badge hue={d.source === 'basis' ? moduleHue.prepare : 'var(--k-ink-faint)'}>{d.source}</Badge>
                        <span>{d.chunkCount} Abschnitte</span>
                        {d.pages !== undefined && <span>· {d.pages} {d.pages === 1 ? 'Seite' : 'Seiten'}</span>}
                      </div>
                    </div>
                    <Badge hue={oeffentlich ? 'var(--k-success)' : 'var(--k-warning)'}>
                      {oeffentlich ? 'Öffentlich' : 'Privat'}
                    </Badge>
                    <KButton
                      size="sm"
                      tone="ghost"
                      data-testid="wissen-visibility-toggle"
                      onClick={() => void toggleVisibility(d)}
                    >
                      {oeffentlich ? 'Privat machen' : 'Öffentlich machen'}
                    </KButton>
                    {d.source === 'lokal' && (
                      <KButton size="sm" tone="ghost" onClick={() => void entfernen(d)} aria-label={`${d.name} entfernen`}>
                        Entfernen
                      </KButton>
                    )}
                  </Panel>
                );
              })}
            </div>
          )}

          {basis.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }} data-testid="wissen-basis">
              <div className="k-titel" style={{ fontSize: 13 }}>Bauwissen-Basis (Kosmos-Bibliothek)</div>
              {basis.map((sa) => (
                <Panel
                  key={sa.sammlung}
                  style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 550, fontSize: 13.5 }}>{sa.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
                      {sa.quellen} Quellen · {sa.chunks} Abschnitte · {(sa.kb / 1024).toFixed(1)} MB
                    </div>
                  </div>
                  {geladeneBasis.has(sa.sammlung) ? (
                    <Badge hue={moduleHue.prepare}>geladen</Badge>
                  ) : (
                    <KButton
                      size="sm"
                      tone="accent"
                      data-testid="wissen-basis-laden"
                      disabled={ladeBasis !== null}
                      onClick={() => void ladeSammlung(sa)}
                    >
                      {ladeBasis === sa.sammlung ? 'Lade …' : 'Laden'}
                    </KButton>
                  )}
                </Panel>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Kurzer Ausschnitt aus Frage/Antwort für die Vorschau-Zeile. */
function kuerzeText(t: string, max = 140): string {
  return t.length > max ? `${t.slice(0, max)} …` : t;
}

function oeffneKosmoTrain() {
  (window as never as { __kosmo?: { open: (s: string) => void } }).__kosmo?.open('train');
}

/**
 * D3 (KosmoData-Dach) — der Training-Tab: der Trainings-Korpus über zwei
 * Achsen (`docs/EIN-SYSTEM-KOSMODATA.md`) — Architektur (kuratierte Lehren
 * aus dem Lernjournal, Notiz gesetzt) und Software-Selbstwissen (jedes
 * registrierte Kernel-Command + der gebündelte Doku-Korpus). Die tiefe
 * Kuration (Notizen schärfen, Einträge löschen) bleibt in der KosmoTrain-
 * Station — dieser Tab ist die Sammlungs-/Übersichts-/Export-Ebene für die
 * kombinierte LoRA-JSONL.
 */
export function KosmoTrainingView() {
  const [architektur, setArchitektur] = useState<TrainBeispiel[]>([]);
  const [software, setSoftware] = useState<TrainBeispiel[]>([]);
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    let verworfen = false;
    setGeladen(false);
    const journal = new LearningJournal(journalStore());
    void softwareKorpus()
      .then((sw) => {
        if (verworfen) return;
        setArchitektur(architekturKorpus(journal));
        setSoftware(sw);
      })
      .finally(() => {
        if (!verworfen) setGeladen(true);
      });
    return () => {
      verworfen = true;
    };
  }, []);

  const commandsCount = software.filter((b) => b.quelle.startsWith('command:')).length;
  const dokuCount = software.filter((b) => b.quelle.startsWith('doku:')).length;
  const { architektur: architekturCount, software: softwareCount } = zaehleAchsen([...architektur, ...software]);
  const leer = geladen && architektur.length === 0 && software.length === 0;

  function exportieren() {
    const beispiele = [...architektur, ...software];
    try {
      const url = URL.createObjectURL(
        new Blob([exportTrainingJsonl(beispiele)], { type: 'application/jsonl' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kosmo-training.jsonl';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      melde(`${beispiele.length} Beispiele exportiert — auf die HomeStation für die LoRA`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  }

  return (
    <div data-testid="kosmodata-training" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--k-ink-soft)', fontSize: 13 }}>
          Zwei Achsen — Architektur (Bürostil) und Software (KosmoOrbit selbst) —, kombiniert exportierbar für die LoRA.
        </span>
        <div style={{ flex: 1 }} />
        <KButton
          size="sm"
          tone="accent"
          data-testid="training-export"
          disabled={!geladen || (architekturCount + softwareCount === 0)}
          onClick={exportieren}
        >
          JSONL exportieren
        </KButton>
      </div>

      {!geladen && <KLade text="Trainings-Korpus laden …" height={160} />}

      {leer && (
        <div data-testid="training-leer">
          <Messrahmen
            height={200}
            caption="Noch kein Trainings-Korpus — Kosmo-Commands sollten immer da sein; sonst 👍/👎 + Notiz in KosmoTrain sammeln"
          />
        </div>
      )}

      {geladen && !leer && (
        <>
          <Panel data-testid="training-achse-architektur" style={{ padding: '12px 14px', display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge hue={moduleHue.train}>Architektur — Bürostil &amp; Fachwissen</Badge>
              <Measure>{architektur.length}</Measure>
              <div style={{ flex: 1 }} />
              <KButton size="sm" tone="ghost" onClick={oeffneKosmoTrain}>
                Zur KosmoTrain-Station
              </KButton>
            </div>
            {architektur.length === 0 ? (
              <span style={{ fontSize: 12.5, color: 'var(--k-ink-faint)' }}>
                Unter Kosmo-Antworten mit 👍/👎 + Notiz sammelst du Architektur-Training — in der
                KosmoTrain-Station kuratierst du die Notizen (sie sind der Trainings-Kern).
              </span>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {architektur.slice(0, 8).map((b) => (
                  <div key={b.id} data-testid="training-beispiel" style={{ fontSize: 12, display: 'grid', gap: 2 }}>
                    <div style={{ fontWeight: 550 }}>{kuerzeText(b.frage, 100)}</div>
                    <div style={{ color: 'var(--k-ink-soft)' }}>{kuerzeText(b.antwort)}</div>
                  </div>
                ))}
                {architektur.length > 8 && (
                  <span style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>
                    … und {architektur.length - 8} weitere
                  </span>
                )}
              </div>
            )}
          </Panel>

          <Panel data-testid="training-achse-software" style={{ padding: '12px 14px', display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge hue={moduleHue.data}>Software — KosmoOrbit selbst</Badge>
              <Measure>
                {commandsCount} Commands · {dokuCount} Doku
              </Measure>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {software.slice(0, 8).map((b) => (
                <div key={b.id} data-testid="training-beispiel" style={{ fontSize: 12, display: 'grid', gap: 2 }}>
                  <div style={{ fontWeight: 550 }}>{kuerzeText(b.frage, 100)}</div>
                  <div style={{ color: 'var(--k-ink-soft)' }}>{kuerzeText(b.antwort)}</div>
                </div>
              ))}
              {software.length > 8 && (
                <span style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>
                  … und {software.length - 8} weitere
                </span>
              )}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

export type GedaechtnisSentimentFilter = 'alle' | 'gut' | 'schlecht';
export type GedaechtnisKurationFilter = 'alle' | 'roh' | 'kuratiert';

/**
 * Reine Sortier-/Filterlogik der Memory-Timeline — extrahiert für den
 * App-Unit-Test (kein DOM nötig). Neueste zuerst (`ts` absteigend); der
 * Kurationsstatus folgt derselben Achse wie das KosmoData-Dach
 * (`istTraining` aus `state/kosmodata-dach.ts` — Notiz gesetzt = kuratiert).
 */
export function gedaechtnisZeilen(
  eintraege: readonly Learning[],
  sentiment: GedaechtnisSentimentFilter,
  kuration: GedaechtnisKurationFilter,
): Learning[] {
  return [...eintraege]
    .filter((e) => sentiment === 'alle' || e.sentiment === sentiment)
    .filter((e) => {
      if (kuration === 'alle') return true;
      return kuration === 'kuratiert' ? istTraining(e) : !istTraining(e);
    })
    .sort((a, b) => b.ts.localeCompare(a.ts));
}

/**
 * D4 (KosmoData-Dach) — der Gedächtnis-Tab: die Memory-Timeline des
 * gesamten Lernjournals (`@kosmo/ai` `LearningJournal`, dasselbe Journal wie
 * KosmoTrain/D3) als erstklassige, pflegbare Sammlung. Zeigt ALLE Einträge,
 * hebt aber hervor, welche schon kuratiert sind (Notiz → Training, D3) und
 * welche noch roh sind. Verknüpfung mit Wissen: pro Eintrag on-demand eine
 * BM25-Suche (`searchKnowledge`) über den Kontext — schlank, nicht für alle
 * Einträge gleichzeitig geladen.
 */
export function KosmoGedaechtnisView() {
  const journal = useMemo(() => new LearningJournal(journalStore()), []);
  const [eintraege, setEintraege] = useState<readonly Learning[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<GedaechtnisSentimentFilter>('alle');
  const [kurationFilter, setKurationFilter] = useState<GedaechtnisKurationFilter>('alle');
  const [aufgeklappt, setAufgeklappt] = useState<string | null>(null);
  const [wissenTreffer, setWissenTreffer] = useState<Record<string, KnowledgeHit[]>>({});
  const [ladeWissen, setLadeWissen] = useState<string | null>(null);
  const [befoerdern, setBefoerdern] = useState<string | null>(null);

  const refresh = () => {
    journal.reload();
    setEintraege(journal.all);
  };

  useEffect(() => {
    refresh();
    setGeladen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleVisibility(e: Learning) {
    try {
      const naechste = (e.visibility ?? 'private') === 'public' ? 'private' : 'public';
      journal.setzeVisibility(e.ts, naechste);
      refresh();
    } catch (err) {
      meldeFehler(err);
    }
  }

  async function entfernen(e: Learning) {
    const ok = await bestaetigen({
      titel: 'Gedächtnis-Eintrag entfernen?',
      text: 'Der Eintrag wird endgültig aus dem Lernjournal gelöscht.',
      bestaetigen: 'Entfernen',
      gefaehrlich: true,
    });
    if (!ok) return;
    journal.entfernen(e.ts);
    refresh();
  }

  function befoerdernAbschliessen(e: Learning, note: string) {
    const kern = note.trim();
    setBefoerdern(null);
    if (!kern) return;
    journal.notieren(e.ts, kern);
    refresh();
    melde('In die Trainings-Sammlung übernommen', { ton: 'erfolg' });
  }

  async function ladeVerwandtesWissen(e: Learning) {
    if (aufgeklappt === e.ts) {
      setAufgeklappt(null);
      return;
    }
    setAufgeklappt(e.ts);
    if (wissenTreffer[e.ts]) return;
    setLadeWissen(e.ts);
    try {
      const treffer = await searchKnowledge(e.context, 3);
      setWissenTreffer((alt) => ({ ...alt, [e.ts]: treffer }));
    } catch {
      setWissenTreffer((alt) => ({ ...alt, [e.ts]: [] }));
    } finally {
      setLadeWissen(null);
    }
  }

  const zeilen = gedaechtnisZeilen(eintraege, sentimentFilter, kurationFilter);
  const leer = geladen && eintraege.length === 0;

  const sentimentLabel: Record<GedaechtnisSentimentFilter, string> = {
    alle: 'Alle',
    gut: '👍 Gut',
    schlecht: '👎 Schlecht',
  };
  const kurationLabel: Record<GedaechtnisKurationFilter, string> = {
    alle: 'Alle',
    roh: 'Roh',
    kuratiert: 'Kuratiert',
  };

  return (
    <div data-testid="kosmodata-gedaechtnis" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['alle', 'gut', 'schlecht'] as const).map((f) => (
          <KButton
            key={f}
            size="sm"
            tone={sentimentFilter === f ? 'accent' : 'quiet'}
            data-testid={`gedaechtnis-filter-sentiment-${f}`}
            onClick={() => setSentimentFilter(f)}
          >
            {sentimentLabel[f]}
          </KButton>
        ))}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--k-line)' }} />
        {(['alle', 'roh', 'kuratiert'] as const).map((f) => (
          <KButton
            key={f}
            size="sm"
            tone={kurationFilter === f ? 'accent' : 'quiet'}
            data-testid={`gedaechtnis-filter-kuration-${f}`}
            onClick={() => setKurationFilter(f)}
          >
            {kurationLabel[f]}
          </KButton>
        ))}
      </div>

      {!geladen && <KLade text="Gedächtnis laden …" height={160} />}

      {leer && (
        <div data-testid="gedaechtnis-leer">
          <Messrahmen
            height={200}
            caption="Noch kein Gedächtnis — 👍/👎 unter Kosmo-Antworten füllt es"
          />
        </div>
      )}

      {geladen && !leer && zeilen.length === 0 && (
        <Messrahmen height={140} caption="Kein Eintrag passt zum Filter — Filter lockern" />
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {zeilen.map((e) => {
          const kuratiert = istTraining(e);
          const oeffentlich = (e.visibility ?? 'private') === 'public';
          const wirdBefoerdert = befoerdern === e.ts;
          const treffer = wissenTreffer[e.ts];
          return (
            <Panel key={e.ts} data-testid="gedaechtnis-eintrag" style={{ padding: '10px 12px', display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Badge hue={e.sentiment === 'gut' ? 'var(--k-success)' : 'var(--k-warning)'}>
                  {e.sentiment === 'gut' ? '👍 BEIBEHALTEN' : '👎 VERMEIDEN'}
                </Badge>
                <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10.5, color: 'var(--k-ink-faint)' }}>
                  {e.ts.slice(0, 16).replace('T', ' ')}
                </span>
                <div style={{ flex: 1 }} />
                {kuratiert && (
                  <span data-testid="gedaechtnis-kuratiert">
                    <Badge hue={moduleHue.train}>kuratiert → Training</Badge>
                  </span>
                )}
                <span data-testid="gedaechtnis-visibility">
                  <Badge hue={oeffentlich ? 'var(--k-success)' : 'var(--k-warning)'}>
                    {oeffentlich ? 'Öffentlich' : 'Privat'}
                  </Badge>
                </span>
              </div>

              <div style={{ fontSize: 13, color: 'var(--k-ink-soft)', lineHeight: 1.45 }}>{kuerzeText(e.context, 180)}</div>
              {e.note && (
                <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--k-ink-faint)' }}>Notiz: {kuerzeText(e.note, 160)}</div>
              )}

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <KButton size="sm" tone="ghost" data-testid="gedaechtnis-visibility-toggle" onClick={() => toggleVisibility(e)}>
                  {oeffentlich ? 'Privat machen' : 'Öffentlich machen'}
                </KButton>
                {!kuratiert &&
                  (wirdBefoerdert ? (
                    <input
                      data-testid="gedaechtnis-befördern-notiz"
                      autoFocus
                      defaultValue=""
                      placeholder="Notiz — sie ist der Trainings-Kern (z.B. «nie Fenster unter 900 Brüstung vorschlagen»)"
                      onBlur={(ev) => befoerdernAbschliessen(e, ev.target.value)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
                        if (ev.key === 'Escape') setBefoerdern(null);
                      }}
                      style={{
                        flex: 1,
                        minWidth: 180,
                        padding: '4px 8px',
                        borderRadius: 'var(--k-radius-sm)',
                        border: '1px solid var(--k-line)',
                        background: 'var(--k-surface)',
                        fontSize: 12,
                      }}
                    />
                  ) : (
                    <KButton size="sm" tone="ghost" data-testid="gedaechtnis-befördern" onClick={() => setBefoerdern(e.ts)}>
                      Zu Training befördern
                    </KButton>
                  ))}
                <KButton
                  size="sm"
                  tone="ghost"
                  data-testid="gedaechtnis-verwandtes-wissen"
                  onClick={() => void ladeVerwandtesWissen(e)}
                >
                  Verwandtes Wissen
                </KButton>
                <KButton size="sm" tone="ghost" data-testid="gedaechtnis-entfernen" onClick={() => void entfernen(e)}>
                  Entfernen
                </KButton>
              </div>

              {aufgeklappt === e.ts && (
                <div data-testid="gedaechtnis-wissen-treffer" style={{ display: 'grid', gap: 4 }}>
                  {ladeWissen === e.ts && (
                    <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>Suche …</span>
                  )}
                  {treffer && treffer.length === 0 && (
                    <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>Kein verwandtes Wissen gefunden</span>
                  )}
                  {treffer?.map((h) => (
                    <span key={h.id} style={{ fontSize: 11.5, color: 'var(--k-ink-soft)' }}>
                      {h.docName} · Abschnitt {h.seq + 1}
                    </span>
                  ))}
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

const archivKategorieLabel: Record<ArchivKategorie, string> = {
  projekte: 'Projekte',
  referenzen: 'Referenzen',
  assets: 'Assets',
  wissen: 'Wissen',
  fotos: 'Fotos',
  sonstiges: 'Sonstiges',
};

const ARCHIV_KATEGORIEN: ArchivKategorie[] = ['projekte', 'referenzen', 'assets', 'wissen', 'fotos', 'sonstiges'];

const archivQuelleLabel: Record<ArchivEintrag['quelle'], string> = {
  manuell: 'Manuell erfasst',
  ordner: 'Ordner-Register',
};

const inputStyle: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 'var(--k-radius-sm)',
  border: '1px solid var(--k-line-strong)',
  background: 'var(--k-surface)',
  fontSize: 13,
};

/**
 * D5 (KosmoData-Dach) — der Archiv-Tab: das Manifest für «alles auf der HDD»
 * am HomePC (Owner-Mandat, `docs/EIN-SYSTEM-KOSMODATA.md` D5). Bewusst KEIN
 * Datenumzug: die grossen Bestände bleiben auf der HDD, KosmoOrbit führt nur
 * das Verzeichnis (IndexedDB `kosmo-archiv`, `state/archiv.ts`) — Name, Pfad,
 * Kategorie, geschätzte Grösse, Notiz. Jeder Eintrag ist `visibility:
 * 'private'`, nie in die Website. Das echte Voll-Indexieren/Einbetten der HDD
 * ist ein HomeStation-Auftrag (`docs/HOMESTATION-AUFTRAG.md`) — die Bridge
 * hat heute keinen HDD-Endpunkt (nur `/health`, `/jobs`, `/stt`, `/tts`,
 * `/embed`).
 */
export function KosmoArchivView() {
  const [eintraege, setEintraege] = useState<ArchivEintrag[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [query, setQuery] = useState('');

  const [name, setName] = useState('');
  const [pfad, setPfad] = useState('');
  const [kategorie, setKategorie] = useState<ArchivKategorie>('sonstiges');
  const [groesse, setGroesse] = useState('');
  const [notiz, setNotiz] = useState('');

  const ordnerInputRef = useRef<HTMLInputElement | null>(null);
  const ordnerUnterstuetzt =
    typeof HTMLInputElement !== 'undefined' && 'webkitdirectory' in HTMLInputElement.prototype;

  const refresh = () => {
    void listeArchiv()
      .then(setEintraege)
      .finally(() => setGeladen(true));
  };
  useEffect(refresh, []);

  async function hinzufuegen() {
    if (!name.trim() || !pfad.trim()) {
      meldeFehler(new Error('Name und Pfad sind Pflichtfelder'));
      return;
    }
    const groesseZahl = groesse.trim() ? Number(groesse.trim()) : undefined;
    try {
      await speichereArchiv({
        name: name.trim(),
        pfad: pfad.trim(),
        kategorie,
        ...(groesseZahl !== undefined && !Number.isNaN(groesseZahl) ? { groesseBytes: groesseZahl } : {}),
        ...(notiz.trim() ? { notiz: notiz.trim() } : {}),
        quelle: 'manuell',
      });
      setName('');
      setPfad('');
      setGroesse('');
      setNotiz('');
      setKategorie('sonstiges');
      refresh();
      melde('Bestand im Archiv erfasst', { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  }

  async function ordnerErfasst(files: FileList | null) {
    if (!files || files.length === 0) return;
    const liste = Array.from(files);
    const gesamtGroesse = liste.reduce((s, f) => s + f.size, 0);
    const erster = liste[0]!;
    const relPfad = (erster as File & { webkitRelativePath?: string }).webkitRelativePath;
    const wurzel = (relPfad ? relPfad.split('/')[0] : '') || erster.name;
    try {
      const eintrag = await speichereArchiv({
        name: wurzel,
        pfad: wurzel,
        kategorie: 'sonstiges',
        groesseBytes: gesamtGroesse,
        dateien: liste.length,
        quelle: 'ordner',
      });
      refresh();
      melde(
        `«${eintrag.name}» registriert — ${liste.length} ${liste.length === 1 ? 'Datei' : 'Dateien'}, ${formatGroesse(gesamtGroesse)}`,
        { ton: 'erfolg' },
      );
    } catch (err) {
      meldeFehler(err);
    } finally {
      if (ordnerInputRef.current) ordnerInputRef.current.value = '';
    }
  }

  async function entfernen(e: ArchivEintrag) {
    const ok = await bestaetigen({
      titel: `«${e.name}» aus dem Archiv-Verzeichnis entfernen?`,
      text: 'Nur der Manifest-Eintrag verschwindet — die Bestände auf der HDD bleiben unberührt.',
      bestaetigen: 'Entfernen',
      gefaehrlich: true,
    });
    if (!ok) return;
    await entferneArchiv(e.id);
    refresh();
  }

  const gefiltert = useMemo(() => sucheArchiv(eintraege, query), [eintraege, query]);
  const leer = geladen && eintraege.length === 0;

  return (
    <div data-testid="kosmodata-archiv" style={{ display: 'grid', gap: 14 }}>
      <div
        data-testid="archiv-hinweis"
        style={{
          fontSize: 12.5,
          color: 'var(--k-ink-soft)',
          lineHeight: 1.5,
          padding: '10px 12px',
          borderRadius: 'var(--k-radius-sm)',
          border: '1px solid var(--k-line)',
          background: 'var(--k-raised)',
        }}
      >
        Lokal &amp; privat — nie in die Website. Grosse Bestände bleiben auf der HDD; KosmoOrbit
        führt nur das Verzeichnis (Manifest). Voll-Indexieren der HDD folgt über die HomeStation.
      </div>

      <Panel data-testid="archiv-form" style={{ padding: '12px 14px', display: 'grid', gap: 8 }}>
        <div className="k-titel" style={{ fontSize: 13 }}>Bestand manuell erfassen</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            data-testid="archiv-feld-name"
            placeholder="Name (z.B. «Projekte 2010–2020»)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ ...inputStyle, flex: '1 1 200px' }}
          />
          <input
            data-testid="archiv-feld-pfad"
            placeholder="HDD-Pfad (z.B. D:\Archiv\Projekte 2010-2020)"
            value={pfad}
            onChange={(e) => setPfad(e.target.value)}
            style={{ ...inputStyle, flex: '1 1 260px', fontFamily: 'var(--k-font-mono)' }}
          />
          <select
            data-testid="archiv-feld-kategorie"
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value as ArchivKategorie)}
            style={inputStyle}
          >
            {ARCHIV_KATEGORIEN.map((k) => (
              <option key={k} value={k}>
                {archivKategorieLabel[k]}
              </option>
            ))}
          </select>
          <input
            data-testid="archiv-feld-groesse"
            placeholder="Grösse in Bytes (optional)"
            value={groesse}
            onChange={(e) => setGroesse(e.target.value)}
            inputMode="numeric"
            style={{ ...inputStyle, flex: '0 1 170px' }}
          />
          <input
            data-testid="archiv-feld-notiz"
            placeholder="Notiz (optional)"
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            style={{ ...inputStyle, flex: '1 1 200px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <KButton size="sm" tone="accent" data-testid="archiv-hinzu" onClick={() => void hinzufuegen()}>
            Hinzufügen
          </KButton>
          <div style={{ flex: 1 }} />
          <input
            data-testid="archiv-ordner-input"
            ref={(el) => {
              ordnerInputRef.current = el;
              if (el) {
                el.setAttribute('webkitdirectory', '');
                el.setAttribute('directory', '');
              }
            }}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => void ordnerErfasst(e.currentTarget.files)}
          />
          <KButton size="sm" tone="ghost" data-testid="archiv-ordner" onClick={() => ordnerInputRef.current?.click()}>
            Ordner erfassen
          </KButton>
          {!ordnerUnterstuetzt && (
            <span style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>
              Ordner-Auswahl braucht einen Chromium-Browser (Desktop/iPad-App)
            </span>
          )}
        </div>
      </Panel>

      <input
        data-testid="archiv-search"
        placeholder="Archiv durchsuchen: Name, Pfad, Kategorie, Notiz …"
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

      {!geladen && <KLade text="Archiv laden …" height={160} />}

      {leer && (
        <div data-testid="archiv-leer">
          <Messrahmen
            height={200}
            caption="Noch nichts im HomePC-Archiv — Bestand erfassen oder Ordner registrieren"
          />
        </div>
      )}

      {geladen && !leer && gefiltert.length === 0 && (
        <Messrahmen height={140} caption="Kein Bestand passt zur Suche — Begriff lockern" />
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {gefiltert.map((e) => (
          <Panel key={e.id} data-testid="archiv-eintrag" style={{ padding: '10px 12px', display: 'grid', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 550, fontSize: 13.5 }}>{e.name}</span>
              <Badge hue={moduleHue.doc}>{archivKategorieLabel[e.kategorie]}</Badge>
              <Badge hue={e.quelle === 'ordner' ? moduleHue.asset : 'var(--k-ink-faint)'}>
                {archivQuelleLabel[e.quelle]}
              </Badge>
              <div style={{ flex: 1 }} />
              <KButton size="sm" tone="ghost" data-testid="archiv-entfernen" onClick={() => void entfernen(e)}>
                Entfernen
              </KButton>
            </div>
            <div style={{ fontFamily: 'var(--k-font-mono)', fontSize: 12, color: 'var(--k-ink-soft)' }}>{e.pfad}</div>
            <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span>{formatGroesse(e.groesseBytes)}</span>
              {e.dateien !== undefined && (
                <span>
                  {e.dateien} {e.dateien === 1 ? 'Datei' : 'Dateien'}
                </span>
              )}
            </div>
            {e.notiz && <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--k-ink-faint)' }}>{e.notiz}</div>}
          </Panel>
        ))}
      </div>
    </div>
  );
}
