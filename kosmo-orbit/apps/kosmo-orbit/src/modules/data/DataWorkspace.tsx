import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Badge,
  bestaetigen,
  Hairline,
  Karteikarte,
  KButton,
  KChip,
  KIcon,
  KInput,
  KLade,
  KSelect,
  KTabs,
  melde,
  meldeFehler,
  Measure,
  Messrahmen,
  Panel,
  moduleHue,
  type PanelProps,
} from '@kosmo/ui';
import { DataLeerbild } from './DataLeerbild';
import { RefHeroBild } from './RefHeroBild';
import { gedaechtnisQuerverweise } from './data-runtime';
import {
  bauteilkatalog,
  gesamtdicke,
  ladeReferenzenLive,
  materialkatalog,
  uWert,
  type KatalogEintrag,
  type MaterialArt,
  type MaterialEintrag,
  type MaterialGroesse,
  type RefEntry,
  type RefEntryAnalysisLayer,
  type RefEntryMedia,
  type RefEntryMediaType,
  type RefReviewStatus,
} from '@kosmo/data';
import { useProject } from '../../state/project-store';
import { setGlbContext, subscribeGlbStatus } from '../design/Viewport3D';
import { erfasseMaterial, listeGlb, listeMaterialien, loescheGlb, type KosmoAsset } from '../../state/asset-bibliothek';
import { renderStandbild } from '../asset/three-standbild';
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
  if (!res.ok) throw new Error(`kosmodata-seed.json: HTTP ${res.status}`);
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
          padding: `0 var(--k-s2)`,
          textAlign: 'center',
          fontSize: 'var(--k-t-xs)',
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
            fontSize: 'var(--k-t-xs)',
            padding: `var(--k-s1) var(--k-s2)`,
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
 * K1 (v0.6.8): Hero-Bilder laufen jetzt über den Laufzeit-Blob-Store
 * (`data-runtime.ts` + `RefHeroBild.tsx`) — on-demand bei sichtbarer Karte,
 * lokal-first, ohne kaputte `<img>` (der frühere R1-Fix mit `onError` →
 * `DataLeerbild` ist darin aufgegangen; der W4-Vertrag
 * `data-testid="karte-leerbild"` bleibt auf dem Platzhalter-Signet).
 */

/** K6: Jahr-Spanne fürs Dossier — zeigt `year_end`, wo es vom Start abweicht. */
function formatJahrSpanne(e: RefEntry): string {
  const von = formatYear(e);
  if (e.year_end == null || e.year_end === e.year_start) return von;
  return `${von}–${e.year_end < 0 ? `${Math.abs(e.year_end)} v. Chr.` : e.year_end}`;
}

/** K6: Seed-Felder ausserhalb des `RefEntry`-Typs (Seed ist READ-ONLY — der
 * Typ in `packages/kosmo-data` bleibt unangetastet; hier nur eine lokale,
 * additive Lese-Sicht auf das, was `kosmodata-seed.json` real enthält). */
interface RefEntrySeedExtras {
  architecture_text?: {
    headline?: string;
    overview?: string;
    chapters?: { title: string; text: string; review_status?: RefReviewStatus }[];
  };
  source_candidates?: {
    source_type?: string;
    title?: string;
    reliability_level?: string;
    rights_status?: string;
  }[];
}

function seedExtras(e: RefEntry): RefEntrySeedExtras {
  return e as RefEntry & RefEntrySeedExtras;
}

/** K6: schlanker Klapp-Abschnitt fürs Dossier (natives `<details>` — das
 * Repo-Muster, es gibt bewusst kein Accordion in @kosmo/ui). Titelzeile im
 * selben Uppercase-Stil wie die bestehenden Dossier-Abschnitte. */
function DossierGruppe({
  titel,
  anzahl,
  testid,
  offen = false,
  children,
}: {
  titel: string;
  anzahl?: number;
  testid: string;
  offen?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <Hairline />
      <details data-testid={testid} open={offen}>
        <summary
          style={{
            cursor: 'pointer',
            fontSize: 'var(--k-t-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--k-ink-faint)',
          }}
        >
          {titel}
          {anzahl !== undefined && (
            <span style={{ fontFamily: 'var(--k-font-mono)', marginLeft: 'var(--k-s2)' }}>{anzahl}</span>
          )}
        </summary>
        <div style={{ display: 'grid', gap: 'var(--k-s2)', paddingTop: 'var(--k-s2)' }}>{children}</div>
      </details>
    </>
  );
}

const modelTypeLabel: Record<string, string> = {
  full_model: 'Vollmodell',
  low_poly_model: 'Low-Poly-Modell',
  structure_model: 'Tragwerksmodell',
  tectonic_model: 'Tektonikmodell',
  site_model: 'Umgebungsmodell',
  mass_model: 'Massenmodell',
};

/** Seed-Vokabeln (snake_case-Freitext) lesbar machen, ohne Inhalt zu erfinden. */
function entschlange(s: string): string {
  return s.replace(/_/g, ' ');
}

/**
 * KdKarte (W4, UI-KONZEPT-065 §2 «Hierarchie-Rezept») — lokale Karten-Hülle
 * um `Panel` (kosmo-ui, eingefroren für diesen Stream — keine Zustands-Props
 * dort ergänzbar). Ruhe = 1px `--k-line` auf `--k-raised`; Hover = 1px
 * `--k-line-strong`; gewählt/aktiv = Akzent-Eckpunkt (6px-Quadrat in der
 * Kartenecke) STATT outline — nie beides gleichzeitig (§2, Rahmen-Regel).
 */
function KdKarte({
  aktiv = false,
  style,
  className,
  children,
  ...rest
}: PanelProps & { aktiv?: boolean; children?: ReactNode }) {
  const [hover, setHover] = useState(false);
  // MOTION-KONZEPT-066 §3 (.k-druck-Rollout Data): JEDE Verwendung von
  // `KdKarte` in dieser Datei trägt bereits ein `onClick` (Referenz-/
  // Material-/Dach-Karten) — die Karte selbst ist also immer echt klickbar,
  // nie Fake-Affordance. Darum hier zentral, statt an jedem Aufrufort.
  const klassen = ['k-druck', className].filter(Boolean).join(' ');
  return (
    <Panel
      {...rest}
      className={klassen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: 'var(--k-raised)',
        borderColor: aktiv || hover ? 'var(--k-line-strong)' : 'var(--k-line)',
        ...style,
      }}
    >
      {children}
      {aktiv && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 6,
            height: 6,
            background: 'var(--k-accent)',
          }}
        />
      )}
    </Panel>
  );
}

/**
 * SuchFeld (W4, UI-KONZEPT-065 §3/§4-4) — KInput mit KIcon `lupe` links,
 * für die vier Suchfelder dieser Station (Referenzen, Dach, Wissen, Archiv).
 * `testid`/Text bleiben unverändert — nur die Hülle wird gemeinsam.
 */
function SuchFeld({
  testid,
  placeholder,
  value,
  onChange,
}: {
  testid: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <KIcon
        name="lupe"
        size={14}
        style={{ position: 'absolute', left: 'var(--k-s3)', color: 'var(--k-ink-faint)', pointerEvents: 'none' }}
      />
      <KInput
        data-testid={testid}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ paddingLeft: 'var(--k-s6)', width: '100%' }}
      />
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

export interface KosmoDataSyncBadgeInfo {
  hue: string;
  text: string;
  /** Ausführlicher, ehrlicher Tooltip-Text (Badge-Titel). */
  titel: string;
}

/**
 * F8 (Owner-Befund v0.6.4, Live-Test 0.6.3-Desktop): «Wieso sehe ich
 * KosmoData-Daten nicht, es steht offline seed.» Die alte Badge-Aufschrift
 * «Offline-Seed» war technisch korrekt, aber kryptisch — sie sagte nicht,
 * DASS die eingebauten Referenzdaten trotzdem vollständig sichtbar sind und
 * WARUM kein Live-Sync passiert (Website-Sync/architekturkosmos.ch im
 * Desktop-Build nicht erreichbar/konfiguriert). Reine Funktion (aus der
 * Komponente gezogen), damit die Formulierungen ohne Rendering testbar sind.
 */
