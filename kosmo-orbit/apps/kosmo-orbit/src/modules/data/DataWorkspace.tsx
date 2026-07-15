import { useEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import {
  Badge,
  bestaetigen,
  Hairline,
  Karteikarte,
  KButton,
  KChip,
  KIcon,
  KInput,
  KKeyValue,
  KLade,
  KSelect,
  KTabs,
  melde,
  meldeFehler,
  Measure,
  Messrahmen,
  moduleHue,
} from '@kosmo/ui';
import './data.css';
import { DataLeerbild } from './DataLeerbild';
import { RefHeroBild } from './RefHeroBild';
import { gedaechtnisQuerverweise, type GedaechtnisTreffer } from './data-runtime';
import { epocheVonEntry } from './epochen';
import { QuellenListe } from './QuellenListe';
import { ReferenzTabelle } from './ReferenzTabelle';
import {
  bauteilkatalog,
  gesamtdicke,
  ladeReferenzenLive,
  materialkatalog,
  modellUrlAusR2Key,
  uWert,
  type KatalogEintrag,
  type MaterialArt,
  type MaterialEintrag,
  type MaterialGroesse,
  type RefEntry,
  type RefEntryAnalysisLayer,
  type RefEntryMedia,
  type RefEntryMediaType,
  type RefEntryModelAsset,
  type RefReviewStatus,
} from '@kosmo/data';
import { useProject } from '../../state/project-store';
import { setGlbContext, subscribeGlbStatus } from '../design/Viewport3D';
import { erfasseMaterial, listeGlb, listeMaterialien, loescheGlb, type KosmoAsset } from '../../state/asset-bibliothek';
import { pruefeGlbHeader } from '../../state/glb-guard';
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
    <div className="kd-media-thumb">
      <span className="kd-media-thumb-label">
        {mediaTypeLabel[media.type]}
        {!media.url && ' · gesperrt'}
      </span>
      {media.url && (
        <img
          src={media.url}
          alt={media.label}
          loading="lazy"
          className="kd-media-thumb-img"
          onError={(ev) => ((ev.target as HTMLImageElement).style.display = 'none')}
        />
      )}
      {media.credit && (
        <span className="kd-media-thumb-credit">
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
        <summary className="kd-label kd-label--klick">
          {titel}
          {anzahl !== undefined && (
            <span className="kd-mono kd-ml-s2">{anzahl}</span>
          )}
        </summary>
        <div className="kd-grid kd-g2 kd-pt-s2">{children}</div>
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
 * KdKarte (W4, UI-KONZEPT-065 §2 «Hierarchie-Rezept»; v0.8.0B/W6: Panel-
 * Anatomie als `.kd-panel`-Klasse statt der `Panel`-Komponente — Fläche/Rand
 * laufen jetzt vollständig über Klassen, `Panel` selbst bleibt in kosmo-ui
 * unangetastet). Ruhe = 1px `--k-line` auf `--k-raised`; Hover = 1px
 * `--k-line-strong`; gewählt/aktiv = RUNDER Eck-Punkt (Gesetz 5, ersetzt die
 * frühere 6×6-Box) STATT outline — nie beides gleichzeitig (§2, Rahmen-Regel).
 */
function KdKarte({
  aktiv = false,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { 'data-testid'?: string; aktiv?: boolean; children?: ReactNode }) {
  const [hover, setHover] = useState(false);
  // MOTION-KONZEPT-066 §3 (.k-druck-Rollout Data): JEDE Verwendung von
  // `KdKarte` in dieser Datei trägt bereits ein `onClick` (Referenz-/
  // Material-/Dach-Karten) — die Karte selbst ist also immer echt klickbar,
  // nie Fake-Affordance. Darum hier zentral, statt an jedem Aufrufort.
  const klassen = ['k-druck', 'kd-panel', 'kd-karte', aktiv || hover ? 'kd-karte--hover' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div {...rest} className={klassen} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {children}
      {aktiv && <span aria-hidden className="kd-karte-eck" />}
    </div>
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
    <div className="kd-rel kd-flex kd-items-center">
      <KIcon
        name="lupe"
        size={14}
        className="kd-abs kd-left-s3 kd-c-faint kd-pe-none"
      />
      <KInput
        data-testid={testid}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="kd-pl-s6 kd-w-full"
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
  // v0.7.6 Welle 2 Stream D: neue Facetten der Datenstationen-Tabelle
  // (linke Spalte, `QuellenListe.tsx`) — Epoche aus `year_start` abgeleitet
  // (`epochen.ts`), Quelle aus dem echten `source_quality`-Feld gezählt
  // (`ref-ableitung.ts`). Kombinieren sich UND-verknüpft mit Suche/Sektor.
  const [epoche, setEpoche] = useState<string | null>(null);
  const [quelleFacet, setQuelleFacet] = useState<string | null>(null);
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

  // K8 (v0.6.8, erweitert v0.6.9 Stream B «Wissen antwortet»):
  // Gedächtnis-/Wissens-Querverweise im Dossier. `gedaechtnisQuerverweise`
  // (data-runtime.ts) nutzt jetzt zuerst die persistierte Referenz-Kante
  // (`Learning.refId`), Text-Match bleibt der Fallback für Alteinträge —
  // beide Arten sind im UI ehrlich unterscheidbar (`GedaechtnisTreffer.
  // matchArt`). Klick wechselt den Tab INNERHALB von KosmoData und übergibt
  // Fokus (Gedächtnis) bzw. Startsuche (Wissen) an die Ziel-Ansicht.
  const journal = useMemo(() => new LearningJournal(journalStore()), []);
  const [gedaechtnisLinks, setGedaechtnisLinks] = useState<GedaechtnisTreffer[]>([]);
  const [wissenLinks, setWissenLinks] = useState<KnowledgeHit[]>([]);
  const [gedaechtnisFokus, setGedaechtnisFokus] = useState<string | null>(null);
  const [wissenStartQuery, setWissenStartQuery] = useState('');
  const aktualisiereGedaechtnisLinks = () => {
    if (!selected) {
      setGedaechtnisLinks([]);
      return;
    }
    try {
      journal.reload();
      setGedaechtnisLinks(gedaechtnisQuerverweise(journal.all, selected));
    } catch {
      setGedaechtnisLinks([]);
    }
  };
  useEffect(() => {
    if (!selected) {
      setGedaechtnisLinks([]);
      setWissenLinks([]);
      return;
    }
    let verworfen = false;
    aktualisiereGedaechtnisLinks();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, journal]);

  // v0.6.9 (Stream B): die 👍/👎-Feedbackstelle im Referenz-Kontext — schreibt
  // die aktive Referenz-Id (`refId`) ins Lernjournal mit, statt sich auf
  // Text-Match zu verlassen (`gedaechtnisQuerverweise` nutzt refId-Treffer
  // zuerst). Additiver Journal-Schreibpfad, unabhängig vom Chat-Feedback.
  function feedbackZurReferenz(sentiment: 'gut' | 'schlecht') {
    if (!selected) return;
    journal.add({
      sentiment,
      context: `Referenz «${selected.title}» im Dossier als ${sentiment === 'gut' ? 'passend' : 'nicht passend'} bewertet`,
      refId: selected.id,
    });
    aktualisiereGedaechtnisLinks();
    nutzungMelden('dossier:referenz-feedback');
  }

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
  // der Remote-Kaskade unten; Ladezustand am Knopf.
  const ref3dQuelle = useMemo(
    () => (selected ? lokaleRef3dQuelle(selected.id, refAssets) : undefined),
    [selected, refAssets],
  );
  // E4 (docs/V071-KONZEPT.md): fehlt ein lokales Asset, aber der Referenz-
  // Eintrag trägt ein model_asset mit r2_key, ist ein Remote-Ladeversuch
  // möglich (r2_key → modellUrlAusR2Key → fetch → Blob). NUR r2_key wird
  // gelesen — keine url/local_path-Felder (Leak-Gates unberührt).
  const remoteRef3dAsset: RefEntryModelAsset | undefined = useMemo(
    () => (selected && !ref3dQuelle ? selected.model_assets?.find((m) => !!m.r2_key) : undefined),
    [selected, ref3dQuelle],
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

  // E4: Remote-Fallback — holt die Bytes selbst (fetch), prüft sie durch
  // denselben GLB-Guard wie der lokale Datei-Import (`pruefeGlbHeader`,
  // AssetWorkspace.tsx, Serie I/B7 — Header/Grösse, kein State-Write bei
  // Fehlern), dann läuft der Rest durch DENSELBEN Pfad wie eine lokale GLB
  // (ladeRef3d → setGlbContext → GLTFLoader). Jeder Fehlschlag (404, Netz,
  // oder der Guard lehnt die Bytes ab) wird ehrlich gemeldet — der
  // «kein-lokal»-Hinweis bleibt daneben stehen, es wird nichts vorgetäuscht.
  async function ladeRef3dRemote(entry: RefEntry, asset: RefEntryModelAsset): Promise<void> {
    setRef3dLaden(true);
    try {
      const antwort = await fetch(modellUrlAusR2Key(asset.r2_key));
      if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
      const buffer = await antwort.arrayBuffer();
      const guard = pruefeGlbHeader(buffer);
      if (!guard.ok) throw new Error(guard.fehler);
      ladeRef3d(entry, new Blob([buffer], { type: 'model/gltf-binary' }));
    } catch (err) {
      if (ref3dMounted.current) setRef3dLaden(false);
      const message = err instanceof Error ? err.message : String(err);
      meldeFehler(`Remote-Modell nicht erreichbar (${message}).`);
    }
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
      // v0.7.6 Welle 2 Stream D: Epochen-/Quellen-Facette der linken Spalte.
      if (epoche) {
        const eb = epocheVonEntry(e);
        if (!eb || eb.id !== epoche) return false;
      }
      if (quelleFacet && e.source_quality !== quelleFacet) return false;
      if (!q) return true;
      const hay = [e.title, e.city, e.country, ...(e.authors ?? []), ...(e.themes ?? []), ...(e.materials ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query, sector, nurSammlung, sammlung, epoche, quelleFacet]);

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
    <div className="k-einblenden kd-viewport">
      <div className="kd-scroll">
        {/* v0.7.6 Welle 2 Stream D: der Referenzen-Tab bekommt eine
            3-Spalten-Tabellenfläche (Quellen/Epochen-Rail + Tabelle) und
            braucht dafür die volle Breite statt der 980px-Lesespalte der
            übrigen sieben Tabs — deren Layout bleibt unverändert. */}
        <div className={`kd-content${tab === 'referenzen' ? ' kd-content--voll' : ''}`}>
          {/* Serie J2 / Batch B1: reiner Test-/Gruppierungs-Wrapper (kein
              eigener Box-Effekt, `display: contents`) — analog zu Designs
              `design-werkzeugleiste`, hier zusätzlich über die (nur im
              referenzen-Tab gerenderte) Such-/Filter-Gruppe hinweg, damit die
              feste-Anker-Prüfung (E2E) alle drei Adaptions-Gruppen erfasst. */}
          <div data-testid="referenzen-werkzeugleiste" className="kd-contents">
          <div className="kd-flex kd-items-center kd-g3 kd-wrap">
            <Badge hue={moduleHue.data}>KosmoData</Badge>
            <span
              data-testid="leiste-gruppe-navigation"
              className={[fokusKlasse(stufeFuerGruppe('navigation')), 'kd-inline-flex kd-items-center', gruppeHatGehobenesElement('navigation') ? 'kd-gehoben' : '']
                .filter(Boolean)
                .join(' ')}
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
            <span className="kd-c-soft kd-fs-md">
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
            <div className="kd-fill" />
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
                className="kd-border-line"
              >
                Erneut versuchen
              </KButton>
            )}
            <span
              data-testid="leiste-gruppe-sync"
              className={[fokusKlasse(stufeFuerGruppe('sync')), 'kd-inline-flex', gruppeHatGehobenesElement('sync') ? 'kd-gehoben' : '']
                .filter(Boolean)
                .join(' ')}
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
                className="kd-border-line"
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
              className={`k-selten kd-inline-flex kd-items-center kd-fs-xs kd-c-faint kd-nowrap kd-hinweis${adaptionHinweisSichtbar ? ' kd-hinweis--sichtbar' : ''}`}
              title={adaptionHinweisTitel}
            >
              ⓘ angepasst
            </span>
            <label className="kd-fs-xs kd-c-faint kd-flex kd-items-center kd-g2">
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
              className="kd-border-line"
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
                  className="kd-border-line"
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
              className={[fokusKlasse(stufeFuerGruppe('suche')), 'kd-grid kd-g3', gruppeHatGehobenesElement('suche') ? 'kd-gehoben' : '']
                .filter(Boolean)
                .join(' ')}
            >
              <SuchFeld
                testid="data-search"
                placeholder="Suchen: Titel, Ort, Architekt, Thema, Material …"
                value={query}
                onChange={setQuery}
              />

              <div className="kd-flex kd-g2 kd-wrap">
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
          {!geladen && <KLade text="Referenzen laden …" height={200} />}
          {/* v0.7.6 Welle 2 Stream D (Soll-Bild `Kosmo Viz
              Datenstationen.dc.html`, README §10): das frühere Karten-Grid
              wird zur 2-Spalten-Fläche — links Datenquellen/Epochen-Facetten
              (`QuellenListe`), rechts der Referenzkatalog als Tabelle
              (`ReferenzTabelle`). Das rechte Detail-Dossier (`ref-detail-
              dossier`) bleibt als dritte, unangetastete Spalte ausserhalb
              dieses Blocks bestehen (Vertrag unverändert). */}
          {geladen && !seedFehler && (
            <div className="kd-flex kd-g5 kd-items-start">
              <QuellenListe
                entries={entries}
                quelleFacet={quelleFacet}
                setQuelleFacet={setQuelleFacet}
                epoche={epoche}
                setEpoche={setEpoche}
              />
              {filtered.length === 0 ? (
                <div className="kd-fill">
                  <Messrahmen
                    height={220}
                    caption="Keine Referenz passt zur Suche — Begriff lockern oder Filter lösen"
                  />
                </div>
              ) : (
                <ReferenzTabelle
                  entries={filtered}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelected}
                  sammlung={sammlung}
                  toggleSammlung={toggleSammlung}
                />
              )}
            </div>
          )}
          </>)}
        </div>
      </div>

      {selected && (
        <aside data-testid="ref-detail-dossier" className="kd-dossier-panel">
          <div className="kd-flex kd-items-center">
            <Badge hue={moduleHue.data}>Referenz</Badge>
            <div className="kd-fill" />
            <KButton size="sm" tone="ghost" onClick={() => setSelected(null)}>
              ×
            </KButton>
          </div>
          {/* K1: lokal-first — lokales Bild als <img>, sonst Tusche-Platzhalter
              plus die ehrliche Zeile «Bild nicht lokal — Quelle: <domain>»
              (vorher stand hier ein kaputtes externes <img> ohne Fallback). */}
          <div data-testid="ref-dossier-bild" className="kd-dossier-hero">
            <RefHeroBild entry={selected} signetGroesse={72} />
          </div>
          <div className="kd-fs-lg kd-w-600">{selected.title}</div>
          <Measure>
            {[formatJahrSpanne(selected), selected.city, selected.country].filter(Boolean).join(' · ')}
          </Measure>
          {(selected.authors ?? []).length > 0 && (
            <div className="kd-fs-sm kd-c-soft">{(selected.authors ?? []).join(', ')}</div>
          )}

          {/* D6 (Batch 2): Status- und Sichtbarkeitschips aus dem reichen Master-Modell. */}
          <div className="kd-flex kd-g2 kd-wrap">
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
          {selected.one_sentence && <div className="kd-fs-md kd-italic">{selected.one_sentence}</div>}
          {(selected.full_description ?? selected.short_description) && (
            <div className="kd-fs-md kd-c-soft kd-lh-55">
              {selected.full_description ?? selected.short_description}
            </div>
          )}
          {(selected.themes ?? []).length > 0 && (
            <div className="kd-flex kd-g2 kd-wrap">
              {(selected.themes ?? []).map((t) => (
                <span key={t} className="kd-fs-xs kd-p-s1-s3 kd-r-pill kd-bg-accent-wash">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Materialprofil: strukturiert (materials_detail) als KKeyValue (Spez
              §3 B-41, W6-Einsatz) falls vorhanden, sonst die schlanke Tag-Liste. */}
          {selected.materials_detail ? (
            <>
              {(() => {
                const zeilen = [
                  ...((selected.materials_detail!.primary ?? []).length > 0
                    ? [{ key: 'Primär', wert: (selected.materials_detail!.primary ?? []).join(', ') }]
                    : []),
                  ...((selected.materials_detail!.stone_type ?? []).length > 0
                    ? [{ key: 'Gestein', wert: (selected.materials_detail!.stone_type ?? []).join(', ') }]
                    : []),
                  ...((selected.materials_detail!.secondary ?? []).length > 0
                    ? [{ key: 'Sekundär', wert: (selected.materials_detail!.secondary ?? []).join(', ') }]
                    : []),
                ];
                // Grid-Kind-Sizing-Eigenheit (Chromium): `.k-keyvalue` (flex-
                // column + overflow:hidden) berechnet als UNMITTELBARES Kind
                // eines `display:grid`-Containers ohne `grid-auto-rows` eine
                // Höhe von 0 (Content bleibt vorhanden, nur die Box kollabiert
                // — reproduzierbar isoliert getestet). Ein simpler Block-
                // Wrapper dazwischen behebt es zuverlässig (`DossierGruppe`s
                // `kd-dossier-body`-Wrapper zeigt dasselbe Muster bereits).
                return zeilen.length > 0 ? (
                  <div>
                    <KKeyValue zeilen={zeilen} />
                  </div>
                ) : null;
              })()}
              {selected.materials_detail.notes && (
                <div className="kd-fs-sm kd-c-faint kd-italic">{selected.materials_detail.notes}</div>
              )}
            </>
          ) : (
            (selected.materials ?? []).length > 0 && (
              <div className="kd-fs-sm kd-c-faint">
                Material: {(selected.materials ?? []).join(', ')}
              </div>
            )
          )}

          {/* Geo: Koordinaten + Region/Kanton/Land als KKeyValue (Spez §3 B-41,
              W6-Einsatz) — keine Karten-Lib (Offline/CORS). */}
          {selected.geo && (selected.geo.lat != null || selected.geo.region || selected.geo.canton) && (
            <>
              <Hairline />
              <div className="kd-label">Geo</div>
              {(() => {
                const geo = selected.geo!;
                const region = [geo.region, geo.canton, selected.country].filter(Boolean).join(' · ');
                const zeilen = [
                  ...(geo.lat != null && geo.lon != null
                    ? [{ key: 'Koordinaten', wert: `${geo.lat.toFixed(4)}°, ${geo.lon.toFixed(4)}°` }]
                    : []),
                  ...(region ? [{ key: 'Region', wert: region }] : []),
                ];
                // s. Kommentar oben (Materialprofil) — derselbe Grid-Kind-
                // Sizing-Fall, derselbe Block-Wrapper als Behebung.
                return (
                  <div>
                    <KKeyValue data-testid="ref-geo" zeilen={zeilen} />
                  </div>
                );
              })()}
            </>
          )}

          {/* Medien-Galerie: Bilder mit öffentlicher URL als Thumbnail, sonst gesperrte Platzhalterkachel. */}
          {(selected.media ?? []).length > 0 && (
            <>
              <Hairline />
              <div className="kd-label">
                Medien
              </div>
              <div data-testid="ref-media" className="kd-grid kd-col-2 kd-g3">
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
              <div className="kd-label">
                Analyse
              </div>
              <div data-testid="ref-analyse" className="kd-grid kd-g3">
                {(selected.analysis_layers ?? []).map((layer, i) => (
                  <div key={`${layer.analysis_type}-${i}`} className="kd-grid kd-g1">
                    <div className="kd-flex kd-items-center kd-g2">
                      <span className="kd-fs-sm kd-w-600">{analysisTypeLabel[layer.analysis_type] ?? layer.analysis_type}</span>
                      <div className="kd-fill" />
                      <Badge hue={reviewStatusHue[layer.review_status]}>{reviewStatusLabel[layer.review_status]}</Badge>
                    </div>
                    <div className="kd-fs-xs kd-c-soft kd-lh-45">{layer.summary}</div>
                    {/* K6: strukturierte Analyse-Daten (`data`-Feld des reichen
                        Typs) — heute im Seed leer, aber der Vertrag sieht sie
                        vor; sobald sie kommen, sind sie sichtbar. */}
                    {layer.data && Object.keys(layer.data).length > 0 && (
                      <div className="kd-mono kd-fs-xs kd-c-faint kd-wrap-anywhere">
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
                <KKeyValue
                  zeilen={[
                    ...(selected.program_detail.type
                      ? [{ key: 'Typ', wert: entschlange(selected.program_detail.type) }]
                      : []),
                    ...(selected.program_detail.subtype
                      ? [{ key: 'Untertyp', wert: entschlange(selected.program_detail.subtype) }]
                      : []),
                    ...(selected.program_detail.public_access
                      ? [{ key: 'Zugang', wert: entschlange(selected.program_detail.public_access) }]
                      : []),
                  ]}
                />
              ) : (
                <div className="kd-fs-sm kd-c-soft">{entschlange(selected.program ?? '')}</div>
              )}
            </DossierGruppe>
          )}

          {selected.context && Object.keys(selected.context).length > 0 && (
            <DossierGruppe titel="Kontext" testid="ref-kontext" offen>
              <KKeyValue
                zeilen={[
                  ...(selected.context.topography
                    ? [{ key: 'Topografie', wert: entschlange(selected.context.topography) }]
                    : []),
                  ...(selected.context.setting ? [{ key: 'Lage', wert: entschlange(selected.context.setting) }] : []),
                  ...(selected.context.climate ? [{ key: 'Klima', wert: entschlange(selected.context.climate) }] : []),
                ]}
              />
              {(selected.context.heritage_context ?? []).length > 0 && (
                <div className="kd-fs-xs kd-c-faint">
                  Denkmalkontext: {(selected.context.heritage_context ?? []).map(entschlange).join(' · ')}
                </div>
              )}
              {(selected.context.landscape_relation ?? []).length > 0 && (
                <div className="kd-fs-xs kd-c-faint">
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
                <div className="kd-fs-sm kd-c-soft">
                  Vorlesungs-Cluster: {(selected.lecture_cluster ?? []).map(entschlange).join(' · ')}
                </div>
              )}
              {(selected.vibes ?? []).length > 0 && (
                <div className="kd-flex kd-g2 kd-wrap">
                  {(selected.vibes ?? []).map((v) => (
                    <span
                      key={v}
                      className="kd-fs-xs kd-p-s1-s3 kd-r-pill kd-b-line kd-c-soft"
                    >
                      {entschlange(v)}
                    </span>
                  ))}
                </div>
              )}
              {(selected.database_tags ?? []).length > 0 && (
                <div
                  className="kd-mono kd-fs-xs kd-c-faint kd-lh-60 kd-wrap-anywhere"
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
                {at.headline && <div className="kd-fs-md kd-w-600">{at.headline}</div>}
                {at.overview && (
                  <div className="kd-fs-sm kd-c-soft kd-lh-50">{at.overview}</div>
                )}
                {(at.chapters ?? []).map((k, i) => (
                  <details key={`${k.title}-${i}`} data-testid="ref-architekturtext-kapitel">
                    <summary className="kd-cursor-pointer kd-fs-sm kd-w-550">
                      {k.title}
                      {k.review_status && (
                        <span className="kd-ml-s2">
                          <Badge hue={reviewStatusHue[k.review_status]}>{reviewStatusLabel[k.review_status]}</Badge>
                        </span>
                      )}
                    </summary>
                    <div className="kd-fs-sm kd-c-soft kd-lh-55 kd-pt-s1">
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
                <div key={`${m.r2_key}-${i}`} className="kd-grid kd-g1">
                  <div className="kd-flex kd-items-center kd-g2 kd-wrap">
                    <span className="kd-fs-sm kd-w-550">{m.title}</span>
                    <div className="kd-fill" />
                    <Badge hue={reviewStatusHue[m.review_status]}>{reviewStatusLabel[m.review_status]}</Badge>
                  </div>
                  <div className="kd-mono kd-fs-xs kd-c-faint">
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
                  <div key={`${q.title ?? 'quelle'}-${i}`} className="kd-grid kd-gxs">
                    <span className="kd-fs-sm kd-c-soft">{q.title ?? 'Ohne Titel'}</span>
                    <span className="kd-mono kd-fs-xs kd-c-faint">
                      {[q.source_type, q.reliability_level, q.rights_status].filter(Boolean).map((s) => entschlange(s!)).join(' · ')}
                    </span>
                  </div>
                ))}
              </DossierGruppe>
            );
          })()}

          {selected.database_profile && (
            <DossierGruppe titel="Datenbankprofil" testid="ref-dbprofil">
              <div className="kd-mono kd-fs-xs kd-c-soft kd-lh-60">
                Quellen {selected.database_profile.source_count} · Medien {selected.database_profile.media_count} · Modelle{' '}
                {selected.database_profile.model_count} · Analysen {selected.database_profile.analysis_count} · Tags{' '}
                {selected.database_profile.tag_count}
              </div>
              <div className="kd-mono kd-fs-xs kd-c-faint kd-wrap-anywhere">
                {selected.database_profile.r2_prefix}
              </div>
            </DossierGruppe>
          )}

          {/* ---------- K8 (v0.6.8, erweitert v0.6.9 Stream B): Gedächtnis-/
              Wissens-Querverweise — klickbar, Klick wechselt den Tab
              innerhalb von KosmoData. Gedächtnis: zuerst die persistierte
              Referenz-Kante (`refId`, «verknüpft»), Text-Match («Texttreffer»)
              bleibt der ehrliche Fallback für Alteinträge. Wissen: was die
              lokale BM25-Suche zum Titel findet. */}
          <DossierGruppe titel="Gedächtnis & Wissen" testid="ref-querverweise" offen>
            <div className="kd-flex kd-items-center kd-g2">
              <div className="kd-fs-xs kd-c-faint kd-fill">Gedächtnis</div>
              <button
                type="button"
                className="k-druck kd-icon-btn"
                data-testid="ref-feedback-gut"
                aria-label="Referenz als hilfreich bewerten"
                onClick={() => feedbackZurReferenz('gut')}
              >
                <KIcon name="daumen-hoch" size={14} />
              </button>
              <button
                type="button"
                className="k-druck kd-icon-btn"
                data-testid="ref-feedback-schlecht"
                aria-label="Referenz als nicht hilfreich bewerten"
                onClick={() => feedbackZurReferenz('schlecht')}
              >
                <KIcon name="daumen-runter" size={14} />
              </button>
            </div>
            {gedaechtnisLinks.length === 0 ? (
              <span data-testid="ref-gedaechtnis-leer" className="kd-fs-sm kd-c-faint">
                Kein Gedächtnis-Eintrag erwähnt diese Referenz.
              </span>
            ) : (
              gedaechtnisLinks.map((g) => (
                <KButton
                  key={g.ts}
                  size="sm"
                  tone="ghost"
                  data-testid="ref-gedaechtnis-link"
                  className="kd-justify-start kd-text-left"
                  onClick={() => {
                    setGedaechtnisFokus(g.ts);
                    setTab('gedaechtnis');
                    nutzungMelden('dossier:gedaechtnis-link');
                  }}
                >
                  <span className="kd-flex kd-col-dir kd-gxs kd-items-start">
                    <span>
                      {g.sentiment === 'gut' ? '👍' : '👎'} {kuerzeText(g.context, 90)}
                    </span>
                    <span data-testid="ref-gedaechtnis-matchart" className="kd-fs-xs kd-c-faint">
                      {g.matchArt === 'verknuepft' ? 'verknüpft' : 'Texttreffer'}
                    </span>
                  </span>
                </KButton>
              ))
            )}
            <div className="kd-fs-xs kd-c-faint kd-mt-s1">Wissen</div>
            {wissenLinks.length === 0 ? (
              <span data-testid="ref-wissen-leer" className="kd-fs-sm kd-c-faint">
                Kein Wissens-Abschnitt zum Titel gefunden.
              </span>
            ) : (
              wissenLinks.map((h) => (
                <KButton
                  key={h.id}
                  size="sm"
                  tone="ghost"
                  data-testid="ref-wissen-link"
                  className="kd-justify-start kd-text-left"
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
          <div className="kd-label">
            Assets dieses Projekts
          </div>
          <div data-testid="ref-assets" className="kd-grid kd-g2">
            {refAssets.length === 0 && (
              <span className="kd-fs-sm kd-c-faint">Noch keine Assets verknüpft</span>
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
              className={[fokusKlasse(stufeFuerGruppe('dossier')), 'kd-grid kd-g2', gruppeHatGehobenesElement('dossier') ? 'kd-gehoben' : '']
                .filter(Boolean)
                .join(' ')}
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
                  <span className="kd-fs-xs kd-c-faint">
                    Lädt das verknüpfte 3D-Objekt aus KosmoAsset als Kontext neben deinen Entwurf.
                  </span>
                </>
              ) : (
                <>
                  {remoteRef3dAsset && (
                    <>
                      <KButton
                        size="sm"
                        tone="accent"
                        data-testid="ref3d-laden-remote"
                        disabled={ref3dLaden}
                        onClick={() => {
                          void ladeRef3dRemote(selected, remoteRef3dAsset);
                          nutzungMelden('dossier:ref3d-laden-remote');
                        }}
                        {...elementStil('dossier', 'ref3d-laden-remote')}
                      >
                        {ref3dLaden ? 'Lädt …' : 'Referenz-3D vom Archiv laden (Remote)'}
                      </KButton>
                      <span className="kd-fs-xs kd-c-faint">
                        Lädt das Studienmodell vom Architektur-Archiv — der Bestand dort kann noch
                        unbefüllt sein, ein Fehlschlag wird ehrlich gemeldet.
                      </span>
                    </>
                  )}
                  <span data-testid="ref3d-kein-lokal" className="kd-fs-xs kd-c-faint">
                    Studienmodell noch nicht lokal verfügbar — verknüpfe in KosmoAsset ein 3D-Objekt
                    mit dieser Referenz oder importiere die GLB dort.
                  </span>
                </>
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
    <div data-testid="kosmodata-dach" className="kd-grid kd-g5">
      <div className="kd-grid kd-col-fill-150 kd-g3">
        {zahlen
          ? sammlungIds.map((s) => (
              <div key={s} data-testid={`dach-zahl-${s}`} className="kd-panel kd-grid kd-g2 kd-p-s3-s4">
                <Badge hue={sammlungHue[s]}>{sammlungLabel[s]}</Badge>
                <span className="kd-fs-plakat kd-w-650">{zahlen[s]}</span>
              </div>
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

      <div className="kd-grid kd-g3">
        {treffer.map((t) => (
          <KdKarte
            key={t.id}
            data-testid="dach-treffer"
            onClick={() => springeZuTreffer(t)}
            className="kd-cursor-pointer kd-flex kd-items-center kd-g3 kd-p-s3-s4"
          >
            <Badge hue={sammlungHue[t.sammlung]}>{sammlungLabel[t.sammlung]}</Badge>
            <div className="kd-fill kd-min0">
              <div className="kd-fs-md kd-w-550">{t.titel}</div>
              <div
                className="kd-fs-xs kd-c-faint kd-ov-hidden kd-ellipsis-text kd-nowrap"
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
  // K5 (Serie F, 0.6.8) — Kategorie-Facette: additiv, Default 'alle' zeigt
  // exakt die bisherigen vier Sektionen unverändert (kein Vertragsbruch).
  const [kategorieFilter, setKategorieFilter] = useState<KatalogEintrag['kategorie'] | 'alle'>('alle');
  const sichtbareKategorien = kategorieFilter === 'alle' ? kategorien : kategorien.filter((k) => k === kategorieFilter);

  function uebernehmen(e: KatalogEintrag) {
    runCommand('design.aufbauErstellen', { name: e.name, target: e.target, layers: e.layers });
    setUebernommen(e.id);
  }

  return (
    <div className="kd-grid kd-g5">
      <div className="kd-flex kd-g2 kd-wrap">
        <KButton
          size="sm"
          tone={kategorieFilter === 'alle' ? 'accent' : 'quiet'}
          data-testid="dach-facette-bauteile-alle"
          onClick={() => setKategorieFilter('alle')}
        >
          Alle · {bauteilkatalog.length}
        </KButton>
        {kategorien.map((kat) => (
          <KButton
            key={kat}
            size="sm"
            tone={kategorieFilter === kat ? 'accent' : 'quiet'}
            data-testid={`dach-facette-bauteile-${kat}`}
            onClick={() => setKategorieFilter(kategorieFilter === kat ? 'alle' : kat)}
          >
            {kat} · {bauteilkatalog.filter((e) => e.kategorie === kat).length}
          </KButton>
        ))}
      </div>
      {sichtbareKategorien.map((kat) => (
        <div key={kat} className="kd-grid kd-g3">
          <div className="k-titel kd-fs-lg">{kat}</div>
          <div className="kd-grid kd-col-fill-320 kd-g3">
            {bauteilkatalog
              .filter((e) => e.kategorie === kat)
              .map((e) => {
                const dicke = gesamtdicke(e.layers);
                const u = uWert(e.layers);
                const schonDa = vorhandene.has(e.name);
                const nr = bauteilkatalog.indexOf(e) + 1;
                return (
                  <Karteikarte key={e.id} nr={nr} data-testid={`bauteil-${e.id}`}>
                   <div className="kd-grid kd-g3">
                    <div className="kd-mono kd-w-700 kd-fs-md">{e.name}</div>
                    <div className="kd-fs-sm kd-c-soft kd-lh-50">{e.beschrieb}</div>
                    {/* Schichtbalken (massstäblich) */}
                    <div className="kd-layerbar">
                      {e.layers.map((l, i) => (
                        <div
                          key={i}
                          className="kd-layerbar-segment"
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
                          }}
                        />
                      ))}
                    </div>
                    <div className="kd-flex kd-items-center kd-g3 kd-fs-sm kd-c-faint">
                      <span>{dicke} mm</span>
                      <span>U ≈ {u.toFixed(2)} W/m²K</span>
                      <div className="kd-fill" />
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
        <div className="kd-fs-sm kd-c-soft">
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
      className="kd-wuerfel-canvas"
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
    <div className="kd-grid kd-g5">
      <div className="kd-fs-sm kd-c-soft kd-lh-50 kd-max-70ch">
        Referenzkatalog (fest) — dieselben Schlüssel tragen die Aufbauten des Bauteilkatalogs:
        3D-Farbe, Plan-Schraffur und U-Wert kommen aus einer Quelle. Der 3D-Würfel zeigt die
        lieferbare Grösse, wo bekannt, sonst ehrlich einen Platzhalter-Würfel 1:1:1. «Quelle
        unbelegt (Altbestand)», weil die Herkunft der ursprünglichen Werte nie dokumentiert
        wurde. Eigene Einträge unten verlangen die Quelle immer (Owner-Befund K21).
      </div>

      <div className="kd-flex kd-g2 kd-wrap">
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

      <div className="kd-grid kd-col-fill-230 kd-g3">
        {gefiltert.map((m) => (
          <KdKarte
            key={m.key}
            data-testid={`material-${m.key}`}
            aktiv={selectedKey === m.key}
            onClick={() => setSelectedKey(selectedKey === m.key ? null : m.key)}
            className="kd-grid kd-g2 kd-cursor-pointer kd-p-s3-s4"
          >
            <div className="kd-flex kd-g3 kd-items-center">
              <span
                className="kd-material-swatch"
                style={{
                  background: `linear-gradient(135deg, ${hex(m.pbr.color)}, color-mix(in srgb, ${hex(m.pbr.color)} ${Math.round((1 - m.pbr.roughness) * 60 + 40)}%, white))`,
                }}
                title={`Rauheit ${m.pbr.roughness}${m.pbr.metalness ? ` · Metall ${m.pbr.metalness}` : ''}`}
              />
              <div className="kd-min0">
                <div className="kd-w-550 kd-fs-md">{m.name}</div>
                <div className="kd-fs-xs kd-c-faint">
                  Schraffur: {m.sia}
                  {m.lambda !== undefined ? ` · λ ${m.lambda}` : ''}
                </div>
              </div>
            </div>
            <div className="kd-fs-sm kd-c-soft kd-lh-45">{m.beschrieb}</div>
            <div className="kd-flex kd-g2 kd-wrap">
              <Badge hue={materialArtHue[m.materialArt]}>{materialArtLabel[m.materialArt]}</Badge>
              {m.region && <Badge hue="var(--k-ink-faint)">{m.region}</Badge>}
            </div>
          </KdKarte>
        ))}
      </div>

      {selected && (
        <div data-testid="material-detail" className="kd-panel kd-grid kd-g3 kd-p-s5">
          <div className="kd-flex kd-items-center kd-g3">
            <span className="kd-w-600 kd-fs-lg">{selected.name}</span>
            <div className="kd-fill" />
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
          <div data-testid="material-detail-quelle" className="kd-fs-sm kd-c-soft">
            Quelle: {selected.quelle}
          </div>
          <div className="kd-flex kd-g2 kd-wrap">
            <Badge hue={materialArtHue[selected.materialArt]}>{materialArtLabel[selected.materialArt]}</Badge>
            {selected.region && <Badge hue="var(--k-ink-faint)">{selected.region}</Badge>}
          </div>
          {selected.dimensionen ? (
            <div className="kd-fs-sm kd-c-faint">
              Lieferbar: {selected.dimensionen.lieferbar.map(formatMaterialGroesse).join(' · ')}
              {selected.dimensionen.hinweis && <div>{selected.dimensionen.hinweis}</div>}
            </div>
          ) : (
            <div className="kd-fs-sm kd-c-faint">
              Keine lieferbare Grösse hinterlegt — Würfel zeigt den Platzhalter 1:1:1.
            </div>
          )}
        </div>
      )}

      <Hairline />

      <div className="kd-flex kd-items-center kd-g3">
        <span className="k-titel kd-fs-lg">
          Eigene Materialien
        </span>
        <div className="kd-fill" />
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
        <div data-testid="material-erfassen-formular" className="kd-panel kd-grid kd-g3 kd-max-480 kd-p-s5">
          <input
            data-testid="material-titel"
            placeholder="Titel"
            value={formTitel}
            onChange={(e) => setFormTitel(e.target.value)}
            className="kd-eingabe"
          />
          <input
            data-testid="material-quelle"
            placeholder="Quelle (Pflicht) — Lieferant, Katalog, Foto-Datum …"
            value={formQuelle}
            onChange={(e) => setFormQuelle(e.target.value)}
            className="kd-eingabe"
          />
          <div className="kd-flex kd-g3 kd-wrap">
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
              className="kd-eingabe kd-eingabe--fill"
            />
          </div>
          <div className="kd-flex kd-g3">
            <input
              data-testid="material-laenge"
              placeholder="Länge mm"
              type="number"
              value={formLaenge}
              onChange={(e) => setFormLaenge(e.target.value)}
              className="kd-eingabe kd-eingabe--fill"
            />
            <input
              data-testid="material-breite"
              placeholder="Breite mm"
              type="number"
              value={formBreite}
              onChange={(e) => setFormBreite(e.target.value)}
              className="kd-eingabe kd-eingabe--fill"
            />
            <input
              data-testid="material-dicke"
              placeholder="Dicke mm"
              type="number"
              value={formDicke}
              onChange={(e) => setFormDicke(e.target.value)}
              className="kd-eingabe kd-eingabe--fill"
            />
          </div>
          <span className="kd-fs-xs kd-c-faint">
            Masse optional — nur wenn bekannt. Die Textur/PBR-Map selbst ist Stufe 2 (externer
            Quellen-Ingest, Lizenzprüfung); der Würfel zeigt bis dahin einen ehrlichen
            Platzhalter-Ton.
          </span>
          <KButton size="sm" tone="accent" data-testid="material-erfassen-speichern" onClick={() => void materialAbsenden()}>
            Speichern
          </KButton>
        </div>
      )}

      {erfasst === null && <KLade text="Eigene Materialien laden …" height={80} />}
      {erfasst !== null && erfasst.length === 0 && (
        <span className="kd-fs-sm kd-c-faint">
          Noch keine eigenen Materialien — «+ Material erfassen» legt den ersten an.
        </span>
      )}
      {erfasst !== null && erfasst.length > 0 && (
        <div className="kd-grid kd-col-fill-230 kd-g3">
          {erfasst.map((m) => (
            <KdKarte
              key={m.id}
              data-testid={`material-erfasst-${m.id}`}
              aktiv={selectedErfasstId === m.id}
              onClick={() => setSelectedErfasstId(selectedErfasstId === m.id ? null : m.id)}
              className="kd-grid kd-g2 kd-cursor-pointer kd-p-s3-s4"
            >
              {/* K21/W4: eigene Einträge tragen keine Textur/Farbe (Stufe 2) —
                  ehrliches Signet statt Fake-Swatch. */}
              <DataLeerbild typ="material" align="start" />
              <div className="kd-w-550 kd-fs-md kd-wrap-anywhere">{m.title}</div>
              <div className="kd-fs-xs kd-c-faint kd-wrap-anywhere">Quelle: {m.quelle}</div>
              <div className="kd-flex kd-g2 kd-wrap">
                {m.materialArt && <Badge hue={materialArtHue[m.materialArt]}>{materialArtLabel[m.materialArt]}</Badge>}
                {m.region && <Badge hue="var(--k-ink-faint)">{m.region}</Badge>}
              </div>
            </KdKarte>
          ))}
        </div>
      )}

      {selectedErfasst && (
        <div data-testid="material-erfasst-detail" className="kd-panel kd-grid kd-g3 kd-p-s5">
          <div className="kd-flex kd-items-center kd-g3">
            <span className="kd-w-600 kd-fs-lg kd-wrap-anywhere">{selectedErfasst.title}</span>
            <div className="kd-fill" />
            <KButton size="sm" tone="ghost" onClick={() => void materialLoeschen(selectedErfasst)}>
              Löschen
            </KButton>
          </div>
          <MaterialWuerfel
            {...(selectedErfasst.materialDimensionen?.lieferbar[0] !== undefined
              ? { groesse: selectedErfasst.materialDimensionen.lieferbar[0] }
              : {})}
          />
          <div className="kd-fs-sm kd-c-soft">Quelle: {selectedErfasst.quelle}</div>
          <div className="kd-flex kd-g2 kd-wrap">
            {selectedErfasst.materialArt && (
              <Badge hue={materialArtHue[selectedErfasst.materialArt]}>{materialArtLabel[selectedErfasst.materialArt]}</Badge>
            )}
            {selectedErfasst.region && <Badge hue="var(--k-ink-faint)">{selectedErfasst.region}</Badge>}
          </div>
          {selectedErfasst.materialDimensionen ? (
            <div className="kd-fs-sm kd-c-faint">
              Lieferbar: {selectedErfasst.materialDimensionen.lieferbar.map(formatMaterialGroesse).join(' · ')}
            </div>
          ) : (
            <div className="kd-fs-sm kd-c-faint">
              Keine lieferbare Grösse hinterlegt — Würfel zeigt den Platzhalter 1:1:1.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * D (v0.6.8) — Stream D: Docling-Wissens-Ingest (Übernahme aus der
 * AI-Scan-Auswertung 0.6.8, `docs/AI-SCAN-AUSWERTUNG-0.6.8.md` §1.1).
 * `tools/docling-ingest/ingest.py` legt PDF-Importe als Markdown-Notizen in
 * `wissen/vault/Import/` ab und regeneriert daraus dieses schlanke Manifest
 * unter `public/wissen/import.json` — derselbe «wissen/-Bündel»-Weg, über
 * den die App bereits die Bauwissen-Basis-Korpora lädt (siehe `basisIndex()`
 * oben in `modules/prepare/knowledge.ts`), hier additiv für Import-Notizen
 * statt Trainings-Sammlungen. Dreistufige Ehrlichkeit im Ingest-Tool: echte
 * Docling-Konvertierung, ehrlicher Fehlausgang ohne Docling, oder eine klar
 * markierte `--fake`-Fixture (nie als echte Extraktion ausgegeben).
 */
interface WissenImportEintrag {
  titel: string;
  quelleDateiname: string;
  importiertAm: string;
  werkzeug: string;
  seiten?: number;
  tags: string[];
}

/** Nur das Datum aus einem ISO-Zeitstempel («2026-07-10T09:00:00Z» → «2026-07-10»). */
function importDatum(importiertAm: string): string {
  return importiertAm.split('T')[0] || importiertAm;
}

async function holeWissenImport(): Promise<WissenImportEintrag[]> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL ?? '/'}wissen/import.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const daten = (await res.json()) as WissenImportEintrag[];
    return Array.isArray(daten) ? daten : [];
  } catch {
    return [];
  }
}

/** K5-artige Facette (Serie F, 0.6.8/0.6.9): Sammlung eines Dokuments aus der
 * stabilen doc-Id ableiten (`basis-<sammlung>-<slug>`, siehe `basisDocId` in
 * `knowledge.ts`) — lokal aufgenommene Dokumente (kein `basis-`-Präfix)
 * gelten als eigene Gruppe «lokal». Rein deterministisch, kein Netzwerk. */
export function sammlungVonDoc(d: Pick<KnowledgeDoc, 'id' | 'source'>): string {
  if (d.source !== 'basis') return 'lokal';
  const m = d.id.match(/^basis-([a-z0-9-]+?)-/);
  return m ? m[1]! : 'basis';
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
  // v0.6.9 (Stream B) — Facette nach Sammlung/Quelle: additiv, Default 'alle'
  // zeigt exakt die bisherige, ungefilterte Dokumentliste (kein Vertragsbruch).
  const [sammlungFilter, setSammlungFilter] = useState<string | 'alle'>('alle');
  const [importEintraege, setImportEintraege] = useState<WissenImportEintrag[]>([]);
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

  // D (v0.6.8): Import-Manifest separat laden — eigene Quelle (statisches
  // JSON aus dem Ingest-Tool), unabhängig von der IndexedDB-Wissensbasis.
  useEffect(() => {
    void holeWissenImport().then(setImportEintraege);
  }, []);

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

  // v0.6.9 (Stream B, «Wissen antwortet»): Import-Sektion → RAG-Kette. KEIN
  // neuer Lade-Weg — derselbe `importiereBasis('import')` wie die übrigen
  // Bauwissen-Basis-Korpora unten (`ladeSammlung`); hier zusätzlich direkt an
  // der Import-Liste, weil der Architekt hier zuerst hinschaut. Ehrliche
  // Statuszeile: unterscheidet frisch geladene Dokumente von «schon geladen»
  // (idempotent — `importiereBasis` überspringt bereits vorhandene doc-Ids).
  const [ladeImport, setLadeImport] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  async function ladeImportSammlung() {
    setLadeImport(true);
    try {
      const { quellen, chunks } = await importiereBasis('import');
      refresh();
      setImportStatus(
        quellen > 0
          ? `${quellen} Dokument${quellen === 1 ? '' : 'e'} · ${chunks} Abschnitt${chunks === 1 ? '' : 'e'} geladen`
          : 'Schon geladen — keine neuen Dokumente',
      );
    } catch (err) {
      meldeFehler(err);
    } finally {
      setLadeImport(false);
    }
  }

  const zeigtSuche = query.trim().length >= 2;
  const leer = geladen && docs.length === 0 && basis.length === 0;
  // v0.6.9: Sammlung-Facette für die Dokumentliste — additiv, 'alle' liefert
  // exakt die bisherige, ungefilterte Liste (byte-identisch).
  const sammlungenInDocs = [...new Set(docs.map((d) => sammlungVonDoc(d)))].sort();
  const sichtbareDocs = sammlungFilter === 'alle' ? docs : docs.filter((d) => sammlungVonDoc(d) === sammlungFilter);

  return (
    <div data-testid="kosmodata-wissen" className="kd-grid kd-g5">
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
        <div className="kd-grid kd-g3">
          {hits.length === 0 && (
            <Messrahmen height={140} caption="Kein Treffer in der Wissensbasis — Begriff lockern" />
          )}
          {hits.map((h) => (
            <div key={h.id} data-testid="wissen-hit" className="kd-panel kd-grid kd-g2 kd-p-s3-s4">
              <div className="kd-flex kd-items-baseline kd-g3">
                <span className="kd-fs-sm kd-w-550">
                  {h.docName} · Abschnitt {h.seq + 1}
                </span>
                <div className="kd-fill" />
                <span className="kd-mono kd-fs-xs kd-c-faint">
                  {h.score.toFixed(2)}
                </span>
              </div>
              <div className="kd-fs-md kd-lh-50 kd-c-soft">
                {h.text.length > 220 ? `${h.text.slice(0, 220)} …` : h.text}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="kd-grid kd-g3" data-testid="wissen-import">
            <div className="k-titel kd-fs-lg">Import (Docling-Wissens-Ingest)</div>
            {importEintraege.length === 0 ? (
              <span data-testid="wissen-import-leer" className="kd-fs-sm kd-c-faint">
                Noch keine Importe — tools/docling-ingest/ingest.py
              </span>
            ) : (
              <>
                {importEintraege.map((e) => (
                  <div
                    key={`${e.quelleDateiname}-${e.importiertAm}`}
                    data-testid="wissen-import-eintrag"
                    className="kd-panel kd-grid kd-g2 kd-p-s3-s4"
                  >
                    <div className="kd-w-550 kd-fs-md">{e.titel}</div>
                    <div
                      data-testid="wissen-import-herkunft"
                      className="kd-fs-xs kd-c-faint"
                    >
                      Import · {e.werkzeug} · {importDatum(e.importiertAm)}
                    </div>
                  </div>
                ))}
                <div className="kd-flex kd-items-center kd-g3 kd-wrap">
                  {geladeneBasis.has('import') && !importStatus ? (
                    <Badge hue={moduleHue.prepare}>In Wissensbasis geladen</Badge>
                  ) : (
                    <KButton
                      size="sm"
                      tone="accent"
                      data-testid="wissen-import-laden"
                      disabled={ladeImport}
                      onClick={() => void ladeImportSammlung()}
                    >
                      {ladeImport ? 'Lade …' : 'In Wissensbasis laden'}
                    </KButton>
                  )}
                  {importStatus && (
                    <span data-testid="wissen-import-status" className="kd-fs-xs kd-c-faint">
                      {importStatus}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {docs.length > 0 && (
            <div className="kd-grid kd-g3">
              <div className="k-titel kd-fs-lg">
                Dokumente ({sichtbareDocs.length})
              </div>
              {sammlungenInDocs.length > 1 && (
                <div className="kd-flex kd-g2 kd-wrap">
                  <KButton
                    size="sm"
                    tone={sammlungFilter === 'alle' ? 'accent' : 'quiet'}
                    data-testid="dach-facette-wissen-alle"
                    onClick={() => setSammlungFilter('alle')}
                  >
                    Alle · {docs.length}
                  </KButton>
                  {sammlungenInDocs.map((s) => (
                    <KButton
                      key={s}
                      size="sm"
                      tone={sammlungFilter === s ? 'accent' : 'quiet'}
                      data-testid={`dach-facette-wissen-${s}`}
                      onClick={() => setSammlungFilter(sammlungFilter === s ? 'alle' : s)}
                    >
                      {s} · {docs.filter((d) => sammlungVonDoc(d) === s).length}
                    </KButton>
                  ))}
                </div>
              )}
              {sichtbareDocs.map((d) => {
                const oeffentlich = (d.visibility ?? 'private') === 'public';
                return (
                  <div
                    key={d.id}
                    data-testid="wissen-doc"
                    className="kd-panel kd-flex kd-items-center kd-g3 kd-p-s3-s4"
                  >
                    <div className="kd-min0 kd-fill">
                      <div
                        className="kd-w-550 kd-fs-md kd-ov-hidden kd-ellipsis-text kd-nowrap"
                      >
                        {d.name}
                      </div>
                      <div className="kd-fs-xs kd-c-faint kd-flex kd-g2 kd-items-center kd-wrap">
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
                  </div>
                );
              })}
            </div>
          )}

          {basis.length > 0 && (
            <div className="kd-grid kd-g3" data-testid="wissen-basis">
              <div className="k-titel kd-fs-lg">Bauwissen-Basis (Kosmos-Bibliothek)</div>
              {basis.map((sa) => (
                <div
                  key={sa.sammlung}
                  className="kd-panel kd-flex kd-items-center kd-g4 kd-p-s3-s4"
                >
                  <div className="kd-min0 kd-fill">
                    <div className="kd-w-550 kd-fs-md">{sa.label}</div>
                    <div className="kd-fs-xs kd-c-faint">
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
                </div>
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
export type TrainAchseFilter = 'alle' | 'architektur' | 'software';

export function KosmoTrainingView() {
  const [architektur, setArchitektur] = useState<TrainBeispiel[]>([]);
  const [software, setSoftware] = useState<TrainBeispiel[]>([]);
  const [geladen, setGeladen] = useState(false);
  // v0.6.9 (Stream B) — Facette nach Achse: additiv, Default 'alle' zeigt
  // exakt beide Panels wie bisher (kein Vertragsbruch).
  const [achseFilter, setAchseFilter] = useState<TrainAchseFilter>('alle');

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
    <div data-testid="kosmodata-training" className="kd-grid kd-g5">
      <div className="kd-flex kd-items-center kd-g3 kd-wrap">
        <span className="kd-c-soft kd-fs-md">
          Zwei Achsen — Architektur (Bürostil) und Software (KosmoOrbit selbst) —, kombiniert exportierbar für die LoRA.
        </span>
        <div className="kd-fill" />
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

      {geladen && !leer && (
        <div className="kd-flex kd-g2 kd-wrap">
          <KButton
            size="sm"
            tone={achseFilter === 'alle' ? 'accent' : 'quiet'}
            data-testid="dach-facette-training-alle"
            onClick={() => setAchseFilter('alle')}
          >
            Alle · {architekturCount + softwareCount}
          </KButton>
          <KButton
            size="sm"
            tone={achseFilter === 'architektur' ? 'accent' : 'quiet'}
            data-testid="dach-facette-training-architektur"
            onClick={() => setAchseFilter(achseFilter === 'architektur' ? 'alle' : 'architektur')}
          >
            Architektur · {architekturCount}
          </KButton>
          <KButton
            size="sm"
            tone={achseFilter === 'software' ? 'accent' : 'quiet'}
            data-testid="dach-facette-training-software"
            onClick={() => setAchseFilter(achseFilter === 'software' ? 'alle' : 'software')}
          >
            Software · {softwareCount}
          </KButton>
        </div>
      )}

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
          {achseFilter !== 'software' && (
          <div data-testid="training-achse-architektur" className="kd-panel kd-grid kd-g3 kd-p-s4-s5">
            <div className="kd-flex kd-items-center kd-g3">
              <Badge hue={moduleHue.train}>Architektur — Bürostil &amp; Fachwissen</Badge>
              <Measure>{architektur.length}</Measure>
              <div className="kd-fill" />
              <KButton size="sm" tone="ghost" onClick={oeffneKosmoTrain}>
                Zur KosmoTrain-Station
              </KButton>
            </div>
            {architektur.length === 0 ? (
              <span className="kd-fs-sm kd-c-faint">
                Unter Kosmo-Antworten mit 👍/👎 + Notiz sammelst du Architektur-Training — in der
                KosmoTrain-Station kuratierst du die Notizen (sie sind der Trainings-Kern).
              </span>
            ) : (
              <div className="kd-grid kd-g2">
                {architektur.slice(0, 8).map((b) => (
                  <div key={b.id} data-testid="training-beispiel" className="kd-fs-sm kd-grid kd-g1">
                    <div className="kd-w-550">{kuerzeText(b.frage, 100)}</div>
                    <div className="kd-c-soft">{kuerzeText(b.antwort)}</div>
                  </div>
                ))}
                {architektur.length > 8 && (
                  <span className="kd-fs-xs kd-c-faint">
                    … und {architektur.length - 8} weitere
                  </span>
                )}
              </div>
            )}
          </div>
          )}

          {achseFilter !== 'architektur' && (
          <div data-testid="training-achse-software" className="kd-panel kd-grid kd-g3 kd-p-s4-s5">
            <div className="kd-flex kd-items-center kd-g3">
              <Badge hue={moduleHue.data}>Software — KosmoOrbit selbst</Badge>
              <Measure>
                {commandsCount} Commands · {dokuCount} Doku
              </Measure>
            </div>
            <div className="kd-grid kd-g2">
              {software.slice(0, 8).map((b) => (
                <div key={b.id} data-testid="training-beispiel" className="kd-fs-sm kd-grid kd-g1">
                  <div className="kd-w-550">{kuerzeText(b.frage, 100)}</div>
                  <div className="kd-c-soft">{kuerzeText(b.antwort)}</div>
                </div>
              ))}
              {software.length > 8 && (
                <span className="kd-fs-xs kd-c-faint">
                  … und {software.length - 8} weitere
                </span>
              )}
            </div>
          </div>
          )}
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
    <div data-testid="kosmodata-gedaechtnis" className="kd-grid kd-g5">
      <div className="kd-flex kd-g2 kd-wrap kd-items-center">
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
        <Hairline vertical />
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

      <div className="kd-grid kd-g3">
        {zeilen.map((e) => {
          const kuratiert = istTraining(e);
          const oeffentlich = (e.visibility ?? 'private') === 'public';
          const wirdBefoerdert = befoerdern === e.ts;
          const treffer = wissenTreffer[e.ts];
          const fokussiert = fokusTs === e.ts;
          return (
            <div
              key={e.ts}
              data-testid="gedaechtnis-eintrag"
              data-gedaechtnis-ts={e.ts}
              className={`kd-panel kd-grid kd-g2 kd-p-s3-s4${fokussiert ? ' kd-eintrag--fokus' : ''}`}
            >
              <div className="kd-flex kd-items-center kd-g3 kd-wrap">
                <Badge hue={e.sentiment === 'gut' ? 'var(--k-success)' : 'var(--k-warning)'}>
                  {e.sentiment === 'gut' ? '👍 BEIBEHALTEN' : '👎 VERMEIDEN'}
                </Badge>
                {fokussiert && (
                  <span data-testid="gedaechtnis-fokus">
                    <Badge hue={moduleHue.data}>Querverweis aus Referenz</Badge>
                  </span>
                )}
                <span className="kd-mono kd-fs-xs kd-c-faint">
                  {e.ts.slice(0, 16).replace('T', ' ')}
                </span>
                <div className="kd-fill" />
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

              <div className="kd-fs-md kd-c-soft kd-lh-45">{kuerzeText(e.context, 180)}</div>
              {e.note && (
                <div className="kd-fs-sm kd-italic kd-c-faint">Notiz: {kuerzeText(e.note, 160)}</div>
              )}

              <div className="kd-flex kd-g2 kd-wrap kd-items-center">
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
                      className="kd-befoerdern-eingabe"
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
                <div data-testid="gedaechtnis-wissen-treffer" className="kd-grid kd-g2">
                  {ladeWissen === e.ts && (
                    <span className="kd-fs-xs kd-c-faint">Suche …</span>
                  )}
                  {treffer && treffer.length === 0 && (
                    <span className="kd-fs-xs kd-c-faint">Kein verwandtes Wissen gefunden</span>
                  )}
                  {treffer?.map((h) => (
                    <span key={h.id} className="kd-fs-xs kd-c-soft">
                      {h.docName} · Abschnitt {h.seq + 1}
                    </span>
                  ))}
                </div>
              )}
            </div>
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
  // K5 (Serie F, 0.6.8) — Kategorie-Facette: additiv, Default 'alle' verhält
  // sich exakt wie die bisherige reine Textsuche (kein Vertragsbruch).
  const [kategorieFilter, setKategorieFilter] = useState<ArchivKategorie | 'alle'>('alle');

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

  const gefiltert = useMemo(() => {
    const basis = kategorieFilter === 'alle' ? eintraege : eintraege.filter((e) => e.kategorie === kategorieFilter);
    return sucheArchiv(basis, query);
  }, [eintraege, query, kategorieFilter]);
  const leer = geladen && eintraege.length === 0;

  return (
    <div data-testid="kosmodata-archiv" className="kd-grid kd-g5">
      <div
        data-testid="archiv-hinweis"
        className="kd-fs-sm kd-c-soft kd-lh-50 kd-p-s3-s4 kd-r-sm kd-b-line kd-bg-raised"
      >
        Lokal &amp; privat — nie in die Website. Grosse Bestände bleiben auf der HDD; KosmoOrbit
        führt nur das Verzeichnis (Manifest). Voll-Indexieren der HDD folgt über die HomeStation.
      </div>

      <div data-testid="archiv-form" className="kd-panel kd-grid kd-g3 kd-p-s4-s5">
        <div className="k-titel kd-fs-lg">Bestand manuell erfassen</div>
        <div className="kd-flex kd-g3 kd-wrap">
          <input
            data-testid="archiv-feld-name"
            placeholder="Name (z.B. «Projekte 2010–2020»)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="kd-eingabe kd-eingabe--surface kd-eingabe--w200"
          />
          <input
            data-testid="archiv-feld-pfad"
            placeholder="HDD-Pfad (z.B. D:\Archiv\Projekte 2010-2020)"
            value={pfad}
            onChange={(e) => setPfad(e.target.value)}
            className="kd-eingabe kd-eingabe--surface kd-eingabe--w260"
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
            className="kd-eingabe kd-eingabe--surface kd-eingabe--w170"
          />
          <input
            data-testid="archiv-feld-notiz"
            placeholder="Notiz (optional)"
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            className="kd-eingabe kd-eingabe--surface kd-eingabe--w200"
          />
        </div>
        <div className="kd-flex kd-g3 kd-items-center kd-wrap">
          <KButton size="sm" tone="accent" data-testid="archiv-hinzu" onClick={() => void hinzufuegen()}>
            Hinzufügen
          </KButton>
          <div className="kd-fill" />
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
            className="kd-hidden"
            onChange={(e) => void ordnerErfasst(e.currentTarget.files)}
          />
          <KButton size="sm" tone="ghost" data-testid="archiv-ordner" onClick={() => ordnerInputRef.current?.click()}>
            Ordner erfassen
          </KButton>
          {!ordnerUnterstuetzt && (
            <span className="kd-fs-xs kd-c-faint">
              Ordner-Auswahl braucht einen Chromium-Browser (Desktop/iPad-App)
            </span>
          )}
        </div>
      </div>

      <div className="kd-flex kd-g2 kd-wrap">
        <KButton
          size="sm"
          tone={kategorieFilter === 'alle' ? 'accent' : 'quiet'}
          data-testid="dach-facette-archiv-alle"
          onClick={() => setKategorieFilter('alle')}
        >
          Alle · {eintraege.length}
        </KButton>
        {ARCHIV_KATEGORIEN.map((k) => (
          <KButton
            key={k}
            size="sm"
            tone={kategorieFilter === k ? 'accent' : 'quiet'}
            data-testid={`dach-facette-archiv-${k}`}
            onClick={() => setKategorieFilter(kategorieFilter === k ? 'alle' : k)}
          >
            {archivKategorieLabel[k]} · {eintraege.filter((e) => e.kategorie === k).length}
          </KButton>
        ))}
      </div>

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

      <div className="kd-grid kd-g3">
        {gefiltert.map((e) => (
          <div key={e.id} data-testid="archiv-eintrag" className="kd-panel kd-grid kd-g2 kd-p-s3-s4">
            <div className="kd-flex kd-items-center kd-g3 kd-wrap">
              <span className="kd-w-550 kd-fs-md">{e.name}</span>
              <Badge hue={moduleHue.doc}>{archivKategorieLabel[e.kategorie]}</Badge>
              <Badge hue={e.quelle === 'ordner' ? moduleHue.asset : 'var(--k-ink-faint)'}>
                {archivQuelleLabel[e.quelle]}
              </Badge>
              <div className="kd-fill" />
              <KButton size="sm" tone="ghost" data-testid="archiv-entfernen" onClick={() => void entfernen(e)}>
                Entfernen
              </KButton>
            </div>
            <div className="kd-mono kd-fs-sm kd-c-soft">{e.pfad}</div>
            <div className="kd-fs-xs kd-c-faint kd-flex kd-g3 kd-wrap">
              <span>{formatGroesse(e.groesseBytes)}</span>
              {e.dateien !== undefined && (
                <span>
                  {e.dateien} {e.dateien === 1 ? 'Datei' : 'Dateien'}
                </span>
              )}
            </div>
            {e.notiz && <div className="kd-fs-sm kd-italic kd-c-faint">{e.notiz}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
