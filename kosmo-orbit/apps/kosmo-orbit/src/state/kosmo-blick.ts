import { useVisRuntime } from '../modules/vis/vis-runtime';
import { bildBlob } from '../modules/vis/vis-jobs';
import { useProject } from './project-store';

/**
 * Kosmo-Blick (v0.6.8 «Kosmo sieht mit», Owner-Nachtrag) — die Capture-
 * Schicht: je aktiver Station das EHRLICHSTE Bild, das ohne Vortäuschung zu
 * bekommen ist. Ausdrücklich KEIN Pixel-Zwang: eine Station ohne sinnvolles
 * Bild liefert einen strukturierten Text-Kontext statt eines erfundenen/
 * irreführenden Screenshots.
 *
 * Bewusst reine Laufzeit (wie `modules/vis/vis-runtime.ts`): ein Blick ist
 * ein Base64-Bild oder ein paar Sätze Text, beides gehört NIE ins Doc/Undo/
 * Yjs-Sync (CLAUDE.md «Laufzeit ≠ Modell»).
 *
 * Stations-Erkennung ist bewusst DOM-basiert: `KosmoPanel` bekommt die
 * aktive App-`Screen` NICHT als Prop (App.tsx bleibt in diesem Stream
 * unangetastet) — die bereits vorhandenen, stabilen `data-testid`s der
 * Stations-Werkzeugleisten/-Einstellungsknöpfe sind der einzige Anker, der
 * ohne einen zweiten globalen State-Kanal auskommt.
 */

export type StationId =
  | 'design'
  | 'vis'
  | 'data'
  | 'publish'
  | 'prepare'
  | 'train'
  | 'doc'
  | 'dev'
  | 'asset'
  | 'unbekannt';

export interface Station {
  id: StationId;
  titel: string;
}

/** Reihenfolge ist Priorität: der erste im DOM gefundene Anker gewinnt. In
 * `viewMode:'quad'` (KosmoDesign) sind mehrere Anker gleichzeitig sichtbar —
 * das ist beabsichtigt kein Konflikt, es gibt dort ohnehin nur EINE Station. */
const STATIONS: readonly { id: Exclude<StationId, 'unbekannt'>; titel: string; anker: string }[] = [
  { id: 'design', titel: 'KosmoDesign', anker: 'station-einstellungen-design' },
  { id: 'vis', titel: 'KosmoVis', anker: 'station-einstellungen-vis' },
  { id: 'data', titel: 'KosmoData', anker: 'station-einstellungen-data' },
  { id: 'publish', titel: 'KosmoPublish', anker: 'station-einstellungen-publish' },
  { id: 'prepare', titel: 'KosmoPrepare', anker: 'prepare-werkzeugleiste' },
  { id: 'train', titel: 'KosmoTrain', anker: 'train-werkzeugleiste' },
  { id: 'doc', titel: 'KosmoDoc', anker: 'doc-werkzeugleiste' },
  { id: 'dev', titel: 'KosmoDev', anker: 'dev-werkzeugleiste' },
  { id: 'asset', titel: 'KosmoAsset', anker: 'asset-werkzeugleiste' },
];

/** Welche Station ist gerade offen? `'unbekannt'` = Zentrale (kein Workspace
 * gemountet) oder KosmoSpeak — dort gibt es ehrlich nichts zu erfassen. */
export function erkenneAktiveStation(): Station {
  if (typeof document === 'undefined') return { id: 'unbekannt', titel: 'Kosmo' };
  for (const s of STATIONS) {
    if (document.querySelector(`[data-testid="${s.anker}"]`)) return { id: s.id, titel: s.titel };
  }
  return { id: 'unbekannt', titel: 'Zentrale' };
}

export interface BlickBild {
  mediaType: string;
  dataBase64: string;
  /** Dokumentarisch, woher das Bild kam — Chat-Zeile/Debug, kein Vertrag. */
  quelle: 'viewport3d' | 'planview' | 'schnitt' | 'node-canvas' | 'vis-render';
}

export interface Blick {
  station: StationId;
  stationTitel: string;
  /** Date.now() beim Erfassen — Ring-Identität, Alters-Anzeige. */
  zeit: number;
  bild?: BlickBild;
  /** Strukturierter Text-Fallback — gesetzt GENAU DANN, wenn `bild` fehlt. */
  text?: string;
}

/** `data:<mediaType>;base64,<...>` → die beiden Teile, die die Provider brauchen. */
function ausDataUrl(dataUrl: string): { mediaType: string; dataBase64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  return m ? { mediaType: m[1]!, dataBase64: m[2]! } : null;
}

/**
 * 3D-Viewport (design-Station): der neue `captureFrame`-Hook in
 * Viewport3D.tsx — EIN frischer Frame, synchron danach `toDataURL`. `null`,
 * solange kein Viewport gemountet ist (z.B. `viewMode:'2d'`) oder kein Frame
 * zu holen war — dann übernimmt der SVG- bzw. Text-Fallback.
 */
