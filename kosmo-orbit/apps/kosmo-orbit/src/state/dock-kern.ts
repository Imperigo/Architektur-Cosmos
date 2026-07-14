/**
 * Dock-Kern (v0.7.8 Welle 1 / Paket P1 — «Intelligente Werkzeugtabs») — REINE
 * Solver-Funktionen für das neue Docking-System, kein DOM/Store/Persistenz
 * (das übernehmen spätere Pakete, analog zu `arbeitsmodi-kern.ts` vs.
 * `ui-zustand.ts`). Dies ist ein 1:1-Verhaltens-Port der `class Component`-
 * Logikklasse aus dem Design-Handoff-Prototyp
 * `Werkzeug-Dock.dc.html` (solve/waterfill/stack/rowLayout/placeFloats/
 * separate/rowSplitters, Zeilen ~574-694), übersetzt in benannte pure
 * Funktionen statt Klassen-State — damit ist der Solver ohne DOM/React
 * unit-testbar.
 *
 * Warum pur: der Prototyp verwechselt bewusst UI-Zustand (React-State,
 * localStorage, Pointer-Drag) mit reiner Layout-Arithmetik. Für KosmoOrbit
 * trennen wir das: dieser Kern nimmt einen deklarativen Satz Panel-
 * Definitionen + Overrides + ein bereits vermessenes Feld entgegen und
 * liefert Rechtecke — nichts misst hier den DOM, nichts läuft nebenläufig.
 *
 * WICHTIG: TOP/BOT (Kopf-/Fusszeilen-Höhe) sind hier bewusst KEINE
 * Konstanten — im Prototyp sind sie feste Werte einer 1440×900-Demobühne.
 * Die echte App misst ihre Leisten selbst und übergibt das Ergebnis bereits
 * fertig vermessen als `opts.feld` (x/y/w/h). Alle anderen Zahlen (RAIL,
 * GAP, COLLH, STRIP, DOCKH, MIN_VIEWPORT, DEF/MIN/MAX_LEFT/RIGHT) sind
 * unverändert aus dem Prototyp übernommen.
 */

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type DockZone = 'rail' | 'left' | 'right' | 'float';
/**
 * `'top-right'` (v0.7.9 A1) ist die EINE additive Erweiterung dieser Datei
 * seit dem P1-Port — kein zweiter Prototyp-Fund, sondern eine bewusste,
 * rückwärtskompatible Ergänzung: die vier bestehenden Anker deckten «Reihe
 * oben zentriert» (`top`)/«Reihe unten zentriert» (`bottom-center`)/«Stapel
 * unten links» (`bottom-left`) ab, aber keinen «Stapel oben rechts» — genau
 * die Geometrie, die ROADMAP 357/358 als letzte offene Überlappungs-Klasse
 * benennen (die fixen ViewportChrome-Säulen, s. `dock-stationen.ts`s
 * `viewportHudStatuskarte`/`viewportEigenschaften`). Mechanik ist die
 * SPIEGELUNG von `'bottom-left'` (rechtsbündige x-Position statt linksbündige,
 * Stapel-Richtung nach UNTEN statt nach OBEN) mit ZWEI dokumentierten
 * Zusätzen (beides in `placeFloats()` kommentiert): (1) der Stapel beginnt
 * UNTERHALB jeder top-Reihen-Zeile, die seinen x-Bereich schneidet, weil
 * `separate()` eine Oberkante↔Oberkante-Kollision strukturell nie auflösen
 * kann; (2) die Stapel-Höhen werden aufs Feld geklemmt (`fh` = Wunschhöhe),
 * weil die migrierte Säule vorher höhen-adaptiv war. Bestehende Anker/
 * Verhalten (inkl. der top-Reihe) bleiben byte-identisch — der neue Code
 * liest die Reihen-Rechtecke nur; `separate()` selbst ist unverändert. */
export type FloatAnker = 'top' | 'bottom-center' | 'bottom-left' | 'top-right';
export type DockModus = 'A' | 'B';

