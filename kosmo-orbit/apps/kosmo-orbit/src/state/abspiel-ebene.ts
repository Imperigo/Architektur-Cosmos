import { create } from 'zustand';
import { registriereAbspielVorspiel, type AbspielSchritt } from './abspiel-anschluss';

/**
 * Abspiel-Ebene «Kosmo zeichnet sichtbar» (v0.7.2 §7, Paket 06.8, Stufe 1 —
 * Stream W3-E). Reiner LAUFZEIT-Store (Laufzeit ≠ Modell, CLAUDE.md): nichts
 * hier läuft je durch Yjs/Undo — das Overlay ist ein VORSPIEL, der atomare
 * `applyPaket` in `KosmoPanel.tsx` bleibt byte-identisch und läuft IMMER,
 * sobald das Vorspiel-Promise auflöst (Anschluss: `state/abspiel-anschluss.ts`,
 * das Vorspiel kann den Apply nur verzögern, nie verhindern).
 *
 * MEHRSPURIG angelegt (Schwarm-Vorbereitung 0.7.3): der Store hält eine
 * LISTE von Spuren, jede mit eigenem Orb-Index und eigenem Schritt-Stapel —
 * Stufe 1 startet aber pro Vorspiel genau EINE Spur (ein Orb), und das
 * Overlay (`modules/design/KosmoZeichnet.tsx`) spielt nur `spuren[0]`.
 * Die API (starteSpur/spurFertig je Spur-Id, stoppeAlle über alle) trägt
 * den Schwarm bereits, ohne dass 0.7.3 sie brechen muss.
 *
 * ── Abbruch-Pfade (dokumentierter Testpfad, Spec §7) ─────────────────────
 * Das Vorspiel löst SOFORT auf (⇒ unveränderter Direkt-Apply), wenn
 *   1. `navigator.webdriver` an ist (Playwright/CI — ~40 Bestands-Specs und
 *      alle kosmo-journey*-Läufe sehen exakt das heutige Verhalten),
 *   2. `prefers-reduced-motion: reduce` gilt (gewinnt gegen ALLES, auch
 *      gegen den Test-Hook unten),
 *   3. die Einstellung `kosmo.abspielen` auf `'0'` steht (Default AN; der
 *      Schalter selbst kommt erst mit Stream W4-H in `Einstellungen.tsx` —
 *      hier wird der localStorage-Key nur GELESEN),
 *   4. gar kein Overlay gemountet ist (z.B. KosmoDesign geschlossen) — ohne
 *      Zeichenfläche gäbe es nichts zu zeigen, der Apply darf nie warten.
 * Laufzeit-Abbruch: ESC (oder der Stopp-Chip) = `stoppeAlle()` ⇒ alle
 * Vorspiel-Promises lösen sofort auf; Leertaste = Pause/Weiter.
 *
 * ── Test-Hook (E2E, `e2e/kosmo-zeichnet.spec.ts`) ────────────────────────
 * `localStorage['kosmo.abspielen'] = 'erzwingen'` hebt NUR die webdriver-
 * Sperre auf (Playwright will das Overlay gezielt sehen). reduced-motion
 * bleibt auch dann ein hartes Veto — genau so beweist der Spec-Fall (c),
 * dass reduced-motion nie ein Overlay bekommt.
 *
 * ── Sicherheits-Wache ────────────────────────────────────────────────────
 * Jede Spur trägt einen absoluten Zeit-Deckel (`wacheMs`). Läuft er ab
 * (Render-Stau, Tab im Hintergrund drosselt rAF, Mensch pausiert und geht
 * in die Mittagspause), löst die Spur trotzdem auf — der Apply darf unter
 * KEINEN Umständen unbegrenzt hängen (Undo-Atomarität/§11 hängt daran,
 * dass der Apply immer stattfindet).
 */

// ─────────────────────────────────────────────────────────────────────────
// Gate: Wann darf überhaupt abgespielt werden?
// ─────────────────────────────────────────────────────────────────────────

/** Einstellung `kosmo.abspielen` — Default AN, `'0'` = aus (Schalter: W4-H). */
export function abspielenEingestellt(): boolean {
  try {
    return typeof localStorage === 'undefined' || localStorage.getItem('kosmo.abspielen') !== '0';
  } catch {
    return true;
  }
}

/**
 * Alle Abbruch-Pfade aus dem Datei-Kopf in EINER Funktion. Reihenfolge ist
 * Vertrag: Einstellung aus → reduced-motion (Veto über alles, auch über
 * `'erzwingen'`) → webdriver (nur durch `'erzwingen'` aufhebbar).
 */