function erfasseViewport3d(): BlickBild | null {
  const hook = (window as unknown as { __kosmoViewport?: { captureFrame?: () => string | null } }).__kosmoViewport;
  const capture = hook?.captureFrame;
  if (!capture) return null;
  try {
    const dataUrl = capture();
    if (!dataUrl) return null;
    const teile = ausDataUrl(dataUrl);
    return teile ? { ...teile, quelle: 'viewport3d' } : null;
  } catch {
    return null;
  }
}

/**
 * Ein sichtbares SVG (PlanView/SectionView/NodeCanvas) → Rasterbild.
 * XMLSerializer → Blob → `Image` → Canvas → `toDataURL` (kein SDK, keine
 * dritte Abhängigkeit). Das SVG selbst setzt seine Grösse nur über CSS
 * (`width/height:100%`), darum bekommt der geklonte Knoten VOR der
 * Serialisierung die tatsächliche Pixelgrösse (`getBoundingClientRect`)
 * explizit gesetzt — sonst rastert `Image` mit dem SVG-Default 300×150.
 *
 * Scheitert ehrlich mit `null` (kaputtes/leeres Bild ist schlimmer als gar
 * keins) — bekannte Risiken: `foreignObject`-Inhalte, die der Browser beim
 * Rasterisieren eines fremd-origin-losen (aber dennoch strengen) Canvas
 * verweigert, und Headless-Chromium unter SwiftShader, wo Bild-Decoding
 * gelegentlich strenger/langsamer ist als mit echter GPU.
 */
async function erfasseSvg(el: SVGSVGElement, quelle: BlickBild['quelle']): Promise<BlickBild | null> {
  try {
    const rect = el.getBoundingClientRect();
    const breite = Math.max(1, Math.round(rect.width)) || 800;
    const hoehe = Math.max(1, Math.round(rect.height)) || 600;
    const klon = el.cloneNode(true) as SVGSVGElement;
    klon.setAttribute('width', String(breite));
    klon.setAttribute('height', String(hoehe));
    if (!klon.getAttribute('xmlns')) klon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const markup = new XMLSerializer().serializeToString(klon);
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const bild = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('SVG liess sich nicht als Bild laden'));
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = breite;
      canvas.height = hoehe;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      // Planpapier-Grund statt transparent — ein leeres Alpha-PNG ist für ein
      // vision-Modell kaum von einem defekten Bild zu unterscheiden.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, breite, hoehe);
      ctx.drawImage(bild, 0, 0, breite, hoehe);
      const teile = ausDataUrl(canvas.toDataURL('image/png'));
      return teile ? { ...teile, quelle } : null;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

async function erfasseDesignBlick(): Promise<BlickBild | null> {
  const dreiD = erfasseViewport3d();
  if (dreiD) return dreiD;
  const plan = document.querySelector<SVGSVGElement>('svg[data-testid="planview"]');
  if (plan) {
    const bild = await erfasseSvg(plan, 'planview');
    if (bild) return bild;
  }
  const schnitt = document.querySelector<SVGSVGElement>('svg[data-testid^="section-"]');
  if (schnitt) {
    const bild = await erfasseSvg(schnitt, 'schnitt');
    if (bild) return bild;
  }
  return null;
}

/** `Blob` → `data:<type>;base64,<...>` (FileReader) — dasselbe Muster wie
 * `modules/vis/vis-jobs.ts` `bildAufsBlatt` fürs Publish-Blatt. */
function blobZuDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Bild nicht lesbar'));
    r.readAsDataURL(blob);
  });
}

/**
 * Der jüngste FERTIGE Render-Lauf mit Bild (`vis-runtime.ts`) — kein neuer
 * Render-Auftrag, nur das, was ohnehin schon auf dem Bildschirm/im Store liegt.
 *
 * FIX (v0.6.9 Stream D, «Kosmo-Blick fertig beweisen»): `NodeLauf.bild` ist
 * ENTGEGEN der ursprünglichen 0.6.8-Annahme dieser Datei KEINE dataURL,
 * sondern nur der Bild-DATEINAME des Bridge-Jobs (`NodeCanvas.tsx`:
 * `patchLauf(nodeId, { ..., bild: j.result.images[0] ?? '' })`). Das echte
 * Bild liegt erst hinter einem authentifizierten Bridge-Fetch (`vis-jobs.ts`
 * `bildBlob`, dasselbe Muster wie `bildAufsBlatt` fürs Publish-Blatt). Die
 * alte Version versuchte den Dateinamen direkt mit `ausDataUrl` zu parsen —
 * das schlug IMMER lautlos fehl (kein `data:`-Präfix), der Blick fiel
 * unbemerkt auf den Node-Canvas-Screenshot zurück. `quelle:'vis-render'`
 * wurde dadurch NIE tatsächlich vergeben — ein e2e-Beweisversuch
 * (`e2e/kosmo-blick-2.spec.ts`) deckte das auf. Owner-Mandat «Ehrlichkeit vor
 * Politur»: minimal gefixt statt kaschiert, kein neuer Render-Auftrag nötig.
 */