export interface PanelDef {
  id: string;
  titel: string;
  rolle: 'manuell' | 'pn' | 'pna' | 'agent' | 'memory' | 'generator' | 'ak' | 'system';
  wichtigkeit: number;
  dock: DockZone;
  anker?: FloatAnker;
  min?: number;
  groesse?: number;
  fw?: number;
  fh?: number;
  start: 'offen' | 'zu';
  schliessbar: boolean;
  bewegbar: boolean;
  /**
   * v0.7.8 Welle 2 / Paket P5 (HUD-Floats): reine RENDER-Weiche für
   * `DockPanel.tsx` — der Solver hier kennt/braucht das Feld nicht (kein
   * Einfluss auf `solve()`/`stack()`/`placeFloats()`, nur strukturell
   * durchgereicht). `'schlank'` = kein Dock-Kopf (Titel/Pin/Chevron/Re-Dock),
   * nur ein dünner Griffstreifen zum Ziehen — für HUDs, die als kompakte
   * Glass-Karten ohne eigenes Chrome wirken sollen (Viewport-Modus-Leiste,
   * -Werkzeug-Rail, -Orientierungskreuz, s. `dock-stationen.ts`). Fehlt das
   * Feld (`undefined`), rendert `DockPanel` wie bisher den vollen Kopf.
   */
  floatChrome?: 'voll' | 'schlank';
}

export interface PanelOverride {
  dock?: DockZone;
  anker?: FloatAnker;
  groesse?: number;
  eingeklappt?: boolean;
  angeheftet?: boolean;
  fx?: number;
  fy?: number;
  fw?: number;
  fh?: number;
  geschlossen?: boolean;
}

export interface DockRect {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  eingeklappt: boolean;
  schwebend?: boolean;
}