export function kosmoDataSyncBadge(state: {
  seedFehler: boolean;
  syncState: 'seed' | 'synced' | 'fehler';
  quelle: 'seed' | 'live' | 'cache';
  entriesCount: number;
}): KosmoDataSyncBadgeInfo {
  if (state.seedFehler) {
    return {
      hue: 'var(--k-warning)',
      text: 'Eingebaute Referenzdaten nicht ladbar',
      titel:
        'Die eingebauten Referenzdaten (Referenz-Kanon, CH-Bauteilkatalog, Materialkatalog) konnten gerade nicht geladen werden — «Erneut versuchen» wiederholt den Ladevorgang.',
    };
  }
  if (state.syncState === 'synced' && state.quelle === 'live') {
    return { hue: 'var(--k-success)', text: `Live · ${state.entriesCount}`, titel: 'Referenzen sind mit architekturkosmos.ch synchronisiert.' };
  }
  if (state.syncState === 'synced') {
    return {
      hue: 'var(--k-info)',
      text: `Cache (letzter Stand) · ${state.entriesCount}`,
      titel: 'Website-Sync gerade nicht erreichbar — letzter erfolgreich synchronisierter Stand wird gezeigt.',
    };
  }
  if (state.syncState === 'fehler') {
    return {
      hue: 'var(--k-warning)',
      text: 'Website-Sync nicht erreichbar — eingebaute Referenzdaten bleiben sichtbar',
      titel: 'Offline — eingebaute Referenzdaten (Stand vom Build). Website-Sync nicht erreichbar.',
    };
  }
  return {
    hue: 'var(--k-info)',
    text: 'Offline — eingebaute Referenzdaten (Stand vom Build)',
    titel: 'Offline — eingebaute Referenzdaten (Stand vom Build). Website-Sync nicht erreichbar.',
  };
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

export interface DataWorkspaceProps {
  /** Serie K / A4: öffnet das zentrale Einstellungs-Panel, vorgefiltert auf
   *  KosmoData. Optional — nur `App.tsx` kennt diesen Weg. */
  onEinstellungen?: () => void;
}

export function DataWorkspace({ onEinstellungen }: DataWorkspaceProps = {}) {
  const [entries, setEntries] = useState<RefEntry[]>([]);
  const [geladen, setGeladen] = useState(false);
  // F8 (Owner-Befund v0.6.4): der eingebaute Referenz-Seed kommt selbst per
  // fetch() (lokale kosmodata-seed.json) — schlägt der Abruf fehl (blockiertes
  // fetch, defekter Build, o.ä.), blieb die Liste bisher leer, ohne Meldung
  // und ohne Wiederholung. `seedFehler` unterscheidet «kein Treffer für die
  // Suche» ehrlich von «der Seed selbst ist nicht geladen» — `seedRetry`
  // triggert einen neuen Versuch (der Sync-Knopf ist etwas anderes: der holt
  // Live-Daten von der Website, nicht den Build-Seed).
  const [seedFehler, setSeedFehler] = useState(false);
  const [seedRetry, setSeedRetry] = useState(0);
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
    let verworfen = false;
    setSeedFehler(false);
    void loadReferences()
      .then((es) => {
        if (verworfen) return;
        setEntries(es);
        setSeedFehler(false);
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
      .catch(() => {
        // F8: ehrlich scheitern statt leer bleiben — die Station zeigt einen
        // Wiederholen-Knopf statt den «kein Treffer»-Leerzustand vorzutäuschen.
        if (!verworfen) setSeedFehler(true);
      })
      .finally(() => {
        if (!verworfen) setGeladen(true);
      });
    return () => {
      verworfen = true;
    };
  }, [seedRetry]);

  // K8 (v0.6.8): Gedächtnis-/Wissens-Querverweise im Dossier — ehrlich
  // textbasiert (das Lernjournal trägt keine persistierte Referenz-Kante,
  // siehe `gedaechtnisQuerverweise` in data-runtime.ts). Klick wechselt den
  // Tab INNERHALB von KosmoData und übergibt Fokus (Gedächtnis) bzw.
  // Startsuche (Wissen) an die Ziel-Ansicht.
  const journal = useMemo(() => new LearningJournal(journalStore()), []);
  const [gedaechtnisLinks, setGedaechtnisLinks] = useState<Learning[]>([]);
  const [wissenLinks, setWissenLinks] = useState<KnowledgeHit[]>([]);
  const [gedaechtnisFokus, setGedaechtnisFokus] = useState<string | null>(null);
  const [wissenStartQuery, setWissenStartQuery] = useState('');
  useEffect(() => {
    if (!selected) {
      setGedaechtnisLinks([]);
      setWissenLinks([]);
      return;
    }
    let verworfen = false;
    try {
      journal.reload();
      setGedaechtnisLinks(gedaechtnisQuerverweise(journal.all, selected));
    } catch {
      setGedaechtnisLinks([]);
    }
    void searchKnowledge(selected.title, 3)
      .then((t) => {
        if (!verworfen) setWissenLinks(t);
      })
      .catch(() => {
        if (!verworfen) setWissenLinks([]);
      });
    return () => {
      verworfen = true;
    };
  }, [selected, journal]);

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

  const syncBadge = kosmoDataSyncBadge({ seedFehler, syncState, quelle, entriesCount: entries.length });

  return (
    <div className="k-einblenden" style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--k-s6)' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 'var(--k-s5)' }}>
          {/* Serie J2 / Batch B1: reiner Test-/Gruppierungs-Wrapper (kein
              eigener Box-Effekt, `display: contents`) — analog zu Designs
              `design-werkzeugleiste`, hier zusätzlich über die (nur im
              referenzen-Tab gerenderte) Such-/Filter-Gruppe hinweg, damit die
              feste-Anker-Prüfung (E2E) alle drei Adaptions-Gruppen erfasst. */}
          <div data-testid="referenzen-werkzeugleiste" style={{ display: 'contents' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)', flexWrap: 'wrap' }}>
            <Badge hue={moduleHue.data}>KosmoData</Badge>
            <span
              data-testid="leiste-gruppe-navigation"
              className={fokusKlasse(stufeFuerGruppe('navigation'))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                ...(gruppeHatGehobenesElement('navigation') ? { opacity: 1 } : {}),
              }}
            >
              {/* W4 (UI-KONZEPT-065 §3): Tab-Wortknöpfe → KTabs. `navigation`
                  ist als Gruppe IMMER `primaer` (T7-Basis, nie gedimmt —
                  `state/oberflaeche-adaption-data.ts`), `elementStil` hätte
                  hier also für jeden Knopf immer nur `opacity: 1` geliefert
                  (ein Anheben über `primaer` clampt auf `primaer`) — reiner
                  No-Op, entfällt beim Wechsel auf KTabs (die keine
                  Element-Style-Props kennt) ohne Verhaltensänderung. */}
              <KTabs
                size="sm"
                aktiv={tab}
                onChange={(id) => {
                  setTab(id as DataTab);
                  nutzungMelden(`navigation:${id}`);
                }}
                items={[
                  { id: 'uebersicht', label: 'Übersicht', testid: 'tab-uebersicht' },
                  { id: 'referenzen', label: 'Referenzen', testid: 'tab-referenzen' },
                  { id: 'bauteile', label: 'Bauteilkatalog CH', testid: 'tab-bauteile' },
                  { id: 'materialien', label: 'Materialien', testid: 'tab-materialien' },
                  { id: 'wissen', label: 'Wissen', testid: 'tab-wissen' },
                  { id: 'training', label: 'Training', testid: 'tab-training' },
                  { id: 'gedaechtnis', label: 'Gedächtnis', testid: 'tab-gedaechtnis' },
                  { id: 'archiv', label: 'Archiv', testid: 'tab-archiv' },
                ]}
              />
            </span>
            <span style={{ color: 'var(--k-ink-soft)', fontSize: 'var(--k-t-md)' }}>
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
            {/* R1-Fix (Kritik-065 p-07/i-07, «Zweite Werkzeugzeile mischt 5
                Paradigmen»): dieselbe flex-Zeile bricht bei knapper Breite
                um — Badge/Chip, «nackter» Ghost-Text, Checkbox, Text-Knopf
                und Zahnrad standen dann unverbunden nebeneinander. Fix OHNE
                die Element-Typen zu wechseln (E2E-Vertrag: testids/Wortlaut
                unverändert) — drei Massnahmen: (1) `<Hairline vertical>`
                gruppiert die drei Absichten (Sync-Stand / Adaption / Station)
                sichtbar, (2) Sync und «Oberfläche zurücksetzen» bekommen
                trotz `tone="ghost"` einen sichtbaren Rand (bleiben als
                KButton ghost sm erkennbar statt wie Fliesstext zu wirken),
                (3) das Zahnrad bekommt Text («Stations-Einstellungen») statt
                nackt zu bleiben — es führt NICHT zum selben Ziel wie das
                globale Zahnrad im Header (dort ungefiltert, hier auf
                KosmoData vorgefiltert), ist also kein Duplikat, nur bisher
                nicht als eigenständig lesbar. */}
            <span data-testid="data-sync-badge" title={syncBadge.titel}>
              <KChip hue={syncBadge.hue}>{syncBadge.text}</KChip>
            </span>
            {seedFehler && (
              <KButton
                size="sm"
                tone="ghost"
                data-testid="data-seed-retry"
                title="Eingebaute Referenzdaten erneut laden"
                onClick={() => setSeedRetry((n) => n + 1)}
                style={{ borderColor: 'var(--k-line)' }}
              >
                Erneut versuchen
              </KButton>
            )}
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
                style={{ borderColor: 'var(--k-line)' }}
              >
                Sync
              </KButton>
            </span>
            <Hairline vertical />
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
                fontSize: 'var(--k-t-xs)',
                color: 'var(--k-ink-faint)',
                whiteSpace: 'nowrap',
                visibility: adaptionHinweisSichtbar ? 'visible' : 'hidden',
              }}
            >
              ⓘ angepasst
            </span>
            <label style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)', display: 'flex', alignItems: 'center', gap: 'var(--k-s2)' }}>
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
              style={{ borderColor: 'var(--k-line)' }}
            >
              Oberfläche zurücksetzen
            </KButton>
            {onEinstellungen && (
              <>
                <Hairline vertical />
                <KButton
                  size="sm"
                  tone="ghost"
                  data-testid="station-einstellungen-data"
                  title="Einstellungen — KosmoData"
                  aria-label="Einstellungen — KosmoData"
                  onClick={onEinstellungen}
                  style={{ borderColor: 'var(--k-line)' }}
                >
                  <KIcon name="zahnrad" size={14} />
                  Stations-Einstellungen
                </KButton>
              </>
            )}
          </div>

          {tab === 'referenzen' && (
            <span
              data-testid="leiste-gruppe-suche"
              className={fokusKlasse(stufeFuerGruppe('suche'))}
              style={{ display: 'grid', gap: 'var(--k-s3)', ...(gruppeHatGehobenesElement('suche') ? { opacity: 1 } : {}) }}
            >
              <SuchFeld
                testid="data-search"
                placeholder="Suchen: Titel, Ort, Architekt, Thema, Material …"
                value={query}
                onChange={setQuery}
              />

              <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap' }}>
                <KButton
                  size="sm"
                  tone={nurSammlung ? 'accent' : 'quiet'}
                  data-testid="filter-sammlung"
                  onClick={() => setNurSammlung(!nurSammlung)}
                >
                  <KIcon name="stern-voll" size={14} /> Sammlung ({sammlung.size})
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
          {tab === 'wissen' && (
            <KosmoWissenView {...(wissenStartQuery ? { startQuery: wissenStartQuery } : {})} />
          )}
          {tab === 'training' && <KosmoTrainingView />}
          {tab === 'gedaechtnis' && (
            <KosmoGedaechtnisView {...(gedaechtnisFokus !== null ? { fokusTs: gedaechtnisFokus } : {})} />
          )}
          {tab === 'archiv' && <KosmoArchivView />}

          {tab === 'referenzen' && (<>
          {/* D3: Leerzustand als Bauzeichnung (Gestaltungskonzept). F8: bei
              einem gescheiterten Seed-Ladevorgang ist die Liste ehrlich als
              «nicht geladen», nicht als «kein Treffer» ausgewiesen — sonst
              sieht es aus, als hätte die Suche/der Filter schuld. */}
          {geladen && seedFehler && entries.length === 0 && (
            <div data-testid="seed-fehler-leerzustand">
              <Messrahmen
                height={220}
                caption="Eingebaute Referenzdaten momentan nicht ladbar — «Erneut versuchen» oben rechts"
              />
            </div>
          )}
          {geladen && !seedFehler && filtered.length === 0 && (
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
              gap: 'var(--k-s4)',
            }}
          >
            {filtered.map((e) => (
              <KdKarte
                key={e.id}
                pad={false}
                data-testid="ref-card"
                aktiv={sammlung.has(e.id)}
                onClick={() => setSelected(e)}
                style={{ cursor: 'pointer', overflow: 'hidden' }}
              >
                <button
                  aria-label="Zur Sammlung"
                  data-testid={`stern-${e.id}`}
                  className="k-druck"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    toggleSammlung(e.id);
                  }}
                  style={{
                    // .k-druck-Rollout: `all: 'unset'` (inline) hätte JEDE
                    // Klassenregel — auch die Press-Simulation — überstimmt
                    // (inline schlägt Stylesheet unabhängig von Pseudoklassen).
                    // Ersetzt durch dieselben Resets einzeln, sichtbar
                    // byte-identisch, `.k-druck` kann jetzt greifen.
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    margin: 0,
                    font: 'inherit',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    position: 'absolute',
                    top: 'var(--k-s1)',
                    right: 'var(--k-s2)',
                    zIndex: 2,
                    color: sammlung.has(e.id) ? 'var(--k-warning)' : 'var(--k-ink-faint)',
                  }}
                >
                  <KIcon name={sammlung.has(e.id) ? 'stern-voll' : 'stern'} size={16} title="Zur Sammlung" />
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
                  <RefHeroBild entry={e} />
                </div>
                <div style={{ padding: `var(--k-s3) var(--k-s4)` }}>
                  <div style={{ fontWeight: 550, fontSize: 'var(--k-t-md)', lineHeight: 1.3 }}>{e.title}</div>
                  <div style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)', marginTop: 'var(--k-s1)' }}>
                    {[formatYear(e), e.city, e.country].filter(Boolean).join(' · ')}
                    {e.has_3d ? ' · 3D' : ''}
                  </div>
                </div>
              </KdKarte>
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
            padding: 'var(--k-s5)',
            display: 'grid',
            gap: 'var(--k-s3)',
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
          {/* K1: lokal-first — lokales Bild als <img>, sonst Tusche-Platzhalter
              plus die ehrliche Zeile «Bild nicht lokal — Quelle: <domain>»
              (vorher stand hier ein kaputtes externes <img> ohne Fallback). */}
          <div
            data-testid="ref-dossier-bild"
            style={{
              height: 170,
              borderRadius: 'var(--k-radius-lg)',
              border: '1px solid var(--k-line)',
              background: 'var(--k-field)',
              overflow: 'hidden',
            }}
          >
            <RefHeroBild entry={selected} signetGroesse={72} />
          </div>
          <div style={{ fontSize: 'var(--k-t-lg)', fontWeight: 600 }}>{selected.title}</div>
          <Measure>
            {[formatJahrSpanne(selected), selected.city, selected.country].filter(Boolean).join(' · ')}
          </Measure>
          {(selected.authors ?? []).length > 0 && (
            <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>{(selected.authors ?? []).join(', ')}</div>
          )}

          {/* D6 (Batch 2): Status- und Sichtbarkeitschips aus dem reichen Master-Modell. */}
          <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap' }}>
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
          {selected.one_sentence && <div style={{ fontSize: 'var(--k-t-md)', fontStyle: 'italic' }}>{selected.one_sentence}</div>}
          {(selected.full_description ?? selected.short_description) && (
            <div style={{ fontSize: 'var(--k-t-md)', color: 'var(--k-ink-soft)', lineHeight: 1.55 }}>
              {selected.full_description ?? selected.short_description}
            </div>
          )}
          {(selected.themes ?? []).length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap' }}>
              {(selected.themes ?? []).map((t) => (
                <span key={t} style={{ fontSize: 'var(--k-t-xs)', padding: `var(--k-s1) var(--k-s3)`, borderRadius: 999, background: 'var(--k-accent-wash)' }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Materialprofil: strukturiert (materials_detail) falls vorhanden, sonst die schlanke Tag-Liste. */}
          {selected.materials_detail ? (
            <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)', display: 'grid', gap: 'var(--k-s2)' }}>
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
              <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
                Material: {(selected.materials ?? []).join(', ')}
              </div>
            )
          )}

          {/* Geo: Koordinaten + Region/Kanton/Land als Text — keine Karten-Lib (Offline/CORS). */}
          {selected.geo && (selected.geo.lat != null || selected.geo.region || selected.geo.canton) && (
            <>
              <Hairline />
              <div data-testid="ref-geo" style={{ display: 'grid', gap: 'var(--k-s2)' }}>
                <div style={{ fontSize: 'var(--k-t-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
                  Geo
                </div>
                {selected.geo.lat != null && selected.geo.lon != null && (
                  <Measure>
                    {selected.geo.lat.toFixed(4)}°, {selected.geo.lon.toFixed(4)}°
                  </Measure>
                )}
                <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
                  {[selected.geo.region, selected.geo.canton, selected.country].filter(Boolean).join(' · ')}
                </div>
              </div>
            </>
          )}

          {/* Medien-Galerie: Bilder mit öffentlicher URL als Thumbnail, sonst gesperrte Platzhalterkachel. */}
          {(selected.media ?? []).length > 0 && (
            <>
              <Hairline />
              <div style={{ fontSize: 'var(--k-t-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
                Medien
              </div>
              <div data-testid="ref-media" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--k-s3)' }}>
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
              <div style={{ fontSize: 'var(--k-t-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
                Analyse
              </div>
              <div data-testid="ref-analyse" style={{ display: 'grid', gap: 'var(--k-s3)' }}>
                {(selected.analysis_layers ?? []).map((layer, i) => (
                  <div key={`${layer.analysis_type}-${i}`} style={{ display: 'grid', gap: 'var(--k-s1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s2)' }}>
                      <span style={{ fontSize: 'var(--k-t-sm)', fontWeight: 600 }}>{analysisTypeLabel[layer.analysis_type] ?? layer.analysis_type}</span>
                      <div style={{ flex: 1 }} />
                      <Badge hue={reviewStatusHue[layer.review_status]}>{reviewStatusLabel[layer.review_status]}</Badge>
                    </div>
                    <div style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-soft)', lineHeight: 1.45 }}>{layer.summary}</div>
                    {/* K6: strukturierte Analyse-Daten (`data`-Feld des reichen
                        Typs) — heute im Seed leer, aber der Vertrag sieht sie
                        vor; sobald sie kommen, sind sie sichtbar. */}
                    {layer.data && Object.keys(layer.data).length > 0 && (
                      <div style={{ fontFamily: 'var(--k-font-mono)', fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)', overflowWrap: 'anywhere' }}>
                        {Object.entries(layer.data)
                          .map(([k, v]) => `${entschlange(k)}: ${typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}`)
                          .join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ---------- K6 (v0.6.8): bisher unsichtbare Felder des reichen
              Master-Modells — gruppiert und zusammenklappbar (Werkplan-Stil,
              natives <details>). Jede Gruppe erscheint nur, wenn der Seed
              für diese Referenz wirklich Daten trägt (kein leeres Gerüst). */}

          {(selected.program_detail || selected.program) && (
            <DossierGruppe titel="Programm" testid="ref-programm" offen>
              {selected.program_detail ? (
                <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)', display: 'grid', gap: 'var(--k-s1)' }}>
                  {selected.program_detail.type && <div>Typ: {entschlange(selected.program_detail.type)}</div>}
                  {selected.program_detail.subtype && <div>Untertyp: {entschlange(selected.program_detail.subtype)}</div>}
                  {selected.program_detail.public_access && (
                    <div>Zugang: {entschlange(selected.program_detail.public_access)}</div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>{entschlange(selected.program ?? '')}</div>
              )}
            </DossierGruppe>
          )}

          {selected.context && Object.keys(selected.context).length > 0 && (
            <DossierGruppe titel="Kontext" testid="ref-kontext" offen>
              <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)', display: 'grid', gap: 'var(--k-s1)' }}>
                {selected.context.topography && <div>Topografie: {entschlange(selected.context.topography)}</div>}
                {selected.context.setting && <div>Lage: {entschlange(selected.context.setting)}</div>}
                {selected.context.climate && <div>Klima: {entschlange(selected.context.climate)}</div>}
              </div>
              {(selected.context.heritage_context ?? []).length > 0 && (
                <div style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
                  Denkmalkontext: {(selected.context.heritage_context ?? []).map(entschlange).join(' · ')}
                </div>
              )}
              {(selected.context.landscape_relation ?? []).length > 0 && (
                <div style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
                  Landschaftsbezug: {(selected.context.landscape_relation ?? []).map(entschlange).join(' · ')}
                </div>
              )}
            </DossierGruppe>
          )}

          {((selected.lecture_cluster ?? []).length > 0 ||
            (selected.vibes ?? []).length > 0 ||
            (selected.database_tags ?? []).length > 0) && (
            <DossierGruppe titel="Einordnung" testid="ref-einordnung">
              {(selected.lecture_cluster ?? []).length > 0 && (
                <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
                  Vorlesungs-Cluster: {(selected.lecture_cluster ?? []).map(entschlange).join(' · ')}
                </div>
              )}
              {(selected.vibes ?? []).length > 0 && (
                <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap' }}>
                  {(selected.vibes ?? []).map((v) => (
                    <span
                      key={v}
                      style={{
                        fontSize: 'var(--k-t-xs)',
                        padding: `var(--k-s1) var(--k-s3)`,
                        borderRadius: 999,
                        border: '1px solid var(--k-line)',
                        color: 'var(--k-ink-soft)',
                      }}
                    >
                      {entschlange(v)}
                    </span>
                  ))}
                </div>
              )}
              {(selected.database_tags ?? []).length > 0 && (
                <div
                  style={{
                    fontFamily: 'var(--k-font-mono)',
                    fontSize: 'var(--k-t-xs)',
                    color: 'var(--k-ink-faint)',
                    lineHeight: 1.6,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {(selected.database_tags ?? []).join('  ')}
                </div>
              )}
            </DossierGruppe>
          )}

          {(() => {
            const at = seedExtras(selected).architecture_text;
            if (!at || (!at.overview && (at.chapters ?? []).length === 0)) return null;
            return (
              <DossierGruppe titel="Architektur-Text" testid="ref-architekturtext" anzahl={(at.chapters ?? []).length}>
                {at.headline && <div style={{ fontSize: 'var(--k-t-md)', fontWeight: 600 }}>{at.headline}</div>}
                {at.overview && (
                  <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>{at.overview}</div>
                )}
                {(at.chapters ?? []).map((k, i) => (
                  <details key={`${k.title}-${i}`} data-testid="ref-architekturtext-kapitel">
                    <summary style={{ cursor: 'pointer', fontSize: 'var(--k-t-sm)', fontWeight: 550 }}>
                      {k.title}
                      {k.review_status && (
                        <span style={{ marginLeft: 'var(--k-s2)' }}>
                          <Badge hue={reviewStatusHue[k.review_status]}>{reviewStatusLabel[k.review_status]}</Badge>
                        </span>
                      )}
                    </summary>
                    <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)', lineHeight: 1.55, paddingTop: 'var(--k-s1)' }}>
                      {k.text}
                    </div>
                  </details>
                ))}
              </DossierGruppe>
            );
          })()}

          {(selected.model_assets ?? []).length > 0 && (
            <DossierGruppe titel="3D-Modelle" testid="ref-modelle" anzahl={(selected.model_assets ?? []).length}>
              {(selected.model_assets ?? []).map((m, i) => (
                <div key={`${m.r2_key}-${i}`} style={{ display: 'grid', gap: 'var(--k-s1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s2)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--k-t-sm)', fontWeight: 550 }}>{m.title}</span>
                    <div style={{ flex: 1 }} />
                    <Badge hue={reviewStatusHue[m.review_status]}>{reviewStatusLabel[m.review_status]}</Badge>
                  </div>
                  <div style={{ fontFamily: 'var(--k-font-mono)', fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
                    {modelTypeLabel[m.model_type] ?? entschlange(m.model_type)} · {m.format.toUpperCase()} · LOD {entschlange(m.lod_level)}
                    {m.confidence_score !== undefined ? ` · Konfidenz ${Math.round(m.confidence_score * 100)}%` : ''}
                  </div>
                </div>
              ))}
            </DossierGruppe>
          )}

          {(() => {
            const quellen = seedExtras(selected).source_candidates ?? [];
            if (quellen.length === 0) return null;
            return (
              <DossierGruppe titel="Quellen-Kandidaten" testid="ref-quellen" anzahl={quellen.length}>
                {quellen.map((q, i) => (
                  <div key={`${q.title ?? 'quelle'}-${i}`} style={{ display: 'grid', gap: 2 }}>
                    <span style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>{q.title ?? 'Ohne Titel'}</span>
                    <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
                      {[q.source_type, q.reliability_level, q.rights_status].filter(Boolean).map((s) => entschlange(s!)).join(' · ')}
                    </span>
                  </div>
                ))}
              </DossierGruppe>
            );
          })()}

          {selected.database_profile && (
            <DossierGruppe titel="Datenbankprofil" testid="ref-dbprofil">
              <div style={{ fontFamily: 'var(--k-font-mono)', fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-soft)', lineHeight: 1.6 }}>
                Quellen {selected.database_profile.source_count} · Medien {selected.database_profile.media_count} · Modelle{' '}
                {selected.database_profile.model_count} · Analysen {selected.database_profile.analysis_count} · Tags{' '}
                {selected.database_profile.tag_count}
              </div>
              <div style={{ fontFamily: 'var(--k-font-mono)', fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)', overflowWrap: 'anywhere' }}>
                {selected.database_profile.r2_prefix}
              </div>
            </DossierGruppe>
          )}

          {/* ---------- K8 (v0.6.8): Gedächtnis-/Wissens-Querverweise — klickbar,
              Klick wechselt den Tab innerhalb von KosmoData. Ehrlich: das
              Lernjournal kennt keine persistierte Referenz-Kante, gezeigt wird,
              was die Referenz wörtlich nennt (Gedächtnis) bzw. was die lokale
              BM25-Suche zum Titel findet (Wissen). */}
          <DossierGruppe titel="Gedächtnis & Wissen" testid="ref-querverweise" offen>
            <div style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>Gedächtnis</div>
            {gedaechtnisLinks.length === 0 ? (
              <span data-testid="ref-gedaechtnis-leer" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
                Kein Gedächtnis-Eintrag erwähnt diese Referenz.
              </span>
            ) : (
              gedaechtnisLinks.map((g) => (
                <KButton
                  key={g.ts}
                  size="sm"
                  tone="ghost"
                  data-testid="ref-gedaechtnis-link"
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => {
                    setGedaechtnisFokus(g.ts);
                    setTab('gedaechtnis');
                    nutzungMelden('dossier:gedaechtnis-link');
                  }}
                >
                  {g.sentiment === 'gut' ? '👍' : '👎'} {kuerzeText(g.context, 90)}
                </KButton>
              ))
            )}
            <div style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)', marginTop: 'var(--k-s1)' }}>Wissen</div>
            {wissenLinks.length === 0 ? (
              <span data-testid="ref-wissen-leer" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
                Kein Wissens-Abschnitt zum Titel gefunden.
              </span>
            ) : (
              wissenLinks.map((h) => (
                <KButton
                  key={h.id}
                  size="sm"
                  tone="ghost"
                  data-testid="ref-wissen-link"
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => {
                    setWissenStartQuery(selected.title);
                    setTab('wissen');
                    nutzungMelden('dossier:wissen-link');
                  }}
                >
                  {h.docName} · Abschnitt {h.seq + 1}
                </KButton>
              ))
            )}
          </DossierGruppe>

          {/* Assets dieses Projekts (Batch 5): Rückrichtung zu KosmoAsset per kosmodata_refs. */}
          <Hairline />
          <div style={{ fontSize: 'var(--k-t-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--k-ink-faint)' }}>
            Assets dieses Projekts
          </div>
          <div data-testid="ref-assets" style={{ display: 'grid', gap: 'var(--k-s2)' }}>
            {refAssets.length === 0 && (
              <span style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>Noch keine Assets verknüpft</span>
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
              style={{ display: 'grid', gap: 'var(--k-s2)', ...(gruppeHatGehobenesElement('dossier') ? { opacity: 1 } : {}) }}
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
                  <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
                    Lädt das verknüpfte 3D-Objekt aus KosmoAsset als Kontext neben deinen Entwurf.
                  </span>
                </>
              ) : (
                <span data-testid="ref3d-kein-lokal" style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
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
    <div data-testid="kosmodata-dach" style={{ display: 'grid', gap: 'var(--k-s5)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--k-s3)' }}>
        {zahlen
          ? sammlungIds.map((s) => (
              <Panel key={s} data-testid={`dach-zahl-${s}`} style={{ padding: `var(--k-s3) var(--k-s4)`, display: 'grid', gap: 'var(--k-s2)' }}>
                <Badge hue={sammlungHue[s]}>{sammlungLabel[s]}</Badge>
                <span style={{ fontSize: 'var(--k-t-plakat)', fontWeight: 650 }}>{zahlen[s]}</span>
              </Panel>
            ))
          : <KLade text="Sammlungen laden …" height={80} />}
      </div>

      <SuchFeld
        testid="dach-suche"
        placeholder="Über alle sechs Sammlungen suchen: Referenzen, Assets, Wissen, Training, Gedächtnis, Archiv …"
        value={query}
        onChange={setQuery}
      />

      {query.trim().length >= 2 && treffer.length === 0 && (
        <Messrahmen height={140} caption="Kein Treffer über die sechs Sammlungen — Begriff lockern" />
      )}

      <div style={{ display: 'grid', gap: 'var(--k-s3)' }}>
        {treffer.map((t) => (
          <KdKarte
            key={t.id}
            pad={false}
            data-testid="dach-treffer"
            onClick={() => springeZuTreffer(t)}
            style={{ cursor: 'pointer', padding: `var(--k-s3) var(--k-s4)`, display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}
          >
            <Badge hue={sammlungHue[t.sammlung]}>{sammlungLabel[t.sammlung]}</Badge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--k-t-md)', fontWeight: 550 }}>{t.titel}</div>
              <div
                style={{
                  fontSize: 'var(--k-t-xs)',
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
          </KdKarte>
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
    <div style={{ display: 'grid', gap: 'var(--k-s5)' }}>
      {kategorien.map((kat) => (
        <div key={kat} style={{ display: 'grid', gap: 'var(--k-s3)' }}>
          <div className="k-titel" style={{ fontSize: 'var(--k-t-lg)' }}>{kat}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--k-s3)' }}>
            {bauteilkatalog
              .filter((e) => e.kategorie === kat)
              .map((e) => {
                const dicke = gesamtdicke(e.layers);
                const u = uWert(e.layers);
                const schonDa = vorhandene.has(e.name);
                const nr = bauteilkatalog.indexOf(e) + 1;
                return (
                  <Karteikarte key={e.id} nr={nr} data-testid={`bauteil-${e.id}`}>
                   <div style={{ display: 'grid', gap: 'var(--k-s3)' }}>
                    <div style={{ fontFamily: 'var(--k-font-mono)', fontWeight: 700, fontSize: 'var(--k-t-md)' }}>{e.name}</div>
                    <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>{e.beschrieb}</div>
                    {/* Schichtbalken (massstäblich) */}
                    <div style={{ display: 'flex', height: 14, borderRadius: 'var(--k-radius-md)', overflow: 'hidden', border: '1px solid var(--k-line)' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)', fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
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
        <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
          Übernommen — ab sofort im Wand-/Decken-Werkzeug (KosmoDesign) wählbar. U-Werte sind
          Richtwerte (SIA-180-vereinfacht), kein Nachweis-Ersatz.
        </div>
      )}
    </div>
  );
}

const materialArtLabel: Record<MaterialArt, string> = {
  rohmaterial: 'Rohmaterial',
  baumaterial: 'Baumaterial',
  unbekannt: 'Unbekannt',
};

const materialArtHue: Record<MaterialArt, string> = {
  rohmaterial: 'var(--k-success)',
  baumaterial: 'var(--k-info)',
  unbekannt: 'var(--k-ink-faint)',
};

const materialInputStyle: CSSProperties = {
  padding: `var(--k-s3) var(--k-s3)`,
  borderRadius: 'var(--k-radius-sm)',
  border: '1px solid var(--k-line-strong)',
  background: 'var(--k-raised)',
  fontSize: 'var(--k-t-md)',
};

/** Lesbare «L×B×D mm»-Zeile aus einer lieferbaren Grösse — nur die vorhandenen Masse. */
function formatMaterialGroesse(g: MaterialGroesse): string {
  const masse = [g.laenge_mm, g.breite_mm, g.dicke_mm].filter((v): v is number => v !== undefined);
  return `${g.bezeichnung}${masse.length ? ` — ${masse.join('×')} mm` : ''}`;
}

/** Ehrlicher Platzhalter-Ton (K21) — Materialien ohne Farbwert/Textur zeigen ihn, statt eine Farbe zu erfinden. */
const PLATZHALTER_TON = 0x9a9488;

/** Würfel-Kantenverhältnis aus einer lieferbaren Grösse (mm) — 1:1:1, wenn keine Masse hinterlegt (ehrlicher Platzhalter). */
function wuerfelKanten(groesse: MaterialGroesse | undefined): { x: number; y: number; z: number } {
  const laenge = groesse?.laenge_mm ?? 100;
  const breite = groesse?.breite_mm ?? 100;
  const dicke = groesse?.dicke_mm ?? 100;
  const max = Math.max(laenge, breite, dicke, 1);
  return { x: laenge / max, y: dicke / max, z: breite / max };
}

/**
 * 3D-Würfel-Vorschau (K21, Owner-Befund «Materialbibliothek ausbauen» Stufe 1)
 * — EIN Standbild (`three-standbild.ts`, dieselbe Infrastruktur wie
 * `AssetWorkspace.tsx`s GLB-Vorschau) mit den echten lieferbaren Massen und,
 * wo ein Materialkatalog-Schlüssel vorliegt, den prozeduralen PBR-Maps aus
 * `modules/design/texturen.ts` (C2 — Wiederverwendung, keine zweite
 * Textur-Erzeugung). Ohne Schlüssel/Textur: ehrlicher Platzhalter-Ton, keine
 * erfundene Farbe.
 */
function MaterialWuerfel({
  groesse,
  farbe,
  rauheit,
  metallisch,
  materialKey,
}: {
  groesse?: MaterialGroesse;
  farbe?: number;
  rauheit?: number;
  metallisch?: number;
  materialKey?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    let verworfen = false;
    void (async () => {
      try {
        if (!ref.current) return;
        await renderStandbild(ref.current, 130, async ({ THREE, scene, breite, hoehe }) => {
          const kanten = wuerfelKanten(groesse);
          const geo = new THREE.BoxGeometry(kanten.x, kanten.y, kanten.z);
          const karten = materialKey ? (await import('../design/texturen')).materialKarten(materialKey) : null;
          const basis = {
            roughness: rauheit ?? 0.85,
            ...(metallisch !== undefined ? { metalness: metallisch } : {}),
          };
          const mat = karten
            ? new THREE.MeshStandardMaterial({ map: karten.map, bumpMap: karten.bumpMap, bumpScale: karten.bumpScale, ...basis })
            : new THREE.MeshStandardMaterial({ color: farbe ?? PLATZHALTER_TON, ...basis });
          scene.add(new THREE.Mesh(geo, mat));
          const camera = new THREE.PerspectiveCamera(35, breite / hoehe, 0.01, 10);
          camera.position.set(1.1, 0.85, 1.1);
          camera.lookAt(0, 0, 0);
          return camera;
        });
      } catch {
        if (!verworfen) setFehler(true);
      }
    })();
    return () => {
      verworfen = true;
    };
  }, [groesse, farbe, rauheit, metallisch, materialKey]);

  if (fehler) return <Messrahmen height={130} caption="Würfel nicht darstellbar" />;
  return (
    <canvas
      ref={ref}
      data-testid="material-wuerfel"
      style={{ width: '100%', height: 130, border: '1px solid var(--k-line)', background: 'var(--k-plan-paper)' }}
    />
  );
}

/**
 * Materialkatalog (Q14) — ein Schlüssel: PBR fürs 3D, SIA-Schraffur, Lambda.
 *
 * v0.6.3 / B4 (Owner-Befund K21, Materialbibliothek Stufe 1): Rohmaterial-/
 * Baumaterial-Filter + Badges, ein Detail mit 3D-Würfel-Vorschau (echte Masse,
 * wo hinterlegt) und «+ Material erfassen» für eigene Einträge — Quelle ist
 * dort Pflicht (`erfasseMaterial` in `state/asset-bibliothek.ts` erzwingt es).
 * Stufe 2 (externer Quellen-Ingest, Lizenzprüfung, echte 4k/8k-Fotomaps,
 * HSLU-Materialdatenbank) bleibt offen.
 */
export function MaterialkatalogView() {
  const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
  const [filter, setFilter] = useState<MaterialArt | 'alle'>('alle');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [erfasst, setErfasst] = useState<KosmoAsset[] | null>(null);
  const [selectedErfasstId, setSelectedErfasstId] = useState<string | null>(null);
  const [formOffen, setFormOffen] = useState(false);
  const [formTitel, setFormTitel] = useState('');
  const [formQuelle, setFormQuelle] = useState('');
  const [formArt, setFormArt] = useState<MaterialArt | ''>('');
  const [formRegion, setFormRegion] = useState('');
  const [formLaenge, setFormLaenge] = useState('');
  const [formBreite, setFormBreite] = useState('');
  const [formDicke, setFormDicke] = useState('');

  const ladeErfasst = () => {
    void listeMaterialien()
      .then(setErfasst)
      .catch((err) => {
        setErfasst([]);
        meldeFehler(err);
      });
  };
  useEffect(ladeErfasst, []);

  const gefiltert = filter === 'alle' ? materialkatalog : materialkatalog.filter((m) => m.materialArt === filter);
  const selected: MaterialEintrag | null = materialkatalog.find((m) => m.key === selectedKey) ?? null;
  const selectedErfasst = erfasst?.find((m) => m.id === selectedErfasstId) ?? null;

  async function materialAbsenden() {
    if (!formQuelle.trim()) {
      meldeFehler('Quelle ist Pflicht — Herkunft des Materials angeben, bevor gespeichert wird.');
      return;
    }
    const laenge = formLaenge.trim() ? Number(formLaenge) : undefined;
    const breite = formBreite.trim() ? Number(formBreite) : undefined;
    const dicke = formDicke.trim() ? Number(formDicke) : undefined;
    const hatMasse = laenge !== undefined || breite !== undefined || dicke !== undefined;
    try {
      const material = await erfasseMaterial({
        title: formTitel,
        quelle: formQuelle,
        ...(formArt ? { materialArt: formArt } : {}),
        ...(formRegion.trim() ? { region: formRegion.trim() } : {}),
        ...(hatMasse
          ? {
              materialDimensionen: {
                lieferbar: [
                  {
                    bezeichnung: 'Erfasst',
                    ...(laenge !== undefined ? { laenge_mm: laenge } : {}),
                    ...(breite !== undefined ? { breite_mm: breite } : {}),
                    ...(dicke !== undefined ? { dicke_mm: dicke } : {}),
                  },
                ],
              },
            }
          : {}),
      });
      ladeErfasst();
      setSelectedErfasstId(material.id);
      setFormOffen(false);
      setFormTitel('');
      setFormQuelle('');
      setFormArt('');
      setFormRegion('');
      setFormLaenge('');
      setFormBreite('');
      setFormDicke('');
      melde(`«${material.title}» erfasst`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  }

  async function materialLoeschen(m: KosmoAsset) {
    const ok = await bestaetigen({ titel: `Material «${m.title}» löschen?`, gefaehrlich: true, bestaetigen: 'Löschen' });
    if (!ok) return;
    await loescheGlb(m.id);
    if (selectedErfasstId === m.id) setSelectedErfasstId(null);
    ladeErfasst();
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--k-s5)' }}>
      <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)', lineHeight: 1.5, maxWidth: '70ch' }}>
        Referenzkatalog (fest) — dieselben Schlüssel tragen die Aufbauten des Bauteilkatalogs:
        3D-Farbe, Plan-Schraffur und U-Wert kommen aus einer Quelle. Der 3D-Würfel zeigt die
        lieferbare Grösse, wo bekannt, sonst ehrlich einen Platzhalter-Würfel 1:1:1. «Quelle
        unbelegt (Altbestand)», weil die Herkunft der ursprünglichen Werte nie dokumentiert
        wurde. Eigene Einträge unten verlangen die Quelle immer (Owner-Befund K21).
      </div>

      <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap' }}>
        {(['alle', 'baumaterial', 'rohmaterial', 'unbekannt'] as const).map((f) => (
          <KButton
            key={f}
            size="sm"
            tone={filter === f ? 'accent' : 'quiet'}
            data-testid={`material-filter-${f}`}
            onClick={() => setFilter(f)}
          >
            {f === 'alle' ? 'Alle' : materialArtLabel[f]} ·{' '}
            {f === 'alle' ? materialkatalog.length : materialkatalog.filter((m) => m.materialArt === f).length}
          </KButton>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 'var(--k-s3)' }}>
        {gefiltert.map((m) => (
          <KdKarte
            key={m.key}
            data-testid={`material-${m.key}`}
            aktiv={selectedKey === m.key}
            onClick={() => setSelectedKey(selectedKey === m.key ? null : m.key)}
            style={{
              padding: `var(--k-s3) var(--k-s4)`,
              display: 'grid',
              gap: 'var(--k-s2)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', gap: 'var(--k-s3)', alignItems: 'center' }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 'var(--k-radius-lg)',
                  background: `linear-gradient(135deg, ${hex(m.pbr.color)}, color-mix(in srgb, ${hex(m.pbr.color)} ${Math.round((1 - m.pbr.roughness) * 60 + 40)}%, white))`,
                  border: '1px solid var(--k-line-strong)',
                  flexShrink: 0,
                }}
                title={`Rauheit ${m.pbr.roughness}${m.pbr.metalness ? ` · Metall ${m.pbr.metalness}` : ''}`}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 550, fontSize: 'var(--k-t-md)' }}>{m.name}</div>
                <div style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
                  Schraffur: {m.sia}
                  {m.lambda !== undefined ? ` · λ ${m.lambda}` : ''}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)', lineHeight: 1.45 }}>{m.beschrieb}</div>
            <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap' }}>
              <Badge hue={materialArtHue[m.materialArt]}>{materialArtLabel[m.materialArt]}</Badge>
              {m.region && <Badge hue="var(--k-ink-faint)">{m.region}</Badge>}
            </div>
          </KdKarte>
        ))}
      </div>

      {selected && (
        <Panel data-testid="material-detail" style={{ padding: 'var(--k-s5)', display: 'grid', gap: 'var(--k-s3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--k-t-lg)' }}>{selected.name}</span>
            <div style={{ flex: 1 }} />
            <KButton size="sm" tone="ghost" onClick={() => setSelectedKey(null)}>
              ×
            </KButton>
          </div>
          <MaterialWuerfel
            {...(selected.dimensionen?.lieferbar[0] !== undefined ? { groesse: selected.dimensionen.lieferbar[0] } : {})}
            farbe={selected.pbr.color}
            rauheit={selected.pbr.roughness}
            {...(selected.pbr.metalness !== undefined ? { metallisch: selected.pbr.metalness } : {})}
            materialKey={selected.key}
          />
          <div data-testid="material-detail-quelle" style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>
            Quelle: {selected.quelle}
          </div>
          <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap' }}>
            <Badge hue={materialArtHue[selected.materialArt]}>{materialArtLabel[selected.materialArt]}</Badge>
            {selected.region && <Badge hue="var(--k-ink-faint)">{selected.region}</Badge>}
          </div>
          {selected.dimensionen ? (
            <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
              Lieferbar: {selected.dimensionen.lieferbar.map(formatMaterialGroesse).join(' · ')}
              {selected.dimensionen.hinweis && <div>{selected.dimensionen.hinweis}</div>}
            </div>
          ) : (
            <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
              Keine lieferbare Grösse hinterlegt — Würfel zeigt den Platzhalter 1:1:1.
            </div>
          )}
        </Panel>
      )}

      <Hairline />

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}>
        <span className="k-titel" style={{ fontSize: 'var(--k-t-lg)' }}>
          Eigene Materialien
        </span>
        <div style={{ flex: 1 }} />
        <KButton
          size="sm"
          tone={formOffen ? 'accent' : 'quiet'}
          data-testid="material-erfassen-oeffnen"
          onClick={() => setFormOffen(!formOffen)}
        >
          {formOffen ? 'Formular schliessen' : '+ Material erfassen'}
        </KButton>
      </div>

      {formOffen && (
        <Panel data-testid="material-erfassen-formular" style={{ padding: 'var(--k-s5)', display: 'grid', gap: 'var(--k-s3)', maxWidth: 480 }}>
          <input
            data-testid="material-titel"
            placeholder="Titel"
            value={formTitel}
            onChange={(e) => setFormTitel(e.target.value)}
            style={materialInputStyle}
          />
          <input
            data-testid="material-quelle"
            placeholder="Quelle (Pflicht) — Lieferant, Katalog, Foto-Datum …"
            value={formQuelle}
            onChange={(e) => setFormQuelle(e.target.value)}
            style={materialInputStyle}
          />
          <div style={{ display: 'flex', gap: 'var(--k-s3)', flexWrap: 'wrap' }}>
            <KSelect
              data-testid="material-art"
              value={formArt}
              onChange={(e) => setFormArt(e.target.value as MaterialArt | '')}
              style={{ flex: 1 }}
            >
              <option value="">Materialart (optional)</option>
              <option value="rohmaterial">Rohmaterial</option>
              <option value="baumaterial">Baumaterial</option>
              <option value="unbekannt">Unbekannt</option>
            </KSelect>
            <input
              data-testid="material-region"
              placeholder="Region (optional)"
              value={formRegion}
              onChange={(e) => setFormRegion(e.target.value)}
              style={{ ...materialInputStyle, flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--k-s3)' }}>
            <input
              data-testid="material-laenge"
              placeholder="Länge mm"
              type="number"
              value={formLaenge}
              onChange={(e) => setFormLaenge(e.target.value)}
              style={{ ...materialInputStyle, flex: 1 }}
            />
            <input
              data-testid="material-breite"
              placeholder="Breite mm"
              type="number"
              value={formBreite}
              onChange={(e) => setFormBreite(e.target.value)}
              style={{ ...materialInputStyle, flex: 1 }}
            />
            <input
              data-testid="material-dicke"
              placeholder="Dicke mm"
              type="number"
              value={formDicke}
              onChange={(e) => setFormDicke(e.target.value)}
              style={{ ...materialInputStyle, flex: 1 }}
            />
          </div>
          <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
            Masse optional — nur wenn bekannt. Die Textur/PBR-Map selbst ist Stufe 2 (externer
            Quellen-Ingest, Lizenzprüfung); der Würfel zeigt bis dahin einen ehrlichen
            Platzhalter-Ton.
          </span>
          <KButton size="sm" tone="accent" data-testid="material-erfassen-speichern" onClick={() => void materialAbsenden()}>
            Speichern
          </KButton>
        </Panel>
      )}

      {erfasst === null && <KLade text="Eigene Materialien laden …" height={80} />}
      {erfasst !== null && erfasst.length === 0 && (
        <span style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
          Noch keine eigenen Materialien — «+ Material erfassen» legt den ersten an.
        </span>
      )}
      {erfasst !== null && erfasst.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 'var(--k-s3)' }}>
          {erfasst.map((m) => (
            <KdKarte
              key={m.id}
              data-testid={`material-erfasst-${m.id}`}
              aktiv={selectedErfasstId === m.id}
              onClick={() => setSelectedErfasstId(selectedErfasstId === m.id ? null : m.id)}
              style={{
                padding: `var(--k-s3) var(--k-s4)`,
                display: 'grid',
                gap: 'var(--k-s2)',
                cursor: 'pointer',
              }}
            >
              {/* K21/W4: eigene Einträge tragen keine Textur/Farbe (Stufe 2) —
                  ehrliches Signet statt Fake-Swatch. */}
              <DataLeerbild typ="material" style={{ justifyItems: 'start', justifyContent: 'start' }} />
              <div style={{ fontWeight: 550, fontSize: 'var(--k-t-md)', overflowWrap: 'anywhere' }}>{m.title}</div>
              <div style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)', overflowWrap: 'anywhere' }}>Quelle: {m.quelle}</div>
              <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap' }}>
                {m.materialArt && <Badge hue={materialArtHue[m.materialArt]}>{materialArtLabel[m.materialArt]}</Badge>}
                {m.region && <Badge hue="var(--k-ink-faint)">{m.region}</Badge>}
              </div>
            </KdKarte>
          ))}
        </div>
      )}

      {selectedErfasst && (
        <Panel data-testid="material-erfasst-detail" style={{ padding: 'var(--k-s5)', display: 'grid', gap: 'var(--k-s3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--k-t-lg)', overflowWrap: 'anywhere' }}>{selectedErfasst.title}</span>
            <div style={{ flex: 1 }} />
            <KButton size="sm" tone="ghost" onClick={() => void materialLoeschen(selectedErfasst)}>
              Löschen
            </KButton>
          </div>
          <MaterialWuerfel
            {...(selectedErfasst.materialDimensionen?.lieferbar[0] !== undefined
              ? { groesse: selectedErfasst.materialDimensionen.lieferbar[0] }
              : {})}
          />
          <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>Quelle: {selectedErfasst.quelle}</div>
          <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap' }}>
            {selectedErfasst.materialArt && (
              <Badge hue={materialArtHue[selectedErfasst.materialArt]}>{materialArtLabel[selectedErfasst.materialArt]}</Badge>
            )}
            {selectedErfasst.region && <Badge hue="var(--k-ink-faint)">{selectedErfasst.region}</Badge>}
          </div>
          {selectedErfasst.materialDimensionen ? (
            <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
              Lieferbar: {selectedErfasst.materialDimensionen.lieferbar.map(formatMaterialGroesse).join(' · ')}
            </div>
          ) : (
            <div style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
              Keine lieferbare Grösse hinterlegt — Würfel zeigt den Platzhalter 1:1:1.
            </div>
          )}
        </Panel>
      )}
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
export function KosmoWissenView({ startQuery }: { startQuery?: string } = {}) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [basis, setBasis] = useState<BasisSammlung[]>([]);
  const [geladeneBasis, setGeladeneBasis] = useState<Set<string>>(new Set());
  const [ladeBasis, setLadeBasis] = useState<string | null>(null);
  const [geladen, setGeladen] = useState(false);
  // K8: ein Querverweis aus dem Referenz-Dossier belegt die Suche vor —
  // die View wird beim Tab-Wechsel frisch gemountet, der Initialwert reicht.
  const [query, setQuery] = useState(startQuery ?? '');
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
    <div data-testid="kosmodata-wissen" style={{ display: 'grid', gap: 'var(--k-s5)' }}>
      <SuchFeld
        testid="wissen-search"
        placeholder="Wissensbasis durchsuchen … (z.B. «Brandschutz Treppenhaus»)"
        value={query}
        onChange={setQuery}
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
        <div style={{ display: 'grid', gap: 'var(--k-s3)' }}>
          {hits.length === 0 && (
            <Messrahmen height={140} caption="Kein Treffer in der Wissensbasis — Begriff lockern" />
          )}
          {hits.map((h) => (
            <Panel key={h.id} data-testid="wissen-hit" style={{ padding: `var(--k-s3) var(--k-s4)`, display: 'grid', gap: 'var(--k-s2)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--k-s3)' }}>
                <span style={{ fontSize: 'var(--k-t-sm)', fontWeight: 550 }}>
                  {h.docName} · Abschnitt {h.seq + 1}
                </span>
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
                  {h.score.toFixed(2)}
                </span>
              </div>
              <div style={{ fontSize: 'var(--k-t-md)', lineHeight: 1.5, color: 'var(--k-ink-soft)' }}>
                {h.text.length > 220 ? `${h.text.slice(0, 220)} …` : h.text}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <>
          {docs.length > 0 && (
            <div style={{ display: 'grid', gap: 'var(--k-s3)' }}>
              <div className="k-titel" style={{ fontSize: 'var(--k-t-lg)' }}>Dokumente ({docs.length})</div>
              {docs.map((d) => {
                const oeffentlich = (d.visibility ?? 'private') === 'public';
                return (
                  <Panel
                    key={d.id}
                    data-testid="wissen-doc"
                    style={{ padding: `var(--k-s3) var(--k-s4)`, display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 550,
                          fontSize: 'var(--k-t-md)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {d.name}
                      </div>
                      <div style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)', display: 'flex', gap: 'var(--k-s2)', alignItems: 'center', flexWrap: 'wrap' }}>
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
            <div style={{ display: 'grid', gap: 'var(--k-s3)' }} data-testid="wissen-basis">
              <div className="k-titel" style={{ fontSize: 'var(--k-t-lg)' }}>Bauwissen-Basis (Kosmos-Bibliothek)</div>
              {basis.map((sa) => (
                <Panel
                  key={sa.sammlung}
                  style={{ padding: `var(--k-s3) var(--k-s4)`, display: 'flex', alignItems: 'center', gap: 'var(--k-s4)' }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 550, fontSize: 'var(--k-t-md)' }}>{sa.label}</div>
                    <div style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
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
    <div data-testid="kosmodata-training" style={{ display: 'grid', gap: 'var(--k-s5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--k-ink-soft)', fontSize: 'var(--k-t-md)' }}>
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
          <Panel data-testid="training-achse-architektur" style={{ padding: `var(--k-s4) var(--k-s5)`, display: 'grid', gap: 'var(--k-s3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}>
              <Badge hue={moduleHue.train}>Architektur — Bürostil &amp; Fachwissen</Badge>
              <Measure>{architektur.length}</Measure>
              <div style={{ flex: 1 }} />
              <KButton size="sm" tone="ghost" onClick={oeffneKosmoTrain}>
                Zur KosmoTrain-Station
              </KButton>
            </div>
            {architektur.length === 0 ? (
              <span style={{ fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-faint)' }}>
                Unter Kosmo-Antworten mit 👍/👎 + Notiz sammelst du Architektur-Training — in der
                KosmoTrain-Station kuratierst du die Notizen (sie sind der Trainings-Kern).
              </span>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--k-s2)' }}>
                {architektur.slice(0, 8).map((b) => (
                  <div key={b.id} data-testid="training-beispiel" style={{ fontSize: 'var(--k-t-sm)', display: 'grid', gap: 'var(--k-s1)' }}>
                    <div style={{ fontWeight: 550 }}>{kuerzeText(b.frage, 100)}</div>
                    <div style={{ color: 'var(--k-ink-soft)' }}>{kuerzeText(b.antwort)}</div>
                  </div>
                ))}
                {architektur.length > 8 && (
                  <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
                    … und {architektur.length - 8} weitere
                  </span>
                )}
              </div>
            )}
          </Panel>

          <Panel data-testid="training-achse-software" style={{ padding: `var(--k-s4) var(--k-s5)`, display: 'grid', gap: 'var(--k-s3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}>
              <Badge hue={moduleHue.data}>Software — KosmoOrbit selbst</Badge>
              <Measure>
                {commandsCount} Commands · {dokuCount} Doku
              </Measure>
            </div>
            <div style={{ display: 'grid', gap: 'var(--k-s2)' }}>
              {software.slice(0, 8).map((b) => (
                <div key={b.id} data-testid="training-beispiel" style={{ fontSize: 'var(--k-t-sm)', display: 'grid', gap: 'var(--k-s1)' }}>
                  <div style={{ fontWeight: 550 }}>{kuerzeText(b.frage, 100)}</div>
                  <div style={{ color: 'var(--k-ink-soft)' }}>{kuerzeText(b.antwort)}</div>
                </div>
              ))}
              {software.length > 8 && (
                <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
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
export function KosmoGedaechtnisView({ fokusTs }: { fokusTs?: string } = {}) {
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

  // K8: kommt die View über einen Dossier-Querverweis, springt sie zum
  // verwiesenen Eintrag (der zusätzlich markiert ist, s. unten).
  useEffect(() => {
    if (!fokusTs || !geladen) return;
    document
      .querySelector(`[data-gedaechtnis-ts="${CSS.escape(fokusTs)}"]`)
      ?.scrollIntoView({ block: 'center' });
  }, [fokusTs, geladen]);

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
    gut: 'Gut',
    schlecht: 'Schlecht',
  };
  const sentimentIcon: Partial<Record<GedaechtnisSentimentFilter, 'daumen-hoch' | 'daumen-runter'>> = {
    gut: 'daumen-hoch',
    schlecht: 'daumen-runter',
  };
  const kurationLabel: Record<GedaechtnisKurationFilter, string> = {
    alle: 'Alle',
    roh: 'Roh',
    kuratiert: 'Kuratiert',
  };

  return (
    <div data-testid="kosmodata-gedaechtnis" style={{ display: 'grid', gap: 'var(--k-s5)' }}>
      <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['alle', 'gut', 'schlecht'] as const).map((f) => (
          <KButton
            key={f}
            size="sm"
            tone={sentimentFilter === f ? 'accent' : 'quiet'}
            data-testid={`gedaechtnis-filter-sentiment-${f}`}
            onClick={() => setSentimentFilter(f)}
          >
            {sentimentIcon[f] && <KIcon name={sentimentIcon[f]!} size={14} />}
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

      <div style={{ display: 'grid', gap: 'var(--k-s3)' }}>
        {zeilen.map((e) => {
          const kuratiert = istTraining(e);
          const oeffentlich = (e.visibility ?? 'private') === 'public';
          const wirdBefoerdert = befoerdern === e.ts;
          const treffer = wissenTreffer[e.ts];
          const fokussiert = fokusTs === e.ts;
          return (
            <Panel
              key={e.ts}
              data-testid="gedaechtnis-eintrag"
              data-gedaechtnis-ts={e.ts}
              style={{
                padding: `var(--k-s3) var(--k-s4)`,
                display: 'grid',
                gap: 'var(--k-s2)',
                ...(fokussiert ? { borderColor: 'var(--k-accent)' } : {}),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)', flexWrap: 'wrap' }}>
                <Badge hue={e.sentiment === 'gut' ? 'var(--k-success)' : 'var(--k-warning)'}>
                  {e.sentiment === 'gut' ? '👍 BEIBEHALTEN' : '👎 VERMEIDEN'}
                </Badge>
                {fokussiert && (
                  <span data-testid="gedaechtnis-fokus">
                    <Badge hue={moduleHue.data}>Querverweis aus Referenz</Badge>
                  </span>
                )}
                <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
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

              <div style={{ fontSize: 'var(--k-t-md)', color: 'var(--k-ink-soft)', lineHeight: 1.45 }}>{kuerzeText(e.context, 180)}</div>
              {e.note && (
                <div style={{ fontSize: 'var(--k-t-sm)', fontStyle: 'italic', color: 'var(--k-ink-faint)' }}>Notiz: {kuerzeText(e.note, 160)}</div>
              )}

              <div style={{ display: 'flex', gap: 'var(--k-s2)', flexWrap: 'wrap', alignItems: 'center' }}>
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
                        padding: `var(--k-s2) var(--k-s3)`,
                        borderRadius: 'var(--k-radius-sm)',
                        border: '1px solid var(--k-line)',
                        background: 'var(--k-surface)',
                        fontSize: 'var(--k-t-sm)',
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
                <div data-testid="gedaechtnis-wissen-treffer" style={{ display: 'grid', gap: 'var(--k-s2)' }}>
                  {ladeWissen === e.ts && (
                    <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>Suche …</span>
                  )}
                  {treffer && treffer.length === 0 && (
                    <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>Kein verwandtes Wissen gefunden</span>
                  )}
                  {treffer?.map((h) => (
                    <span key={h.id} style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-soft)' }}>
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
  padding: `var(--k-s3) var(--k-s3)`,
  borderRadius: 'var(--k-radius-sm)',
  border: '1px solid var(--k-line-strong)',
  background: 'var(--k-surface)',
  fontSize: 'var(--k-t-md)',
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
    <div data-testid="kosmodata-archiv" style={{ display: 'grid', gap: 'var(--k-s5)' }}>
      <div
        data-testid="archiv-hinweis"
        style={{
          fontSize: 'var(--k-t-sm)',
          color: 'var(--k-ink-soft)',
          lineHeight: 1.5,
          padding: `var(--k-s3) var(--k-s4)`,
          borderRadius: 'var(--k-radius-sm)',
          border: '1px solid var(--k-line)',
          background: 'var(--k-raised)',
        }}
      >
        Lokal &amp; privat — nie in die Website. Grosse Bestände bleiben auf der HDD; KosmoOrbit
        führt nur das Verzeichnis (Manifest). Voll-Indexieren der HDD folgt über die HomeStation.
      </div>

      <Panel data-testid="archiv-form" style={{ padding: `var(--k-s4) var(--k-s5)`, display: 'grid', gap: 'var(--k-s3)' }}>
        <div className="k-titel" style={{ fontSize: 'var(--k-t-lg)' }}>Bestand manuell erfassen</div>
        <div style={{ display: 'flex', gap: 'var(--k-s3)', flexWrap: 'wrap' }}>
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
          <KSelect
            data-testid="archiv-feld-kategorie"
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value as ArchivKategorie)}
          >
            {ARCHIV_KATEGORIEN.map((k) => (
              <option key={k} value={k}>
                {archivKategorieLabel[k]}
              </option>
            ))}
          </KSelect>
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
        <div style={{ display: 'flex', gap: 'var(--k-s3)', alignItems: 'center', flexWrap: 'wrap' }}>
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
            <span style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)' }}>
              Ordner-Auswahl braucht einen Chromium-Browser (Desktop/iPad-App)
            </span>
          )}
        </div>
      </Panel>

      <SuchFeld
        testid="archiv-search"
        placeholder="Archiv durchsuchen: Name, Pfad, Kategorie, Notiz …"
        value={query}
        onChange={setQuery}
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

      <div style={{ display: 'grid', gap: 'var(--k-s3)' }}>
        {gefiltert.map((e) => (
          <Panel key={e.id} data-testid="archiv-eintrag" style={{ padding: `var(--k-s3) var(--k-s4)`, display: 'grid', gap: 'var(--k-s2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 550, fontSize: 'var(--k-t-md)' }}>{e.name}</span>
              <Badge hue={moduleHue.doc}>{archivKategorieLabel[e.kategorie]}</Badge>
              <Badge hue={e.quelle === 'ordner' ? moduleHue.asset : 'var(--k-ink-faint)'}>
                {archivQuelleLabel[e.quelle]}
              </Badge>
              <div style={{ flex: 1 }} />
              <KButton size="sm" tone="ghost" data-testid="archiv-entfernen" onClick={() => void entfernen(e)}>
                Entfernen
              </KButton>
            </div>
            <div style={{ fontFamily: 'var(--k-font-mono)', fontSize: 'var(--k-t-sm)', color: 'var(--k-ink-soft)' }}>{e.pfad}</div>
            <div style={{ fontSize: 'var(--k-t-xs)', color: 'var(--k-ink-faint)', display: 'flex', gap: 'var(--k-s3)', flexWrap: 'wrap' }}>
              <span>{formatGroesse(e.groesseBytes)}</span>
              {e.dateien !== undefined && (
                <span>
                  {e.dateien} {e.dateien === 1 ? 'Datei' : 'Dateien'}
                </span>
              )}
            </div>
            {e.notiz && <div style={{ fontSize: 'var(--k-t-sm)', fontStyle: 'italic', color: 'var(--k-ink-faint)' }}>{e.notiz}</div>}
          </Panel>
        ))}
      </div>
    </div>
  );
}