async function neuesterFertigerLaufBild(): Promise<BlickBild | null> {
  const laeufe = useVisRuntime.getState().laeufe;
  let bester: { jobId: string; bild: string } | null = null;
  let besteZeit = -1;
  for (const lauf of Object.values(laeufe)) {
    if (lauf.status !== 'fertig' || !lauf.bild || !lauf.jobId) continue;
    const zeit = lauf.gestartetUm ?? 0;
    if (zeit >= besteZeit) {
      besteZeit = zeit;
      bester = { jobId: lauf.jobId, bild: lauf.bild };
    }
  }
  if (!bester) return null;
  try {
    const blob = await bildBlob(bester.jobId, bester.bild);
    const teile = ausDataUrl(await blobZuDataUrl(blob));
    return teile ? { ...teile, quelle: 'vis-render' } : null;
  } catch {
    // Bridge nicht erreichbar/Artefakt weg — ehrlich auf den Node-Canvas
    // zurückfallen (Aufrufer) statt eines kaputten/erfundenen Bilds.
    return null;
  }
}

async function erfasseVisBlick(): Promise<BlickBild | null> {
  const renderBild = await neuesterFertigerLaufBild();
  if (renderBild) return renderBild;
  const canvas = document.querySelector<SVGSVGElement>('svg[data-testid="node-canvas"]');
  if (canvas) {
    const bild = await erfasseSvg(canvas, 'node-canvas');
    if (bild) return bild;
  }
  return null;
}

/** data/publish/prepare/train/doc/dev/asset: strukturierter Text statt
 * Pixel-Zwang — ein paar ehrliche Eckdaten des aktuellen Projekts. */
function strukturierterTextKontext(station: Station): string {
  const doc = useProject.getState().doc;
  const geschosse = doc.byKind('storey').length;
  const waende = doc.byKind('wall').length;
  return (
    `Station ${station.titel} — für diese Station gibt es kein Bild-Erfassen ` +
    `(Text-Kontext statt Pixel-Zwang). Projektstand: ${geschosse} Geschoss${geschosse === 1 ? '' : 'e'}, ` +
    `${waende} Wand${waende === 1 ? '' : 'wände'}.`
  );
}

// ---------------------------------------------------------------------------
// Ringpuffer — letzte 3 erfasste Blicke (Laufzeit, NIE im Doc/Yjs).
// ---------------------------------------------------------------------------

const RING_MAX = 3;
let ring: Blick[] = [];

/** Für Anzeige/Debug/E2E-Assertions — schreibgeschützte Sicht auf den Ring. */
export function blickRingPuffer(): readonly Blick[] {
  return ring;
}

function ringEinfuegen(blick: Blick): void {
  ring = [...ring, blick].slice(-RING_MAX);
}

/** E2E-Isolation zwischen Läufen (Modul-Scope überlebt sonst über Test-Grenzen
 * hinweg, wenn dieselbe Seite mehrfach im selben Prozess läuft). */
export function blickRingZuruecksetzen(): void {
  ring = [];
}

/**
 * Reine Auswahlfunktion (exportiert fürs Unit-Testen ohne Modul-State): aus
 * einem Ring die jüngsten `anzahl` Blicke MIT Bild, die nicht `aktuell`
 * selbst sind (Identität über `zeit`).
 *
 * KOSTEN-HINWEIS (ehrlich, Owner-Auftrag): jedes weitere Bild ist ein
 * weiterer Base64-Block im Prompt — mehr Tokens/Bandbreite pro Zug, bei
 * Cloud-Providern auch mehr Kosten. Bewusst auf 1–2 gedeckelt statt den
 * ganzen Ring mitzuschicken, damit eine einfache Frage nicht automatisch
 * die volle Bild-Historie der letzten drei Stationen kostet.
 */
export function waehleErgaenzendeBilder(ring: readonly Blick[], aktuell: Blick, anzahl = 2): BlickBild[] {
  return ring
    .filter((b) => b.zeit !== aktuell.zeit && b.bild)
    .slice(-anzahl)
    .map((b) => b.bild!);
}

/** Bequemer Wrapper für die App: dieselbe Auswahl auf dem Modul-internen Ring. */
export function ergaenzendeBilderAusRing(aktuell: Blick, anzahl = 2): BlickBild[] {
  return waehleErgaenzendeBilder(ring, aktuell, anzahl);
}

/**
 * Erfasst den Blick der übergebenen Station — Design/Vis versuchen zuerst
 * ein Bild, jede andere Station bekommt sofort den Text-Fallback. Ein
 * erfasster Blick landet automatisch im Ringpuffer (s. oben). `null` nur für
 * `station.id === 'unbekannt'` (Zentrale/Speak — nichts Ehrliches zu zeigen).
 */
export async function blickErfassen(station: Station): Promise<Blick | null> {
  if (station.id === 'unbekannt') return null;
  const zeit = Date.now();
  const bild =
    station.id === 'design' ? await erfasseDesignBlick() : station.id === 'vis' ? await erfasseVisBlick() : null;
  const blick: Blick = {
    station: station.id,
    stationTitel: station.titel,
    zeit,
    ...(bild ? { bild } : { text: strukturierterTextKontext(station) }),
  };
  ringEinfuegen(blick);
  return blick;
}