export interface DockSplitterZone {
  id: string;
  art: 'col-left' | 'col-right' | 'row';
  a?: string;
  b?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SolveErgebnis {
  rects: Record<string, DockRect>;
  viewport: DockRect;
  splitters: DockSplitterZone[];
}

export interface SolveOptionen {
  feld: { x: number; y: number; w: number; h: number };
  modus: DockModus;
  leftW: number;
  rightW: number;
  overrides: Record<string, PanelOverride>;
  gedraggtId?: string;
  floatGesperrtId?: string;
  zuletztGeoeffnet?: string;
}

// ---------------------------------------------------------------------------
// Konstanten (1:1 aus dem Prototyp — RAIL..DOCKH sind `this.RAIL` etc.,
// DEF/MIN/MAX_LEFT/RIGHT sind die Default- und Klemm-Werte aus `solve()`
// bzw. dem `onMove()`-Resize-Handler des Prototyps)
// ---------------------------------------------------------------------------

export const DOCK_KONSTANTEN = {
  RAIL: 52,
  GAP: 10,
  COLLH: 34,
  STRIP: 56,
  DOCKH: 68,
  MIN_VIEWPORT: 380,
  DEF_LEFT: 224,
  MIN_LEFT: 168,
  MAX_LEFT: 360,
  DEF_RIGHT: 326,
  MIN_RIGHT: 250,
  MAX_RIGHT: 480,
} as const;

// ---------------------------------------------------------------------------
// Interne Hilfstypen für die Merge- und Routing-Schritte
// ---------------------------------------------------------------------------

interface MergedPanel {
  id: string;
  titel: string;
  rolle: PanelDef['rolle'];
  wichtigkeit: number;
  dock: DockZone;
  anker?: FloatAnker;
  min?: number;
  groesse?: number;
  fw?: number;
  fh?: number;
  fx?: number;
  fy?: number;
  eingeklappt: boolean;
  angeheftet: boolean;
  geschlossen: boolean;
}

interface RoutedPanel extends MergedPanel {
  _dock: DockZone | 'ctop' | 'cbot';
}

/** Def ⊕ Override (entspricht `merged()` im Prototyp). */
function mischePanel(def: PanelDef, ov: PanelOverride | undefined): MergedPanel {
  const o = ov ?? {};
  const geschlossen = o.geschlossen !== undefined ? o.geschlossen : def.start === 'zu';
  const anker = o.anker ?? def.anker;
  const groesse = o.groesse ?? def.groesse;
  const fw = o.fw ?? def.fw;
  const fh = o.fh ?? def.fh;
  return {
    id: def.id,
    titel: def.titel,
    rolle: def.rolle,
    wichtigkeit: def.wichtigkeit,
    dock: o.dock ?? def.dock,
    ...(anker !== undefined ? { anker } : {}),
    ...(def.min !== undefined ? { min: def.min } : {}),
    ...(groesse !== undefined ? { groesse } : {}),
    ...(fw !== undefined ? { fw } : {}),
    ...(fh !== undefined ? { fh } : {}),
    ...(o.fx !== undefined ? { fx: o.fx } : {}),
    ...(o.fy !== undefined ? { fy: o.fy } : {}),
    eingeklappt: !!o.eingeklappt,
    angeheftet: !!o.angeheftet,
    geschlossen,
  };
}

// ---------------------------------------------------------------------------
// waterfill — verteilt Restplatz proportional zum "Schlupf" (size-min)
// (Prototyp `waterfill()`, Zeile 624-631)
// ---------------------------------------------------------------------------

export interface WaterfillEintrag {
  id: string;
  min: number;
  groesse: number;
  h: number;
}

export function waterfill(list: readonly WaterfillEintrag[], avail: number): void {
  if (!list.length) return;
  const base = list.reduce((s, x) => s + x.min, 0);
  if (avail <= base) {
    const f = avail / base;
    list.forEach((x) => {
      x.h = Math.max(20, x.min * f);
    });
    return;
  }
  const extra = avail - base;
  const slk = list.reduce((s, x) => s + Math.max(1, x.groesse - x.min), 0);
  list.forEach((x) => {
    x.h = x.min + extra * (Math.max(1, x.groesse - x.min) / slk);
  });
}

// ---------------------------------------------------------------------------
// stack — vertikaler Stapel (linke/rechte Spalte); Modus 'collapse' (Konzept
// A) klappt bei Platzmangel Panels zu Tabs ein, Modus 'share' (Konzept B)
// staucht stattdessen alle proportional (Prototyp `stack()`, Zeile 632-659)
// ---------------------------------------------------------------------------

export interface StackPanel {
  id: string;
  wichtigkeit: number;
  angeheftet?: boolean;
  eingeklappt?: boolean;
  min?: number;
  groesse?: number;
}

export function stack(
  items: readonly StackPanel[],
  rect: { x: number; y: number; w: number; h: number },
  rects: Record<string, DockRect>,
  modus: 'collapse' | 'share',
  schutzId: string | undefined,
): void {
  if (!items.length) return;
  const n = items.length;
  const gaps = DOCK_KONSTANTEN.GAP * (n - 1);
  const st = items.map((p) => ({
    id: p.id,
    wichtigkeit: p.wichtigkeit,
    angeheftet: !!p.angeheftet,
    eingeklappt: !!p.eingeklappt,
    min: p.min || 130,
    groesse: p.groesse || 220,
    h: 0,
  }));
  let ch = st.filter((x) => x.eingeklappt).length * DOCK_KONSTANTEN.COLLH;
  let avail = rect.h - gaps - ch;
  let exp = st.filter((x) => !x.eingeklappt);

  if (modus === 'collapse') {
    const targ = (x: (typeof st)[number]) => Math.max(x.min, Math.min(x.groesse, avail * 0.66));
    // Solange (angeheftete Ziel-Höhen + Σ min(flex)) nicht in avail passt:
    // das unwichtigste, nicht geschützte Flex-Panel einklappen.
    for (;;) {
      const pn = exp.filter((x) => x.angeheftet);
      const fx = exp.filter((x) => !x.angeheftet);
      const pH = pn.reduce((s, x) => s + targ(x), 0);
      const need = fx.reduce((s, x) => s + x.min, 0);
      if (pH + need <= avail) break;
      const cand = fx.filter((x) => x.id !== schutzId).sort((a, b) => a.wichtigkeit - b.wichtigkeit)[0];
      if (!cand) break;
      cand.eingeklappt = true;
      ch += DOCK_KONSTANTEN.COLLH;
      avail = rect.h - gaps - ch;
      exp = exp.filter((x) => x !== cand);
    }
    const pinned = exp.filter((x) => x.angeheftet);
    const flex = exp.filter((x) => !x.angeheftet);
    let ph = 0;
    pinned.forEach((x) => {
      x.h = targ(x);
      ph += x.h;
    });
    waterfill(flex, Math.max(0, avail - ph));
  } else {
    const need = exp.reduce((s, x) => s + x.min, 0);
    if (need > avail) {
      const f = avail / need;
      exp.forEach((x) => {
        x.h = Math.max(18, x.min * f);
      });
    } else {
      const pinned = exp.filter((x) => x.angeheftet);
      const flex = exp.filter((x) => !x.angeheftet);
      let ph = 0;
      pinned.forEach((x) => {
        x.h = Math.max(x.min, Math.min(x.groesse, avail * 0.6));
        ph += x.h;
      });
      waterfill(flex, Math.max(0, avail - ph));
    }
  }

  let y = rect.y;
  st.forEach((x) => {
    const h = x.eingeklappt ? DOCK_KONSTANTEN.COLLH : x.h || x.min;
    rects[x.id] = { x: rect.x, y, w: rect.w, h, z: 14, eingeklappt: x.eingeklappt };
    y += h + DOCK_KONSTANTEN.GAP;
  });
}

// ---------------------------------------------------------------------------
// rowLayout — zentrierte horizontale Reihe für Streifen (ctop/cbot in
// Konzept B) (Prototyp `rowLayout()`, Zeile 660-664)
// ---------------------------------------------------------------------------

export interface RowItem {
  id: string;
  fw?: number;
  fh?: number;
}

export function rowLayout(
  items: readonly RowItem[],
  strip: { x: number; y: number; w: number; h: number },
  rects: Record<string, DockRect>,
): void {
  const total = items.reduce((s, p) => s + (p.fw || 160), 0) + DOCK_KONSTANTEN.GAP * (items.length - 1);
  let x = strip.x + Math.max(DOCK_KONSTANTEN.GAP, (strip.w - total) / 2);
  items.forEach((p) => {
    const w = p.fw || 160;
    const h = Math.min(strip.h - 8, p.fh || strip.h - 8);
    rects[p.id] = { x, y: strip.y + (strip.h - h) / 2, w, h, z: 16, eingeklappt: false };
    x += w + DOCK_KONSTANTEN.GAP;
  });
}

// ---------------------------------------------------------------------------
// placeFloats / separate — schwebende Panels (Konzept A). placeFloats platziert
// zuerst automatisch verankerte Floats (top/bottom-center/bottom-left, seit
// v0.7.9 A1 zusätzlich top-right, s. `FloatAnker`-Kommentar oben) und frei
// positionierte (fx/fy gesetzt), dann räumt separate() Überlappungen aus dem
// Weg (Prototyp Zeile 665-689 + die additive top-right-Ergänzung).
// ---------------------------------------------------------------------------

export interface FloatItem {
  id: string;
  wichtigkeit: number;
  anker?: FloatAnker;
  fx?: number;
  fy?: number;
  fw?: number;
  fh?: number;
}

export function placeFloats(
  floats: readonly FloatItem[],
  vp: { x: number; y: number; w: number; h: number },
  rects: Record<string, DockRect>,
  lockId: string | undefined,
): void {
  const pad = 14;
  const put = (f: FloatItem, x: number, y: number) => {
    rects[f.id] = { x, y, w: f.fw || 200, h: f.fh || 60, z: 30, eingeklappt: false, schwebend: true };
  };

  const top = floats.filter((f) => f.anker === 'top' && f.fx === undefined);
  const tw = top.reduce((s, f) => s + (f.fw || 200), 0) + DOCK_KONSTANTEN.GAP * (top.length - 1);
  let tx = vp.x + Math.max(pad, (vp.w - tw) / 2);
  let ty = vp.y + pad;
  let rowH = 0;
  const maxx = vp.x + vp.w - pad;
  top.forEach((f) => {
    const w = f.fw || 200;
    if (tx + w > maxx) {
      tx = vp.x + pad;
      ty += rowH + DOCK_KONSTANTEN.GAP;
      rowH = 0;
    }
    put(f, tx, ty);
    tx += w + DOCK_KONSTANTEN.GAP;
    rowH = Math.max(rowH, f.fh || 60);
  });

  // Hinweis: die folgenden zwei Blöcke übernehmen bewusst eine Eigenheit des
  // Prototyps — die Positions-Mathematik (w/h hier) verwendet andere
  // Default-Breiten/-Höhen (400/56 bzw. nur 90 für die Höhe) als `put()`
  // intern (200/60). In der Praxis liefern alle Stations-Defs immer ein
  // `fw`/`fh`, sodass die Diskrepanz nie zum Tragen kommt — sie wird hier
  // nicht "repariert", weil die Aufgabe einen exakten Verhaltens-Port
  // verlangt, keine Verbesserung.
  const bc = floats.filter((f) => f.anker === 'bottom-center' && f.fx === undefined);
  let by = vp.y + vp.h - pad;
  bc.forEach((f) => {
    const w = f.fw || 400;
    const h = f.fh || 56;
    by -= h;
    put(f, vp.x + (vp.w - w) / 2, by);
    by -= DOCK_KONSTANTEN.GAP;
  });

  const bl = floats.filter((f) => f.anker === 'bottom-left' && f.fx === undefined);
  let ly = vp.y + vp.h - pad;
  bl.forEach((f) => {
    const h = f.fh || 90;
    ly -= h;
    put(f, vp.x + pad, ly);
    ly -= DOCK_KONSTANTEN.GAP;
  });

  // v0.7.9 (A1) — der `top-right`-Stapel: rechtsbündig, wächst von der
  // OBEREN Kante nach UNTEN (Spiegelung von `bl` oben). Reihenfolge =
  // Registry-Reihenfolge, erstes Element am nächsten zur oberen Kante.
  // ZWEI dokumentierte Zusätze gegenüber den Prototyp-Ankern (s. auch
  // `FloatAnker`-Kommentar):
  //  (1) Der Stapel beginnt UNTERHALB jeder top-Reihen-Zeile, deren
  //      Rechteck seinen x-Bereich schneidet — `separate()` kann eine
  //      Oberkante↔Oberkante-Kollision strukturell nie auflösen (beide
  //      kleben an `vp.y`, der y-Ausweichzug klemmt sofort zurück; dieselbe
  //      dokumentierte Kanten-Grenze wie im «9-Iterationen-Kappe»-Test).
  //      Die top-REIHE selbst bleibt dabei byte-identisch zum Prototyp —
  //      nur die Spalte weicht nach unten aus (bewusst NICHT umgekehrt:
  //      eine Breiten-Reserve für die Spalte liess die Reihe in engen
  //      Split-Ansichten in drei Zeilen kaskadieren — real probiert und
  //      verworfen).
  //  (2) Die Höhen werden aufs Feld GEKLEMMT (`fh` = WUNSCH-Höhe): die
  //      migrierte Eigenschaften-Säule war als fixes Chrome höhen-adaptiv
  //      (`top:16;bottom:180` + inneres `overflowY:auto`) — eine starre fh
  //      ragte bei kleinen Fenstern unter das Feld (über Statusleiste/
  //      Boden-Chrome). Der Inhalt scrollt intern weiter
  //      (s. `ViewportChromeHuds.tsx`).
  const tr = floats.filter((f) => f.anker === 'top-right' && f.fx === undefined);
  if (tr.length) {
    const spalteX = vp.x + vp.w - pad - Math.max(...tr.map((f) => f.fw || 200));
    let ry = vp.y + pad;
    top.forEach((t) => {
      const r = rects[t.id];
      if (r && r.x + r.w + DOCK_KONSTANTEN.GAP > spalteX) {
        ry = Math.max(ry, r.y + r.h + DOCK_KONSTANTEN.GAP);
      }
    });
    const trBoden = vp.y + vp.h - pad;
    tr.forEach((f) => {
      const w = f.fw || 200;
      const h = Math.max(40, Math.min(f.fh || 90, trBoden - ry));
      rects[f.id] = { x: vp.x + vp.w - pad - w, y: ry, w, h, z: 30, eingeklappt: false, schwebend: true };
      ry += h + DOCK_KONSTANTEN.GAP;
    });
  }

  floats
    .filter((f) => f.fx !== undefined)
    .forEach((f) => {
      const w = f.fw || 200;
      const h = f.fh || 60;
      const x = Math.min(Math.max(vp.x, f.fx as number), vp.x + vp.w - w);
      const y = Math.min(Math.max(vp.y, f.fy as number), vp.y + vp.h - h);
      rects[f.id] = { x, y, w, h, z: 32, eingeklappt: false, schwebend: true };
    });

  separate(floats, rects, vp, lockId);
}

export function separate(
  floats: readonly FloatItem[],
  rects: Record<string, DockRect>,
  vp: { x: number; y: number; w: number; h: number },
  lockId: string | undefined,
): void {
  for (let it = 0; it < 9; it++) {
    let moved = false;
    for (let i = 0; i < floats.length; i++) {
      for (let j = i + 1; j < floats.length; j++) {
        const fi = floats[i]!;
        const fj = floats[j]!;
        const a = rects[fi.id];
        const b = rects[fj.id];
        if (!a || !b) continue;
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + 4;
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + 4;
        if (ox > 0 && oy > 0) {
          let lo: DockRect;
          if (fi.id === lockId) lo = b;
          else if (fj.id === lockId) lo = a;
          else lo = fi.wichtigkeit <= fj.wichtigkeit ? a : b;
          if (ox < oy) {
            lo.x += lo.x + lo.w / 2 < vp.x + vp.w / 2 ? -(ox + 1) : ox + 1;
          } else {
            lo.y += lo.y + lo.h / 2 < vp.y + vp.h / 2 ? -(oy + 1) : oy + 1;
          }
          lo.x = Math.min(Math.max(vp.x, lo.x), vp.x + vp.w - lo.w);
          lo.y = Math.min(Math.max(vp.y, lo.y), vp.y + vp.h - lo.h);
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

// ---------------------------------------------------------------------------
// rowSplitters — Trenn-Griffe zwischen benachbarten Stack-Panels (intern,
// nicht separat exportiert — der Prototyp ruft sie nur aus `solve()` heraus
// auf; Zeile 690-694)
// ---------------------------------------------------------------------------

function rowSplitters(items: readonly { id: string }[], rects: Record<string, DockRect>, spl: DockSplitterZone[]): void {
  for (let i = 0; i < items.length - 1; i++) {
    const a = items[i]!;
    const b = items[i + 1]!;
    const ra = rects[a.id];
    const rb = rects[b.id];
    if (!ra || !rb || ra.eingeklappt || rb.eingeklappt) continue;
    spl.push({ id: 'sr-' + a.id, art: 'row', a: a.id, b: b.id, x: ra.x + 6, y: ra.y + ra.h + DOCK_KONSTANTEN.GAP / 2 - 7, w: ra.w - 12, h: 14 });
  }
}

// ---------------------------------------------------------------------------
// solve — der eigentliche Layout-Solver (Prototyp `solve()`, Zeile 574-623)
// ---------------------------------------------------------------------------

export function solve(defs: readonly PanelDef[], opts: SolveOptionen): SolveErgebnis {
  const A = opts.modus === 'A';
  const feld = opts.feld;
  const leftW = opts.leftW || DOCK_KONSTANTEN.DEF_LEFT;
  const rightW = opts.rightW || DOCK_KONSTANTEN.DEF_RIGHT;

  const merged = defs.map((d) => mischePanel(d, opts.overrides[d.id]));
  let vis: MergedPanel[] = merged.filter((p) => !p.geschlossen);
  if (opts.gedraggtId !== undefined) {
    const gedraggtId = opts.gedraggtId;
    vis = vis.filter((p) => p.id !== gedraggtId);
  }

  const rail = vis.find((p) => p.dock === 'rail');

  const routed: RoutedPanel[] = vis.map((p) => {
    let d: DockZone | 'ctop' | 'cbot' = p.dock;
    if (!A && d === 'float') {
      if (p.anker === 'top') d = 'ctop';
      else if (p.anker === 'bottom-center') d = 'cbot';
      else d = 'left';
    }
    return { ...p, _dock: d };
  });

  const leftPanels = routed.filter((p) => p._dock === 'left');
  const rightPanels = routed.filter((p) => p._dock === 'right');
  const floats = A ? routed.filter((p) => p._dock === 'float') : [];
  const ctop = !A ? routed.filter((p) => p._dock === 'ctop') : [];
  const cbot = !A ? routed.filter((p) => p._dock === 'cbot') : [];

  const railW = rail ? DOCK_KONSTANTEN.RAIL : 0;
  let lw = leftPanels.length ? leftW : 0;
  let rw = rightPanels.length ? rightW : 0;
  let leftZone = feld.x + railW + lw;
  let centerW = feld.x + feld.w - leftZone - rw;
  if (centerW < DOCK_KONSTANTEN.MIN_VIEWPORT) {
    let def = DOCK_KONSTANTEN.MIN_VIEWPORT - centerW;
    const rs = Math.min(def, Math.max(0, rw - DOCK_KONSTANTEN.MIN_RIGHT));
    rw -= rs;
    def -= rs;
    if (def > 0) {
      const ls = Math.min(def, Math.max(0, lw - DOCK_KONSTANTEN.MIN_LEFT));
      lw -= ls;
      leftZone = feld.x + railW + lw;
    }
    centerW = feld.x + feld.w - leftZone - rw;
  }

  const rects: Record<string, DockRect> = {};
  if (rail) rects[rail.id] = { x: feld.x, y: feld.y, w: railW, h: feld.h, z: 14, eingeklappt: false };

  let vp = { x: leftZone, y: feld.y, w: centerW, h: feld.h };
  if (!A) {
    let ty = feld.y;
    let bh = 0;
    if (ctop.length) {
      rowLayout(ctop, { x: leftZone, y: ty, w: centerW, h: DOCK_KONSTANTEN.STRIP }, rects);
      ty += DOCK_KONSTANTEN.STRIP + DOCK_KONSTANTEN.GAP;
    }
    if (cbot.length) {
      bh = DOCK_KONSTANTEN.DOCKH + DOCK_KONSTANTEN.GAP;
      rowLayout(cbot, { x: leftZone, y: feld.y + feld.h - DOCK_KONSTANTEN.DOCKH, w: centerW, h: DOCK_KONSTANTEN.DOCKH }, rects);
    }
    vp = { x: leftZone, y: ty, w: centerW, h: feld.y + feld.h - ty - bh };
  }

  const schutz = opts.zuletztGeoeffnet;
  if (leftPanels.length) {
    stack(leftPanels, { x: feld.x + railW, y: feld.y, w: lw, h: feld.h }, rects, A ? 'collapse' : 'share', schutz);
  }
  if (rightPanels.length) {
    stack(rightPanels, { x: feld.x + feld.w - rw, y: feld.y, w: rw, h: feld.h }, rects, A ? 'collapse' : 'share', schutz);
  }

  const lockId = opts.floatGesperrtId;
  if (A && floats.length) placeFloats(floats, vp, rects, lockId);

  const spl: DockSplitterZone[] = [];
  if (leftPanels.length) {
    spl.push({ id: 'spL', art: 'col-left', x: feld.x + railW + lw - 7, y: feld.y + 6, w: 14, h: feld.h - 12 });
  }
  if (rightPanels.length) {
    spl.push({ id: 'spR', art: 'col-right', x: feld.x + feld.w - rw - 7, y: feld.y + 6, w: 14, h: feld.h - 12 });
  }
  rowSplitters(leftPanels, rects, spl);
  rowSplitters(rightPanels, rects, spl);

  const viewport: DockRect = { x: vp.x, y: vp.y, w: vp.w, h: vp.h, z: 0, eingeklappt: false };
  return { rects, viewport, splitters: spl };
}
