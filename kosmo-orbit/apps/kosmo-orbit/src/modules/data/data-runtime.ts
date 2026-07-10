import { create } from 'zustand';
import type { Learning } from '@kosmo/ai';
import type { RefEntry } from '@kosmo/data';

/**
 * KosmoData-Laufzeit (v0.6.8 K1, «KosmoData sichtbar») — Laufzeit-Blob-Store
 * für Referenz-Hero-Bilder, nach dem Muster von `modules/vis/vis-runtime.ts`:
 * Laufzeit ≠ Modell. Objekt-URLs/Blobs leben NIE im Doc/Yjs/Undo — sie werden
 * on-demand geholt (nur wenn die Karte sichtbar wird und der Nutzer das
 * Online-Laden nicht deaktiviert hat) und bleiben für die Sitzungsdauer im
 * Speicher (kein `revokeObjectURL` pro Bild — der Cache IST der Zweck).
 *
 * Ehrlichkeits-Vertrag (Owner-Mandat): schlägt der Abruf fehl oder ist er
 * nicht erlaubt, zeigt die Karte KEIN kaputtes `<img>`, sondern den
 * deterministischen Tusche-Platzhalter je Typologie plus die ehrliche Zeile
 * «Bild nicht lokal — Quelle: <domain>».
 */

/** Nutzer-Schalter: '0' = Online-Bildabruf aus (Default: an). */
export const BILDER_ONLINE_KEY = 'kosmo.data.bilderOnline';

export type HeroBildZustand =
  | { status: 'laedt' }
  | { status: 'lokal'; objectUrl: string }
  | { status: 'nichtLokal'; quelle: string };

interface DataRuntime {
  bilder: Record<string, HeroBildZustand>;
  setzeBild: (refId: string, zustand: HeroBildZustand) => void;
}

export const useDataRuntime = create<DataRuntime>((set) => ({
  bilder: {},
  setzeBild: (refId, zustand) => set((s) => ({ bilder: { ...s.bilder, [refId]: zustand } })),
}));

/** true, wenn die URL einen fremden Host anspricht (http/https absolut). */
export function istExterneUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Ehrliche Quellen-Angabe für die «Bild nicht lokal»-Zeile: bei externen
 * URLs der Hostname (z.B. `upload.wikimedia.org`), bei relativen Pfaden der
 * eingebaute Build-Bestand (die Datei fehlt dann schlicht im Build).
 */
export function bildQuelle(url: string): string {
  if (istExterneUrl(url)) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
  return 'Build-Bestand';
}

/**
 * Darf die Laufzeit externe Bild-URLs abrufen? Drei ehrliche Neins:
 *  1. Unter Playwright/WebDriver NIE (E2E dürfen keinen fetch nach aussen
 *     machen — `navigator.webdriver` ist dort immer gesetzt).
 *  2. Wenn der Nutzer das Online-Laden abgeschaltet hat (`kosmo.data.
 *     bilderOnline` = '0', Laufzeit-Einstellung, kein Doc-Zustand).
 *  3. Wenn der Browser offline ist (der Versuch wäre nur ein Fehler-Toast).
 */