export function abspielenAktiv(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (!abspielenEingestellt()) return false;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    const erzwungen = typeof localStorage !== 'undefined' && localStorage.getItem('kosmo.abspielen') === 'erzwingen';
    if (typeof navigator !== 'undefined' && navigator.webdriver === true && !erzwungen) return false;
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Spur-Store (mehrspurig — Stufe 1 nutzt genau eine Spur pro Vorspiel)
// ─────────────────────────────────────────────────────────────────────────

export interface AbspielSpur {
  id: string;
  /** Orb-Index fürs Schwarm-Layout (0.7.3) — Stufe 1: der jeweils nächste freie Index. */
  orb: number;
  schritte: readonly AbspielSchritt[];
}

interface AbspielEbeneZustand {
  spuren: readonly AbspielSpur[];
  /** Globale Pause (Leertaste) — gilt für ALLE Spuren, das rAF liest sie je Frame. */
  pausiert: boolean;
  /** Legt eine Spur an (löst NICHT selbst auf — das tut `spurFertig`/die Wache). */
  starteSpur: (schritte: readonly AbspielSchritt[]) => AbspielSpur;
  /** Beendet EINE Spur: löst ihr Vorspiel-Promise auf und räumt sie weg. Idempotent. */
  spurFertig: (spurId: string) => void;
  /** ESC/Stopp-Chip: beendet ALLE Spuren sofort (⇒ alle Applies laufen los). */
  stoppeAlle: () => void;
  setzePause: (v: boolean) => void;
  pauseUmschalten: () => void;
}

/** Auflöser + Wach-Timer je Spur — Modul-Maps statt Store-Feldern (nicht renderrelevant). */
const aufloeser = new Map<string, () => void>();
const wachen = new Map<string, ReturnType<typeof setTimeout>>();

let spurZaehler = 0;

/** Absoluter Zeit-Deckel je Spur (s. Datei-Kopf «Sicherheits-Wache»). */
export function wacheMs(schrittAnzahl: number): number {
  return Math.min(8000 + schrittAnzahl * 5000, 45000);
}

export const useAbspielEbene = create<AbspielEbeneZustand>((set, get) => ({
  spuren: [],
  pausiert: false,
  starteSpur: (schritte) => {
    spurZaehler += 1;
    const spur: AbspielSpur = {
      id: `spur-${spurZaehler}`,
      orb: get().spuren.length,
      schritte,
    };
    set((s) => ({ spuren: [...s.spuren, spur] }));
    return spur;
  },
  spurFertig: (spurId) => {
    const wache = wachen.get(spurId);
    if (wache !== undefined) {
      clearTimeout(wache);
      wachen.delete(spurId);
    }
    const loese = aufloeser.get(spurId);
    aufloeser.delete(spurId);
    set((s) => {
      const spuren = s.spuren.filter((sp) => sp.id !== spurId);
      // Letzte Spur weg → Pause zurücksetzen (eine «hängende» Pause dürfte
      // sonst das NÄCHSTE Vorspiel eingefroren starten).
      return spuren.length === 0 ? { spuren, pausiert: false } : { spuren };
    });
    loese?.();
  },
  stoppeAlle: () => {
    for (const spur of [...get().spuren]) get().spurFertig(spur.id);
  },
  setzePause: (v) => set({ pausiert: v }),
  pauseUmschalten: () => set((s) => ({ pausiert: !s.pausiert })),
}));

/**
 * Startet ein Vorspiel als EINE neue Spur und liefert das Promise, das
 * `KosmoPanel.applyPaket` awaitet. Aufgelöst wird über `spurFertig`
 * (Overlay fertig / ESC / Wache) — nie hier drin.
 */
export function starteVorspiel(schritte: readonly AbspielSchritt[]): Promise<void> {
  return new Promise<void>((resolve) => {
    const spur = useAbspielEbene.getState().starteSpur(schritte);
    aufloeser.set(spur.id, resolve);
    wachen.set(
      spur.id,
      setTimeout(() => useAbspielEbene.getState().spurFertig(spur.id), wacheMs(schritte.length)),
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Anschluss-Registrierung + Overlay-Anmeldung
// ─────────────────────────────────────────────────────────────────────────

/** Das am Anschluss registrierte Vorspiel — prüft ALLE Abbruch-Pfade. */
function vorspielFuer(schritte: readonly AbspielSchritt[]): Promise<void> | void {
  if (schritte.length === 0) return;
  if (overlayAnzahl === 0) return; // keine Zeichenfläche gemountet → Direkt-Apply
  if (!abspielenAktiv()) return; // webdriver / reduced-motion / Einstellung aus → Direkt-Apply
  return starteVorspiel(schritte);
}

let overlayAnzahl = 0;
let anschlussAbmelden: (() => void) | null = null;

/**
 * Vom Overlay (`KosmoZeichnet.tsx`) beim Mount gerufen; Rückgabe = Abmelden
 * (Unmount). Erst mit dem ERSTEN Overlay registriert sich die Ebene am
 * Anschluss (`registriereAbspielVorspiel`), mit dem letzten meldet sie sich
 * ab UND stoppt laufende Spuren — ein Unmount mitten im Abspiel darf den
 * wartenden Apply keine Sekunde länger blockieren.
 */
export function meldeOverlayAn(): () => void {
  overlayAnzahl += 1;
  if (overlayAnzahl === 1) {
    anschlussAbmelden = registriereAbspielVorspiel(vorspielFuer);
  }
  let angemeldet = true;
  return () => {
    if (!angemeldet) return;
    angemeldet = false;
    overlayAnzahl -= 1;
    if (overlayAnzahl === 0) {
      anschlussAbmelden?.();
      anschlussAbmelden = null;
      useAbspielEbene.getState().stoppeAlle();
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Pfad-Ableitung: Schritt → Welt-Polylinien (pure, unit-testbar)
// ─────────────────────────────────────────────────────────────────────────

export interface WeltPunkt {
  x: number;
  y: number;
}

export interface WeltPfad {
  /** Punktzug in Doc-Weltkoordinaten (mm, Y wie im Modell — der Zeichner negiert selbst). */
  punkte: readonly WeltPunkt[];
  geschlossen: boolean;
  /**
   * 'element' = echte Geometrie aus den Command-Params ·
   * 'umkreisung' = ehrlicher Fallback: der Orb umkreist nur den betroffenen
   * Vorschau-Ausschnitt (`ProposalVorschau`-viewBox), weil die Params keine
   * zeichenbare Geometrie tragen (z.B. reine Settings-/Id-Commands).
   */
  art: 'element' | 'umkreisung';
}

function istPunkt(v: unknown): v is WeltPunkt {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as WeltPunkt).x === 'number' &&
    Number.isFinite((v as WeltPunkt).x) &&
    typeof (v as WeltPunkt).y === 'number' &&
    Number.isFinite((v as WeltPunkt).y)
  );
}

/** Rauten-Radius für Punkt-Platzierungen (`at`) — 350mm liest sich im Plan als Marker. */
const PUNKT_RADIUS_MM = 350;

/** `viewBox="minX minY b h"` aus einem Vorschau-SVG (Plan-SVG-Koordinaten, y = −Welt). */
function parseViewBox(svg: string): { minX: number; minY: number; b: number; h: number } | null {
  const m = svg.match(/viewBox="([-\d.eE]+)[ ,]+([-\d.eE]+)[ ,]+([-\d.eE]+)[ ,]+([-\d.eE]+)"/);
  if (!m) return null;
  const [minX, minY, b, h] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (![minX, minY, b, h].every(Number.isFinite) || b <= 0 || h <= 0) return null;
  return { minX, minY, b, h };
}

/**
 * Leitet die zeichenbaren Welt-Pfade eines Schritts ab — Quelle 1 sind die
 * Command-Params (dieselben Geometrie-Konventionen wie der ganze Kernel:
 * `a`/`b` = Achse (Wand/Träger/Treppe/Achse), `outline` = Polygon (Decke/
 * Zone/Volumen/Dach/Baulinie), `at` = Punkt-Platzierung (Stütze/Möbel/…)),
 * Quelle 2 (Fallback) der Vorschau-Ausschnitt aus `state/proposal-vorschau.ts`.
 * Liefert `[]`, wenn beides fehlt — das Overlay zeigt dann nur Orb + Chip.
 */
export function weltPfadeFuerSchritt(schritt: AbspielSchritt): WeltPfad[] {
  const params =
    schritt.params !== null && typeof schritt.params === 'object'
      ? (schritt.params as Record<string, unknown>)
      : {};
  const raus: WeltPfad[] = [];

  const a = params['a'];
  const b = params['b'];
  if (istPunkt(a) && istPunkt(b)) {
    raus.push({ punkte: [a, b], geschlossen: false, art: 'element' });
  }

  const outline = params['outline'];
  if (Array.isArray(outline) && outline.length >= 2 && outline.every(istPunkt)) {
    raus.push({ punkte: outline, geschlossen: outline.length >= 3, art: 'element' });
  }

  const at = params['at'];
  if (istPunkt(at)) {
    raus.push({
      punkte: [
        { x: at.x + PUNKT_RADIUS_MM, y: at.y },
        { x: at.x, y: at.y + PUNKT_RADIUS_MM },
        { x: at.x - PUNKT_RADIUS_MM, y: at.y },
        { x: at.x, y: at.y - PUNKT_RADIUS_MM },
      ],
      geschlossen: true,
      art: 'element',
    });
  }

  if (raus.length > 0) return raus;

  const vb = schritt.vorschau ? parseViewBox(schritt.vorschau.nachherSvg) : null;
  if (vb) {
    // Plan-SVG → Welt: y zurückspiegeln (planInnerSvg zeichnet bei −weltY).
    return [
      {
        punkte: [
          { x: vb.minX, y: -vb.minY },
          { x: vb.minX + vb.b, y: -vb.minY },
          { x: vb.minX + vb.b, y: -(vb.minY + vb.h) },
          { x: vb.minX, y: -(vb.minY + vb.h) },
        ],
        geschlossen: true,
        art: 'umkreisung',
      },
    ];
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────
// Test-Hook (Playwright) — Muster `window.__kosmoStatus` (`kosmo-status.ts`)
// ─────────────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  (window as never as Record<string, unknown>)['__kosmoAbspiel'] = {
    aktiv: () => abspielenAktiv(),
    spuren: () => useAbspielEbene.getState().spuren.length,
    pausiert: () => useAbspielEbene.getState().pausiert,
    stoppen: () => useAbspielEbene.getState().stoppeAlle(),
  };
}