export function onlineBilderErlaubt(): boolean {
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
  try {
    if (localStorage.getItem(BILDER_ONLINE_KEY) === '0') return false;
  } catch {
    /* privates Fenster — Default gilt */
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  return true;
}

/**
 * Holt das Hero-Bild einer Referenz on-demand in den Laufzeit-Store —
 * idempotent (ein zweiter Aufruf für dieselbe Referenz ist ein No-Op, auch
 * während des Ladens). Relative Pfade (eigener Build) werden immer
 * versucht (same-origin, kein Netz nach aussen); externe URLs nur, wenn
 * `onlineBilderErlaubt()` — sonst sofort ehrlich `nichtLokal`.
 */
export async function ladeHeroBild(refId: string, heroUrl: string): Promise<void> {
  const store = useDataRuntime.getState();
  if (store.bilder[refId]) return;
  const quelle = bildQuelle(heroUrl);
  if (istExterneUrl(heroUrl) && !onlineBilderErlaubt()) {
    store.setzeBild(refId, { status: 'nichtLokal', quelle });
    return;
  }
  store.setzeBild(refId, { status: 'laedt' });
  try {
    const res = await fetch(heroUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error(`kein Bild: ${blob.type || 'unbekannt'}`);
    const objectUrl = URL.createObjectURL(blob);
    useDataRuntime.getState().setzeBild(refId, { status: 'lokal', objectUrl });
  } catch {
    useDataRuntime.getState().setzeBild(refId, { status: 'nichtLokal', quelle });
  }
}

/* ------------------------------------------------------------------ */
/* K1 — deterministischer Tusche-Platzhalter je Typologie              */
/* ------------------------------------------------------------------ */

/**
 * Billiger, stabiler Hash (FNV-1a-artig) — macht den Platzhalter je
 * Referenz-Id deterministisch: dieselbe Referenz zeichnet über Sitzungen
 * und Geräte hinweg exakt dasselbe Piktogramm.
 */
export function refHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Strichpiktogramm je Typologie im Werkplan-Stil — monochrome SVG-Pfade
 * (viewBox 0 0 48 34, Stroke zeichnet der Aufrufer mit `--k-ink-faint`).
 * Deterministisch aus der Referenz-Id: der Hash variiert je Motiv 1–2
 * Parameter (Dachform, Linienzahl, Versatz), erfindet aber nie Inhalt —
 * es bleibt ein ehrliches Piktogramm der Kategorie, kein Fake-Foto.
 */
export function tuschePfade(id: string, entryType?: string | undefined): string[] {
  const h = refHash(id);
  const boden = 'M4 30 H44';
  switch (entryType) {
    case 'building': {
      // Haus im Schnitt: zwei Wände, Decke, Dachform je Hash (Flach/Sattel/Pult).
      const dach = h % 3;
      const first =
        dach === 0
          ? 'M10 12 H38' // Flachdach
          : dach === 1
            ? 'M10 14 L24 5 L38 14' // Satteldach
            : 'M10 15 L38 8'; // Pultdach
      return [boden, 'M10 30 V12 M38 30 V12', first, 'M14 30 V22 H20 V30', 'M26 22 H33 V27 H26 Z'];
    }
    case 'urban_plan': {
      // Stadtraster: Blockfeld, ein Block je Hash betont (Schraffur-Kreuz).
      const bx = 8 + (h % 3) * 12;
      const by = 8 + ((h >> 4) % 2) * 10;
      return [
        'M6 6 H42 V28 H6 Z',
        'M18 6 V28 M30 6 V28 M6 16 H42',
        `M${bx} ${by} l8 6 M${bx + 8} ${by} l-8 6`,
      ];
    }
    case 'landscape_project': {
      // Höhenlinien: 3–5 Kurven je Hash + Baumsignet.
      const n = 3 + (h % 3);
      const kurven: string[] = [];
      for (let i = 0; i < n; i++) {
        const y = 26 - i * 5;
        const amp = 2 + ((h >> (i * 3)) % 3);
        kurven.push(`M4 ${y} Q16 ${y - amp} 24 ${y} T44 ${y}`);
      }
      return [...kurven, 'M36 12 l3 -6 l3 6 Z M39 12 V16'];
    }
    case 'infrastructure':
      // Brücke: Fahrbahn, Bogen, Pfeiler (Pfeilerzahl je Hash 2–3).
      return [
        'M4 14 H44',
        'M8 28 Q24 6 40 28',
        h % 2 === 0 ? 'M16 14 V22 M32 14 V22' : 'M14 14 V24 M24 14 V17 M34 14 V24',
        boden,
      ];
    case 'text': {
      // Schriftblock: Initial-Quadrat + Zeilen variabler Länge je Hash.
      const zeilen: string[] = [];
      for (let i = 0; i < 4; i++) {
        const b = 24 + ((h >> (i * 4)) % 14);
        zeilen.push(`M18 ${9 + i * 5} H${Math.min(44, 18 + b)}`);
      }
      return ['M6 6 H14 V14 H6 Z', ...zeilen, 'M6 29 H36'];
    }
    case 'theory':
      // Diagramm: Kreis + Achsenkreuz, Sekante je Hash gedreht.
      return [
        'M24 17 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0',
        'M24 2 V32 M9 17 H39',
        h % 2 === 0 ? 'M15 8 L33 26' : 'M33 8 L15 26',
      ];
    case 'map': {
      // Karte: Rahmen, mäandrierender Weg je Hash, Nordpfeil.
      const kx = 12 + (h % 8);
      return [
        'M6 4 H42 V30 H6 Z',
        `M6 24 Q${kx} 18 24 20 T42 10`,
        'M37 8 l2.5 6 l-2.5 -2 l-2.5 2 Z',
      ];
    }
    case 'object':
      // Objekt: Axo-Quader (wie das bisherige Referenz-Signet, kompakter).
      return ['M24 4 38 11 24 18 10 11Z', 'M38 11 V24 M24 18 V31 M10 11 V24', 'M38 24 24 31 10 24'];
    case 'event':
      // Ereignis: Punkt mit radialen Strichen (Strahlenzahl je Hash 6/8).
      return [
        'M24 17 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0',
        (h % 2 === 0
          ? [0, 45, 90, 135, 180, 225, 270, 315]
          : [0, 60, 120, 180, 240, 300]
        )
          .map((g) => {
            const r = (g * Math.PI) / 180;
            const x1 = 24 + Math.cos(r) * 7;
            const y1 = 17 + Math.sin(r) * 7;
            const x2 = 24 + Math.cos(r) * 12;
            const y2 = 17 + Math.sin(r) * 12;
            return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`;
          })
          .join(' '),
      ];
    default:
      // Unbekannte Typologie: Messrahmen-Motiv (Rechteck + Achsenkreuz).
      return ['M8 6 H40 V28 H8 Z', 'M24 2 V32 M4 17 H44'];
  }
}

/* ------------------------------------------------------------------ */
/* K8 — Gedächtnis-Querverweise (refId zuerst, Text-Match als Fallback) */
/* ------------------------------------------------------------------ */

/** Wie ein Gedächtnis-Eintrag zur Referenz gefunden wurde — ehrlich sichtbar
 * im UI (Meta-Zeile «verknüpft» vs. «Texttreffer»), statt beides zu vermengen. */
export type GedaechtnisMatchArt = 'verknuepft' | 'text';

export interface GedaechtnisTreffer extends Learning {
  /**
   * v0.6.9 (Stream B): 'verknuepft' = der Eintrag trägt `refId === referenz.id`
   * (persistierte Kante, seit die 👍/👎-Feedbackstellen im Referenz-Kontext
   * die aktive Referenz-Id mitschreiben). 'text' = Fallback für Alteinträge
   * ohne `refId` — der bisherige textbasierte Treffer (Titel/Id wörtlich im
   * Kontext oder in der Notiz genannt).
   */
  matchArt: GedaechtnisMatchArt;
}

/**
 * Gedächtnis-Einträge, die eine Referenz erwähnen. `refId`-Treffer (die
 * persistierte Kante) gehen IMMER vor — Text-Match (Titel/Id wörtlich im
 * Kontext/in der Notiz genannt, case-insensitiv) füllt nur auf, was die
 * Kante nicht liefert; Alteinträge ohne `refId` fallen automatisch auf den
 * bisherigen Weg zurück (keine Migration nötig). Neueste zuerst je Gruppe,
 * gedeckelt.
 */
export function gedaechtnisQuerverweise(
  eintraege: readonly Learning[],
  referenz: Pick<RefEntry, 'id' | 'title'>,
  max = 5,
): GedaechtnisTreffer[] {
  const verknuepft: GedaechtnisTreffer[] = eintraege
    .filter((e) => e.refId === referenz.id)
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .map((e) => ({ ...e, matchArt: 'verknuepft' as const }));

  if (verknuepft.length >= max) return verknuepft.slice(0, max);

  const titel = referenz.title.trim().toLowerCase();
  const idKlein = referenz.id.toLowerCase();
  const verknuepfteTs = new Set(verknuepft.map((e) => e.ts));
  const textTreffer: GedaechtnisTreffer[] =
    titel.length < 3
      ? []
      : eintraege
          .filter((e) => !verknuepfteTs.has(e.ts))
          .filter((e) => {
            const text = `${e.context} ${e.note ?? ''}`.toLowerCase();
            return text.includes(titel) || text.includes(idKlein);
          })
          .sort((a, b) => b.ts.localeCompare(a.ts))
          .map((e) => ({ ...e, matchArt: 'text' as const }));

  return [...verknuepft, ...textTreffer].slice(0, max);
}
